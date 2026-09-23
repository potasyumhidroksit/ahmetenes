import { ogImage } from "./responsive-image";

// Sabit sayfalarin ust fotografi (acik lisansli; atfi image-credits.json'da).
export const PAGE_HEROES: Record<string, { src: string; alt: string }> = {
	hakkimda: { src: "/blog/sayfa-hakkimda/cover.webp", alt: "Beyaz zemin üzerinde gümüş gövdeli eski bir 35 mm film kamerası" },
	now: { src: "/blog/sayfa-now/cover.webp", alt: "Ahşap masa üzerinde fincan tabağında bir fincan kahve, yukarıdan" },
	iletisim: { src: "/blog/sayfa-iletisim/cover.webp", alt: "Maviye boyanmış duvarda kırmızı bir posta kutusu ve yanında kırmızı bir kapı" },
	ekipman: { src: "/blog/sayfa-ekipman/cover.webp", alt: "Ahşap zemin üzerinde kapağıyla birlikte eski bir 28 mm geniş açı objektif" },
};

/** Paylasim gorseli (1200x630 JPEG), mutlak URL. */
export const pageHeroOg = (key: string, origin: string) => {
	const og = PAGE_HEROES[key] && ogImage(PAGE_HEROES[key].src);
	return og ? origin + og : undefined;
};
