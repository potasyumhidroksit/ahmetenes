import node from "@astrojs/node";
import react from "@astrojs/react";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { publishPingPlugin } from "./src/plugins/publish-ping.ts";
import { cdnPurgePlugin } from "./src/plugins/cdn-purge.ts";
import { defineConfig, fontProviders } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Self-hosted (Node) deployment for ahmetenes.com. The origin sits behind a
// TLS-terminating proxy, so the public origin is resolved at runtime from
// EMDASH_SITE_URL / SITE_URL. Do NOT fall back to localhost here: this value is
// baked at build time (where no env is set) and would override the runtime env,
// making EmDash derive the WebAuthn rpId as "localhost" (passkey origin error).
const siteUrl =
	process.env.EMDASH_SITE_URL || process.env.SITE_URL || undefined;

export default defineConfig({
	site: siteUrl,
	output: "server",
	adapter: node({ mode: "standalone" }),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	security: {
		allowedDomains: [
			{ hostname: "ahmetenes.com", protocol: "https" },
			{ hostname: "www.ahmetenes.com", protocol: "https" },
		],
	},
	integrations: [
		react(),
		emdash({
			siteUrl,
			database: sqlite({
				url: process.env.DATABASE_URL || "file:./data/data.db",
			}),
			storage: local({
				directory: process.env.MEDIA_DIR || "./data/uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			plugins: [formsPlugin(), publishPingPlugin(), cdnPurgePlugin()],
			marketplace: "https://marketplace.emdashcms.com",
		}),
	],
	// Turkce ğ/Ğ/ş/Ş/İ "latin-ext" alt kumesinde: yalnizca "latin" yuklenince bu
	// harfler Arial/Liberation ile ciziliyordu. 600: tema basliklari/dugmeleri
	// (yoksa tarayici sahte kalin uretir). Inter hicbir sayfada kullanilmiyordu.
	fonts: [
		{
			provider: fontProviders.google(),
			name: "DM Sans",
			cssVariable: "--font-personabio",
			weights: [400, 500, 600],
			subsets: ["latin", "latin-ext"],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			subsets: ["latin", "latin-ext"],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
