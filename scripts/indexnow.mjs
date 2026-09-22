#!/usr/bin/env node
// IndexNow (Bing, Yandex, Seznam...): yeni/degisen sayfalari aninda bildirir.
//   pnpm indexnow                 -> sitemap'teki tum URL'ler
//   pnpm indexnow /slug /galeri   -> yalnizca verilen yollar
// Anahtar public/<anahtar>.txt dosyasindan okunur (IndexNow geregi yayindadir).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://ahmetenes.com";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyFile = readdirSync(path.join(ROOT, "public")).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("public/ altinda IndexNow anahtar dosyasi yok.");
  process.exit(1);
}
const key = readFileSync(path.join(ROOT, "public", keyFile), "utf8").trim();

async function sitemapUrls() {
  const urls = new Set();
  const queue = [SITE + "/sitemap.xml", SITE + "/sitemap-static.xml"];
  while (queue.length) {
    const res = await fetch(queue.shift(), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) continue;
    const xml = await res.text();
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      if (/\.xml$/.test(loc)) queue.push(loc);
      else urls.add(loc);
    }
  }
  return [...urls];
}

const args = process.argv.slice(2);
const urlList = args.length ? args.map((p) => new URL(p, SITE).href) : await sitemapUrls();
if (urlList.length === 0) {
  console.error("Gonderilecek URL yok.");
  process.exit(1);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList }),
  signal: AbortSignal.timeout(20000),
});
console.log(`IndexNow ${res.status} — ${urlList.length} URL`);
if (!res.ok && res.status !== 202) {
  console.error((await res.text()).slice(0, 300));
  process.exit(1);
}
