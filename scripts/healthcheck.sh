#!/usr/bin/env bash
set -uo pipefail
# Sağlık kontrolü: site + bağımlı servisler; arıza olursa ntfy'e bildir.
LOG="/var/log/ahmetenes-health.log"
NTFY="https://ntfy.ahmetenes.tr/ahmetenes-alerts"

now() { date -Iseconds; }
http_code() { curl -s -o /dev/null -w "%{http_code}" --max-time 12 "$1" 2>/dev/null; }

failed=""
# Yerel konteyner + veri kontrolu
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^ahmetenes$'; then
  failed="$failed ahmetenes-konteyner"
fi
[ -f /var/www/ahmetenes-data/data.db ] || failed="$failed data.db"
for entry in \
  "https://ahmetenes.com/|ahmetenes" \
  "https://ahmetenes.com/sitemap-static.xml|sitemap" \
  "https://sinedexter.ahmetenes.com/api/stats|sinedexter" \
  "https://foto.ahmetenes.tr/api/server/ping|immich" \
  "https://s.ahmetenes.com/api/status|pulse"; do
  url=${entry%|*}
  name=${entry#*|}
  code=$(http_code "$url")
  if [ "$code" != "200" ]; then
    failed="$failed $name($code)"
  fi
done

ts=$(now)
if [ -n "$failed" ]; then
  echo "[$ts] ARZA:$failed" >> "$LOG"
  curl -s -d "ahmetenes kesinti:$failed — $(date '+%d.%m %H:%M')" "$NTFY" >/dev/null 2>&1 || true
else
  echo "[$ts] tamam" >> "$LOG"
fi

# Sertifika bitiş izleme (yerel letsencrypt zincirleri; 48s içinde → uyar)
for cert in /etc/letsencrypt/live/*/fullchain.pem; do
  [ -f "$cert" ] || continue
  if ! openssl x509 -checkend 172800 -noout -in "$cert" >/dev/null 2>&1; then
    echo "[$ts] SERTIFIKA BITIYOR: $cert" >> "$LOG"
    curl -s -d "Sertifika bitiyor: $cert" "$NTFY" >/dev/null 2>&1 || true
  fi
done
