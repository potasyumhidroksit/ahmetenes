/**
 * Immich istemcisi (foto.ahmetenes.tr). API anahtari yalnizca sunucuda kalir;
 * goruntuler /api/immich/... proxy rotasindan akar.
 */
export const IMMICH_BASE = (process.env.IMMICH_URL || "https://foto.ahmetenes.tr/api").replace(/\/$/, "");
export const IMMICH_API_KEY = process.env.IMMICH_API_KEY || "";

export function immichAuthHeaders(): Record<string, string> {
  return { "x-api-key": IMMICH_API_KEY };
}

export type ImmichKind = "thumbnail" | "preview" | "original";

export function immichAssetUrl(kind: ImmichKind, assetId: string): string {
  if (kind === "thumbnail") return IMMICH_BASE + "/assets/" + assetId + "/thumbnail";
  if (kind === "preview") return IMMICH_BASE + "/assets/" + assetId + "/thumbnail?size=preview";
  return IMMICH_BASE + "/assets/" + assetId + "/original";
}

export const SITEDE_ALBUM_ID = "a2d99017-906b-4cd9-ae1e-12f0c83fb4eb";

export type ImmichAsset = {
  id: string;
  originalFileName: string;
  width: number;
  height: number;
  type: string;
  exifInfo?: {
    model?: string | null;
    lensModel?: string | null;
    iso?: number | null;
    fNumber?: number | null;
    focalLength?: number | null;
    exposureTime?: string | null;
    dateTimeOriginal?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

const cache = new Map<string, { at: number; data: unknown }>();

async function immichFetch<T>(path: string, ttlMs: number): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const res = await fetch(IMMICH_BASE + path, {
    headers: immichAuthHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("immich " + res.status);
  const data = (await res.json()) as T;
  cache.set(path, { at: Date.now(), data });
  return data;
}

type TimeBucket = { timeBucket: string; count: number };
type BucketRow = { id?: string[]; [k: string]: unknown };

async function bucketIds(albumId: string, timeBucket: string): Promise<string[]> {
  const row = await immichFetch<BucketRow>(
    "/timeline/bucket?albumId=" + albumId + "&timeBucket=" + encodeURIComponent(timeBucket),
    3600000
  );
  return Array.isArray(row.id) ? row.id : [];
}

export async function getAlbumAssetIds(albumId: string): Promise<string[]> {
  const buckets = await immichFetch<TimeBucket[]>("/timeline/buckets?albumId=" + albumId, 3600000);
  const rows = await Promise.all(buckets.map((b) => bucketIds(albumId, b.timeBucket)));
  const ids = new Set<string>();
  for (const r of rows) for (const id of r) ids.add(id);
  return [...ids];
}

export async function getAsset(id: string): Promise<ImmichAsset> {
  return immichFetch<ImmichAsset>("/assets/" + id, 3600000);
}

export async function getAssetBatch(ids: string[]): Promise<Map<string, ImmichAsset>> {
  const uniq = [...new Set(ids)];
  const entries = await Promise.all(uniq.map(async (id) => [id, await getAsset(id)] as const));
  return new Map(entries);
}
