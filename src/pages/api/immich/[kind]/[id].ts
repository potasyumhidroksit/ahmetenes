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

export const prerender = false;

const KINDS: ImmichKind[] = ["thumbnail", "preview", "original"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE_DIR = process.env.IMG_CACHE_DIR || "/app/data/imgcache";
const DEFAULT_W: Record<ImmichKind, number> = { thumbnail: 512, preview: 1600, original: 2200 };

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

  const parsedW = Number(new URL(request.url).searchParams.get("w"));
  const w = Number.isInteger(parsedW) && parsedW >= 64 && parsedW <= 2600 ? parsedW : DEFAULT_W[kind];
  const cachePath = path.join(CACHE_DIR, kind + "-" + id + "-w" + w + ".webp");

  try {
    const cached = await fs.readFile(cachePath);
    if (cached) return imageResponse(cached, "image/webp", kind);
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
      const out = await sharp(input, { failOn: "none" })
        .rotate()
        .resize({ width: w })
        .webp({ quality: 82 })
        .toBuffer();
      try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(cachePath, out);
      } catch {
        // önbelleğe yazılamazsa yanıtı döndür
      }
      return imageResponse(out, "image/webp", kind);
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
