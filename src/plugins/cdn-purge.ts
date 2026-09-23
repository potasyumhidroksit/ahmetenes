/**
 * Panelden yapilan her icerik degisikliginden (kaydet, yayinla, yayindan kaldir,
 * sil, geri yukle, yorum onayi) sonra Cloudflare onbellegini temizletir.
 *
 * Konteynerde Cloudflare anahtari yok: eklenti yalnizca paylasilan veri
 * dizinine bir istek dosyasi yazar (DATA_DIR/cdn-purge-request). Sunucudaki
 * ahmetenes-cdn-purge.path birimi dosyayi izler ve scripts/cdn-refresh.sh'i
 * calistirir (bkz. scripts/systemd/). Aksi halde sayfalar s-maxage (5 dk) +
 * stale-while-revalidate yuzunden bir sure eski haliyle gorunuyordu.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

const ID = "ahmetenes-cdn-purge";
const VERSION = "1.0.0";

export function cdnPurgePlugin(): PluginDescriptor {
	return {
		id: ID,
		version: VERSION,
		entrypoint: fileURLToPath(import.meta.url),
		options: {},
		capabilities: ["content:read", "users:read"],
	};
}

export function createPlugin(): ResolvedPlugin {
	const request = async (reason: string, ctx: { log: { info(message: string): void; warn(message: string, data?: unknown): void } }) => {
		const file = path.join(process.env.DATA_DIR || "/app/data", "cdn-purge-request");
		try {
			await writeFile(file, `${new Date().toISOString()} ${reason}\n`);
			ctx.log.info(`[cdn-purge] ${reason}: temizleme istendi`);
		} catch (error) {
			ctx.log.warn(`[cdn-purge] ${reason}: istek yazilamadi`, String(error));
		}
	};

	return definePlugin({
		id: ID,
		version: VERSION,
		capabilities: ["content:read", "users:read"],
		hooks: {
			"content:afterSave": async (event, ctx) => request(`kaydet ${event.collection}`, ctx),
			"content:afterPublish": async (event, ctx) => request(`yayin ${event.collection}`, ctx),
			"content:afterUnpublish": async (event, ctx) => request(`yayindan kalkti ${event.collection}`, ctx),
			"content:afterDelete": async (event, ctx) => request(`sil ${event.collection}`, ctx),
			"content:afterRestore": async (event, ctx) => request(`geri yukle ${event.collection}`, ctx),
			"comment:afterModerate": async (_event, ctx) => request("yorum", ctx),
		},
	});
}
