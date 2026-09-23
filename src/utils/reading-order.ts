// Yazilarin okuma sirasi ("sira" alani): yeni baslayan biri icin temellerden
// ileri konulara. Sirasiz yazilar sona, kendi aralarinda gelen sirayla (tarih).
type Ordered = { data: object };

const rank = (post: Ordered) => {
	const n = Number((post.data as { sira?: unknown }).sira);
	return Number.isInteger(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
};

export function byReadingOrder<T extends Ordered>(posts: readonly T[]): T[] {
	return posts
		.map((post, index) => ({ post, index }))
		.sort((a, b) => rank(a.post) - rank(b.post) || a.index - b.index)
		.map(({ post }) => post);
}

/** Okuma sirasinda bir onceki ve sonraki yazi (yalnizca sirali yazilar arasinda). */
export function readingNeighbors<T extends Ordered & { id: string }>(posts: readonly T[], id: string) {
	const ordered = byReadingOrder(posts).filter((post) => rank(post) !== Number.POSITIVE_INFINITY);
	const index = ordered.findIndex((post) => post.id === id);
	if (index === -1) return undefined;
	return { prev: ordered[index - 1], next: ordered[index + 1], position: index + 1, total: ordered.length };
}
