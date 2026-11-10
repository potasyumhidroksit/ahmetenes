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

// Turkish interface strings: pages pass Turkish literals, which are returned
// unchanged; English literals (a few shared layouts) are mapped to Turkish.
const englishToTurkish: Record<string, string> = {
  Home: "Ana sayfa", About: "Hakkımda", Posts: "Yazılar", "My Blog": "Ahmet Enes",
  Navigate: "Gezin", Connect: "Bağlan", Search: "Ara", "Search...": "Yazılarda ara...",
  Admin: "Yönetim", RSS: "RSS", "All posts": "Tüm yazılar", "Read more": "Devamını oku",
  Categories: "Kategoriler", Tags: "Etiketler", "Recent posts": "Son yazılar",
  "Keep reading": "İlgini çekebilir", Published: "Yayın tarihi", "Reading time": "Okuma süresi",
  "Table of contents": "İçindekiler", "On this page": "Bu yazıda", Author: "Yazar", Authors: "Yazarlar",
  "Page not found": "Sayfa bulunamadı", "Back to home": "Ana sayfaya dön",
};

export const translate = (_locale: Locale, text: string) =>
  englishToTurkish[text] ?? text;

export function readingTimeLabel(_locale: Locale, minutes: number): string {
  return minutes + " dk okuma";
}
export function commentCountLabel(_locale: Locale, count: number): string {
  return count === 0 ? "Henüz yorum yok" : count + " yorum";
}
export function menuLabel(label: string, _locale: Locale) {
  const defaults: Record<string, string> = { Home: "Ana sayfa", About: "Hakkımda", Posts: "Yazılar" };
  return translate("tr", defaults[label] ?? label);
}
