import node from "@astrojs/node";
import react from "@astrojs/react";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { defineConfig, fontProviders } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Self-hosted (Node) deployment for ahmetenes.com. The origin sits behind a
// TLS-terminating proxy, so the public origin is supplied explicitly instead
// of being inferred from the internal request.
const siteUrl =
	process.env.EMDASH_SITE_URL || process.env.SITE_URL || "http://localhost:4321";

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
			plugins: [formsPlugin()],
			marketplace: "https://marketplace.emdashcms.com",
		}),
	],
	fonts: [
		{ provider: fontProviders.google(), name: "DM Sans", cssVariable: "--font-personabio", weights: [400, 500], fallbacks: ["sans-serif"] },
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-body",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
