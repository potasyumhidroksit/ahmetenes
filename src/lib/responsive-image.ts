import manifest from "../data/image-manifest.json";

type ManifestEntry = { width: number; height: number; variants: number[]; og?: string };

export type LocalImage = {
  src: string;
  srcset: string;
  width: number;
  height: number;
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
  return { src, srcset, width: entry.width, height: entry.height };
}

/** Kapak icin uretilmis 1200x630 JPEG paylasim gorseli (varsa). */
export function ogImage(image: unknown): string | undefined {
  const src = imageSrc(image);
  return src ? entries[src]?.og : undefined;
}
