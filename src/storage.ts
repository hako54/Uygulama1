import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, MAX_GUESSES } from './game';

export type Status = 'playing' | 'won' | 'lost';

export interface GameState {
  day: number;
  guesses: string[];
  status: Status;
}

/** A paid extra word; `index` counts this language's extra words from 0. */
export interface BonusState {
  index: number;
  word: string;
  guesses: string[];
  status: Status;
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  lastWonDay: number | null;
  distribution: number[];
}

export const emptyStats = (): Stats => ({
  played: 0,
  won: 0,
  streak: 0,
  maxStreak: 0,
  lastWonDay: null,
  distribution: Array(MAX_GUESSES).fill(0),
});

async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function save(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Progress just won't persist; the game still works.
  }
}

export const loadGame = (lang: Lang) => load<GameState>(`game:${lang}`);
export const saveGame = (lang: Lang, s: GameState) => save(`game:${lang}`, s);
export const loadStats = async (lang: Lang) => (await load<Stats>(`stats:${lang}`)) ?? emptyStats();
export const saveStats = (lang: Lang, s: Stats) => save(`stats:${lang}`, s);
export const loadLang = () => load<Lang>('lang');
export const saveLang = (l: Lang) => save('lang', l);
/** 'on' / 'off' once the player has answered the reminder prompt; null before that. */
export type ReminderPref = 'on' | 'off';
export const loadReminderPref = () => load<ReminderPref>('reminders');
export const saveReminderPref = (p: ReminderPref) => save('reminders', p);
export const loadSeenHelp = () => load<boolean>('seenHelp');
export const saveSeenHelp = () => save('seenHelp', true);

export const loadBonus = (lang: Lang) => load<BonusState>(`bonus:${lang}`);
export const saveBonus = (lang: Lang, s: BonusState) => save(`bonus:${lang}`, s);

// Credits are shared by all languages. Updates are chained so a purchase landing while a
// word is being spent can't lose either change.
let creditQueue: Promise<number> = Promise.resolve(0);

export const loadCredits = async () => (await load<number>('credits')) ?? 0;

export function changeCredits(delta: number): Promise<number> {
  creditQueue = creditQueue.then(async () => {
    const next = Math.max(0, (await loadCredits()) + delta);
    await save('credits', next);
    return next;
  });
  return creditQueue;
}

/** Remembers handled store transactions so a replayed one isn't credited twice. */
export async function markPurchaseHandled(id: string): Promise<boolean> {
  const handled = (await load<string[]>('purchases')) ?? [];
  if (handled.includes(id)) return false;
  await save('purchases', [...handled, id].slice(-200));
  return true;
}

export function recordResult(stats: Stats, day: number, won: boolean, guessCount: number): Stats {
  const next = { ...stats, distribution: [...stats.distribution] };
  next.played++;
  if (won) {
    next.won++;
    next.streak = stats.lastWonDay === day - 1 ? stats.streak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.streak);
    next.lastWonDay = day;
    next.distribution[guessCount - 1]++;
  } else {
    next.streak = 0;
  }
  return next;
}
