// RSS icin Portable Text -> sade HTML. Feed okuyucular stil/JS calistirmaz;
// yalnizca anlamli etiketler (p, h2, liste, alinti, vurgu, baglanti, gorsel).
// Bilinmeyen blok turleri atlanir.
import { localImage } from "./responsive-image";
import { imageCreditHtml } from "./image-credit";

type Span = { _type?: string; text?: string; marks?: string[] };
type MarkDef = { _key?: string; _type?: string; href?: string };
type Block = {
  _type?: string;
  style?: string;
  listItem?: string;
  children?: Span[];
  markDefs?: MarkDef[];
  asset?: { url?: string };
  alt?: string;
  caption?: string;
};

const DECORATORS: Record<string, string> = { strong: "strong", em: "em", code: "code", underline: "u", "strike-through": "s" };
/** Feed gorselleri: okuyucu genisligine yeten en buyuk varyant. */
const FEED_IMAGE_MAX_W = 1280;

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Goreli yolu mutlak yapar; http(s) disi (javascript: vb.) semalar atilir. */
function absolute(url: string, siteUrl: string): string | null {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return siteUrl + url;
  return null;
}

function renderSpans(block: Block, siteUrl: string): string {
  const defs = new Map((block.markDefs ?? []).map((def) => [def._key, def]));
  return (block.children ?? [])
    .map((span) => {
      let html = esc(span.text ?? "").replace(/\n/g, "<br>");
      for (const mark of span.marks ?? []) {
        const tag = DECORATORS[mark];
        if (tag) {
          html = `<${tag}>${html}</${tag}>`;
          continue;
        }
        const def = defs.get(mark);
        const href = def?._type === "link" && def.href ? absolute(def.href, siteUrl) : null;
        if (href) html = `<a href="${esc(href)}">${html}</a>`;
      }
      return html;
    })
    .join("");
}

function renderImage(block: Block, siteUrl: string): string {
  const url = block.asset?.url;
  if (!url) return "";
  let src = url;
  let size = "";
  const local = localImage(url);
  if (local) {
    const best = local.srcset
      .split(", ")
      .map((candidate) => {
        const [candidateUrl, w] = candidate.split(" ");
        return { url: candidateUrl, w: Number.parseInt(w, 10) };
      })
      .filter((candidate) => candidate.w <= FEED_IMAGE_MAX_W)
      .sort((a, b) => b.w - a.w)[0];
    if (best) {
      src = best.url;
      size = ` width="${best.w}" height="${Math.round((local.height / local.width) * best.w)}"`;
    }
  }
  const abs = absolute(src, siteUrl);
  if (!abs) return "";
  const credit = imageCreditHtml(url);
  const captionText = [block.caption ? esc(block.caption) : "", credit].filter(Boolean).join("<br>");
  const caption = captionText ? `<figcaption>${captionText}</figcaption>` : "";
  return `<figure><img src="${esc(abs)}" alt="${esc(block.alt ?? "")}"${size}>${caption}</figure>`;
}

/** `skipImage`: govdede tekrar gosterilmeyecek gorsel (kapak zaten media:content). */
export function portableTextToHtml(blocks: unknown, siteUrl: string, skipImage?: string): string {
  if (!Array.isArray(blocks)) return "";
  const out: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  for (const block of blocks as Block[]) {
    if (block?._type === "block") {
      const inner = renderSpans(block, siteUrl);
      if (block.listItem) {
        const tag = block.listItem === "number" ? "ol" : "ul";
        if (!list || list.tag !== tag) {
          flush();
          list = { tag, items: [] };
        }
        list.items.push(inner);
        continue;
      }
      flush();
      if (!inner.trim()) continue;
      const style = block.style ?? "normal";
      const tag = /^h[1-6]$/.test(style) ? style : style === "blockquote" ? "blockquote" : "p";
      out.push(`<${tag}>${inner}</${tag}>`);
    } else if (block?._type === "image") {
      flush();
      if (skipImage && block.asset?.url === skipImage) continue;
      const html = renderImage(block, siteUrl);
      if (html) out.push(html);
    }
  }
  flush();
  return out.join("\n");
}
