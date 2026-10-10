# Kelimo — Günlük Kelime Oyunu

Android ve iOS için Wordle tarzı, basit bir günlük kelime oyunu. Tek kod tabanı (Expo / React Native).

- Her gün herkese aynı 5 harfli kelime, 6 deneme hakkı
- Türkçe ve İngilizce (cihaz diline göre otomatik, sağ üstten değiştirilebilir)
- İstatistikler, seri (streak), tahmin dağılımı
- Sözlük kontrolü: yalnızca gerçek kelimeler tahmin olarak kabul edilir (TR 5.522, EN 12.653 kelime)
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

## Kod yapısı

| Dosya | İçerik |
| --- | --- |
| `App.tsx` | Ekran: tahta, klavye, yardım ve istatistik pencereleri |
| `src/game.ts` | Günün kelimesi, puanlama, paylaşım metni |
| `src/words.ts` | Cevap kelime listeleri (TR/EN) |
| `src/dictionary.ts` | Kabul edilen tahminler (otomatik üretilir: `npm run build:dictionary`) |
| `src/storage.ts` | Oyun durumu ve istatistiklerin cihazda saklanması |
| `src/i18n.ts` | Metinler ve klavye düzenleri |

## Sonraki adımlar (popülerlik için)

1. **Çekimli kelimeler:** Türkçe sözlük TDK madde başlıklarından oluşur; "evler", "geldi" gibi çekimli
   haller şu an kabul edilmiyor. Gerekirse temiz bir çekimli kelime listesi eklenebilir.
2. **Daha fazla dil:** İspanyolca, Portekizce, Almanca, Fransızca vb. — dünya çapında ilk 100 için şart.
3. **Daha uzun kelime listeleri** (en az 1–2 yıllık).
4. **Bildirimler:** "Günün kelimesi hazır" hatırlatması (`expo-notifications`).
5. **Uygulama simgesi, mağaza ekran görüntüleri ve ASO** (mağaza başlığı/açıklaması/anahtar kelimeler).
6. **Gelir:** Reklam (AdMob) veya reklamsız sürüm için uygulama içi satın alma.

## Kelime listesi kaynakları

- Türkçe: [wordle-tr-dictionary](https://www.npmjs.com/package/wordle-tr-dictionary) (TDK tabanlı, MIT)
- İngilizce: [an-array-of-english-words](https://www.npmjs.com/package/an-array-of-english-words) (Letterpress listesi, MIT)
