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

> Yerelde canlı `.env`'i kullanıyorsan `RESEND_API_KEY`, `RESEND_FROM` ve `CONTACT_TO`'yu
> **unset** et: aksi halde iletişim/bülten testleri gerçek e-posta gönderir.

## Sayfalar

- `/` profil kartı; `/posts` + `/<slug>` yazılar (karelerin altında EXIF + "Galeride aç");
  `/hakkimda`, `/now` (panelden düzenlenen sayfalar)
- `/galeri` — Immich "sitede" albümü: filtre çipleri (kare sayılı), sütun ızgara, lightbox
  (EXIF, hikâye, kaydırma, "Yazıda: …"); açık karede adres `/galeri/<id>` olur, eski
  `/galeri#kare-<id>` bağlantıları da kareyi açar
- `/galeri/<id>` — tek kare sayfası: kareye özel paylaşım görseli, EXIF/konum/hikâye, önceki/sonraki,
  ImageObject + BreadcrumbList; yazılardaki "Galeride aç" ve ekipman küçük resimleri buraya gider
- `/ekipman` — gövde / objektif / filtre / ses / ışık / aksesuar; gövde ve objektiflerin
  yanında EXIF'e göre onlarla çekilmiş kareler
- `/medya` — Pulse "şu an çalıyor / son dinlenen" + Sinedexter film/dizi/bölüm istatistikleri
- `/iletisim` — iletişim formu (Resend) + bülten kaydı (double opt-in); JS'siz de çalışır
- `/gizlilik` — KVKK bilgilendirmesi; sitenin gerçek veri işleyişini anlatır. Veri akışı değişirse
  (yeni form, üçüncü taraf, saklama süresi) bu sayfayı ve içindeki tarihi güncelle
