import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { markdownToPortableText } from "emdash/client";

const OLD = "/var/www/deneme/projeler/ahmetenes-nextjs-archive/src/content/blog";
const ROOT = "/var/www/deneme/projeler/ahmetenes";
const OLD_ORIGIN = "http://127.0.0.1:5193";

// Oldest first: seed inserts entries in order and stamps published_at at insert
// time, so the newest entry ends up first in the archive's desc ordering.
const POSTS = [
  { file: "kompozisyon-temelleri-ucte-bir-kurali.md", category: "teknik", tags: ["kompozisyon", "teknik"] },
  { file: "dogal-isikla-portre-teknikleri.md", category: "teknik", tags: ["isik", "portre"] },
  { file: "uc-karede-gorsel-hikaye-anlatimi.md", category: "sanat", tags: ["hikaye", "kompozisyon"] },
  { file: "sokak-fotografciliginda-gorunmez-olmak.md", category: "sokak", tags: ["sokak", "an"] },
  { file: "az-ekipman-cok-kare-minimal-fotografcilik.md", category: "ekipman", tags: ["minimalizm", "ekipman"] },
];

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fm = {};
  if (!m) return { fm, body: raw };
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { fm, body: raw.slice(m[0].length) };
}

const immichRe = /\/api\/immich\/preview\/([0-9a-f-]{36})(?:\?[^\s)"']*)?/g;

async function download(id, dest) {
  if (existsSync(dest)) return;
  const url = OLD_ORIGIN + "/api/immich/preview/" + id + "?w=1600";
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed " + url + " -> " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  console.log("saved", dest, buf.length, "bytes");
}

const posts = [];
for (const p of POSTS) {
  const raw = readFileSync(join(OLD, p.file), "utf8");
  const { fm, body } = parseFrontmatter(raw);
  const slug = fm.slug;
  const dir = join(ROOT, "public/blog", slug);
  const coverMatch = fm.cover.match(/\/api\/immich\/preview\/([0-9a-f-]{36})/);
  const coverId = coverMatch ? coverMatch[1] : undefined;
  const bodyIds = [...body.matchAll(immichRe)].map((x) => x[1]);
  const localFor = new Map();
  if (coverId) {
    await download(coverId, join(dir, "cover.webp"));
    localFor.set(coverId, "/blog/" + slug + "/cover.webp");
  }
  let n = 0;
  for (const id of bodyIds) {
    if (localFor.has(id)) continue;
    n++;
    const name = "kare-" + n + ".webp";
    await download(id, join(dir, name));
    localFor.set(id, "/blog/" + slug + "/" + name);
  }
  const rewritten = body.replace(immichRe, (full, id) => localFor.get(id) || full);
  posts.push({
    id: slug,
    slug,
    status: "published",
    data: {
      title: fm.title,
      excerpt: fm.excerpt,
      featured_image: coverId ? localFor.get(coverId) : fm.cover,
      content: markdownToPortableText(rewritten),
    },
    taxonomies: { category: [p.category], tag: p.tags },
    bylines: [{ byline: "enes" }],
  });
}

const aboutMd = [
  "# Ahmet Enes",
  "",
  "Fotoğrafçı. Işığın peşinde, karenin peşinde; gördüğümü sakin ve dürüst bir dille anlatmaya çalışıyorum.",
  "",
  "Bu sitede portfolyomun yanı sıra ışık, kompozisyon, sokak ve ekipman üzerine notlar paylaşıyorum. Amacım teknik bilgiyi gösterişten uzak, deneyerek öğrendiğim şekliyle aktarmak.",
  "",
  "Bana ulaşmak için aşağıdaki bağlantıları kullanabilirsiniz.",
].join("\n");

const nowMd = [
  "# Şu an",
  "",
  "Bu sayfa, şu sıralar neyle meşgul olduğumu kısaca anlatır.",
  "",
  "## Fotoğraf",
  "- Şehir ve sokakta ışığın peşindeyim; hafta sonları erken saatlerde çekim yapıyorum.",
  "- Liman, iskele ve sabah sisi üzerine kişisel bir seri sürüyor.",
  "",
  "## Öğrenme",
  "- Doğal ışıkta portre ve negatif dolgu üzerine pratik.",
  "- Renk yönetimi ve baskı iş akışı.",
  "",
  "## Okuma ve izleme",
  "- Fotoğraf monografileri ve sergi katalogları.",
  "- Film arşivini düzenliyorum.",
  "",
  "Birlikte çalışmak ya da bir konu önermek isterseniz iletişim sayfasından yazabilirsiniz.",
].join("\n");

const seed = {
  defaultLocale: "tr",
  $schema: "https://emdashcms.com/seed.schema.json",
  version: "1",
  meta: {
    name: "Ahmet Enes",
    description: "Fotoğraf portfolyosu ve notlar.",
    author: "Ahmet Enes",
  },
  settings: {
    title: "Ahmet Enes",
    tagline: "Fotoğraf, ışık ve kareler üzerine notlar.",
    url: "https://ahmetenes.com",
    seo: {
      robotsTxt: [
        "User-agent: *",
        "Allow: /",
        "",
        "Disallow: /_emdash/",
        "",
        "Sitemap: https://ahmetenes.com/sitemap.xml",
        "Sitemap: https://ahmetenes.com/sitemap-static.xml",
        "",
      ].join("\n"),
    },
  },
  collections: [
    {
      slug: "posts", label: "Yazılar", labelSingular: "Yazı",
      urlPattern: "/{slug}",
      supports: ["drafts", "revisions", "search", "seo"], commentsEnabled: false,
      fields: [
        { slug: "title", label: "Başlık", type: "string", required: true, searchable: true },
        { slug: "featured_image", label: "Kapak görseli", type: "image" },
        { slug: "content", label: "İçerik", type: "portableText", searchable: true },
        { slug: "excerpt", label: "Özet", type: "text" },
      ],
    },
    {
      slug: "pages", label: "Sayfalar", labelSingular: "Sayfa",
      urlPattern: "/{slug}",
      supports: ["drafts", "revisions", "search"],
      fields: [
        { slug: "title", label: "Başlık", type: "string", required: true, searchable: true },
        { slug: "content", label: "İçerik", type: "portableText", searchable: true },
      ],
    },
    {
      slug: "bio_profiles", label: "Profil", labelSingular: "Profil",
      supports: ["drafts", "revisions"],
      fields: [
        { slug: "title", label: "İsim", type: "string", required: true },
        { slug: "description", label: "Kısa açıklama", type: "text" },
        { slug: "avatar", label: "Profil fotoğrafı", type: "image" },
      ],
    },
  ],
  taxonomies: [
    {
      name: "category", label: "Kategoriler", labelSingular: "Kategori",
      hierarchical: true, collections: ["posts"],
      terms: [
        { slug: "teknik", label: "Teknik" },
        { slug: "sokak", label: "Sokak" },
        { slug: "sanat", label: "Sanat" },
        { slug: "ekipman", label: "Ekipman" },
      ],
    },
    {
      name: "tag", label: "Etiketler", labelSingular: "Etiket",
      hierarchical: false, collections: ["posts"],
      terms: [
        { slug: "isik", label: "Işık" },
        { slug: "portre", label: "Portre" },
        { slug: "kompozisyon", label: "Kompozisyon" },
        { slug: "minimalizm", label: "Minimalizm" },
        { slug: "hikaye", label: "Hikâye" },
        { slug: "an", label: "An" },
        { slug: "teknik", label: "Teknik" },
        { slug: "ekipman", label: "Ekipman" },
        { slug: "sokak", label: "Sokak" },
      ],
    },
  ],
  bylines: [{ id: "enes", slug: "ahmet-enes", displayName: "Ahmet Enes" }],
  menus: [
    {
      name: "primary", label: "Ana menü",
      items: [
        { type: "custom", label: "Ana sayfa", url: "/" },
        { type: "custom", label: "Galeri", url: "/galeri" },
        { type: "custom", label: "Ekipman", url: "/ekipman" },
        { type: "custom", label: "Medya", url: "/medya" },
        { type: "custom", label: "Yazılar", url: "/posts" },
        { type: "custom", label: "Hakkımda", url: "/hakkimda" },
        { type: "custom", label: "Şu an", url: "/now" },
        { type: "custom", label: "İletişim", url: "/iletisim" },
      ],
    },
    {
      name: "social", label: "Sosyal bağlantılar",
      items: [
        { type: "custom", label: "Instagram", url: "https://instagram.com/eneswideshut", target: "_blank" },
        { type: "custom", label: "E-posta", url: "/email/info@ahmetenes.com" },
      ],
    },
  ],
  redirects: [
    { source: "/blog", destination: "/posts", type: 301 },
    { source: "/blog/feed.xml", destination: "/rss.xml", type: 301 },
    { source: "/blog/bulten", destination: "/", type: 301 },
    { source: "/blog/kategori/Teknik", destination: "/category/teknik", type: 301 },
    { source: "/blog/kategori/Sokak", destination: "/category/sokak", type: 301 },
    { source: "/blog/kategori/Sanat", destination: "/category/sanat", type: 301 },
    { source: "/blog/kategori/Ekipman", destination: "/category/ekipman", type: 301 },
    { source: "/blog/kategori/teknik", destination: "/category/teknik", type: 301 },
    { source: "/blog/kategori/sokak", destination: "/category/sokak", type: 301 },
    { source: "/blog/kategori/sanat", destination: "/category/sanat", type: 301 },
    { source: "/blog/kategori/ekipman", destination: "/category/ekipman", type: 301 },
    { source: "/blog/[slug]", destination: "/[slug]", type: 301 },
    { source: "/admin", destination: "/_emdash/admin", type: 301 },
  ],
  widgetAreas: [],
  sections: [],
  content: {
    pages: [
      {
        id: "hakkimda", slug: "hakkimda", status: "published",
        data: { title: "Hakkımda", content: markdownToPortableText(aboutMd) },
      },
      {
        id: "now", slug: "now", status: "published",
        data: { title: "Şu an", content: markdownToPortableText(nowMd) },
      },
    ],
    bio_profiles: [
      {
        id: "personabio-profile", slug: "personabio", status: "published",
        data: {
          title: "Ahmet Enes",
          description: "Fotoğrafçı — ışığı, kareyi ve hikâyeyi seven biri. Portfolyo ve notlar.",
          avatar: "/avatar.webp",
        },
      },
    ],
    posts,
  },
};

writeFileSync(join(ROOT, "seed/seed.json"), JSON.stringify(seed, null, 2) + "\n");
console.log("seed written:", posts.length, "posts");
