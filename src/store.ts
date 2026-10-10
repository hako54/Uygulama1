import {
  Purchase,
  endConnection,
  fetchProducts,
  finishTransaction,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';
import { Platform } from 'react-native';

import { changeCredits, markPurchaseHandled } from './storage';

// Consumable products; create them with these exact IDs in App Store Connect and Play Console.
export const PACKS = [
  { id: 'kelimo_words_1', words: 1, fallbackPrice: '$0.99' },
  { id: 'kelimo_words_5', words: 5, fallbackPrice: '$2.99' },
  { id: 'kelimo_words_15', words: 15, fallbackPrice: '$6.99' },
] as const;

export type PackId = (typeof PACKS)[number]['id'];

export interface StoreEvents {
  /** New credit total after a purchase was granted. */
  onCredits: (total: number, added: number) => void;
  onError: () => void;
}

export interface Store {
  /** Store-localized prices; missing entries fall back to `fallbackPrice`. */
  prices: Partial<Record<PackId, string>>;
  /** True when purchases are simulated (development builds without a store). */
  demo: boolean;
  available: boolean;
  buy: (id: PackId) => Promise<void>;
  close: () => void;
}

const wordsFor = (productId: string) => PACKS.find((p) => p.id === productId)?.words ?? 0;

async function grant(purchase: Purchase, events: StoreEvents) {
  if (purchase.purchaseState !== 'purchased') return; // pending (e.g. cash payment): wait for update
  const words = wordsFor(purchase.productId) * Math.max(1, purchase.quantity ?? 1);
  if (words > 0 && (await markPurchaseHandled(purchase.transactionId ?? purchase.id))) {
    events.onCredits(await changeCredits(words), words);
  }
  // Consuming lets the same pack be bought again; unfinished Android purchases are refunded.
  await finishTransaction({ purchase, isConsumable: true });
}

/** Connects to the App Store / Google Play; falls back to a demo store in development. */
export async function openStore(events: StoreEvents): Promise<Store> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await initConnection();
      const subs = [
        purchaseUpdatedListener((p) => {
          grant(p, events).catch(() => events.onError());
        }),
        purchaseErrorListener((e) => {
          if (!isUserCancelledError(e)) events.onError();
        }),
      ];
      const products = await fetchProducts({ skus: PACKS.map((p) => p.id), type: 'in-app' });
      const prices: Store['prices'] = {};
      for (const product of products ?? []) prices[product.id as PackId] = product.displayPrice;
      return {
        prices,
        demo: false,
        available: true,
        buy: async (id) => {
          await requestPurchase({
            request: { apple: { sku: id }, google: { skus: [id] } },
            type: 'in-app',
          });
        },
        close: () => {
          subs.forEach((s) => s.remove());
          endConnection().catch(() => {});
        },
      };
    } catch {
      // Expo Go or a build without the native module: fall through.
    }
  }

  if (__DEV__) {
    return {
      prices: {},
      demo: true,
      available: true,
      buy: async (id) => {
        const words = wordsFor(id);
        events.onCredits(await changeCredits(words), words);
      },
      close: () => {},
    };
  }
  return { prices: {}, demo: false, available: false, buy: async () => {}, close: () => {} };
}
