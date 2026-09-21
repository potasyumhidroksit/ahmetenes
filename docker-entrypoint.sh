#!/bin/sh
# ahmetenes.com — EmDash (Node + SQLite) container entrypoint.
# Applies schema + content seed idempotently, then starts the server.
set -e

mkdir -p /app/data

if [ -f /app/seed/seed.json ]; then
  SEED="node /app/node_modules/emdash/dist/cli/index.mjs seed /app/seed/seed.json --database /app/data/data.db --uploads-dir /app/data/uploads --media-base-url /_emdash/api/media/file"
  # 1) Yapi + ayarlar + menuler + yonlendirmeler her deploy'da guncel kalsin
  #    (--no-content: icerik/bylines/terimler atlanir, admin duzenlemeleri ezilmez).
  echo "[entrypoint] syncing schema/settings/menus (no content overwrite)..."
  $SEED --no-content --on-conflict update || echo "[entrypoint] structure sync failed; continuing"
  # 2) Icerik yalnizca eksikse olusturulur (mevcut kayitlar atlanir).
  echo "[entrypoint] applying content seed (skip existing)..."
  $SEED --on-conflict skip || echo "[entrypoint] content seed failed; continuing"
fi

echo "[entrypoint] starting EmDash on ${HOST}:${PORT}..."
exec node /app/dist/server/entry.mjs