- `/search` — Türkçe katlamalı arama (ışık = isik), noindex
- `/istatistik` — yalnızca panelde oturum açmış yönetici (diğerlerine 404); ziyaretler, en çok
  görüntülenenler ve **kırık bağlantılar** (404'e düşen yollar + geldikleri site; "site içi" olanlar düzeltilmeli)

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
  Vekil yalnızca albümdeki kareleri, `preview`/`thumbnail` türlerini ve 240/480/640/800/1200/1600
  genişliklerini sunar; `?fmt=og` 1200×630 JPEG paylaşım görseli. Başlık/kategori/hikâye:
  `/var/www/ahmetenes-data/gallery-meta.json`. Yazı görseli ↔ galeri karesi eşlemesi:
  `src/data/blog-image-sources.json`.
- **Medya:** Pulse (`/api/pulse` same-origin proxy; albüm kapağı `/api/pulse/art/<id>` ile siteden,
  128px WebP) + Sinedexter `/api/stats`. Sayfalar Cloudflare dışında üçüncü tarafa bağlanmaz.
- **İletişim/Bülten:** Resend; aboneler `data/newsletter.json` (double opt-in, HMAC imzalı token).
- Bülten: `pnpm newsletter list` (aboneler), `pnpm newsletter export [dosya.csv]` (CSV), `pnpm send-newsletter "Başlık" "slug" ["özet"]` (gönderim, `List-Unsubscribe` başlıklı).
- Analitik (gizlilik dostu; IP/çerez saklanmaz): panelde oturum açıkken https://ahmetenes.com/istatistik
  (yalnızca yönetici; diğerlerine 404) ya da sunucuda `pnpm analytics [gün]`
- Yeni yazı yayınladıktan sonra: `pnpm announce <slug>` (RSS'ten başlık/özet, IndexNow, bülten önizlemesi);
  bülteni de göndermek için `pnpm announce <slug> --send`. Göndermeden e-postayı görmek için:
  `NEWSLETTER_PREVIEW=/tmp/bulten.html pnpm send-newsletter "Başlık" "slug" "özet" "kapak.jpg"`.
- IndexNow (Bing/Yandex hızlı indeksleme): panelde bir yazı/sayfa **yayınlanınca ya da yayından kalkınca
  otomatik** bildirilir (`src/plugins/publish-ping.ts`, yalnızca canlıda; `docker logs ahmetenes | grep publish-ping`).
  Elle: `pnpm indexnow /slug`; tümü için `pnpm indexnow` (sitemap'ten). Anahtar `public/<anahtar>.txt`.
- Performans & güvenlik: public HTML için edge cache (`Cache-Control` + Cloudflare Cache Rules, deploy'da purge), CSP ve güvenlik başlıkları, form honeypot + IP hız sınırı.

## Dağıtım (VPS)

```bash
bash deploy.sh    # imaj derler, konteyneri 127.0.0.1:5193'te yeniden başlatır
```

`deploy.sh` sırasıyla: sağlık kontrolüne "dağıtım sürüyor" bayrağı koyar; önceki imajın hash'li
`/_astro` varlıklarını yeni imaja taşır (edge'de kalmış eski HTML stilsiz kalmasın, 14 gün);
imajı derler ve konteyneri değiştirir; `/` 200 olunca Cloudflare'de yalnızca ahmetenes.com
host'larını iki turda (20 sn arayla) temizler, sitemap'teki sayfaları ısıtır (katmanlı önbellekte
purge nesneyi yalnızca "süresi dolmuş" işaretler; ısıtılmazsa ilk ziyaretçi eski HTML'i görür) ve
galeri görsel önbelleğini arka planda ısıtır.
Geri almak için: `git revert <commit>` + `bash deploy.sh`.

- Konteyner: `ahmetenes` (imaj `ahmetenes:latest`), arkasında Cloudflare proxy.
- Kalıcı veri: `/var/www/ahmetenes-data` (SQLite `data.db`, `uploads/`, `newsletter.json`, `imgcache/`) → konteynerde `/app/data`.
- Gizli anahtarlar: `/root/ahmetenes-emdash.env` (git dışı).
- Ortam değişkenleri: `EMDASH_SITE_URL`, `SITE_URL`, `EMDASH_ENCRYPTION_KEY`, `EMDASH_AUTH_SECRET`,
  `EMDASH_IP_SALT`, `EMDASH_ALLOWED_ORIGINS`, `IMMICH_URL`, `IMMICH_API_KEY`, `RESEND_API_KEY`,
  `RESEND_FROM`, `CONTACT_TO`, `DATA_DIR`, `IMG_CACHE_DIR`.

Konteyner açılışta `docker-entrypoint.sh` ile seed'i idempotent uygular, sonra sunucuyu başlatır.

## Operasyon

- **Sağlık kontrolü** (`ahmetenes-health.timer`, 5 dk; `scripts/healthcheck.sh`): konteyner, ana sayfa,
  hash'li CSS'ler (stilsiz sayfa), galeride en az bir kare, RSS XML, sitemap, Sinedexter/Immich/Pulse.
  ntfy (`ahmetenes-alerts`) yalnızca durum değişince + süren arızada saatte bir; düzelince "düzeldi".
  Sertifika uyarısı günde bir, tek mesaj. Günlük: `/var/log/ahmetenes-health.log` (logrotate 14 gün).
- **Yedek** (`ahmetenes-backup.timer`, 04:00; `scripts/backup.sh`): SQLite `.backup` (tutarlı anlık
  görüntü) + `integrity_check`, medya/bülten/galeri künyesi, env, git bundle. Yerelde 14, şifreli R2'de
  (`ahmetenes-crypt:ahmetenes-backup/ahmetenes-site`) 30 gün. Hata → ntfy + systemd failed.
- **Önbellek:** anonim HTML edge'de 5 dk (+SWR); oturum/önizleme/düzenleme istekleri ve
  `/istatistik` hiçbir katmanda saklanmaz; 404'ler 60 sn; bot yoklamaları render'sız 404 (1 sa).

## Eski site

Önceki Next.js sürümü `/var/www/deneme/projeler/ahmetenes-nextjs-archive` altında rollback için korunur.
`/blog/*`, `/now` ve `/admin` yolları yeni rotalara 301 ile yönlendirilir.
