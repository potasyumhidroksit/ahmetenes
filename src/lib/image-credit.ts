import credits from "../data/image-credits.json";
import { imageSrc } from "./responsive-image";

// Yazilardaki acik lisansli (CC0 / CC BY / CC BY-SA) fotograflarin kaynak
// bilgisi. CC BY ve BY-SA atif ister: eser, yazar, lisans ve kaynak baglantisi.
type Entry = {
  title?: string | null;
  creator?: string | null;
  creatorUrl?: string | null;
  license: string;
  licenseVersion?: string | null;
  licenseUrl?: string | null;
  source?: string | null;
  url?: string | null;
};

export type ImageCredit = {
  creator?: string;
  creatorUrl?: string;
  /** "CC BY-SA 4.0", "CC0" gibi okunur lisans adi */
  license: string;
  licenseUrl?: string;
  /** Eserin kaynak sayfasi */
  url?: string;
  /** "Wikimedia Commons" gibi okunur kaynak adi */
  source?: string;
};

const entries = credits as Record<string, Entry>;
const SOURCES: Record<string, string> = { wikimedia: "Wikimedia Commons", rawpixel: "rawpixel", stocksnap: "StockSnap", flickr: "Flickr", wordpress: "WordPress Photos" };

function licenseName(e: Entry): string {
  const raw = e.license.trim();
  if (/^cc0$/i.test(raw)) return "CC0";
  if (/^pdm$/i.test(raw)) return "Kamu malı";
  if (/^(by|by-sa|by-nd|by-nc)/i.test(raw)) return `CC ${raw.toUpperCase()}${e.licenseVersion ? " " + e.licenseVersion : ""}`;
  return raw;
}

export function imageCredit(image: unknown): ImageCredit | undefined {
  const src = imageSrc(image);
  const e = src ? entries[src] : undefined;
  if (!e) return undefined;
  return {
    creator: e.creator?.trim() || undefined,
    creatorUrl: e.creatorUrl || undefined,
    license: licenseName(e),
    licenseUrl: e.licenseUrl || undefined,
    url: e.url || undefined,
    source: e.source ? SOURCES[e.source] ?? e.source : undefined,
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS gibi duz HTML ciktilari icin tek satir atif. */
export function imageCreditHtml(image: unknown): string {
  const c = imageCredit(image);
  if (!c) return "";
  const link = (text: string, href?: string) => (href ? `<a href="${esc(href)}">${esc(text)}</a>` : esc(text));
  const parts = [c.creator ? "Fotoğraf: " + link(c.creator, c.creatorUrl ?? c.url) : link("Fotoğraf", c.url), link(c.license, c.licenseUrl)];
  if (c.source) parts.push(link(c.source, c.url));
  return parts.join(" · ");
}
