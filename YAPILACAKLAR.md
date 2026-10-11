# Kelimo — Yapılacaklar

Bu dosya projenin iş listesidir. Sırayla ilerlenir; her adım bitince işaretlenir ve aynı commit'e
eklenir. Araya başka iş girerse buradaki ilk işaretsiz adımdan devam edilir.

Durum: `[x]` bitti · `[ ]` sırada · `[~]` başladı, yarım · `[-]` bilinçli olarak atlandı (nedeni yazılır)

## Tamamlananlar (özet)

- [x] Oyun: günlük 5 harfli kelime, 6 deneme, istatistik, seri, emoji paylaşımı
- [x] Sözlük kontrolü ve uzun cevap listeleri
- [x] 6 dil (TR, EN, ES, PT, FR, DE), dile özel klavyeler
- [x] Günde 1 ücretsiz kelime + ücretli ekstra kelime paketleri (expo-iap)
- [x] Sabah 09:00 hatırlatma bildirimi
- [x] Simge, açılış ekranı, mağaza ekran görüntüleri (iPhone + Android, TR/EN), 6 dilde mağaza metinleri
- [x] Web test sürümü, gizlilik politikası sayfası (`docs/privacy.html`)

## Bölüm 1 — Hesap gerektirmeyenler (şimdi yapılabilir)

1. [x] **İş listesi ve otomatik kontrol (CI):** her push'ta tip kontrolü, lint ve testler GitHub'da
   otomatik çalışır; bozuk kod fark edilmeden birikmez.
2. [x] **Kod incelemesi:** tüm uygulamanın hata avı (gün değişimi, satın alma, kayıt, dil değişimi gibi
   kenar durumları) ve bulunan hataların düzeltilmesi.
   Düzeltilenler: ekstra kelime oynarken istatistikten paylaşılan sonucun yanlış renklenmesi; mağaza
   fiyatları alınamayınca satın almanın tamamen kapanması.
3. [ ] **Oyun hissi:** harf kartlarının çevrilme animasyonu, kazanınca zıplama, tuşlarda ve sonuçta
   titreşim (haptics). Bu tür oyunlarda oyuncuyu tutan en önemli ayrıntılardan biri.
4. [ ] **Erişilebilirlik:** VoiceOver/TalkBack etiketleri, renk körleri için yüksek kontrast modu
   (yeşil/sarı yerine turuncu/mavi), iPad ve web'de fiziksel klavye ile oynama.
5. [ ] **iPad:** iPad ekranında yerleşimin kontrolü ve iyileştirilmesi; App Store için iPad ekran
   görüntüleri (13" iPad, 2064×2752). iPad desteği açık olduğu için App Store bunları zorunlu tutar.
6. [ ] **Uygulama içi bağlantılar ve destek sayfası:** yardım ekranına "Gizlilik" ve "Destek"
   bağlantıları; App Store'un zorunlu tuttuğu destek sayfası (`docs/support.html`, SSS dahil).
7. [ ] **Mağaza başvuru yanıtları:** App Store yaş derecelendirmesi, kategori, App Privacy, Google Play
   içerik derecelendirmesi ve Veri güvenliği formu için hazır yanıtlar (`store/basvuru.md`).
8. [ ] **Zor mod (öneri):** bulunan ipuçlarını sonraki tahminlerde kullanma zorunluluğu. Kelime
   oyunlarının sadık oyuncularının en çok kullandığı ayar.
9. [ ] **Türkçe çekimli kelimeler (öneri):** "evler", "geldi" gibi çekimli tahminlerin kabul edilmesi
   için temiz bir liste eklenmesi.

## Bölüm 2 — Sizin yapmanız gerekenler (hesap / karar)

10. [ ] İletişim e-posta adresi açılması (gizlilik ve destek sayfalarına yazılacak)
11. [ ] Gizlilik ve destek sayfalarının herkese açık bir adreste yayınlanması (GitHub Pages, Netlify Drop
    ya da sayfanın Paylaş menüsü)
12. [ ] Paket kimliğinin seçilmesi (`com.kelimo.app` yerine size ait bir kimlik, ör. `com.adiniz.kelimo`)
13. [ ] Cevap listelerinin ve çevirilerin anadili konuşan biri tarafından gözden geçirilmesi
    (özellikle Almanca)
14. [ ] Expo hesabı (ücretsiz) ve Apple Developer hesabı (yıllık 99 $)

## Bölüm 3 — Apple hesabı açıldıktan sonra

15. [ ] App Store Connect'te uygulama kaydı, Paid Apps sözleşmesi, banka/vergi bilgileri
16. [ ] Üç ekstra kelime ürününün oluşturulması (`kelimo_words_1/5/15`, Consumable)
17. [ ] EAS ile iOS derlemesi ve TestFlight'a gönderim
18. [ ] iPhone ve iPad'de test: bildirimler, Sandbox satın alma, tüm diller
19. [ ] Mağaza sayfasının doldurulması (metinler, ekran görüntüleri, gizlilik/destek adresleri, formlar)
20. [ ] App Store incelemesine gönderim

## Bölüm 4 — Android (isteğe bağlı, sonra)

21. [ ] Google Play geliştirici hesabı (bir kerelik 25 $)
22. [ ] Dahili test: bir Android cihazda deneme (arkadaş telefonu, emülatör ya da bulut cihaz)
23. [ ] Play Console ürünleri, Veri güvenliği formu, incelemeye gönderim

## Bilinçli kararlar

- **Expo Router kullanılmadı:** `AGENTS.md` gezinme için Expo Router öneriyor, ama uygulama tek ekranlı;
  pencereler sayfa değil açılır panel. Gezinme ihtiyacı doğarsa geçilecek.
