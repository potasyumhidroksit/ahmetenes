# İçerik Takvimi — ayda 2 yazı

## Ritim
- **Ayda 2 yazı** (15. ve 28. gün civarı), her biri **1-2 fotoğrafla**.
- Yazı başına süre hedefi: 45-60 dk yazım.

## İş Akışı
1. `pnpm new-post "Başlık"` → iskelet oluşur
2. İçeriği düzenle (frontmatter: kategori/özet/kapak + markdown gövde)
3. Yazıya 1-2 galeri karesini ekle: `![Açıklama](/api/immich/preview/<assetId>?w=1200)`
   - assetId'yi Immich'te fotoğrafın adresinden al; küratörlü kareler için
     `src/data/gallery.ts`'teki id'leri kullan
4. `pnpm publish-post "Başlık"` → onay → push + bülten + IndexNow

## Örnek Takvim (konular)
### Ayın ilk yarısı
- **Teknik**: Işık, kompozisyon, post-üretim notu (ekipmanla destekle)
- **Sahne**: Bir çekim gezisinin hikâyesi + 3-4 kare

### Ayın ikinci yarısı
- **Ekipman**: Yeni bir ekipmanın ilk izlenimi (fotoğraflı)
- **Kişisel**: "Şu an" güncellemesi / yılın kareleri seçkisi

## İpuçları
- Her yazı en az 1 galeri fotoğrafı içersin (portfolyo↔blog köprüsü)
- Yazı sonuna "İlgili yazılar" otomatik gelir (aynı kategori)
- Kapak görselini `public/blog/covers/<slug>.webp` altına koy ve frontmatter'a yaz
