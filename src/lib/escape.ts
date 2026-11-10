// HTML/XML metin kacisi: e-posta govdeleri, RSS, sitemap ve arama vurgusu ortak kullanir.

/** & < > " kacisi (oznitelik ve metin icin yeterli). */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** escapeHtml + kesme isareti (XML). */
export function escapeXml(value: string): string {
  return escapeHtml(value).replace(/'/g, "&apos;");
}
