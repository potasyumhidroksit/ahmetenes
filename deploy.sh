#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Saglik kontrolu dagitim sirasinda (konteyner yeniden baslarken) alarm vermesin.
DEPLOY_FLAG=/var/tmp/ahmetenes-deploying
touch "$DEPLOY_FLAG"
trap 'rm -f "$DEPLOY_FLAG"' EXIT

# Ortam: önce sunucu düzeyi dosya (auto-deploy), sonra yerel .env.local
if [ -f /root/ahmetenes-emdash.env ]; then
  set -a; . /root/ahmetenes-emdash.env; set +a
elif [ -f ./.env.local ]; then
  set -a; . ./.env.local; set +a
fi

IMAGE="${IMAGE:-ahmetenes:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-ahmetenes}"
HOST_PORT="${HOST_PORT:-5193}"
DATA_DIR="${DATA_DIR:-/var/www/ahmetenes-data}"

# Onceki imajin hash'li varliklarini yeni imaja tasi (14 gunden eskiler hariç).
# Cloudflare (Cache Reserve/tiered) ya da acik sekmelerde kalan eski HTML'in
# referans verdigi CSS/JS 404 olmasin; aksi halde sayfa stilsiz gorunur.
PREV_ASSETS=".deploy/prev-assets"
find "$PREV_ASSETS" -mindepth 1 ! -name .gitkeep -delete 2>/dev/null || true
mkdir -p "$PREV_ASSETS"
if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  prev_cid=$(docker create "$IMAGE")
  docker cp "$prev_cid:/app/dist/client/_astro/." "$PREV_ASSETS/" 2>/dev/null || true
  docker rm "$prev_cid" >/dev/null
  find "$PREV_ASSETS" -type f ! -name .gitkeep -mtime +14 -delete
  echo "→ Önceki sürümden $(find "$PREV_ASSETS" -type f ! -name .gitkeep | wc -l) varlık taşınıyor."
fi

echo "→ Docker imajı derleniyor ($IMAGE)..."
docker build -t "$IMAGE" .

echo "→ Veri dizini hazırlanıyor ($DATA_DIR)..."
mkdir -p "$DATA_DIR"
chown -R 1001:1001 "$DATA_DIR" || true

echo "→ Konteyner yeniden oluşturuluyor ($CONTAINER_NAME :$HOST_PORT)..."
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:4321" \
  --log-opt max-file=3 --log-opt max-size=10m \
  -v "${DATA_DIR}:/app/data" \
  -e EMDASH_SITE_URL="${EMDASH_SITE_URL:-https://ahmetenes.com}" \
  -e SITE_URL="${SITE_URL:-https://ahmetenes.com}" \
  -e DATABASE_URL="file:./data/data.db" \
  -e MEDIA_DIR="./data/uploads" \
  -e IMMICH_URL \
  -e IMMICH_API_KEY \
  -e RESEND_API_KEY \
  -e RESEND_FROM \
  -e CONTACT_TO \
  -e DATA_DIR=/app/data \
  -e IMG_CACHE_DIR=/app/data/imgcache \
  -e EMDASH_ENCRYPTION_KEY \
  -e EMDASH_AUTH_SECRET \
  -e EMDASH_IP_SALT \
  -e EMDASH_ALLOWED_ORIGINS \
  "$IMAGE"

sleep 4
docker ps --format "{{.Names}} {{.Status}} {{.Ports}}" | grep "$CONTAINER_NAME"

echo "→ Sağlık kontrolü..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:${HOST_PORT}/" || true)
  if [ "$code" = "200" ]; then
    echo "OK: http://127.0.0.1:${HOST_PORT}/ (HTTP $code)"
    # Galeri gorsel onbellegini arka planda isit: yeni genislikler ilk
    # ziyaretcide Immich'ten cekilip yeniden boyutlandiriliyordu (yavas LCP).
    ( for id in $(curl -s "http://127.0.0.1:${HOST_PORT}/galeri" | grep -oE 'id="kare-[0-9a-f-]{36}"' | sed 's/id="kare-//;s/"//' | sort -u); do
        for q in w=240 w=480 w=640 w=800 w=1200 w=1600 fmt=og; do
          curl -s -o /dev/null --max-time 30 "http://127.0.0.1:${HOST_PORT}/api/immich/preview/$id?$q"
        done
      done ) >/dev/null 2>&1 &
    # Cloudflare: temizle + isit (scripts/cdn-refresh.sh).
    bash scripts/cdn-refresh.sh || true
    exit 0
  fi
  sleep 3
done
echo "UYARI: sağlık kontrolü 200 dönmedi; konteyner loglarına bakın: docker logs ${CONTAINER_NAME}"
exit 1
