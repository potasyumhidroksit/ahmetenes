// Dekoratif cizim varyantlari (public/cizim/<ad>[-acik].webp) ve deterministik secim.
// Secim sunucuda yapilir: ayni anahtar hep ayni cizimi verir (yazi slug'i, adres, gun).
// Sayfalar CDN'de kisa sure (s-maxage=300 + stale-while-revalidate) tutulur; gune gore
// secimde bu yalnizca degisimin birkac dakika/saat gecikmesi demektir, celiski yok.

/** FNV-1a: kucuk, kararli dize ozeti. */
function ozet(anahtar: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < anahtar.length; i++) {
		h ^= anahtar.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	// Son karistirma: kucuk modlarda (2, 3) alt bitler tek basina dagilimi bozmasin.
	h ^= h >>> 16;
	h = Math.imul(h, 0x45d9f3b);
	h ^= h >>> 16;
	return h >>> 0;
}

/** Anahtardan kararli bir sira numarasi. */
export function sira(anahtar: string): number {
	return ozet(anahtar);
}

export function sec(liste: readonly string[], anahtar: string): string {
	return liste[ozet(anahtar) % liste.length];
}

/** Istanbul takvimine gore gunun anahtari (YYYY-MM-DD). */
export function gunAnahtari(): string {
	return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

/** Ana sayfa menu kutulari: adres -> varyantlar (gune gore doner, tum kutular ayni sirada). */
export const MENU_CIZIMLERI: Record<string, readonly string[]> = {
	"/galeri": ["menu-galeri", "menu-karanlik-oda"],
	"/ekipman": ["menu-ekipman", "menu-film-kutulari"],
	"/medya": ["menu-medya", "menu-sinema-salonu"],
	"/posts": ["menu-yazilar", "menu-kod-kahve"],
	"/hakkimda": ["menu-hakkimda", "menu-canta-harita"],
	"/iletisim": ["menu-iletisim", "menu-kartpostal"],
};

/** Yazi sonu kapanis cizimi (yazinin slug'ina gore). */
export const KAPANIS_CIZIMLERI = ["kapanis", "altin-saat", "yagmurlu-cam", "deniz-feneri"] as const;

/** 404 (istenen adrese gore). */
export const KAYIP_CIZIMLERI = ["kayip-yol", "canta-harita", "deniz-feneri"] as const;

/** Arama bos/sonucsuz (sorguya gore). */
export const ARAMA_CIZIMLERI = ["arama", "isik-masasi"] as const;

/** Yazilar arsivi basligi (gune gore) ve etiket sayfalari (etiket slug'ina gore). */
export const ARSIV_CIZIMLERI = ["masa", "sokak", "karanlik-oda", "isik-masasi", "film-kutulari", "altin-saat"] as const;

/** Kategoriye ozgu baslik cizimi; listede olmayan kategori ARSIV_CIZIMLERI'nden secilir. */
export const KATEGORI_CIZIMLERI: Record<string, string> = {
	teknik: "isik-masasi",
	sokak: "sokak",
	sanat: "karanlik-oda",
	baslangic: "ilk-kamera",
	gezi: "canta-harita",
	ekipman: "film-kutulari",
};
