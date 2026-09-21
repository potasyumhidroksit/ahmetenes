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

## İçerik

- `seed/seed.json` — koleksiyonlar, menüler, taksonomiler, sayfalar ve yazılar.
  İçerik, mevcut Next.js blog yazılarından `scripts/migrate-content.mjs` ile üretilir.
- Blog görselleri `public/blog/<slug>/` altında; albüm/gallery için EmDash medya kütüphanesi kullanılır.

## Dağıtım (VPS)

```bash
bash deploy.sh    # imaj derler, konteyneri 127.0.0.1:5193'te yeniden başlatır
```

- Konteyner: `ahmetenes` (imaj `ahmetenes:latest`), arkasında Cloudflare proxy.
- Kalıcı veri: `/var/www/ahmetenes-data` → konteynerde `/app/data`.
- Gizli anahtarlar: `/root/ahmetenes-emdash.env` (git dışı).
- Ortam değişkenleri: `EMDASH_SITE_URL`, `SITE_URL`, `DATABASE_URL`, `MEDIA_DIR`,
  `EMDASH_ENCRYPTION_KEY`, `EMDASH_AUTH_SECRET`, `EMDASH_IP_SALT`.

Konteyner açılışta `docker-entrypoint.sh` ile seed'i idempotent uygular, sonra sunucuyu başlatır.

## Eski site

Önceki Next.js sürümü `/var/www/deneme/projeler/ahmetenes-nextjs-archive` altında rollback için korunur.
`/blog/*`, `/now` ve `/admin` yolları yeni rotalara 301 ile yönlendirilir.
