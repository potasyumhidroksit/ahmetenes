/**
 * Yayin bildirimi: panelde bir yazi/sayfa yayinlandiginda (ya da yayindan
 * kalktiginda) degisen adresleri IndexNow'a (Bing, Yandex, Seznam...) bildirir;
 * `pnpm indexnow`u elle calistirmaya gerek kalmaz. Yalnizca canli sitede
 * (SITE_URL = https://ahmetenes.com) gonderir; yerelde yalnizca loglar.
 * Anahtar public/<anahtar>.txt'den okunur (IndexNow geregi zaten yayinda).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

const ID = "ahmetenes-publish-ping";
const VERSION = "1.0.0";
const PRODUCTION = "https://ahmetenes.com";
const HOST = "api.indexnow.org";
/** Yayindaki adresi "/<slug>" olan koleksiyonlar. */
const COLLECTIONS = new Set(["posts", "pages"]);

export function publishPingPlugin(): PluginDescriptor {
	return {
		id: ID,
		version: VERSION,
		entrypoint: fileURLToPath(import.meta.url),
		options: {},
		capabilities: ["content:read", "network:request"],
		allowedHosts: [HOST],
	};
}

let cachedKey: string | null | undefined;
function indexNowKey(): string | null {
	if (cachedKey !== undefined) return cachedKey;
	try {
		const dir = path.join(process.cwd(), "public");
		const file = readdirSync(dir).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
		cachedKey = file ? readFileSync(path.join(dir, file), "utf8").trim() : null;
	} catch {
		cachedKey = null;
	}
	return cachedKey;
}

/** Yayin durumu degisen icerigin etkiledigi adresler. */
function changedUrls(collection: string, content: Record<string, unknown>): string[] {
	const slug = typeof content.slug === "string" ? content.slug : "";
	if (!COLLECTIONS.has(collection) || !/^[a-z0-9-]+$/.test(slug)) return [];
	const paths = ["/" + slug];
	// Yazi listeleri de degisir (ana sayfa, arsiv).
	if (collection === "posts") paths.push("/posts", "/");
	return paths.map((p) => new URL(p, PRODUCTION).href);
}

export function createPlugin(): ResolvedPlugin {
	const ping = async (reason: string, collection: string, content: Record<string, unknown>, ctx: {
		http?: { fetch(url: string, init?: RequestInit): Promise<Response> };
		log: { info(message: string, data?: unknown): void; warn(message: string, data?: unknown): void };
	}) => {
		const urlList = changedUrls(collection, content);
		if (urlList.length === 0) return;
		const key = indexNowKey();
		const live = process.env.SITE_URL?.replace(/\/$/, "") === PRODUCTION;
		if (!live || !key || !ctx.http) {
			const why = [!live && "canli degil", !key && "anahtar yok", !ctx.http && "http yetkisi yok"].filter(Boolean).join(", ");
			ctx.log.info(`[publish-ping] ${reason}: gonderilmedi (${why})`, urlList);
			return;
		}
		try {
			const res = await ctx.http.fetch(`https://${HOST}/indexnow`, {
				method: "POST",
				headers: { "content-type": "application/json; charset=utf-8" },
				body: JSON.stringify({ host: new URL(PRODUCTION).host, key, keyLocation: `${PRODUCTION}/${key}.txt`, urlList }),
				signal: AbortSignal.timeout(10_000),
			});
			ctx.log.info(`[publish-ping] ${reason}: IndexNow ${res.status}`, urlList);
		} catch (error) {
			ctx.log.warn(`[publish-ping] ${reason}: IndexNow hatasi`, String(error));
		}
	};

	return definePlugin({
		id: ID,
		version: VERSION,
		capabilities: ["content:read", "network:request"],
		allowedHosts: [HOST],
		hooks: {
			"content:afterPublish": async (event, ctx) => ping("yayin", event.collection, event.content, ctx),
			"content:afterUnpublish": async (event, ctx) => ping("yayindan kalkti", event.collection, event.content, ctx),
		},
	});
}
