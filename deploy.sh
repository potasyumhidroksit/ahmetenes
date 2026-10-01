#!/usr/bin/env bash
# ahmetenes.com (Astro apex) yayını — fidelios ship'e alınana kadar ship'in temel güvenceleriyle (2026-10-01 v2):
#   - derleme ÇALIŞMA AĞACINDAN değil HEAD commit'inin temiz kopyasından (git archive); commit'lenmemiş değişiklik yayınlanmaz
#   - host.lock (paylaşımlı): otomatik apt yükseltmesi / reboot süren yayını bekler; aynı anda tek ahmetenes yayını
#   - imaj ahmetenes:<kısa-sha> + org.opencontainers.image.revision etiketi; ÇALIŞAN imaj ahmetenes:rollback olarak
#     etiketlenir (etiketsiz kalan imajı containerd hemen siler, gece prune'u da siler — etiketli olan kalır)
#   - sağlık kontrolü başarısızsa önceki imaja otomatik dönülür ve o da doğrulanır; sonuç ntfy'a bildirilir
# Kullanım: bash deploy.sh             # HEAD'i yayınla
#           bash deploy.sh --dry-run   # yalnız derle (canlıya dokunmaz)
#           bash deploy.sh --rollback  # ahmetenes:rollback imajına dön (tekrar çalıştırmak ileri döndürür)
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-}"
case "$MODE" in ""|--dry-run|--rollback) ;; *) echo "bilinmeyen argüman: $MODE (--dry-run | --rollback)" >&2; exit 2;; esac

exec 9>/opt/fidelios/locks/host.lock
flock -s -w 1800 9 || { echo "HATA: host.lock 30 dk boşalmadı (apt/reboot?)" >&2; exit 1; }
exec 8>/run/lock/ahmetenes-deploy.lock
flock -n 8 || { echo "HATA: başka bir ahmetenes yayını sürüyor" >&2; exit 1; }

# Ortam: önce sunucu düzeyi dosya (auto-deploy), sonra yerel .env.local
if [ -f /root/ahmetenes-emdash.env ]; then
  set -a; . /root/ahmetenes-emdash.env; set +a
elif [ -f ./.env.local ]; then
  set -a; . ./.env.local; set +a
fi

CONTAINER_NAME="${CONTAINER_NAME:-ahmetenes}"
HOST_PORT="${HOST_PORT:-5193}"
DATA_DIR="${DATA_DIR:-/var/www/ahmetenes-data}"
notify() { [ -x /usr/local/sbin/notify ] && /usr/local/sbin/notify "$@" >/dev/null 2>&1 || true; }

run_container() { # $1 = imaj
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
    -p "127.0.0.1:${HOST_PORT}:4321" \
    --log-opt max-file=3 --log-opt max-size=10m \
    --label com.centurylinklabs.watchtower.enable=false \
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
    "$1" >/dev/null
}

healthy() { # 60 sn içinde / 200 ve konteyner yeniden başlamamış
  for _ in $(seq 1 20); do
    sleep 3
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:${HOST_PORT}/" || true)
    restarts=$(docker inspect -f '{{.RestartCount}}' "$CONTAINER_NAME" 2>/dev/null || echo 99)
    [ "$code" = "200" ] && [ "$restarts" = "0" ] && return 0
  done
  return 1
}

# Saglik kontrolu (scripts/healthcheck.sh) dagitim sirasinda alarm vermesin.
DEPLOY_FLAG=/var/tmp/ahmetenes-deploying
SRC=$(mktemp -d /var/tmp/ahmetenes-src.XXXXXX)
trap 'rm -f "$DEPLOY_FLAG"; rm -rf "$SRC"' EXIT

CUR=$(docker inspect -f '{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)

if [ "$MODE" = "--rollback" ]; then
  RB=$(docker image inspect -f '{{.Id}}' ahmetenes:rollback 2>/dev/null) || { echo "HATA: ahmetenes:rollback yok" >&2; exit 1; }
  [ "$RB" != "$CUR" ] || { echo "HATA: rollback imajı zaten çalışıyor" >&2; exit 1; }
  touch "$DEPLOY_FLAG"
  run_container "$RB"
  if healthy; then
    [ -n "$CUR" ] && docker tag "$CUR" ahmetenes:rollback   # tekrar --rollback = ileri dön
    docker tag "$RB" ahmetenes:latest
    echo "OK: geri alındı ($(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$RB" | cut -c1-7))"
    notify "ahmetenes geri alındı" "rollback imajına dönüldü" warning; exit 0
  fi
  echo "HATA: rollback imajı sağlıksız — çalışan sürüme dönülüyor" >&2
  [ -n "$CUR" ] && run_container "$CUR" && healthy && exit 1
  notify "KESİNTİ RİSKİ: ahmetenes" "geri alma ve dönüş sağlıksız; elle bak: docker logs $CONTAINER_NAME" critical; exit 1
