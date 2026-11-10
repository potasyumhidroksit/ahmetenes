type Tagged = { tags?: string[] };

/** Ilk onbellek ipucunun alanlari + hepsinin etiketleri (birden cok sorgu tek sayfada). */
export function mergeCacheHints<T extends Tagged>(base: T, ...others: Tagged[]): T {
	return { ...base, tags: [base, ...others].flatMap((hint) => hint.tags ?? []) };
}
