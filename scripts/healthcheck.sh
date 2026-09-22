#!/usr/bin/env bash
set -uo pipefail
# Sağlık kontrolü: site + bağımlı servisler; arıza olursa ntfy'e bildir.
# Bildirimler durum değişince gider (yeni arıza, arıza değişti, düzeldi) ve
# süren arıza için saatte bir hatırlatılır; sertifika uyarısı günde bir,
# tek mesaj. Önceden her 5 dakikada her sertifika için ayrı bildirim gidiyordu.
LOG="${HEALTH_LOG:-/var/log/ahmetenes-health.log}"
NTFY="${NTFY_URL:-https://ntfy.ahmetenes.tr/ahmetenes-alerts}"
STATE="${STATE_DIR:-/var/lib/ahmetenes-health}"
SITE="${HEALTH_SITE:-https://ahmetenes.com}"
DEPLOY_FLAG="/var/tmp/ahmetenes-deploying"
REMIND_SECS=3600

mkdir -p "$STATE"
now() { date -Iseconds; }
epoch() { date +%s; }
notify() { curl -s -d "$1" "$NTFY" >/dev/null 2>&1 || true; }
http_code() { curl -s -o /dev/null -w "%{http_code}" --max-time 12 "$1" 2>/dev/null; }
ts=$(now)

failed=""
fail() { failed="$failed $1"; }

# Dağıtım sürüyorsa (deploy.sh bayrağı, 10 dk'dan yeni) konteyner/site
# kontrollerini atla: yeniden başlatma anı yanlış alarm üretiyordu.
deploying=0
if [ -f "$DEPLOY_FLAG" ] && [ $(( $(epoch) - $(stat -c %Y "$DEPLOY_FLAG") )) -lt 600 ]; then
  deploying=1
fi

if [ "$deploying" = 0 ]; then
  docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^ahmetenes$' || fail "ahmetenes-konteyner"
  [ -f /var/www/ahmetenes-data/data.db ] || fail "data.db"

  home=$(curl -s --max-time 12 -w '\n%{http_code}' "$SITE/" 2>/dev/null || true)
  home_code=${home##*$'\n'}
  home=${home%$'\n'*}
  if [ "$home_code" != "200" ]; then
    fail "ahmetenes($home_code)"
  else
    # Stilsiz sayfa: HTML'in referans verdiği hash'li CSS'ler erişilebilir mi?
    for css in $(printf '%s' "$home" | grep -oE '/_astro/[^"]+\.css' | sort -u | head -5); do
      code=$(http_code "$SITE$css")
      [ "$code" = "200" ] || fail "css($code $css)"
    done
  fi
  # Galeri: Immich anahtarı/erişimi bozulursa kareler kaybolur.
  galeri=$(curl -s --max-time 20 "$SITE/galeri" 2>/dev/null | grep -c 'data-gallery-item' || true)
  [ "${galeri:-0}" -ge 1 ] || fail "galeri(0 kare)"
  # RSS geçerli XML mi?
  curl -s --max-time 12 "$SITE/rss.xml" 2>/dev/null \
    | python3 -c "import sys,xml.dom.minidom; xml.dom.minidom.parseString(sys.stdin.buffer.read())" 2>/dev/null \
    || fail "rss(xml)"
fi

for entry in \
  "$SITE/sitemap-static.xml|sitemap" \
  "https://sinedexter.ahmetenes.com/api/stats|sinedexter" \
  "https://foto.ahmetenes.tr/api/server/ping|immich" \
  "https://s.ahmetenes.com/api/status|pulse"; do
  url=${entry%|*}
  name=${entry#*|}
  code=$(http_code "$url")
  [ "$code" = "200" ] || fail "$name($code)"
done

failed=${failed# }
last_sig=$(cat "$STATE/last-failure" 2>/dev/null || true)
last_at=$(cat "$STATE/last-alert-at" 2>/dev/null || echo 0)
if [ -n "$failed" ]; then
  echo "[$ts] ARIZA: $failed" >> "$LOG"
  if [ "$failed" != "$last_sig" ] || [ $(( $(epoch) - last_at )) -ge $REMIND_SECS ]; then
    notify "ahmetenes kesinti: $failed — $(date '+%d.%m %H:%M')"
    epoch > "$STATE/last-alert-at"
  fi
  printf '%s' "$failed" > "$STATE/last-failure"
else
  if [ "$deploying" = 1 ]; then
    echo "[$ts] tamam (dağıtım sürüyor; site kontrolleri atlandı)" >> "$LOG"
  else
    echo "[$ts] tamam" >> "$LOG"
    if [ -n "$last_sig" ]; then
      notify "ahmetenes düzeldi ✓ (önceki: $last_sig) — $(date '+%d.%m %H:%M')"
      rm -f "$STATE/last-failure" "$STATE/last-alert-at"
    fi
  fi
fi

# Sertifika bitiş izleme (yerel letsencrypt; 48 saat içinde -> uyar). Günde
# bir, tüm liste tek mesajda; liste değişirse hemen.
expiring=""
for cert in /etc/letsencrypt/live/*/fullchain.pem; do
  [ -f "$cert" ] || continue
  if ! openssl x509 -checkend 172800 -noout -in "$cert" >/dev/null 2>&1; then
    expiring="$expiring $(basename "$(dirname "$cert")")"
  fi
done
expiring=${expiring# }
if [ -n "$expiring" ]; then
  today=$(date +%F)
  sig="$today $expiring"
  if [ "$sig" != "$(cat "$STATE/cert-alert" 2>/dev/null || true)" ]; then
    count=$(printf '%s\n' $expiring | wc -l)
    echo "[$ts] SERTIFIKA BITIYOR ($count): $expiring" >> "$LOG"
    notify "Sertifika süresi doluyor/doldu ($count): $expiring"
    printf '%s' "$sig" > "$STATE/cert-alert"
  fi
fi
