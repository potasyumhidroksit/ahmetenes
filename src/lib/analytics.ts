import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/** 404'e dusen yol: kac kez, son gun, son geldigi site (yalnizca host). */
export type MissingHit = { n: number; last: string; ref?: string };

export type AnalyticsStats = {
  days: Record<string, number>;
  paths: Record<string, number>;
  missing: Record<string, MissingHit>;
};

const DIR = process.env.DATA_DIR || "/app/data";
const FILE = path.join(DIR, "analytics.json");
/** Istemci yolu keyfi gonderebilir; farkli yol sayisi sinirli, tasanlar tek kovada. */
const MAX_PATHS = 500;
const OVERFLOW_KEY = "(diğer)";
const MAX_MISSING = 200;
const SITE_HOST = (() => {
  try {
    return new URL(process.env.SITE_URL || "https://ahmetenes.com").hostname.replace(/^www\./, "");
  } catch {
    return "ahmetenes.com";
  }
})();

/** Referrer host'u sitenin kendisi mi (kirik baglanti site icinde). */
export const isOwnHost = (host: string | undefined): boolean => host === SITE_HOST;

let cache: AnalyticsStats | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<AnalyticsStats> {
  if (cache) return cache;
  try {
    const raw = JSON.parse(await readFile(FILE, "utf8")) as Partial<AnalyticsStats>;
    cache = { days: raw.days ?? {}, paths: raw.paths ?? {}, missing: raw.missing ?? {} };
  } catch {
    cache = { days: {}, paths: {}, missing: {} };
  }
  return cache;
}

function schedule(): void {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void persist();
  }, 2000);
}

async function persist(): Promise<void> {
  if (!cache) return;
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(cache));
  } catch {
    // yazilamazsa siteyi etkilemesin
  }
}

// Gun sinirlari Istanbul saatine gore (UTC'de 00-03 arasi ziyaretler bir
// onceki gune yaziliyordu). en-CA -> YYYY-MM-DD.
const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
const pathKey = (pathname: string) => pathname.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";

/** Gizlilik dostu: IP/cerez/kimlik saklanmaz; yalnizca gun ve yol sayaci. */
export function trackVisit(pathname: string): void {
  void (async () => {
    const stats = await load();
    const today = dayKey();
    stats.days[today] = (stats.days[today] || 0) + 1;
    let key = pathKey(pathname);
    if (!(key in stats.paths) && Object.keys(stats.paths).length >= MAX_PATHS) key = OVERFLOW_KEY;
    stats.paths[key] = (stats.paths[key] || 0) + 1;
    schedule();
  })();
}

/**
 * 404 sayfasi goruntulemesi: ziyaret sayilmaz, kirik baglanti listesine
 * yazilir. Liste doluysa en eski/en seyrek kayit yer acar.
 */
export function trackMissing(pathname: string, refHost: string | null): void {
  void (async () => {
    const stats = await load();
    const key = pathKey(pathname);
    let hit = stats.missing[key];
    if (!hit) {
      const keys = Object.keys(stats.missing);
      if (keys.length >= MAX_MISSING) {
        const oldest = keys.reduce((a, b) => {
          const x = stats.missing[a], y = stats.missing[b];
          return x.last < y.last || (x.last === y.last && x.n <= y.n) ? a : b;
        });
        delete stats.missing[oldest];
      }
      hit = stats.missing[key] = { n: 0, last: "" };
    }
    hit.n += 1;
    hit.last = dayKey();
    // Site ici kaynak en onemli bilgi (duzeltilebilir); disaridan gelen ezmesin.
    if (refHost && !isOwnHost(hit.ref)) hit.ref = refHost;
    schedule();
  })();
}

export async function getAnalytics(): Promise<AnalyticsStats> {
  return load();
}
