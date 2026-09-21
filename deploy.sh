#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Ortam: önce sunucu düzeyi dosya (auto-deploy), sonra yerel .env.local
if [ -f /root/ahmetenes-personabio.env ]; then
  set -a; . /root/ahmetenes-personabio.env; set +a
elif [ -f ./.env.local ]; then
  set -a; . ./.env.local; set +a
fi

IMAGE="${IMAGE:-ahmetenes:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-ahmetenes}"
HOST_PORT="${HOST_PORT:-5193}"
DATA_DIR="${DATA_DIR:-/var/www/ahmetenes-data}"

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
  if [ "$code" = "200" ]; then echo "OK: http://127.0.0.1:${HOST_PORT}/ (HTTP $code)"; exit 0; fi
  sleep 3
done
echo "UYARI: sağlık kontrolü 200 dönmedi; konteyner loglarına bakın: docker logs ${CONTAINER_NAME}"
exit 1
