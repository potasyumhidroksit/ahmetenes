#!/usr/bin/env node
// Yeni yazi duyurusu (panelden yayinladiktan sonra):
//   pnpm announce <slug>          -> kuru calistirma: yazi bulunur, IndexNow'a
//                                    bildirilir, bulten onizlemesi gosterilir
//   pnpm announce <slug> --send   -> ayrica onayli abonelere bulten gonderilir
// Baslik ve ozet canli RSS'ten okunur (panelde ne yayinlandiysa o).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://ahmetenes.com";
const DIR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const send = args.includes("--send");
const slug = args.find((a) => !a.startsWith("--"))?.replace(/^\/+|\/+$/g, "");
if (!slug) {
  console.error("Kullanım: pnpm announce <slug> [--send]");
  process.exit(1);
}

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const rss = await (await fetch(SITE + "/rss.xml", { signal: AbortSignal.timeout(15000) })).text();
const item = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map((m) => m[1])
  .find((body) => body.includes(`<link>${SITE}/${slug}</link>`));
if (!item) {
  console.error(`RSS'te "${slug}" yok. Yazı yayında mı? (${SITE}/${slug})`);
  process.exit(1);
}
const title = decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
const excerpt = decode(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
// Bulten kapagi: yazinin og:image'i (1200x630 JPEG; WebP bircok e-posta istemcisinde gorunmez).
const page = await (await fetch(`${SITE}/${slug}`, { signal: AbortSignal.timeout(15000) })).text();
const image = page.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? "";
console.log(`Yazı:  ${title}\nÖzet:  ${excerpt}\nURL:   ${SITE}/${slug}\nKapak: ${image || "(yok)"}\n`);

// Yeni yazi hemen gorunsun: /posts ve ana sayfa edge'de 5 dk, yazi URL'si
// daha once 404 aldiysa 60 sn onbellekte kalabilir. Ilgili URL'leri temizle.
try {
  const env = Object.fromEntries(
    readFileSync("/root/.cloudflare/env", "utf8").split("\n").map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
  const files = ["/", "/posts", `/${slug}`, "/rss.xml", "/sitemap.xml", "/sitemap-posts.xml", "/sitemap-static.xml"].map((p) => SITE + p);
  const res = await fetch("https://api.cloudflare.com/client/v4/zones/5079525e40cebf813550cbf2bd411b46/purge_cache", {
    method: "POST",
    headers: { "X-Auth-Email": env.CF_EMAIL, "X-Auth-Key": env.CF_GLOBAL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  console.log(data.success ? `Önbellek temizlendi (${files.length} URL).` : `UYARI: önbellek temizlenemedi ${JSON.stringify(data.errors)}`);
} catch (error) {
  console.log("UYARI: Cloudflare temizliği atlandı (" + error.message + ")");
}

execFileSync("node", [path.join(DIR, "indexnow.mjs"), `/${slug}`, "/posts"], { stdio: "inherit" });

const file = process.env.NEWSLETTER_FILE || "/var/www/ahmetenes-data/newsletter.json";
let confirmed = 0;
if (existsSync(file)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const list = Array.isArray(d.subscribers) ? d.subscribers : [];
  confirmed = list.filter((s) => typeof s === "string" || s.confirmed !== false).length;
}
if (!send) {
  console.log(`\nBülten: ${confirmed} onaylı abone. Göndermek için: pnpm announce ${slug} --send`);
  process.exit(0);
}
execFileSync("node", [path.join(DIR, "send-newsletter.mjs"), title, slug, excerpt, /\.jpe?g$/i.test(image) ? image : ""], { stdio: "inherit" });
