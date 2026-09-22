#!/usr/bin/env bash
set -euo pipefail
# Yedekleme: EmDash SQLite + yüklenen medya + gizli anahtarlar + kaynak kod.
# Son 14 yedeği tutar. Eski Next.js git arşivi de saklanır.
# Kritik adımlardan biri başarısız olursa ntfy'e bildirir ve hata ile çıkar
# (systemd birimi "failed" görünür).
DEST="/root/backups/ahmetenes"
TS=$(date +%Y%m%d_%H%M%S)
WORK="$DEST/$TS"
PROJ="/var/www/deneme/projeler/ahmetenes"
DATA="/var/www/ahmetenes-data"
NTFY="https://ntfy.ahmetenes.tr/ahmetenes-alerts"

fail() {
  echo "YEDEK HATASI: $1" >&2
  curl -s -d "ahmetenes yedek hatası: $1 — $(date '+%d.%m %H:%M')" "$NTFY" >/dev/null 2>&1 || true
  rm -rf "$WORK"
  exit 1
}
trap 'fail "beklenmeyen hata (satır $LINENO)"' ERR

mkdir -p "$WORK"

# 1) Kaynak kod — git bundle (tam geçmiş, tek dosya), doğrulanır
git -C "$PROJ" bundle create "$WORK/repo.bundle" --all 2>/dev/null || fail "git bundle"
git -C "$PROJ" bundle verify "$WORK/repo.bundle" >/dev/null 2>&1 || fail "git bundle doğrulanamadı"

# 2) EmDash verisi. SQLite WAL modunda ve konteyner yazarken ham `cp` tutarsız
#    kopya üretebilir; çevrimiçi .backup API'si tutarlı anlık görüntü alır.
mkdir -p "$WORK/sitedata"
sqlite3 "$DATA/data.db" ".backup '$WORK/sitedata/data.db'" || fail "sqlite .backup"
check=$(sqlite3 "$WORK/sitedata/data.db" "pragma integrity_check;" 2>&1 || true)
[ "$check" = "ok" ] || fail "data.db bütünlük: $check"
# Diğer veri (medya, bülten, galeri künyesi...). imgcache yeniden üretilebilir.
tar -C "$DATA" --exclude='./data.db' --exclude='./data.db-wal' --exclude='./data.db-shm' \
  --exclude='./imgcache' -cf - . | tar -C "$WORK/sitedata" -xf - || fail "site verisi kopyalanamadı"

# 3) Gizli anahtarlar (okuma izni yalnız root)
cp /root/ahmetenes-emdash.env "$WORK/ahmetenes-emdash.env" || fail "env dosyası"
chmod 600 "$WORK/ahmetenes-emdash.env"

# 4) Deploy dosyaları
cp "$PROJ/deploy.sh" "$PROJ/Dockerfile" "$WORK/"
cp "$PROJ/seed/seed.json" "$WORK/seed.json"

# 5) Eski Next.js arşivi (git bare repo) — isteğe bağlı
git clone --quiet --bare /root/repos/ahmetenes-nextjs.git "$WORK/legacy-repo-git" 2>/dev/null || true

cd "$DEST"
tar czf "$TS.tar.gz" "$TS"
rm -rf "$WORK"
trap - ERR

# son 14 yedek tut
ls -1t "$DEST"/*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "yedek tamam: $DEST/$TS.tar.gz ($(du -h "$DEST/$TS.tar.gz" | cut -f1))"
