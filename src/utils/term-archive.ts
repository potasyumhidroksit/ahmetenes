import { getTermsForEntries } from "emdash";
import type { Locale } from "./i18n";
import { localizedTerm } from "./localized-content";
import { localizedPosts } from "./localized-posts";
import { metaDescription } from "./meta-description";
import { byReadingOrder } from "./reading-order";

/** Kategori/etiket arsivi: terim + o terimdeki yazilar (okuma sirasinda) ve etiketleri. */
export async function loadTermArchive(taxonomy: "category" | "tag", slug: string | null | undefined, locale: Locale) {
	const term = slug ? await localizedTerm(taxonomy, slug, { includeCounts: false, locale }) : null;
	if (!term) return null;

	const { entries: datedPosts, cacheHint } = await localizedPosts(locale, {
		where: { [taxonomy]: term.slug },
		orderBy: { published_at: "desc" },
	});
	// /posts ile ayni okuma sirasi: yayin tarihleri tohumlamadan milisaniye
	// farkli oldugu icin tarih sirasi rastgeleydi.
	const posts = byReadingOrder(datedPosts);

	// Single batched query for tags on every post in this archive, rather
	// than calling getEntryTerms() per post (one round-trip per post).
	const tagsByEntry = await getTermsForEntries(
		"posts",
		posts.map((p) => p.data.id),
		"tag",
	);
	return {
		term,
		cacheHint,
		posts: posts.map((post) => ({ post, tags: tagsByEntry.get(post.data.id) ?? [] })),
	};
}

export type TermArchiveData = NonNullable<Awaited<ReturnType<typeof loadTermArchive>>>;

/** Aciklama arsivdeki yazi basliklarindan (ince/tekrar eden aciklama yerine). */
export const archiveDescription = (archive: TermArchiveData, kind: string) =>
	metaDescription(`${archive.term.label} ${kind} yazılar: ${archive.posts.map(({ post }) => post.data.title).join("; ")}.`);
