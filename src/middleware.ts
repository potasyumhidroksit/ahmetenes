import { defineMiddleware } from "astro:middleware";
import type { APIContext } from "astro";
import { fixAdminColorScheme, isLocalThemePreview, withThemeCatalog } from "./themes/personabio/admin";

/** Public HTML sayfalari edge/tarayici onbellegine uygun mu? (admin, api, arama ve
 * kendi TTL'ini yoneten xml/txt ciktilar haric) */
function isCacheable(pathname: string): boolean {
  if (pathname.startsWith("/_emdash") || pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/search")) return false;
  if (pathname.startsWith("/istatistik")) return false;
  if (/\/(?:sitemap|rss)[^/]*\.(?:xml)$/.test(pathname) || pathname === "/robots.txt") return false;
  return true;
}

/**
 * Istek anonim mi? Oturum (astro-session), gorsel duzenleme cerezi ya da
 * taslak onizleme parametresi varsa EmDash sayfayi editore ozel render eder
 * (arac cubugu, duzenleme isaretleri). Bunlar edge'de onbellege alinirsa
 * herkese sunulur: Cloudflare cerezleri onbellek anahtarina katmaz ve
 * Cloudflare-CDN-Cache-Control, EmDash'in "private, no-store"unu ezer.
 */
function isAnonymous(context: APIContext): boolean {
  const { cookies, url, locals } = context;
  return (
    !locals.user &&
    !cookies.has("astro-session") &&
    !cookies.has("emdash-edit-mode") &&
    !url.searchParams.has("_preview")
  );
}

/** Yanit govdesini bozmadan basliklari ekler/degistirir. */
function withHeaders(response: Response, values: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(values)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Kimlikli/onizleme yanitlari hicbir katmanda saklanmasin. */
const NO_STORE = { "Cache-Control": "private, no-store", "Cloudflare-CDN-Cache-Control": "no-store" };
/** Anonim public HTML: edge'de 5 dk + stale-while-revalidate. */
const PUBLIC_CACHE = {
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
  "Cloudflare-CDN-Cache-Control": "max-age=300, stale-while-revalidate=86400",
};
/** 404'ler edge'de en fazla 60 sn: yayindan once paylasilan bir yazi linki
 * yayindan sonra dakikalarca 404 kalmasin (Cloudflare varsayilani daha uzun). */
const NOT_FOUND_CACHE = { "Cache-Control": "public, max-age=0, s-maxage=60", "Cloudflare-CDN-Cache-Control": "max-age=60" };

/**
 * Zafiyet tarayicilarinin yoklamalari (.git, .env, *.php, wp-*, /proc/...).
 * 404 kaydinin neredeyse tamami bunlardi; her biri tam 404 sayfasini DB
 * sorgulariyla render edip _emdash_404_log'a satir ekliyordu. Sitede bu
 * kaliplarda mesru yol yok; /.well-known/ haric.
 */
const PROBE_SEGMENT = /(?:^|\/)\.(?!well-known(?:\/|$))[^/]/;
const PROBE_PATH = /^\/(?:wp-|wordpress|cgi-bin|proc\/|@fs\/|var\/run\/|vendor\/|actuator|telescope|server-status)|\.(?:php\d?|aspx?|jsp|cgi|env|ini|sql|bak|old|swp|ya?ml|log|git)(?:$|\/)/i;

/**
 * EmDash'in /sitemap-[collection].xml rotasi her /sitemap-*.xml'i yakalar ama EmDash
 * ara katmani calisma ortamini yalniz /^\/sitemap-[a-z][a-z0-9_]*\.xml$/ icin kurar;
 * digerleri ("sitemap-0.xml": eski Next.js next-sitemap adi, "sitemap-1a.xml", buyuk
 * harf, tire) 404 yerine 500 "EmDash not configured" donuyordu. Onlar dogrudan 404.
 */
const SITEMAP_ANY = /^\/sitemap-[^/]+\.xml$/;
const SITEMAP_COLLECTION = /^\/sitemap-[a-z][a-z0-9_]*\.xml$/;
const isBrokenSitemapPath = (pathname: string) => SITEMAP_ANY.test(pathname) && !SITEMAP_COLLECTION.test(pathname);

function isProbe(pathname: string): boolean {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // bozuk kodlama: ham yolu kullan
  }
  return PROBE_SEGMENT.test(path) || PROBE_PATH.test(path);
}

async function handleRequest(context: APIContext, next: () => Promise<Response>): Promise<Response> {
  const {url, request} = context;
  if (isProbe(url.pathname) || isBrokenSitemapPath(url.pathname)) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }
  // Tek kanonik URL: /hakkimda/ -> /hakkimda (aksi halde canonical sonda
  // egik cizgiyle uretiliyor ve ayni sayfa iki URL'de indeksleniyordu).
  if (
    (request.method === "GET" || request.method === "HEAD") &&
    url.pathname.length > 1 &&
    url.pathname.endsWith("/") &&
    !url.pathname.startsWith("/_emdash") &&
    !url.pathname.startsWith("/api/")
  ) {
    return context.redirect(url.pathname.replace(/\/+$/, "") + url.search, 301);
  }
  const path = url.pathname.replace(/\/$/, "");
  if (path === "/_emdash/admin/themes") return context.redirect("/_emdash/admin/themes/marketplace",302);
  const localPreview = await isLocalThemePreview(context, path);
  let response = await next();
  if (path.startsWith("/_emdash/admin")) response = await fixAdminColorScheme(response);

  // Herkese acik HTML sayfalar icin edge/tarayici onbellegi. Edge'de en fazla
  // s-maxage kadar bayat kalir; deploy'da Cloudflare purge edilir.
  const contentType = response.headers.get("content-type") || "";
  // /istatistik: anonime 404, yoneticiye sayfa; ikisi de hicbir katmanda
  // saklanmamali (edge cerezlere bakmaz: onbellekteki 404 yoneticiye de giderdi).
  if (url.pathname.startsWith("/istatistik") || (contentType.includes("text/html") && !url.pathname.startsWith("/_emdash") && !isAnonymous(context))) {
    response = withHeaders(response, NO_STORE);
  } else if (request.method === "GET" && response.status === 404 && contentType.includes("text/html")) {
    response = withHeaders(response, NOT_FOUND_CACHE);
  } else if (
    request.method === "GET" &&
    response.status === 200 &&
    contentType.includes("text/html") &&
    isCacheable(url.pathname) &&
    !response.headers.has("set-cookie")
  ) {
    response = withHeaders(response, PUBLIC_CACHE);
  }
  return withThemeCatalog(context, path, response, localPreview);
}

const SECURITY_HEADERS = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** Guvenlik basliklari. CSP yalnizca public sayfalara uygulanir; EmDash admin
 * editorunu (inline worker/editor scriptleri) kirmamak icin /_emdash haric tutulur. */
function withSecurityHeaders(response: Response, pathname: string): Response {
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    if (!pathname.startsWith("/_emdash")) response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    return response;
  } catch {
    // Basliklar immutable ise (ornegin Response.redirect) yeni bir Response ile
    // ayni govdeyi dondur; bu yolda CSP eklenmez.
    return withHeaders(response, SECURITY_HEADERS);
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await handleRequest(context, next);
  return withSecurityHeaders(response, context.url.pathname);
});
