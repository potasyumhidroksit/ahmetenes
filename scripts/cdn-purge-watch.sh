#!/usr/bin/env bash
# ahmetenes-cdn-purge.service: panelde icerik degisince (istek dosyasi
# guncellenince) Cloudflare'i temizler. Art arda kayitlar tek turda toplanir;
# calisirken yeni istek gelirse bir tur daha doner.
set -u
REQ=/var/www/ahmetenes-data/cdn-purge-request
cd "$(dirname "$0")/.."
last=""
for _ in 1 2 3 4 5; do
  sleep 5
  now=$(stat -c %y "$REQ" 2>/dev/null || true)
  [ -n "$now" ] && [ "$now" != "$last" ] || break
  last=$now
  echo "istek: $(tail -n1 "$REQ" 2>/dev/null)"
  bash scripts/cdn-refresh.sh
done
