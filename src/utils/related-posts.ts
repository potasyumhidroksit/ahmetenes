// "Ilgini Cekebilir": ortak kategori (2 puan) ve etiket (1 puan) sayisina
// gore; esitlikte gelen sira (en yeni). Yalnizca en yeniyi gostermek konu
// disi yazilari one cikariyordu.
type Terms = { category?: { slug: string }[]; tag?: { slug: string }[] };
type Entry = { id: string; data: object };

const termSlugs = (list: { slug: string }[] | undefined) => new Set((list ?? []).map((term) => term.slug));
const termsOf = (entry: Entry): Terms => (entry.data as { terms?: Terms }).terms ?? {};

export function relatedPosts<T extends Entry>(posts: readonly T[], post: Entry, limit = 3): T[] {
	const ownCategories = termSlugs(termsOf(post).category);
	const ownTags = termSlugs(termsOf(post).tag);
	const relevance = (p: T) =>
		2 * [...termSlugs(termsOf(p).category)].filter((slug) => ownCategories.has(slug)).length +
		[...termSlugs(termsOf(p).tag)].filter((slug) => ownTags.has(slug)).length;
	return posts
		.filter((p) => p.id !== post.id)
		.map((p, order) => ({ p, order, score: relevance(p) }))
		.sort((a, b) => b.score - a.score || a.order - b.order)
		.slice(0, limit)
		.map(({ p }) => p);
}
