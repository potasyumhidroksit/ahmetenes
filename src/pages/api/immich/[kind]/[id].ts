import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  immichAssetUrl,
  immichAuthHeaders,
  IMMICH_API_KEY,
  type ImmichKind,
} from "../../../../lib/immich";
import { loadGallery } from "../../../../lib/gallery";

export const prerender = false;

// Guvenlik: yalnizca sitenin kullandigi turler ("original" tam cozunurluklu
// kareleri disari aciyordu), yalnizca galerideki kareler (sahibin Immich
// kutuphanesinin geri kalani degil) ve sabit genislikler (her w icin diske
// yeni onbellek dosyasi yazilip CPU harcaniyordu).
const KINDS: ImmichKind[] = ["thumbnail", "preview"];
const WIDTHS = [240, 480, 640, 800, 1200, 1600];
const snapWidth = (w: number) => WIDTHS.find((x) => x >= w) ?? WIDTHS[WIDTHS.length - 1];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE_DIR = process.env.IMG_CACHE_DIR || "/app/data/imgcache";
const DEFAULT_W: Record<ImmichKind, number> = { thumbnail: 480, preview: 1600, original: 1600 };

function imageResponse(body: Buffer, type: string, kind: ImmichKind): Response {
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": type,
      "cache-control": kind === "original" ? "public, max-age=3600" : "public, max-age=604800, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export const GET: APIRoute = async ({ params, request }) => {
  const kind = params.kind as ImmichKind;
  const id = params.id as string;
  if (!KINDS.includes(kind) || !UUID_RE.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  if (!IMMICH_API_KEY) {
    return new Response("Server misconfigured", { status: 500 });
  }
  const allowed = new Set((await loadGallery()).map((p) => p.id));
  if (!allowed.has(id)) {
    return new Response("Not found", { status: 404 });
  }

  const query = new URL(request.url).searchParams;
  // fmt=og: sosyal paylasim icin 1200x630 JPEG (WebP og:image her yerde gorunmuyor).
  const og = query.get("fmt") === "og";
  const parsedW = Number(query.get("w"));
  const w = og ? 1200 : snapWidth(Number.isInteger(parsedW) && parsedW > 0 ? parsedW : DEFAULT_W[kind]);
  const type = og ? "image/jpeg" : "image/webp";
  const cachePath = path.join(CACHE_DIR, kind + "-" + id + (og ? "-og.jpg" : "-w" + w + ".webp"));

  try {
    const cached = await fs.readFile(cachePath);
    if (cached) return imageResponse(cached, type, kind);
  } catch {
    // önbellek yoksa devam
  }

  try {
    const upstream = await fetch(immichAssetUrl(kind, id), {
      headers: immichAuthHeaders(),
      signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok) return new Response("Not found", { status: upstream.status });
    const input = Buffer.from(await upstream.arrayBuffer());

    try {
      const pipeline = sharp(input, { failOn: "none" }).rotate();
      const out = og
        ? await pipeline
            .resize({ width: 1200, height: 630, fit: "cover", position: sharp.strategy.attention })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer()
        : await pipeline.resize({ width: w }).webp({ quality: 82 }).toBuffer();
      try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(cachePath, out);
      } catch {
        // önbelleğe yazılamazsa yanıtı döndür
      }
      return imageResponse(out, type, kind);
    } catch {
      return new Response(new Uint8Array(input), {
        headers: {
          "content-type": upstream.headers.get("content-type") || "image/jpeg",
          "cache-control": "public, max-age=300",
        },
      });
    }
  } catch {
    return new Response("Upstream error", { status: 502 });
  }
};
