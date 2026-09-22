# ahmetenes.com — Geliştirme Planı

Tarih: 2026-09-21 · Yöntem: canlı HTTP ölçümleri + kaynak kod incelemesi
Kapsam: EmDash + Astro (Node/SQLite), canlı site

## Kısa durum

- Tüm ana rotalar 200 (/, /galeri, /ekipman, /medya, /iletisim, /posts, /hakkimda, /search, /rss.xml).
- TTFB: ~0.10-0.17 sn (origin). Cloudflare edge önbelleği yok.
- Görseller sharp ile boyutlandırılıyor ve diskte önbellekleniyor (w=800 -> 68 KB webp).
- pnpm typecheck temiz; konteyner sağlıklı; yedek/sağlık systemd birimleri yeni projeye bağlı.

## Bulgular (kanıtlı)

### P0 — Doğruluk, SEO ve indeksleme

1) robots.txt yanlış origin bildiriyor
- Kanıt: robots.txt icinde "Sitemap: http://localhost:4321/sitemap.xml".
- Neden: EmDash robots route'u once DB'deki settings.url degerine bakiyor; ilk kurulumda bu deger localhost olarak yazilmis. seed/seed.json'da "url" alani yok.
- Cozum: DB'de settings.url = https://ahmetenes.com yap; seed'e "url" ekle ki yeni kurulumlar dogru dogsun.
- Kabul: robots.txt dogru sitemap URL'i verir.

2) Sitemap yonlendiren URL uretiyor ve statik sayfalari listelemiyor
- Kanit: sitemap-posts.xml -> https://ahmetenes.com/posts/<slug>; fakat bu URL /<slug> adresine 308 ile yonlendiriyor. /, /galeri, /ekipman, /medya, /iletisim, /hakkimda sitemap'te hic yok.
- Neden: posts koleksiyonunda urlPattern tanimli degil; sitemap /{collection}/{slug} fallback'ini kullaniyor.
- Cozum: posts ve pages icin urlPattern "/{slug}"; statik sayfalar icin ozel sitemap girdisi.
- Kabul: sitemap yalnizca 200 donen kanonik URL'leri ve statik sayfalari icerir.

3) Bilinmeyen URL 404 yerine 302
- Kanit: /rastgele-yok -> 302 -> /404. /404 dogru sekilde 404 donuyor ancak ara adim 302.
- Cozum: catch-all [slug].astro bulunamayinca redirect yerine dogrudan 404 yaniti dondursun.
- Kabul: bilinmeyen URL tek adimda 404.

4) canonical ve og:image eksik
- Kanit: /, /posts, /galeri icin canonical=0, og:image=0; twitter:card=summary.
- Cozum: Content.astro/PersonaBio.astro'da canonical uret; varsayilan paylasim gorseli (og:image) ekle; twitter:card=summary_large_image; ana sayfaya Person + WebSite JSON-LD.
- Kabul: her sayfada canonical; sosyal paylasimda gorsel.

### P1 — Performans ve edge

5) Cloudflare edge onbellegi yok
- Kanit: tum HTML ve /api/immich yanitlarinda cf-cache-status: DYNAMIC; HTML'de Cache-Control basligi yok.
- Cozum: herkese acik sayfalara Cache-Control: public, s-maxage + stale-while-revalidate; Cloudflare Cache Rules; gorsel proxy'ye Cloudflare-CDN-Cache-Control.
- Kabul: cf-cache-status HIT; tekrar ziyaretlerde origin yuku ve TTFB duser.

6) Galeri/medya her istekte origin'e gidiyor
- Kanit: custom sayfalarda Astro.cache kullanilmiyor; loadGallery yalnizca 1 saatlik in-memory cache tutuyor.
- Cozum: sayfa seviyesinde cache ipucu ve HTTP cache; Immich cagrilarini istek disi tut.
- Kabul: sicak isteklerde DB/Immich cagrisi gorunmez.

### P2 — Guvenlik

