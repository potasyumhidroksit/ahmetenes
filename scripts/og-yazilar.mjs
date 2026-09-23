#!/usr/bin/env node
// Yazilar icin fotografsiz, tipografik paylasim gorselleri (1200x630 JPEG):
// public/og/<slug>.jpg + src/data/og-posts.json. Sitenin DM Sans fontuyla
// Chrome'da render edilir.
//   PLAYWRIGHT=/yol/node_modules/playwright-core CHROME=/usr/bin/google-chrome node scripts/og-yazilar.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadPosts } from "./yazilar.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ahmetenes.com";
const pw = await import(process.env.PLAYWRIGHT ? pathToFileURL(path.join(process.env.PLAYWRIGHT, "index.mjs")).href : "playwright-core");
const chromium = pw.chromium ?? pw.default.chromium;

const LABELS = { teknik: "Teknik", sokak: "Sokak", sanat: "Sanat", ekipman: "Ekipman", gezi: "Gezi" };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Sitenin kullandigi DM Sans dosyalari (latin + latin-ext).
const home = await (await fetch(SITE + "/")).text();
// Sitenin @font-face tanimlari (normal 400; latin + latin-ext, unicode-range ile).
// Bos sayfadan capraz kaynak font istegi CORS'a takilir: data URL olarak gom.
const faces = [...home.matchAll(/@font-face\s*\{[^}]*\}/g)]
  .map((m) => m[0])
  .filter((f) => /font-style:\s*normal/.test(f) && /font-weight:\s*400/.test(f) && /url\(/.test(f));
const fontFaces = await Promise.all(
  faces.map(async (face) => {
    const url = face.match(/url\(["']?([^"')]+)/)[1];
    const range = face.match(/unicode-range:\s*([^;}]+)/)?.[1] ?? "U+0000-FFFF";
    const buf = Buffer.from(await (await fetch(new URL(url, SITE))).arrayBuffer());
    return `@font-face{font-family:"DM Sans";src:url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2");font-weight:100 900;unicode-range:${range};}`;
  }),
);
if (fontFaces.length === 0) throw new Error("DM Sans @font-face bulunamadi");

const html = (post) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFaces.join("\n")}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:"DM Sans",sans-serif;color:#e8edf1;
background:radial-gradient(120% 90% at 85% 10%,#2a3440 0%,#161b22 45%,#0e1216 100%);
display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px}
.cat{font-size:22px;letter-spacing:.22em;text-transform:uppercase;color:#9aa7b2}
h1{font-weight:500;font-size:${post.title.length > 60 ? 58 : 66}px;line-height:1.1;letter-spacing:-.03em;max-width:1000px}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:24px;color:#9aa7b2}
.foot b{color:#e8edf1;font-weight:500}
.line{height:2px;width:64px;background:#e8edf1;opacity:.5;margin-bottom:28px}
</style></head><body>
<div class="cat">${esc(LABELS[post.category] ?? post.category)}</div>
<div><div class="line"></div><h1>${esc(post.title)}</h1></div>
<div class="foot"><b>Ahmet Enes</b><span>ahmetenes.com</span></div>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
mkdirSync(path.join(ROOT, "public/og"), { recursive: true });
const done = [];
for (const post of loadPosts()) {
  await page.setContent(html(post), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(ROOT, "public/og", post.slug + ".jpg"), type: "jpeg", quality: 88 });
  done.push(post.slug);
}
await browser.close();
writeFileSync(path.join(ROOT, "src/data/og-posts.json"), JSON.stringify(done, null, 2) + "\n");
console.log(done.length + " gorsel -> public/og/");
