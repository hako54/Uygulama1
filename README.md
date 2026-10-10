# Kelimo — Günlük Kelime Oyunu

Android ve iOS için Wordle tarzı, basit bir günlük kelime oyunu. Tek kod tabanı (Expo / React Native).

- Her gün herkese aynı 5 harfli kelime, 6 deneme hakkı
- 6 dil: Türkçe, English, Español, Português, Français, Deutsch — cihaz diline göre otomatik seçilir,
  sağ üstten değiştirilir; her dilin kendi klavyesi var (QWERTY, AZERTY, QWERTZ, Ñ, Türkçe harfler)
- İstatistikler, seri (streak), tahmin dağılımı
- Sözlük kontrolü: yalnızca gerçek kelimeler tahmin olarak kabul edilir

| Dil | Günlük cevap | Yetme süresi | Kabul edilen tahmin |
| --- | --- | --- | --- |
| Türkçe | 1.681 | ~4,6 yıl | 5.522 |
| English | 823 | ~2,3 yıl | 12.653 |
| Español | 688 | ~1,9 yıl | 10.836 |
| Português | 481 | ~1,3 yıl | 16.459 |
| Français | 474 | ~1,3 yıl | 5.891 |
| Deutsch | 428 | ~1,2 yıl | 6.748 |

Aksanlar yok sayılır (É = E, Ç = C); İspanyolcada Ñ ayrı harftir, Almancada umlautlar açık yazılır (Ä = AE, ß = SS).
- Her gün 1 ücretsiz kelime; daha fazlası için ertesi günü bekle ya da **ekstra kelime** satın al
- Emoji sonuç paylaşımı (🟩🟨⬛) — uygulamanın viral büyüme motoru
- İnternet ve hesap gerektirmez, veriler cihazda saklanır

## Çalıştırma

```bash
npm install
npm start        # QR kodu telefondaki Expo Go uygulamasıyla okut
npm test         # oyun mantığı testleri
npx tsc --noEmit # tip kontrolü
```

## Mağazalara yükleme (EAS)

