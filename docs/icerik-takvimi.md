# İçerik Takvimi — ayda 2 yazı

## Ritim
- **Ayda 2 yazı** (15. ve 28. gün civarı), her biri **1-2 fotoğrafla**.
- Yazı başına süre hedefi: 45-60 dk yazım.

## İş Akışı (EmDash)
1. **Yaz:** https://ahmetenes.com/_emdash/admin → Posts → New.
   Başlık, özet (listede, RSS'te ve paylaşım açıklamasında görünür), kategori/etiket,
   kapak görseli ve gövde.
2. **Görseller:**
   - En kolayı: editörde görsel yükle (medya kütüphanesi).
   - En iyi sonuç (duyarlı boyutlar + 1200×630 paylaşım görseli): dosyaları
     `public/blog/<slug>/cover.webp`, `kare-1.webp`… olarak koy, `pnpm optimize-images`
     çalıştır, yazıda bu yolları kullan ve `bash deploy.sh`.
   - Kare galerideyse (Immich "sitede" albümü) `src/data/blog-image-sources.json`'a
     `"/blog/<slug>/kare-1.webp": "<immich asset id>"` ekle: yazıda karenin altında çekim
     bilgisi (gövde/objektif/diyafram…) ve "Galeride aç" bağlantısı çıkar.
3. **Yayınla** (panelde), sonra duyur:
   - `pnpm announce <slug>` → yazıyı RSS'ten bulur, IndexNow'a bildirir, bülten önizlemesi.
   - `pnpm announce <slug> --send` → onaylı abonelere bülten e-postası.

## Galeriye kare eklemek
- Fotoğrafı Immich'te **sitede** albümüne ekle; galeri kendiliğinden alır.
- Başlık/kategori/hikâye/konum: `/var/www/ahmetenes-data/gallery-meta.json` (kalıcı veri;
  imajdaki `src/data/gallery-meta.json` yalnızca ilk kurulumda kopyalanır).
  Kategoriler: `sehir`, `sokak`, `doga`, `portre`, `gece` (karesi olmayan filtre gizlenir).

## Örnek Takvim (konular)
### Ayın ilk yarısı
- **Teknik**: Işık, kompozisyon, post-üretim notu (ekipmanla destekle)
- **Sahne**: Bir çekim gezisinin hikâyesi + 3-4 kare

### Ayın ikinci yarısı
- **Ekipman**: Yeni bir ekipmanın ilk izlenimi (fotoğraflı)
- **Kişisel**: "Şu an" güncellemesi / yılın kareleri seçkisi

## İpuçları
- Her yazı en az 1 galeri fotoğrafı içersin (portfolyo↔blog köprüsü; yukarıdaki eşleme).
- Kapak aynı zamanda yazının başında gösterilir; gövdeye aynı kareyi tekrar koyma
  (gerekirse otomatik atlanır).
- Yazı sonuna "İlgini Çekebilir" ve bülten kaydı otomatik gelir.
- "Şu an" sayfası (`/now`) panelden güncellenir; üstünde son güncelleme tarihi görünür.
