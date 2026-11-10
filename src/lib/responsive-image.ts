import manifest from "../data/image-manifest.json";

type ManifestEntry = { width: number; height: number; variants: number[]; og?: string; color?: string };

export type LocalImage = {
  src: string;
  srcset: string;
  width: number;
  height: number;
  /** Yuklenirken arka plan (baskin renk) */
  color?: string;
};

const entries = manifest as Record<string, ManifestEntry>;

/** Bir gorsel alanindan (string ya da { src }) yol cikarir. */
export function imageSrc(image: unknown): string | undefined {
  if (typeof image === "string") return image || undefined;
  if (image && typeof image === "object" && typeof (image as { src?: unknown }).src === "string") {
    return (image as { src: string }).src || undefined;
  }
  return undefined;
}

/**
 * `scripts/optimize-images.mjs` ile varyantlari uretilmis yerel gorseller icin
 * srcset ve gercek boyutlari dondurur; manifestte olmayanlar icin undefined.
 */
export function localImage(image: unknown): LocalImage | undefined {
  const src = imageSrc(image);
  const entry = src ? entries[src] : undefined;
  if (!src || !entry) return undefined;
  const base = src.replace(/\.[^.]+$/, "");
  const srcset = [
    ...entry.variants.map((w) => `${base}-${w}w.webp ${w}w`),
    `${src} ${entry.width}w`,
  ].join(", ");
  return { src, srcset, width: entry.width, height: entry.height, color: entry.color };
}

/** Kapak icin uretilmis 1200x630 JPEG paylasim gorseli (varsa). */
export function ogImage(image: unknown): string | undefined {
  const src = imageSrc(image);
  return src ? entries[src]?.og : undefined;
}

/** Gorsel alanindan mutlak URL (og:image yedegi): src (dis ya da goreli) ya da
 * yerel medyanin storageKey'i; bulunamazsa undefined. */
export function absoluteImageUrl(img: unknown, origin: string): string | undefined {
  if (!img || (typeof img !== "object" && typeof img !== "string")) return undefined;
  if (typeof img === "string") {
    if (!img) return undefined;
    return img.startsWith("http") ? img : `${origin}${img}`;
  }
  const image = img as Record<string, unknown>;
  // Check for direct src
  if (typeof image.src === "string" && image.src) {
    return image.src.startsWith("http")
      ? image.src
      : `${origin}${image.src}`;
  }
  // Build from storageKey for local images
  const meta = image.meta as Record<string, unknown> | undefined;
  const storageKey =
    (typeof meta?.storageKey === "string" ? meta.storageKey : undefined) ||
    (typeof image.id === "string" ? image.id : undefined);
  if (storageKey) {
    return `${origin}/_emdash/api/media/file/${storageKey}`;
  }
  return undefined;
}
