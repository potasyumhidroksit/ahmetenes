import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type AnalyticsStats = {
  days: Record<string, number>;
  paths: Record<string, number>;
};

const DIR = process.env.DATA_DIR || "/app/data";
const FILE = path.join(DIR, "analytics.json");

let cache: AnalyticsStats | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<AnalyticsStats> {
  if (cache) return cache;
  try {
    const raw = JSON.parse(await readFile(FILE, "utf8")) as Partial<AnalyticsStats>;
    cache = { days: raw.days ?? {}, paths: raw.paths ?? {} };
  } catch {
    cache = { days: {}, paths: {} };
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

/** Gizlilik dostu: IP/cerez/kimlik saklanmaz; yalnizca gun ve yol sayaci. */
export function trackVisit(pathname: string): void {
  void (async () => {
    const stats = await load();
    const today = new Date().toISOString().slice(0, 10);
    stats.days[today] = (stats.days[today] || 0) + 1;
    const key = pathname.replace(/\/+$/, "") || "/";
    stats.paths[key] = (stats.paths[key] || 0) + 1;
    schedule();
  })();
}

export async function getAnalytics(): Promise<AnalyticsStats> {
  return load();
}
