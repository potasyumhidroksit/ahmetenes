#!/usr/bin/env bash
# Cloudflare edge onbellegini temizler ve sitemap sayfalarini isitir.
# deploy.sh sonunda calisir; CLI ile icerik guncellendiginde tek basina da:
#   bash scripts/cdn-refresh.sh
# Cloudflare edge onbellegini temizle (yeni surum aninda gorunsun). Zone
# diger alt alan adlarini da barindirir (cdn., sis., ...); yalnizca bu
# sitenin hostlarini temizle, olmazsa tum zone'a dus. Yaniti dogrula.
if [ -f /root/.cloudflare/env ]; then
  ( set -a; . /root/.cloudflare/env; set +a
    purge() {
      curl -s -X POST "https://api.cloudflare.com/client/v4/zones/5079525e40cebf813550cbf2bd411b46/purge_cache" \
        -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" \
        -H 'Content-Type: application/json' --data "$1" | grep -Eq '"success": *true'
    }
    # Katmanli onbellekte host purge nesneyi silmiyor, "suresi dolmus"
    # isaretliyor; stale-while-revalidate yuzunden her sayfanin ilk
    # ziyaretcisi deploy oncesi HTML'i goruyordu (UPDATING). Sitemap'teki
    # sayfalar iki tur istenir: ilki arka plan tazelemesini tetikler,
    # ikincisi taze kopyayi (HIT) dogrular.
    warm() {
      urls=$(for sm in sitemap-static.xml sitemap-posts.xml; do curl -s --max-time 10 "https://ahmetenes.com/$sm"; done \
        | grep -o '<loc>https://ahmetenes.com[^<]*</loc>' | sed -e 's#<loc>##' -e 's#</loc>##' | sort -u)
      [ -n "$urls" ] || return 0
      # Ilk tur: tazelemeyi tetikle; yazilardaki kategori/etiket arsivlerini
      # de topla (sitemap'te yoklar ama yazi listesi gosterirler).
      tax=$(for u in $urls; do curl -s --max-time 15 "$u"; done \
        | grep -oE 'href="/(category|tag)/[a-z0-9-]+"' | sed -e 's#href="#https://ahmetenes.com#' -e 's#"$##' | sort -u)
      for u in $tax; do curl -s -o /dev/null --max-time 15 "$u"; done
      urls=$(printf '%s\n' $urls $tax | sort -u)
      sleep 3
      total=0; fresh=0
      for u in $urls; do
        total=$((total + 1))
        st=$(curl -s -o /dev/null -D - --max-time 15 "$u" | tr -d '\r' | awk -F': ' 'tolower($1)=="cf-cache-status"{print $2}')
        [ "$st" = "HIT" ] && fresh=$((fresh + 1))
      done
      echo "→ Önbellek ısıtıldı: $fresh/$total sayfa taze (HIT)."
    }
    if purge '{"hosts":["ahmetenes.com","www.ahmetenes.com"]}'; then
      echo "→ Cloudflare edge cache temizlendi (ahmetenes.com)."
      # Cache Reserve / ust katman eski kopyayi kisa sure geri doldurabiliyor
      # (dagitimdan 10-60 sn sonra eski HTML goruldu); ikinci tur.
      sleep 20
      purge '{"hosts":["ahmetenes.com","www.ahmetenes.com"]}' && echo "→ İkinci temizleme turu tamam."
      warm
    elif purge '{"purge_everything":true}'; then
      echo "→ Cloudflare edge cache temizlendi (tüm zone)."
    else
      echo "UYARI: Cloudflare purge başarısız; eski HTML en fazla s-maxage kadar görünebilir."
    fi ) || true
fi
