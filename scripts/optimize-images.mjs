#!/usr/bin/env node
// public/blog altindaki gorseller icin duyarli (srcset) varyantlar uretir ve
// src/data/image-manifest.json dosyasina boyutlari yazar. Idempotent: mevcut ve
// guncel varyantlar yeniden uretilmez.
//
//   pnpm optimize-images
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SOURCE_DIRS = ["blog"];
const WIDTHS = [640, 960, 1280];
const MAX_WIDTH = 1600;
const QUALITY = 78;
const VARIANT_RE = /-\d+w\.webp$/;
const MANIFEST = path.join(ROOT, "src/data/image-manifest.json");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && /\.(webp|jpe?g|png)$/i.test(entry.name) && !VARIANT_RE.test(entry.name)) yield full;
  }
}

async function isFresh(target, source) {
  try {
    return (await stat(target)).mtimeMs >= (await stat(source)).mtimeMs;
  } catch {
    return false;
  }
}

const manifest = {};
let generated = 0;

for (const sub of SOURCE_DIRS) {
  for await (const file of walk(path.join(PUBLIC_DIR, sub))) {
    const meta = await sharp(file).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) continue;
    if (width > MAX_WIDTH) {
      console.warn(`! ${path.relative(ROOT, file)} ${width}px genis; ${MAX_WIDTH}px ustu kaynaklar srcset'te kullanilmaz.`);
    }

    const base = file.replace(/\.[^.]+$/, "");
    const variants = [];
    for (const w of WIDTHS) {
      if (w >= width) continue;
      const target = `${base}-${w}w.webp`;
      if (!(await isFresh(target, file))) {
        await sharp(file).rotate().resize({ width: w }).webp({ quality: QUALITY }).toFile(target);
        generated++;
      }
      variants.push(w);
    }

    const src = "/" + path.relative(PUBLIC_DIR, file).split(path.sep).join("/");
    manifest[src] = { width, height, variants };
  }
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");
console.log(`${Object.keys(sorted).length} gorsel, ${generated} yeni varyant -> ${path.relative(ROOT, MANIFEST)}`);
