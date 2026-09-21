type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Basit bellek-ici hiz siniri (tek konteyner, IP basina). Kalici degildir;
 * konteyner yeniden baslarsa sifirlanir — form spam'ini yavaslatmaya yeter.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Istemci IP'si (Cloudflare oncelikli). */
export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return (xff.split(",")[0] || "").trim();
  return "unknown";
}

/** Gizli honeypot alani doldurulmussa istegi bot say. */
export function isBot(body: Record<string, unknown>): boolean {
  const trap = body.website ?? body.url ?? body.company;
  return typeof trap === "string" && trap.trim() !== "";
}
