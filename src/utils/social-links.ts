// Sosyal menu baglantilari (profil karti ve icerik sayfasi cekmecesi).

/** "/email/<adres>[?…]" -> "mailto:<adres>[?…]"; digerleri oldugu gibi. */
function linkHref(url: string): string {
  const emailPath = url.match(/^\/email\/([^/?#\s]+@[^/?#\s]+)(\?.*)?$/i);
  return emailPath ? `mailto:${emailPath[1]}${emailPath[2] ?? ""}` : url;
}

/** Site ici yol ya da http(s)/mailto/tel; javascript: vb. semalar atilir. */
function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try { return ["https:", "http:", "mailto:", "tel:"].includes(new URL(href).protocol); } catch { return false; }
}

export function socialLinks<T extends { url: string }>(links: readonly T[]): (T & { href: string })[] {
  return links.map((link) => ({ ...link, href: linkHref(link.url) })).filter((link) => isSafeHref(link.href));
}
