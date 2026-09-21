export type Locale = "tr" | "en";

/**
 * ahmetenes.com is published in Turkish only, so every route resolves to
 * locale "tr". The Locale type still admits "en" so the theme's shared
 * components keep type-checking; no "/en" routes are rendered.
 */
export function localeFromUrl(_url: URL): Locale {
  return "tr";
}

/**
 * Canonicalise a content path. Turkish is the default locale, so the legacy
 * "/tr" prefix is stripped and old CMS prefixes collapse to canonical routes.
 */
export function localePath(path: string, _locale: Locale = "tr"): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/_emdash")) return path;
  const base = path.replace(/^\/tr(?=\/|$|[?#])/, "") || "/";
  const canonical = base.replace(/^\/(?:pages|posts)\/([^/?#]+)(?=\/|[?#]|$)/, "/$1");
  return canonical.replace(/^\/(?:posts|yazilar)(?=\/?$|[?#])/, "/posts");
}

// Turkish interface strings. `translate()` is fed Turkish literals by most
// pages; English literals (a few shared layouts) are mapped back to Turkish.
const interfaceTr: Record<string, string> = {
  "Ayarlar": "Ayarlar", "Görünüm": "Görünüm", "Dil": "Dil", "Alt bilgi": "Alt bilgi",
  "Ana sayfa": "Ana sayfa", "Hakkımda": "Hakkımda", "Yazılar": "Yazılar", "Ana menü": "Ana menü",
  "Görüşme": "Görüşme", "Fotoğraflar": "Fotoğraflar", "Menüyü kapat": "Menüyü kapat",
  "Tema": "Tema", "Açık": "Açık", "Koyu": "Koyu", "E-posta": "E-posta",
  "Kişisel notlar & düşünceler": "Kişisel notlar & düşünceler",
  "Profil bağlantıları": "Profil bağlantıları", "profili": "profili", "Profil": "Profil",
  "Renk teması": "Renk teması", "Açık tema": "Açık tema", "Koyu tema": "Koyu tema",
  "Dil seçimi": "Dil seçimi", "İçeriğe geç": "İçeriğe geç", "Yaşam yolundan notlar": "Yaşam yolundan notlar",
  "Yazılarda ara": "Yazılarda ara", "Ara": "Ara", "Yönetim": "Yönetim", "Tüm yazılar": "Tüm yazılar",
  "Ana sayfaya dön": "Ana sayfaya dön", "Notlar, fikirler ve üzerine düşündüklerim.": "Notlar, fikirler ve üzerine düşündüklerim.",
  "Yazı görünümü": "Yazı görünümü", "Liste": "Liste", "Kare": "Kare", "Tekli": "Tekli",
  "Biraz düşünce, biraz zaman.": "Biraz düşünce, biraz zaman.", "Yeni yazılar burada yerini alacak.": "Yeni yazılar burada yerini alacak.",
  "Notlar & düşünceler": "Notlar & düşünceler", "Yazıyı oku": "Yazıyı oku", "dk okuma": "dk okuma",
  "Kategori": "Kategori", "Etiket": "Etiket", "yazı": "yazı",
  "Bu kategoride henüz yazı yok.": "Bu kategoride henüz yazı yok.", "Bu etikette henüz yazı yok.": "Bu etikette henüz yazı yok.",
  "Yayın tarihi": "Yayın tarihi", "Okuma süresi": "Okuma süresi", "İçindekiler": "İçindekiler", "Bu yazıda": "Bu yazıda",
  "Yazar": "Yazar", "Yazarlar": "Yazarlar", "Etiketler": "Etiketler", "İlgini Çekebilir": "İlgini Çekebilir",
  "Yazılar arasında arayın": "Yazılar arasında arayın", "Yazılarda ara...": "Yazılarda ara...", "Başlıksız": "Başlıksız",
  "Bir kelime veya konu yazarak notlar arasında gezinin.": "Bir kelime veya konu yazarak notlar arasında gezinin.",
  "Sayfa bulunamadı": "Sayfa bulunamadı", "Aradığınız sayfa bulunamadı.": "Aradığınız sayfa bulunamadı.",
};

const englishToTurkish: Record<string, string> = {
  Home: "Ana sayfa", About: "Hakkımda", Posts: "Yazılar", "My Blog": "Ahmet Enes",
  Navigate: "Gezin", Connect: "Bağlan", Search: "Ara", "Search...": "Yazılarda ara...",
  Admin: "Yönetim", RSS: "RSS", "All posts": "Tüm yazılar", "Read more": "Devamını oku",
  Categories: "Kategoriler", Tags: "Etiketler", "Recent posts": "Son yazılar",
  "Keep reading": "İlgini Çekebilir", Published: "Yayın tarihi", "Reading time": "Okuma süresi",
  "Table of contents": "İçindekiler", "On this page": "Bu yazıda", Author: "Yazar", Authors: "Yazarlar",
  "Page not found": "Sayfa bulunamadı", "Back to home": "Ana sayfaya dön",
};

export const translate = (_locale: Locale, text: string) =>
  interfaceTr[text] ?? englishToTurkish[text] ?? text;

export function readingTimeLabel(_locale: Locale, minutes: number): string {
  return "Okuma Süresi " + minutes + " Dakika";
}
export function commentCountLabel(_locale: Locale, count: number): string {
  return count === 0 ? "Henüz Yorum Yok" : count + " Yorum Var";
}
export function menuLabel(label: string, _locale: Locale) {
  const defaults: Record<string, string> = { Home: "Ana sayfa", About: "Hakkımda", Posts: "Yazılar" };
  return translate("tr", defaults[label] ?? label);
}