7) CSP ve guvenlik basliklari eksik
- Kanit: yanitlarda content-security-policy yok; Permissions-Policy ve Referrer-Policy yok (eski Next sitesinde CSP vardi).
- Cozum: Astro middleware ile CSP + Permissions-Policy + Referrer-Policy; inline script'ler icin nonce/hash.
- Kabul: guvenlik tarayicisinda CSP aktif, sayfa kirilmaz.

8) Formlarda spam/rate limit yok
- Cozum: honeypot + IP hiz siniri; istege bagli Cloudflare Turnstile (EMDASH_TURNSTILE_SECRET_KEY).
- Kabul: otomatik spam gonderimleri engellenir.

### P3 — UX, erisilebilirlik, icerik, operasyon

9) Galeri alt metinleri dosya adi (ornek: DSCF1766); baslik/aciklama duzenleme yok.
- Cozum: gallery-meta.json'a baslik/aciklama/alt alanlari; admin tarafinda duzenlenebilirlik.
- Kabul: anlamli alt metin ve basliklar.

10) Lightbox odak yonetimi ve klavye deneyimi iyilestirilebilir (odak tuzagi, ESC, ok tuslari).
- Kabul: klavye ile tam kullanim.

11) Bulten operasyonu: admin gorunurluk, CSV disa aktarma ve List-Unsubscribe basligi yok.
- Cozum: abone liste ucu + CSV; gonderimde List-Unsubscribe/List-Unsubscribe-Post.
- Kabul: teslim edilebilirlik ve yonetim iyilesir.

12) Icerik hacmi dusuk (5 yazi); /now sayfasi yok.
- Cozum: icerik takvimi ve /now sayfasi.

13) Analitik yok (opsiyonel, gizlilik dostu secenek).
14) Yedek/uptime dogrulamasi: systemd birimleri yeni projeye bagli ve test edildi; periyodik dogrulama eklenebilir.

## Uygulama plani

### Faz 0 — Hizli ve dusuk riskli duzeltmeler (0.5-1 gun)
| # | Is | Dosya/komut | Kabul |
|---|----|-------------|-------|
| 0.1 | DB settings.url'i duzelt + seed'e url ekle | seed/seed.json, emdash seed --on-conflict update | robots.txt dogru |
| 0.2 | posts/pages urlPattern "/{slug}" | seed/seed.json | sitemap kanonik |
| 0.3 | 404'u dogrudan dondur | src/pages/[slug].astro | tek adim 404 |
| 0.4 | canonical + og:image + twitter card | src/layouts/Content.astro, PersonaBio.astro | her sayfada dolu meta |
| 0.5 | Statik sayfalari sitemap'e ekle | src/pages/sitemap.xml.ts (ozel) | tum sayfalar listede |

### Faz 1 — SEO ve paylasim (1 gun)
- Person/WebSite/BlogPosting JSON-LD butunlugu.
- Varsayilan OG gorseli uretimi (mevcut gorsellerden).
- iletisim/ekipman/medya/galeri icin ozel meta aciklamalari.

### Faz 2 — Performans ve edge (1-2 gun)
- Public sayfalara Cache-Control + Cloudflare Cache Rules.
- Gorsel proxy: Cloudflare-CDN-Cache-Control + immutable (zaten var) ve edge cache kurali.
- Galeri/medya sayfalarina Astro.cache ve HTTP cache.
- Font yuklemesini gozden gecir (3 aile; preload stratejisi).

### Faz 3 — Guvenlik (1 gun)
- CSP + Permissions-Policy + Referrer-Policy (Astro middleware).
- Form honeypot + rate limit; opsiyonel Turnstile.
- Admin setup tamamlandiktan sonra admin erisimini gozden gecir.

### Faz 4 — UX, erisilebilirlik, icerik (2-3 gun)
- Galeri alt/baslik/aciklama duzenleme; lightbox klavye/odak.
- Bulten admin listesi + CSV + List-Unsubscribe.
- /now sayfasi + icerik takvimi (docs/icerik-takvimi.md eski repodan uyarlanabilir).

