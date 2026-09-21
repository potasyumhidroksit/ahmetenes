#!/usr/bin/env bash
set -euo pipefail
# Yedekleme: EmDash SQLite + yüklenen medya + gizli anahtarlar + kaynak kod.
# Son 14 yedeği tutar. Eski Next.js git arşivi de saklanır.
DEST="/root/backups/ahmetenes"
TS=$(date +%Y%m%d_%H%M%S)
WORK="$DEST/$TS"
PROJ="/var/www/deneme/projeler/ahmetenes-personabio"
mkdir -p "$WORK"

# 1) Kaynak kod — git bundle (tam geçmiş, tek dosya)
git -C "$PROJ" bundle create "$WORK/repo.bundle" --all 2>/dev/null || true

# 2) EmDash verisi (SQLite DB + yüklenen medya)
mkdir -p "$WORK/sitedata"
cp -a /var/www/ahmetenes-data/. "$WORK/sitedata/" 2>/dev/null || true

# 3) Gizli anahtarlar (okuma izni yalnız root)
cp /root/ahmetenes-personabio.env "$WORK/ahmetenes-personabio.env" 2>/dev/null || true
chmod 600 "$WORK/ahmetenes-personabio.env" 2>/dev/null || true

# 4) Deploy dosyaları
cp "$PROJ/deploy.sh" "$WORK/" 2>/dev/null || true
cp "$PROJ/Dockerfile" "$WORK/" 2>/dev/null || true
cp "$PROJ/seed/seed.json" "$WORK/seed.json" 2>/dev/null || true

# 5) Eski Next.js arşivi (git bare repo)
git clone --quiet --bare /root/repos/ahmetenes.git "$WORK/legacy-repo-git" 2>/dev/null || true

cd "$DEST"
tar czf "$TS.tar.gz" "$TS"
rm -rf "$WORK"

# son 14 yedek tut
ls -1t "$DEST"/*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "yedek tamam: $DEST/$TS.tar.gz"
