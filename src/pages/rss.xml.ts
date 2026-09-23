import type { APIRoute } from "astro";
import { getSiteSettings } from "emdash";

import { localeFromUrl, localePath, translate } from "../utils/i18n";
import { localizedPosts } from "../utils/localized-posts";
import { imageSrc, localImage } from "../lib/responsive-image";
import { resolveBlogSiteIdentity } from "../utils/site-identity";

export const GET: APIRoute = async ({ site, url }) => {
	const locale = localeFromUrl(url);
	// Sondaki "/" atilir; yoksa yollar "//slug" olur.
	const siteUrl = (site?.toString() || url.origin).replace(/\/$/, "");
	const { siteTitle, siteTagline } = resolveBlogSiteIdentity(await getSiteSettings());

	const { entries: posts } = await localizedPosts(locale, {
		orderBy: { published_at: "desc" },
		limit: 20,
	});

	// Sabit "son derleme": en son yazi degisikligi (her istekte "simdi" olunca
	// okuyucular akisi her seferinde degismis sanip yeniden indiriyordu).
	const lastChange = new Date(Math.max(0, ...posts.map((post) => (post.data.updatedAt ?? post.data.publishedAt ?? new Date(0)).getTime())));

	const items = posts
		.map((post) => {
			if (!post.data.publishedAt) return null;
			const pubDate = post.data.publishedAt.toUTCString();

			const postUrl = `${siteUrl}${localePath(`/${post.id}`, locale)}`;
			const title = escapeXml(post.data.title || "Untitled");
			const description = escapeXml(post.data.excerpt || "");
			// Feed okuyucular (Feedly, NetNewsWire) kapak gorselini media:content'ten alir.
			const cover = imageSrc(post.data.featured_image);
			const coverUrl = cover ? (cover.startsWith("http") ? cover : `${siteUrl}${cover}`) : "";
			const size = localImage(cover);
			const media = coverUrl
				? `\n      <media:content url="${escapeXml(coverUrl)}" medium="image" type="image/webp"${size ? ` width="${size.width}" height="${size.height}"` : ""}/>`
				: "";
			const labels = [...(post.data.terms?.category ?? []), ...(post.data.terms?.tag ?? [])].map((term) => term.label);
			const terms = [...new Set(labels)]
				.map((label) => `\n      <category>${escapeXml(label)}</category>`)
				.join("");

			return `    <item>
      <title>${title}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>Ahmet Enes</dc:creator>
      <description>${description}</description>${media}${terms}
    </item>`;
		})
		.filter(Boolean)
		.join("\n");

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(translate(locale, siteTitle))}</title>
    <description>${escapeXml(translate(locale, siteTagline))}</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}${localePath("/rss.xml", locale)}" rel="self" type="application/rss+xml"/>
    <language>${locale}</language>
    <image>
      <url>${siteUrl}/icons/icon-192.png</url>
      <title>${escapeXml(translate(locale, siteTitle))}</title>
      <link>${siteUrl}</link>
    </image>
    <lastBuildDate>${lastChange.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
			"Last-Modified": lastChange.toUTCString(),
		},
	});
};

const XML_ESCAPE_PATTERNS = [
	[/&/g, "&amp;"],
	[/</g, "&lt;"],
	[/>/g, "&gt;"],
	[/"/g, "&quot;"],
	[/'/g, "&apos;"],
] as const;

function escapeXml(str: string): string {
	let result = str;
	for (const [pattern, replacement] of XML_ESCAPE_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}
