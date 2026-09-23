import { defineMiddleware } from "astro:middleware";
import type { APIContext } from "astro";
import { personabioTheme, PERSONABIO_ID, PERSONABIO_PREVIEW_PATH } from "./themes/personabio/manifest";

const catalog = "/_emdash/api/admin/themes/marketplace";
const json = (data: unknown) => Response.json({success:true, data}, {headers:{"Cache-Control":"private, no-store"}});

async function fixAdminColorScheme(response: Response) {
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return response;
  const html = await response.text();
  const override = '<style id="persona-bio-admin-mode">html[data-mode="dark"]{color-scheme:dark!important}html[data-mode="light"]{color-scheme:light!important}</style>';
  if (html.includes('id="persona-bio-admin-mode"')) return new Response(html, response);
  return new Response(html.replace("</head>", `${override}</head>`), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

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

/** Kimlikli/onizleme yanitlari hicbir katmanda saklanmasin. */
function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Yanit govdesini bozmadan onbellek basliklarini ekler. */
function withCache(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  headers.set("Cloudflare-CDN-Cache-Control", "max-age=300, stale-while-revalidate=86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Zafiyet tarayicilarinin yoklamalari (.git, .env, *.php, wp-*, /proc/...).
 * 404 kaydinin neredeyse tamami bunlardi; her biri tam 404 sayfasini DB
 * sorgulariyla render edip _emdash_404_log'a satir ekliyordu. Sitede bu
 * kaliplarda mesru yol yok; /.well-known/ haric.
 */
const PROBE_SEGMENT = /(?:^|\/)\.(?!well-known(?:\/|$))[^/]/;
const PROBE_PATH = /^\/(?:wp-|wordpress|cgi-bin|proc\/|@fs\/|var\/run\/|vendor\/|actuator|telescope|server-status)|\.(?:php\d?|aspx?|jsp|cgi|env|ini|sql|bak|old|swp|ya?ml|log|git)(?:$|\/)/i;

function isProbe(pathname: string): boolean {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // bozuk kodlama: ham yolu kullan
  }
  return PROBE_SEGMENT.test(path) || PROBE_PATH.test(path);
}

/** Extend the built-in catalog, retaining EmDash authentication and upstream entries.
 * Runs after next() so core auth, permissions and CSRF checks always execute first.
 * Local catalog handling is deliberately restricted to administrator accounts.
 */
async function handleRequest(context: APIContext, next: () => Promise<Response>): Promise<Response> {
  const {url, request} = context;
  if (isProbe(url.pathname)) {
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
  const preview = path === "/_emdash/api/themes/preview" && request.method === "POST";
  let localPreview = false;
  if (preview) {
    try {
      const body = await request.clone().json() as {previewUrl?: unknown};
      localPreview = body.previewUrl === `${url.origin}${PERSONABIO_PREVIEW_PATH}`;
    } catch { /* Let the core endpoint report invalid JSON. */ }
  }
  let response = await next();
  if (path.startsWith("/_emdash/admin")) response = await fixAdminColorScheme(response);

  // Herkese acik HTML sayfalar icin edge/tarayici onbellegi. Edge'de en fazla
  // s-maxage kadar bayat kalir; deploy'da Cloudflare purge edilir.
  const contentType = response.headers.get("content-type") || "";
  // /istatistik: anonime 404, yoneticiye sayfa; ikisi de hicbir katmanda
  // saklanmamali (edge cerezlere bakmaz: onbellekteki 404 yoneticiye de giderdi).
  if (url.pathname.startsWith("/istatistik") || (contentType.includes("text/html") && !url.pathname.startsWith("/_emdash") && !isAnonymous(context))) {
    response = withNoStore(response);
  } else if (
    request.method === "GET" &&
    response.status === 200 &&
    contentType.includes("text/html") &&
    isCacheable(url.pathname) &&
    !response.headers.has("set-cookie")
  ) {
    response = withCache(response);
  }
  if (!context.locals.user || context.locals.user.role < 50 || [401,403].includes(response.status)) return response;
  if (localPreview && (response.ok || response.status === 400)) {
    // No remote content export or signing is needed for this same-site preview.
    return json({url: `${url.origin}${PERSONABIO_PREVIEW_PATH}`});
  }
  if (request.method !== "GET") return response;
  const theme = personabioTheme(url.origin);
  if (path === `${catalog}/${PERSONABIO_ID}/thumbnail`) return context.redirect(theme.thumbnailUrl,302);
  if (path === `${catalog}/${PERSONABIO_ID}`) return json(theme);
  if (path !== catalog) return response;
  if (!response.ok && response.status !== 404 && response.status < 500) return response;
  let data: {items: {id:string}[]; nextCursor?:string} = {items:[]};
  if (response.ok) {
    try {
      const payload = await response.clone().json() as {data?: typeof data};
      if (!Array.isArray(payload.data?.items)) return response;
      data = payload.data!;
    } catch { return response; }
  }
  const query = (url.searchParams.get("q") || "").toLocaleLowerCase("tr");
  const keyword = url.searchParams.get("keyword");
  const match = `${theme.name} ${theme.description} ${theme.keywords.join(" ")}`.toLocaleLowerCase("tr").includes(query) && (!keyword || theme.keywords.includes(keyword));
  if (!url.searchParams.get("cursor") && match) data.items = [theme, ...data.items.filter(item => item.id !== PERSONABIO_ID)];
  return json(data);
}

/** Guvenlik basliklari. CSP yalnizca public sayfalara uygulanir; EmDash admin
 * editorunu (inline worker/editor scriptleri) kirmamak icin /_emdash haric tutulur. */
function withSecurityHeaders(response: Response, pathname: string): Response {
  try {
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    if (!pathname.startsWith("/_emdash")) {
      response.headers.set(
        "Content-Security-Policy",
        [
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
        ].join("; "),
      );
    }
    return response;
  } catch {
    // Basliklar immutable ise yeni bir Response ile ayni govdeyi dondur.
    const headers = new Headers(response.headers);
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await handleRequest(context, next);
  return withSecurityHeaders(response, context.url.pathname);
});
