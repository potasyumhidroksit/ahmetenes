import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import { SPOTIFY_ART_ID } from "../../../../lib/services";

export const prerender = false;

// Pulse albüm kapağı: tarayıcı Spotify CDN'ine (i.scdn.co) bağlanmasın diye
// site üzerinden, 64px kutuya yetecek 128px WebP olarak sunulur. Yalnızca
// i.scdn.co/image/<hex> çekilir (açık vekil değil); kimlikler içerik adresli
// olduğu için yanıt kalıcı önbelleklenir.
const CACHE_DIR = process.env.IMG_CACHE_DIR || "/app/data/imgcache";
const SIZE = 128;
const MAX_BYTES = 2 * 1024 * 1024;

function artResponse(body: Buffer): Response {
  return new Response(new Uint8Array(body), {
    headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" },
  });
}

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "";
  if (!SPOTIFY_ART_ID.test(id)) return new Response("Not found", { status: 404 });

  const cachePath = path.join(CACHE_DIR, "pulse-" + id + ".webp");
  try {
    return artResponse(await fs.readFile(cachePath));
  } catch {
    // önbellekte yok
  }

  // Önbellekte olmayan kapaklar Spotify'a gider: IP başına sınırlı.
  if (!rateLimit("pulse-art:" + clientIp(request), 20, 60_000)) {
    return new Response("Too many requests", { status: 429, headers: { "retry-after": "60" } });
  }
  try {
    const upstream = await fetch("https://i.scdn.co/image/" + id, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return new Response("Not found", { status: 404 });
    const input = Buffer.from(await upstream.arrayBuffer());
    if (input.byteLength > MAX_BYTES) return new Response("Not found", { status: 404 });
    const out = await sharp(input, { failOn: "none" })
      .resize({ width: SIZE, height: SIZE, fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(cachePath, out);
    } catch {
      // yazılamazsa yine de döndür
    }
    return artResponse(out);
  } catch {
    return new Response("Upstream error", { status: 502 });
  }
};
