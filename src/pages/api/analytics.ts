import type { APIRoute } from "astro";
import { trackMissing, trackVisit } from "../../lib/analytics";
import { clientIp, rateLimit } from "../../lib/rate-limit";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const pathname = typeof data.path === "string" ? data.path : "/";
  if (!pathname.startsWith("/") || pathname.startsWith("/_emdash")) {
    return new Response(null, { status: 204 });
  }
  if (rateLimit("analytics:" + clientIp(request), 120, 60_000)) {
    if (data.missing === true) trackMissing(pathname.slice(0, 200), refererHost(data.ref));
    else trackVisit(pathname.slice(0, 200));
  }
  return new Response(null, { status: 204 });
};

/** Referrer'in yalnizca host'u (tam URL saklanmaz); gecersizse null. */
function refererHost(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.hostname.toLowerCase().replace(/^www\./, "").slice(0, 100) || null;
  } catch {
    return null;
  }
}
