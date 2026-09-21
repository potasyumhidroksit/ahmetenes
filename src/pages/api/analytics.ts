import type { APIRoute } from "astro";
import { trackVisit } from "../../lib/analytics";
import { clientIp, rateLimit } from "../../lib/rate-limit";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }
  const pathname = typeof (body as Record<string, unknown> | null)?.path === "string"
    ? ((body as Record<string, unknown>).path as string)
    : "/";
  if (!pathname.startsWith("/") || pathname.startsWith("/_emdash")) {
    return new Response(null, { status: 204 });
  }
  if (rateLimit("analytics:" + clientIp(request), 120, 60_000)) {
    trackVisit(pathname.slice(0, 200));
  }
  return new Response(null, { status: 204 });
};