### Faz 5 — Operasyon ve olcum (0.5 gun)
- Gizlilik dostu analitik (opsiyonel) veya ziyaret sayaci.
- Uptime/saglik ve yedek dogrulama periyodikligi.

## Oncelik ozeti
- P0 (Faz 0): robots, sitemap, 404, canonical/og. SEO ve dogruluk icin en kritik, dusuk riskli.
- P1 (Faz 2): edge cache ve cache basliklari. En yuksek performans kazanci.
- P2 (Faz 3): CSP ve form korumasi. Guvenlik hijyeni.
- P3 (Faz 4-5): UX, erisilebilirlik, icerik ve operasyon. Uzun vadeli kalite.

## Uygulama durumu (2026-09-21) — TAMAMLANDI

- Faz 0: robots/site url duzeltildi; posts/pages urlPattern "/{slug}"; bilinmeyen URL dogrudan 404; canonical + og:image + twitter:card; statik sayfalar icin ozel sitemap + robots.
- Faz 1: ana sayfaya WebSite + Person JSON-LD; markali varsayilan OG gorseli (1200x630); ozel meta aciklamalari.
- Faz 2: public HTML'e Cache-Control + Cloudflare-CDN-Cache-Control; Cloudflare Cache Rules (HTML 300s, varliklar 7 gun) ile cf-cache-status HIT; deploy sonrasi otomatik purge.
- Faz 3: CSP + Permissions-Policy + Referrer-Policy + X-Content-Type-Options/X-Frame-Options; form honeypot + IP hiz siniri.
- Faz 4: galeri alt metinleri + lightbox klavye/odak; bulten CLI (list/export) + List-Unsubscribe; /now sayfasi; icerik takvimi.
- Faz 5: gizlilik dostu analitik (beacon + CLI); healthcheck konteyner/DB/sitemap kontrolu; systemd timer dogrulamasi.

Repo: https://github.com/potasyumhidroksit/ahmetenes

## 2026-09-23 oturumu — repo dışındaki altyapı değişiklikleri

Kod değişiklikleri git geçmişinde; aşağıdakiler repoda görünmez:

- **DNS (Cloudflare, ahmetenes.com TXT/SPF):** `include:_spf.resend.com` kaldırıldı. Bu ad
  NXDOMAIN'di; SPF değerlendirmesi orada permerror ile kesiliyor, ardından gelen
  `ip4:92.5.98.67` (mx.ahmetenes.com) hiç okunmuyordu. Resend'in SPF'i zaten
  `send.ahmetenes.com`'da (`include:amazonses.com`). Yeni kayıt:
  `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com include:amazonses.com ip4:92.5.98.67 ~all`
- **logrotate:** `/etc/logrotate.d/ahmetenes` — `/var/log/ahmetenes-health.log` günlük, 14 gün.
- **Sağlık durumu:** `/var/lib/ahmetenes-health/` (son arıza imzası, sertifika uyarı günü).
- **Yedek:** `scripts/backup.sh` her yedeği `ahmetenes-crypt:ahmetenes-backup/ahmetenes-site`'a
  (rclone crypt, R2) kopyalar; `r2-offsite.sh` bu dizini almıyordu.
- **Docker:** `ahmetenes:rollback-20260922` etiketi (oturum öncesi imaj).

### Sahibin kararına kalanlar
- Yazıların gerçek yayın tarihleri (30 May, 6/13/20/27 Haz 2026) — taşımada hepsi
  21 Eylül oldu; panelden düzeltilmeli (doğrudan DB güncellemesi yapılmadı).
- Cloudflare Bot Fight Mode / JS detections: mobilde ana iş parçacığını 0.5-3 sn meşgul
  ediyor ve Lighthouse "en iyi uygulamalar"ı 81'de tutuyor; zone genelinde bir güvenlik ayarı.
- *.ahmetenes.tr kaynak sertifikaları 22 Eylül'de doldu (Cloudflare "Full" modunda maskeleniyor).
