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
- Sabah 09:00 "günün kelimesi hazır" hatırlatması (o günün kelimesi çözüldüyse gönderilmez)
- Emoji sonuç paylaşımı (🟩🟨⬛) — uygulamanın viral büyüme motoru
- İnternet ve hesap gerektirmez, veriler cihazda saklanır

## Çalıştırma

```bash
npm install
npm start        # QR kodu telefondaki Expo Go uygulamasıyla okut
npm test         # oyun mantığı testleri
npx tsc --noEmit # tip kontrolü
npm run lint     # ESLint
```

## Web test sürümü

Telefon olmadan denemek için web derlemesi alınabilir. `EXPO_PUBLIC_DEMO_STORE=1` ile derlenirse ekstra
kelime satın alma ücretsiz deneme moduna geçer (yalnızca test sürümleri için; mağaza derlemelerinde
kullanmayın):

```bash
EXPO_PUBLIC_DEMO_STORE=1 npx expo export --platform web --output-dir dist
npx serve -s dist
```

Web'de bildirimler yoktur ve Paylaş düğmesi sonucu panoya kopyalar.

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

## Günlük hatırlatma

Oyuncu ilk günlük kelimesini bitirince bir kez "Hatırlatayım mı?" diye sorulur; sonra sol üstteki
🔔/🔕 düğmesiyle açılıp kapatılır. Bildirimler cihazda planlanır (sunucu gerekmez): uygulama her
açıldığında önümüzdeki 14 günün sabah 09:00 bildirimleri oyuncunun dilinde yeniden kurulur, o günün
kelimesi çözüldüyse o günkü atlanır. Uygulamayı 2 hafta açmayan oyuncu bildirim almayı bırakır.

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

## Mağaza sayfası

| Dosya | İçerik |
| --- | --- |
| `assets/` | Simge seti (iOS, Android uyarlanabilir + tek renkli, açılış ekranı, favicon) |
| `store/listing.json` | 6 dilde ad, alt başlık, tanıtım metni, anahtar kelimeler, kısa/uzun açıklama |
| `store/screenshots/ios/<dil>/` | App Store ekran görüntüleri, 1290×2796 (6,7"/6,9" iPhone) |
| `store/screenshots/android/<dil>/` | Google Play ekran görüntüleri, 1080×1920 |

- Simgeleri yeniden üretmek: `npm run brand:icons` (tasarım `scripts/brand/render-icons.cjs` içinde).
- Ekran görüntülerini yeniden üretmek: web derlemesini sunup
  `npm run brand:screenshots -- http://localhost:4567` (ayrıntılar betiğin başında).
- `store/listing.json` alanları mağaza sınırlarına göre test edilir (ad/alt başlık 30, anahtar kelimeler
  100, kısa açıklama 80, uzun açıklama 4000 karakter) ve başka ürün adı içermemesi kontrol edilir.
- **Gizlilik formu:** Uygulama kişisel veri toplamaz. App Store'da "Data Not Collected",
  Google Play'de "Veri toplanmıyor/paylaşılmıyor" seçilebilir; yine de bir gizlilik politikası URL'si
  (basit bir sayfa yeterli) iki mağaza için de zorunludur.
- Ekran görüntülerindeki istatistikler (47 oyun, 13 seri…) tanıtım amaçlı örnek verilerdir.

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
| `src/reminders.ts` | Günlük hatırlatma bildirimleri (expo-notifications) |
| `src/store.ts` | App Store / Google Play satın alma (expo-iap) |
| `src/i18n.ts` | Metinler ve klavye düzenleri |

## Sonraki adımlar (popülerlik için)

1. **Çekimli kelimeler:** Türkçe sözlük TDK madde başlıklarından oluşur; "evler", "geldi" gibi çekimli
   haller şu an kabul edilmiyor. Gerekirse temiz bir çekimli kelime listesi eklenebilir.
2. **Cevap listelerini büyütmek:** Portekizce, Fransızca ve Almanca listeler ~1,2–1,3 yıl yetiyor;
   bir yıl dolmadan sonlarına yeni kelimeler eklenmeli. Yeni diller (İtalyanca, Endonezce…) eklenebilir.
3. **Gizlilik politikası sayfası** ve mağaza hesaplarının açılması (yayın için son adımlar).
4. **Gelir:** Ekstra kelime satışı hazır; ek olarak ödüllü reklam (reklam izle → 1 ekstra kelime) eklenebilir.

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
