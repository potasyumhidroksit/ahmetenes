#!/usr/bin/env bash
# Bu deponun systemd birimlerini ve cron dosyalarını kurar (tek kaynak: depo; 10 Kas 2026).
#   ops/systemd/*.service|*.timer|*.path   → /etc/systemd/system/
#   ops/systemd/<birim>.d/*.conf           → /etc/systemd/system/<birim>.d/  (drop-in)
#   ops/cron/<ad>                          → /etc/cron.d/<ad>
# ship adımı (apps.json): {"komut": "[ ! -f ops/kur.sh ] || bash ops/kur.sh", "eger": ["ops/*"]}
# - Tekrar çalıştırılabilir: yalnız farklı olan dosya kopyalanır (aynı klasörde geçici dosya + mv = atomik).
# - Değişecek birimler önce `systemd-analyze verify`'dan geçer; geçmezse hiçbir şey kurulmaz (betik hata verir,
#   ship geri alır).
# - systemd dosyası değiştiyse daemon-reload. Servis ne başlatılır ne yeniden başlatılır (çalışan servis yeni birimi
#   kendi yeniden başlatılmasında alır). Birimi değişen etkin timer/path yeniden başlatılır (servisi tetiklemez).
# - Etkinleştirme yalnız İLK kurulumda (hedefte dosya yokken): [Install]'lı birim enable, timer/path ayrıca start.
#   ops/systemd/kapali'da adı geçen birim hiç etkinleştirilmez (bilerek kapalı tutulanlar). Var olan birimin
#   etkin/kapalı durumuna dokunulmaz.
# Denemek için (sisteme dokunmadan): HEDEF=$(mktemp -d) CRON_HEDEF=$(mktemp -d) SYSTEMCTL='echo systemctl' bash ops/kur.sh
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")"
SD=${SD:-systemd}
CD=${CD:-cron}
HEDEF=${HEDEF:-/etc/systemd/system}
CRON_HEDEF=${CRON_HEDEF:-/etc/cron.d}
SYSTEMCTL=${SYSTEMCTL:-systemctl}

kapali=" "
if [[ -f $SD/kapali ]]; then kapali+="$(grep -v -E '^[[:space:]]*(#|$)' "$SD/kapali" | tr '\n' ' ')"; fi

degisen=() yeni=() dogrula=()
for f in "$SD"/*.service "$SD"/*.timer "$SD"/*.path "$SD"/*.d/*.conf; do
    r=${f#"$SD"/}
    cmp -s "$f" "$HEDEF/$r" && continue
    degisen+=("$r")
    [[ -e $HEDEF/$r ]] || yeni+=("$r")
    [[ $r == *.d/* ]] || dogrula+=("$f")
done
if ((${#dogrula[@]})); then systemd-analyze verify --recursive-errors=no "${dogrula[@]}"; fi

for r in "${degisen[@]}"; do
    mkdir -p "$(dirname "$HEDEF/$r")"
    install -m 0644 -o root -g root "$SD/$r" "$HEDEF/$r.kur-tmp"
    mv -f "$HEDEF/$r.kur-tmp" "$HEDEF/$r"
    echo "kuruldu: $HEDEF/$r"
done
if ((${#degisen[@]})); then $SYSTEMCTL daemon-reload; fi
for r in "${degisen[@]}"; do
    [[ $r == *.d/* || $kapali == *" $r "* ]] && continue
    if [[ " ${yeni[*]} " == *" $r "* ]]; then
        case $r in
            *.timer | *.path) $SYSTEMCTL enable --quiet --now "$r" ;;
            *@.service) ;;
            *) if grep -q '^\[Install\]' "$SD/$r"; then $SYSTEMCTL enable --quiet "$r"; fi ;;
        esac
    else
        case $r in *.timer | *.path) $SYSTEMCTL try-restart "$r" ;; esac
    fi
done

cron=0
for f in "$CD"/*; do
    [[ -f $f ]] || continue
    ad=${f##*/}
    cmp -s "$f" "$CRON_HEDEF/$ad" && continue
    install -m 0644 -o root -g root "$f" "$CRON_HEDEF/.$ad.kur-tmp"
    mv -f "$CRON_HEDEF/.$ad.kur-tmp" "$CRON_HEDEF/$ad"
    echo "kuruldu: $CRON_HEDEF/$ad"
    cron=$((cron + 1))
done
echo "birimler güncel (${#degisen[@]} systemd, $cron cron dosyası değişti)"
