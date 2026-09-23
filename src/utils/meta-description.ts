/** Arama sonucu aciklamasi: bosluklari sadelestir, ~155 karakterde kelime sinirinda kes. */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:·—-]+$/, "") + "…";
}
