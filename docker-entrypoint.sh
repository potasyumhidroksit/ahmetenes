#!/bin/sh
# ahmetenes.com — EmDash (Node + SQLite) container entrypoint.
# Applies schema + content seed idempotently, then starts the server.
set -e

mkdir -p /app/data
# Kuatorlu galeri kunyesi: kalici veri dizininde yoksa imajdaki kopyadan olustur.
if [ ! -f /app/data/gallery-meta.json ] && [ -f /app/src/data/gallery-meta.json ]; then
  cp /app/src/data/gallery-meta.json /app/data/gallery-meta.json
fi

if [ -f /app/seed/seed.json ]; then
  SEED="node /app/node_modules/emdash/dist/cli/index.mjs seed /app/seed/seed.json --database /app/data/data.db --uploads-dir /app/data/uploads --media-base-url /_emdash/api/media/file"
  # 1) Yapi + ayarlar + menuler + yonlendirmeler her deploy'da guncel kalsin.
  #    DIKKAT: bu EmDash surumunde `--no-content` beklendigi gibi calismiyor
  #    (cac `--no-x` ifadesini x=false olarak cozumler). Bu yuzden content
  #    anahtarini cikarip uygulariz; boylece admin'de duzenlenen icerik ezilmez.
  echo "[entrypoint] syncing schema/settings/menus (content stripped)..."
  node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('/app/seed/seed.json','utf8'));delete s.content;fs.writeFileSync('/tmp/seed-structure.json',JSON.stringify(s));"
  node /app/node_modules/emdash/dist/cli/index.mjs seed /tmp/seed-structure.json --database /app/data/data.db --uploads-dir /app/data/uploads --media-base-url /_emdash/api/media/file --on-conflict update || echo "[entrypoint] structure sync failed; continuing"
  # 2) Icerik yalnizca eksikse olusturulur (mevcut kayitlar atlanir).
  echo "[entrypoint] applying content seed (skip existing)..."
  $SEED --on-conflict skip || echo "[entrypoint] content seed failed; continuing"
fi

echo "[entrypoint] starting EmDash on ${HOST}:${PORT}..."
exec node /app/dist/server/entry.mjs
