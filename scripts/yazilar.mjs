#!/usr/bin/env node
// content/yazilar/*.md -> EmDash yazi verisi (Portable Text).
//   node scripts/yazilar.mjs json <cikti-dizini>   yazi basina CLI'ya uygun JSON
//   node scripts/yazilar.mjs seed                  seed/seed.json'daki yazilari degistirir
// Frontmatter: title, slug, excerpt, category, tags: [a, b]
// Kapak: public/blog/<slug>/cover.webp varsa featured_image olur.
// Govde gorseli: ![alt](/blog/<slug>/x.webp "altyazi")
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { markdownToPortableText } from "emdash/client";

// Okuma sirasi: yeni baslayan biri icin en mantikli ilk yazi en ustte. /posts
// bu siraya gore listelenir (sira alani); seed yayin tarihini de buna gore
// damgalar (ilk yazi en yeni).
const ORDER = [
  "fotografciliga-baslangic-yol-haritasi",
  "pozlama-ucgeni-diyafram-enstantane-iso",
  "ilk-kamera-ve-objektif-secimi",
  "yeni-baslayanlarin-sik-yaptigi-hatalar",
  "olcum-histogram-ve-manuel-mod-efsanesi",
  "keskin-fotograf-enstantane-odak-titresim",
  "isigi-okumak-yon-kalite-saat",
  "sikici-fotograftan-derinlikli-kareye",
  "odak-uzakligi-ve-perspektif",
  "raw-jpeg-ve-lightroom",
  "raw-duzenleme-is-akisi",
  "renk-teorisi-ve-doygunluk",
  "iso-gurultu-isik-ve-sinyal",
  "sokakta-35mm-yaklasmak-beklemek",
  "turist-gibi-cekmeyi-birakmak",
  "gece-hareket-ve-filtreler",
  "fotografciligin-dort-evresi",
];
const LABELS = { baslangic: "Başlangıç", gezi: "Gezi", pozlama: "Pozlama", duzenleme: "Düzenleme", keskinlik: "Keskinlik", renk: "Renk", gelisim: "Gelişim" };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content/yazilar");

function parse(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error("frontmatter yok");
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.startsWith("[") && val.endsWith("]")) val = val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    else if (/^".*"$/.test(val)) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { fm, body: raw.slice(m[0].length) };
}

export function loadPosts() {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const { fm, body } = parse(readFileSync(path.join(DIR, file), "utf8"));
      for (const k of ["title", "slug", "excerpt", "category"]) if (!fm[k]) throw new Error(`${file}: ${k} eksik`);
      const content = markdownToPortableText(body).map((block) => {
        // markdownToPortableText gorsel basligini URL'e katiyor: altyaziya tasi.
        const m = block._type === "image" && block.asset?.url?.match(/^(\S+)\s+"(.*)"$/);
        return m ? { ...block, asset: { ...block.asset, url: m[1] }, caption: m[2] } : block;
      });
      const cover = `/blog/${fm.slug}/cover.webp`;
      const sira = ORDER.indexOf(fm.slug) + 1;
      return {
        file, ...fm, tags: fm.tags ?? [], content,
        featured_image: existsSync(path.join(ROOT, "public", cover)) ? cover : undefined,
        sira: sira || undefined,
      };
    });
}

if (import.meta.url !== pathToFileURL(process.argv[1] ?? "").href) {
  // ice aktarildi (og-yazilar.mjs): komut satiri calismasin
} else {
const [cmd, out] = process.argv.slice(2);
const posts = loadPosts();
if (cmd === "json") {
  mkdirSync(out, { recursive: true });
  for (const p of posts) {
    writeFileSync(path.join(out, p.slug + ".json"), JSON.stringify({ title: p.title, excerpt: p.excerpt, content: p.content, featured_image: p.featured_image, sira: p.sira }, null, 2));
  }
  console.log(posts.length + " yazi ->", out);
} else if (cmd === "seed") {
  const file = path.join(ROOT, "seed/seed.json");
  const seed = JSON.parse(readFileSync(file, "utf8"));
  // Seed yayin tarihini ekleme anina gore damgalar: once eklenen daha eski.
  const rank = (p) => (ORDER.includes(p.slug) ? ORDER.indexOf(p.slug) : -1);
  const ordered = [...posts].sort((a, b) => rank(b) - rank(a));
  seed.content.posts = ordered.map((p) => ({
    id: p.slug,
    slug: p.slug,
    status: "published",
    data: { title: p.title, excerpt: p.excerpt, content: p.content, featured_image: p.featured_image, sira: p.sira },
    taxonomies: { category: [p.category], tag: p.tags },
    bylines: [{ byline: "enes" }],
  }));
  // Yazilarda kullanilan kategori/etiketler taksonomide tanimli olsun.
  for (const tax of seed.taxonomies ?? []) {
    const used = new Set(posts.flatMap((p) => (tax.name === "category" ? [p.category] : tax.name === "tag" ? p.tags : [])));
    for (const slug of used) {
      if (!tax.terms.some((t) => t.slug === slug)) tax.terms.push({ slug, label: LABELS[slug] ?? slug });
    }
  }
  writeFileSync(file, JSON.stringify(seed, null, 2) + "\n");
  console.log("seed: " + posts.length + " yazi");
} else {
  for (const p of posts) console.log(p.sira ?? "-", p.slug, "|", p.featured_image ? "kapak" : "-", "|", p.category, "|", p.tags.join(","), "|", p.content.length, "blok");
}
}