Mac veya Android Studio gerekmez; derleme bulutta yapılır.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform android   # Google Play Console hesabı (25$ tek sefer)
npx eas-cli@latest submit --platform ios       # Apple Developer hesabı (99$/yıl)
```

Yüklemeden önce `app.json` içindeki `com.kelimo.app` paket adını kendinize ait bir adla değiştirin
ve `assets/` altındaki simgeleri kendi tasarımınızla değiştirin.

## Ekstra kelimeler (uygulama içi satın alma)

Günün kelimesi herkese ücretsizdir. Bitirince oyuncu ya ertesi günü bekler ya da ekstra kelime
satın alır. Ekstra kelimeler günlük listenin sonundan (yıllar sonra gelecek kelimelerden) seçilir ve
önümüzdeki 60 günün günlük kelimelerini asla göstermez; günlük istatistik ve seriyi etkilemez.

| Ürün kimliği | İçerik | Önerilen fiyat |
| --- | --- | --- |
| `kelimo_words_1` | 1 kelime | 0,99 $ |
| `kelimo_words_5` | 5 kelime | 2,99 $ |
| `kelimo_words_15` | 15 kelime | 6,99 $ |

Kurulum:

1. **App Store Connect** → Uygulamanız → *In-App Purchases* → üç ürünü **Consumable (tüketilebilir)**
   olarak yukarıdaki kimliklerle oluşturun; Paid Apps sözleşmesini ve banka/vergi bilgilerini tamamlayın.
2. **Google Play Console** → *Monetize → Products → In-app products* → aynı kimliklerle üç ürün oluşturun.
   (Play, ürün oluşturmadan önce faturalandırma içeren bir derlemenin yüklenmiş olmasını ister.)
3. Satın alma **Expo Go'da çalışmaz**; geliştirme derlemesi gerekir:
   `npx eas-cli@latest build --profile development`. Test için iOS'ta Sandbox hesabı,
   Android'de Play Console'daki *License testers* listesini kullanın.
4. Geliştirme modunda (Expo Go / web) mağaza yoksa satın almalar **ücretsiz simüle edilir**;
   yayın derlemesinde bu kapalıdır.

Bilinen sınırlamalar: haklar cihazda saklanır, uygulama silinirse kullanılmamış haklar kaybolur;
satın almalar sunucuda doğrulanmaz (düşük fiyatlı tüketilebilir ürün için kabul edilebilir risk).

## Kod yapısı

| Dosya | İçerik |
| --- | --- |
| `App.tsx` | Ekran: tahta, klavye, yardım ve istatistik pencereleri |
| `src/game.ts` | Günün kelimesi, puanlama, paylaşım metni |
| `src/words.ts` | Günün kelimesi olabilecek cevaplar (otomatik üretilir) |
| `src/dictionary.ts` | Kabul edilen tahminler (otomatik üretilir) |
| `scripts/build-words.mjs` | İki listeyi üretir: `npm run build:words` |
| `scripts/words/` | Dil başına elle seçilmiş cevaplar (`*.curated.txt`) ve hariç tutulanlar (`*.exclude.txt`) |
| `src/storage.ts` | Oyun durumu, istatistikler ve ekstra kelime haklarının cihazda saklanması |
| `src/store.ts` | App Store / Google Play satın alma (expo-iap) |
| `src/i18n.ts` | Metinler ve klavye düzenleri |

## Sonraki adımlar (popülerlik için)

1. **Çekimli kelimeler:** Türkçe sözlük TDK madde başlıklarından oluşur; "evler", "geldi" gibi çekimli
   haller şu an kabul edilmiyor. Gerekirse temiz bir çekimli kelime listesi eklenebilir.
2. **Cevap listelerini büyütmek:** Portekizce, Fransızca ve Almanca listeler ~1,2–1,3 yıl yetiyor;
   bir yıl dolmadan sonlarına yeni kelimeler eklenmeli. Yeni diller (İtalyanca, Endonezce…) eklenebilir.
3. **Bildirimler:** "Günün kelimesi hazır" hatırlatması (`expo-notifications`).
4. **Uygulama simgesi, mağaza ekran görüntüleri ve ASO** (mağaza başlığı/açıklaması/anahtar kelimeler).
5. **Gelir:** Ekstra kelime satışı hazır; ek olarak ödüllü reklam (reklam izle → 1 ekstra kelime) eklenebilir.

## Kelime listesi kaynakları

- Türkçe: [wordle-tr-dictionary](https://www.npmjs.com/package/wordle-tr-dictionary) (TDK tabanlı, MIT)
- İngilizce: [an-array-of-english-words](https://www.npmjs.com/package/an-array-of-english-words) (Letterpress listesi, MIT)
  ve [wordlist-english](https://www.npmjs.com/package/wordlist-english) (SCOWL, en yaygın kelimeler, MIT)
- İspanyolca / Fransızca: [an-array-of-spanish-words](https://www.npmjs.com/package/an-array-of-spanish-words),
  [an-array-of-french-words](https://www.npmjs.com/package/an-array-of-french-words) (Letterpress, MIT)
- Portekizce: [an-array-of-portuguese-words](https://www.npmjs.com/package/an-array-of-portuguese-words) (MIT)
- Almanca: [all-the-german-words-ascii](https://www.npmjs.com/package/all-the-german-words-ascii) (MIT)
- İspanyolca, Portekizce, Fransızca cevaplar ayrıca [bip39](https://www.npmjs.com/package/bip39) kelime listelerinden (ISC)

> Uygulama yayınlandıktan sonra cevap listesine yalnızca **ekleme** yapın; mevcut kelimeleri
> değiştirmek ya da silmek günlük kelime sırasını değiştirir.