fi

SHA=$(git rev-parse HEAD); SHORT=${SHA:0:7}
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "UYARI: commit'lenmemiş değişiklikler YAYINLANMAZ (yalnız HEAD $SHORT derlenir):"; git status --short --untracked-files=no
fi
git archive HEAD | tar -x -C "$SRC"

# Onceki imajin hash'li varliklarini yeni imaja tasi (14 gunden eskiler hariç).
# Cloudflare (Cache Reserve/tiered) ya da acik sekmelerde kalan eski HTML'in
# referans verdigi CSS/JS 404 olmasin; aksi halde sayfa stilsiz gorunur.
PREV_ASSETS="$SRC/.deploy/prev-assets"
mkdir -p "$PREV_ASSETS"
if [ -n "$CUR" ]; then
  prev_cid=$(docker create "$CUR")
  docker cp "$prev_cid:/app/dist/client/_astro/." "$PREV_ASSETS/" 2>/dev/null || true
  docker rm "$prev_cid" >/dev/null
  find "$PREV_ASSETS" -type f ! -name .gitkeep -mtime +14 -delete
  echo "→ Önceki sürümden $(find "$PREV_ASSETS" -type f ! -name .gitkeep | wc -l) varlık taşınıyor."
fi

echo "→ Docker imajı derleniyor (ahmetenes:$SHORT, HEAD temiz kopyası)..."
docker build -t "ahmetenes:$SHORT" --label "org.opencontainers.image.revision=$SHA" "$SRC"
if [ "$MODE" = "--dry-run" ]; then echo "OK (--dry-run): ahmetenes:$SHORT derlendi; canlıya dokunulmadı."; exit 0; fi

touch "$DEPLOY_FLAG"
echo "→ Veri dizini hazırlanıyor ($DATA_DIR)..."
mkdir -p "$DATA_DIR"
chown -R 1001:1001 "$DATA_DIR" || true

[ -n "$CUR" ] && docker tag "$CUR" ahmetenes:rollback
echo "→ Konteyner yeniden oluşturuluyor ($CONTAINER_NAME :$HOST_PORT)..."
run_container "ahmetenes:$SHORT"

echo "→ Sağlık kontrolü..."
if healthy; then
  docker tag "ahmetenes:$SHORT" ahmetenes:latest
  echo "OK: http://127.0.0.1:${HOST_PORT}/ ($SHORT)"
  # Galeri gorsel onbellegini arka planda isit: yeni genislikler ilk
  # ziyaretcide Immich'ten cekilip yeniden boyutlandiriliyordu (yavas LCP).
  ( for id in $(curl -s "http://127.0.0.1:${HOST_PORT}/galeri" | grep -oE 'id="kare-[0-9a-f-]{36}"' | sed 's/id="kare-//;s/"//' | sort -u); do
      for q in w=240 w=480 w=640 w=800 w=1200 w=1600 fmt=og; do
        curl -s -o /dev/null --max-time 30 "http://127.0.0.1:${HOST_PORT}/api/immich/preview/$id?$q"
      done
    done ) >/dev/null 2>&1 &
  # Cloudflare: temizle + isit (scripts/cdn-refresh.sh).
  bash scripts/cdn-refresh.sh || true
  # Eski sha etiketleri: en yeni 3 kalsın (rollback/latest ayrı etiketler)
  docker images ahmetenes --format '{{.CreatedAt}}|{{.Tag}}' | sort -r | cut -d'|' -f2 | grep -E '^[0-9a-f]{7}$' | \
    tail -n +4 | xargs -r -I{} docker rmi "ahmetenes:{}" >/dev/null 2>&1 || true
  notify "Yayında: ahmetenes $SHORT" "$(git log -1 --format=%s)" info
  exit 0
fi

echo "UYARI: sağlık kontrolü başarısız ($SHORT) — önceki imaja dönülüyor" >&2
docker logs --tail 20 "$CONTAINER_NAME" 2>&1 | sed 's/^/  | /' >&2 || true
if [ -n "$CUR" ]; then
  run_container "$CUR"
  if healthy; then
    notify "YAYIN BAŞARISIZ: ahmetenes $SHORT" "Önceki sürüme dönüldü ve doğrulandı. docker logs ahmetenes" warning
    echo "Önceki sürüm geri yüklendi ve sağlıklı." >&2; exit 1
  fi
fi
notify "KESİNTİ RİSKİ: ahmetenes" "Yeni sürüm ($SHORT) ve geri dönüş sağlıksız. Elle bak: docker logs ahmetenes" critical
exit 1
