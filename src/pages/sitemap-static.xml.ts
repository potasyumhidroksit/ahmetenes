import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";
import { loadGallery } from "../lib/gallery";
import { localizedPosts } from "../utils/localized-posts";

export const prerender = false;

// EmDash sitemap index'i yalnızca koleksiyon sitemaplarini listeler ve
// pages koleksiyonu su an dahil degil. Statik sayfalar + CMS sayfalari icin
// ayri bir sitemap uretiyoruz; robots.txt ikisini de bildirir.
const STATIC_PATHS = ["/", "/galeri", "/ekipman", "/medya", "/iletisim", "/posts", "/gizlilik"];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin.replace(/\/$/, "");
  const entries: { loc: string; lastmod?: string; images?: string[] }[] = STATIC_PATHS.map((path) => ({
    loc: origin + path,
  }));

  // Galeri kareleri (Google Gorseller): buyuk onizleme adresi. Kareler sayfada
  // da var; image sitemap kesfi hizlandirir. Immich yoksa bos gecer.
  try {
    const photos = await loadGallery();
    const galeri = entries.find((entry) => entry.loc === origin + "/galeri");
    if (galeri) galeri.images = photos.slice(0, 1000).map((p) => new URL(p.fullSrc, origin + "/").href);
    // Her karenin kendi sayfasi (/galeri/<id>) ve gorseli.
    for (const p of photos) entries.push({ loc: origin + "/galeri/" + p.id, images: [new URL(p.fullSrc, origin + "/").href] });
  } catch {
    // galeri alinamazsa gorselsiz devam
  }

  // /posts ve ana sayfa: en son yazi degisikligi (tarayicilar arsivi ne zaman
  // yeniden taramasi gerektigini bilsin).
  try {
    const { entries: posts } = await localizedPosts("tr", { orderBy: { published_at: "desc" } });
    const latest = Math.max(0, ...posts.map((post) => (post.data.updatedAt ?? post.data.publishedAt ?? new Date(0)).getTime()));
    if (latest > 0) {
      const lastmod = new Date(latest).toISOString();
      for (const entry of entries) if (entry.loc === origin + "/posts" || entry.loc === origin + "/") entry.lastmod = lastmod;
    }
  } catch {
    // yazilar alinamazsa lastmod'suz devam
  }

  try {
    const { entries: pages } = await getEmDashCollection("pages");
    for (const page of pages) {
      if (!page.id) continue;
      const updated = page.data.updatedAt;
      entries.push({
        loc: origin + "/" + page.id,
        lastmod: updated instanceof Date ? updated.toISOString() : undefined,
      });
    }
  } catch {
    // CMS sayfalari alinamazsa yalnizca statik yollar kalir
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    entries
      .map(
        (entry) =>
          "  <url><loc>" +
          escapeXml(entry.loc) +
          "</loc>" +
          (entry.lastmod ? "<lastmod>" + escapeXml(entry.lastmod) + "</lastmod>" : "") +
          (entry.images ?? []).map((src) => "\n    <image:image><image:loc>" + escapeXml(src) + "</image:loc></image:image>").join("") +
          (entry.images?.length ? "\n  " : "") +
          "</url>"
      )
      .join("\n") +
    "\n</urlset>\n";

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
