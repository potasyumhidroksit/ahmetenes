import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAlbumAssetIds, getAssetBatch, SITEDE_ALBUM_ID, type ImmichAsset } from "./immich";

export type GalleryCategory = { id: string; label: string };

export const galleryCategories: GalleryCategory[] = [
  { id: "tumu", label: "Tümü" },
  { id: "sehir", label: "Şehir" },
  { id: "sokak", label: "Sokak" },
  { id: "doga", label: "Doğa" },
  { id: "portre", label: "Portre" },
  { id: "gece", label: "Gece" },
];

export type GalleryPhoto = {
  id: string;
  title: string;
  alt?: string;
  src: string;
  srcSet: { w: number; src: string }[];
  fullSrc: string;
  aspect: "landscape" | "portrait";
  width?: number;
  height?: number;
  category: string;
  tags?: string[];
  story?: string;
  location?: string;
  year?: string;
  featured?: boolean;
  exif?: {
    camera?: string;
    lens?: string;
    focal?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
  };
};

type CuratedItem = {
  id: string;
  title: string;
  alt?: string;
  category: string;
  layout?: "wide" | "tall";
  tags?: string[];
  story?: string;
  location?: string;
  year?: string;
  featured?: boolean;
  width?: number;
  height?: number;
  exif?: GalleryPhoto["exif"];
};

const META_FILE = path.join(process.cwd(), "src/data/gallery-meta.json");

export async function loadCurated(): Promise<CuratedItem[]> {
  try {
    const raw = await readFile(META_FILE, "utf8");
    const arr = JSON.parse(raw) as CuratedItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function toPhoto(item: CuratedItem): GalleryPhoto {
  const width = item.width && item.width > 0 ? item.width : undefined;
  const height = item.height && item.height > 0 ? item.height : undefined;
  return {
    id: item.id,
    title: item.title,
    alt: item.alt ?? item.title,
    category: item.category,
    aspect: item.layout === "tall" ? "portrait" : "landscape",
    width,
    height,
    tags: item.tags,
    story: item.story,
    location: item.location,
    year: item.year,
    featured: item.featured,
    exif: item.exif,
    src: "/api/immich/preview/" + item.id + "?w=800",
    srcSet: [240, 480, 800, 1200, 1600].map((w) => ({ w, src: "/api/immich/preview/" + item.id + "?w=" + w })),
    fullSrc: "/api/immich/preview/" + item.id + "?w=1600",
  };
}

function mergeCurated(item: CuratedItem, asset?: ImmichAsset): CuratedItem {
  if (!asset) return item;
  const live = asset.exifInfo || {};
  const w = asset.width || 0;
  const h = asset.height || 0;
  return {
    ...item,
    width: w || item.width,
    height: h || item.height,
    layout: w && h ? (w >= h ? "wide" : "tall") : item.layout,
    year: live.dateTimeOriginal ? String(new Date(live.dateTimeOriginal).getUTCFullYear()) : item.year,
    exif: {
      camera: live.model || item.exif?.camera,
      lens: live.lensModel || item.exif?.lens,
      iso: live.iso != null ? String(live.iso) : item.exif?.iso,
      aperture: live.fNumber != null ? String(live.fNumber) : item.exif?.aperture,
      shutter: live.exposureTime || item.exif?.shutter,
      focal: live.focalLength != null ? String(live.focalLength) + "mm" : item.exif?.focal,
    },
  };
}

function assetToCurated(a: ImmichAsset): CuratedItem {
  const w = a.width || 3;
  const h = a.height || 2;
  const title = (a.originalFileName || a.id).replace(/\.[a-z0-9]+$/i, "").replace(/[_\-]+/g, " ").trim();
  return {
    id: a.id,
    title: title || a.id.slice(0, 8),
    alt: title || a.id.slice(0, 8),
    category: "",
    layout: w >= h ? "wide" : "tall",
    width: a.width || undefined,
    height: a.height || undefined,
    exif: a.exifInfo
      ? {
          camera: a.exifInfo.model || undefined,
          lens: a.exifInfo.lensModel || undefined,
          iso: a.exifInfo.iso != null ? String(a.exifInfo.iso) : undefined,
          aperture: a.exifInfo.fNumber != null ? String(a.exifInfo.fNumber) : undefined,
          shutter: a.exifInfo.exposureTime || undefined,
          focal: a.exifInfo.focalLength != null ? String(a.exifInfo.focalLength) + "mm" : undefined,
        }
      : undefined,
  };
}

/**
 * Albümdeki küratörlü kareler + yeni eklenenler. Immich erişilemezse yalnızca
 * küratörlü liste döner (site boş kalmaz).
 */
export async function loadGallery(): Promise<GalleryPhoto[]> {
  const curated = await loadCurated();
  const curatedById = new Map(curated.map((c) => [c.id, c]));
  try {
    const ids = await getAlbumAssetIds(SITEDE_ALBUM_ID);
    const assets = await getAssetBatch(ids);
    const out: GalleryPhoto[] = [];
    for (const c of curated) out.push(toPhoto(mergeCurated(c, assets.get(c.id))));
    for (const id of ids) {
      if (curatedById.has(id)) continue;
      const a = assets.get(id);
      if (a) out.push(toPhoto(assetToCurated(a)));
    }
    return out;
  } catch {
    return curated.map((c) => toPhoto(c));
  }
}
