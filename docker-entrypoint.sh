#!/bin/sh
# ahmetenes.com — EmDash (Node + SQLite) container entrypoint.
# Applies schema + content seed idempotently, then starts the server.
set -e

mkdir -p /app/data

if [ -f /app/seed/seed.json ]; then
  echo "[entrypoint] applying seed (idempotent)..."
  node /app/node_modules/emdash/dist/cli/index.mjs seed /app/seed/seed.json \
    --database /app/data/data.db \
    --uploads-dir /app/data/uploads \
    --media-base-url /_emdash/api/media/file \
    || echo "[entrypoint] seed apply failed; continuing"
fi

echo "[entrypoint] starting EmDash on ${HOST}:${PORT}..."
exec node /app/dist/server/entry.mjs
