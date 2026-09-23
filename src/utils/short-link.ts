/**
 * Kısa link köprüsü — ahmetenes.com/<kod> → 9816-links çözücüsü (go.ahmetenes.com).
 *
 * Next.js döneminde src/app/[slug]/route.ts bu işi yapıyordu; 2026-09-21'deki Astro/EmDash
 * göçünde aktarılmadı ve ahmetenes.com/ne-izlesem gibi kısa linkler 404'e düşüyordu (links
 * veritabanında son başarılı yönlendirme 2026-09-19). [slug].astro sayfa ya da yazı
 * bulamazsa buraya sorar: çözücü 30x + Location dönerse o hedef, bilinmeyen kodda (404) ya da
 * çözücüye ulaşılamazsa null → sitenin kendi 404'ü.
 *
 * Çözücü üzerinden gidilir (veritabanına doğrudan değil): hit sayacı ve hits_log orada tutulur.
 */
const RESOLVER = "https://go.ahmetenes.com";
const CODE_RE = /^[a-z0-9-]{1,40}$/i;

export async function resolveShortLink(code: string): Promise<string | null> {
  if (!CODE_RE.test(code)) return null;
  try {
    const res = await fetch(`${RESOLVER}/${encodeURIComponent(code)}`, {
      redirect: "manual", // yönlendirmeyi izleme, Location'ı oku
      signal: AbortSignal.timeout(5000),
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      // Hedef sahibin kendi link veritabanından gelir; yine de yalnız mutlak http(s).
      if (location && /^https?:\/\//i.test(location)) return location;
    }
  } catch {
    /* çözücüye ulaşılamadı → 404 */
  }
  return null;
}

/**
 * Kısa link yönlendirmesi: kenarda 5 dk (eski sitedeki gibi), tarayıcıda önbelleksiz — link
 * hedefi değişirse en geç 5 dk'da yayılır. Ara katman yalnız 200/404 HTML'e başlık ekler.
 */
export function shortLinkRedirect(target: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "public, max-age=0, s-maxage=300",
      "Cloudflare-CDN-Cache-Control": "max-age=300",
    },
  });
}
