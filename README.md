# ahmetenes.com — Persona Bio (EmDash + Astro)

ahmetenes.com, [emdash-theme-persona-bio](https://github.com/ahmetcigsar/emdash-theme-persona-bio)
teması üzerine kurulu kişisel profil + blog sitesidir. EmDash CMS ile yönetilir,
Astro ile sunulur ve bu sunucuda **Node + SQLite** olarak self-host edilir.

## Stack

- **Astro 7** (`output: "server"`, `@astrojs/node` standalone)
- **EmDash CMS 0.38** — SQLite veritabanı (`data/data.db`), yerel medya depolama (`data/uploads`)
- **Persona Bio** teması — profil kartı + üç sütunlu blog okuma düzeni
- Türkçe tek dil; içerik EmDash panelinden yönetilir

## Geliştirme

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm typecheck
pnpm build
```

İlk istekte şema + içerik seed'i (`seed/seed.json`) otomatik uygulanır.
Panel: `http://localhost:4321/_emdash/admin`

## Sayfalar

- `/` profil kartı; `/posts` + `/<slug>` yazılar; `/hakkimda`
- `/galeri` — Immich "sitede" albümü: filtre çipleri, ızgara, lightbox (EXIF)
- `/ekipman` — gövde / objektif / filtre / ses / ışık / aksesuar listesi
- `/medya` — Pulse "şu an çalıyor" kartı + Sinedexter film/dizi/bölüm istatistikleri
- `/iletisim` — iletişim formu (Resend) + bülten kaydı (double opt-in)

## İçerik ve servis entegrasyonları

- `seed/seed.json` — koleksiyonlar, menüler, taksonomiler, sayfalar ve yazılar.
  İçerik, mevcut Next.js blog yazılarından `scripts/migrate-content.mjs` ile üretilir.
- Blog görselleri `public/blog/<slug>/` altında. Yeni görsel ekledikten sonra `pnpm optimize-images`
  çalıştır: 640/960/1280px varyantları, kapaklar için 1200×630 JPEG paylaşım görseli (`cover-og.jpg`,
  og:image) ve `src/data/image-manifest.json` üretilir; kartlar, yazı
  kapağı ve gövde görselleri bunlarla `srcset` + gerçek boyutla sunulur (manifestte olmayan görseller
  EmDash'in varsayılan `Image` bileşenine düşer).
- **Galeri:** Immich `/timeline` API'si; görseller `/api/immich/<kind>/<id>?w=` proxy'sinden akar
  (API anahtarı sunucuda kalır, sharp ile boyutlandırılır, `IMG_CACHE_DIR` altında önbelleklenir).
- **Medya:** Pulse (`/api/pulse` same-origin proxy) + Sinedexter `/api/stats`.
- **İletişim/Bülten:** Resend; aboneler `data/newsletter.json` (double opt-in, HMAC imzalı token).
- Bülten: `pnpm newsletter list` (aboneler), `pnpm newsletter export [dosya.csv]` (CSV), `pnpm send-newsletter "Başlık" "slug" ["özet"]` (gönderim, `List-Unsubscribe` başlıklı).
- Analitik (gizlilik dostu; IP/çerez saklanmaz): `pnpm analytics [gün]`
- Yeni yazı yayınladıktan sonra: `pnpm announce <slug>` (RSS'ten başlık/özet, IndexNow, bülten önizlemesi);
  bülteni de göndermek için `pnpm announce <slug> --send`. Göndermeden e-postayı görmek için:
  `NEWSLETTER_PREVIEW=/tmp/bulten.html pnpm send-newsletter "Başlık" "slug" "özet" "kapak.jpg"`.
- IndexNow (Bing/Yandex hızlı indeksleme): yeni yazıdan sonra `pnpm indexnow /slug`; tümü için `pnpm indexnow`
  (sitemap'ten). Anahtar `public/<anahtar>.txt`.
- Performans & güvenlik: public HTML için edge cache (`Cache-Control` + Cloudflare Cache Rules, deploy'da purge), CSP ve güvenlik başlıkları, form honeypot + IP hız sınırı.

## Dağıtım (VPS)

```bash
bash deploy.sh    # imaj derler, konteyneri 127.0.0.1:5193'te yeniden başlatır
```

- Konteyner: `ahmetenes` (imaj `ahmetenes:latest`), arkasında Cloudflare proxy.
- Kalıcı veri: `/var/www/ahmetenes-data` (SQLite `data.db`, `uploads/`, `newsletter.json`, `imgcache/`) → konteynerde `/app/data`.
- Gizli anahtarlar: `/root/ahmetenes-emdash.env` (git dışı).
- Ortam değişkenleri: `EMDASH_SITE_URL`, `SITE_URL`, `EMDASH_ENCRYPTION_KEY`, `EMDASH_AUTH_SECRET`,
  `EMDASH_IP_SALT`, `EMDASH_ALLOWED_ORIGINS`, `IMMICH_URL`, `IMMICH_API_KEY`, `RESEND_API_KEY`,
  `RESEND_FROM`, `CONTACT_TO`, `DATA_DIR`, `IMG_CACHE_DIR`.

Konteyner açılışta `docker-entrypoint.sh` ile seed'i idempotent uygular, sonra sunucuyu başlatır.

## Eski site

Önceki Next.js sürümü `/var/www/deneme/projeler/ahmetenes-nextjs-archive` altında rollback için korunur.
`/blog/*`, `/now` ve `/admin` yolları yeni rotalara 301 ile yönlendirilir.
