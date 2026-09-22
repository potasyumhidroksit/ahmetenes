// Turkce arama yardimcilari: aksan/ı-i katlamali eslesme, yalnizca gercek metin
// alanlari (span metni, gorsel alt/caption), vurgulu ve guvenli (escape) ozet.

/** "Işık" -> "isik", "ÇİĞDEM" -> "cigdem": tr kucuk harf + aksanlari sil. */
function foldChar(ch: string): string {
  return ch
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

export function fold(text: string): string {
  return Array.from(text, foldChar).join("");
}

/** Katlanmis metin + her katlanmis karakterin orijinaldeki indeksi. */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  let index = 0;
  for (const ch of Array.from(text)) {
    const f = foldChar(ch);
    for (let i = 0; i < f.length; i++) map.push(index);
    folded += f;
    index += ch.length;
  }
  map.push(index);
  return { folded, map };
}

/**
 * Portable Text'ten yalnizca okunur metin (_type, _key, url, style vb. haric).
 * Bir blogun span'leri bitisik birlesir (vurgu kelimeyi bolmesin); bloklar
 * noktalama yoksa ". " ile ayrilir (baslik sonraki paragrafa yapismasin).
 */
export function plainText(value: unknown): string {
  const chunks: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== "object" || node instanceof Date) return;
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.children) && record._type === "block") {
      chunks.push(record.children.map((child) => (typeof (child as { text?: unknown }).text === "string" ? (child as { text: string }).text : "")).join(""));
      return;
    }
    for (const key of ["alt", "caption"]) {
      if (typeof record[key] === "string") chunks.push(record[key] as string);
    }
    for (const child of Object.values(record)) if (child && typeof child === "object") walk(child);
  };
  walk(value);
  return chunks
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((chunk) => (/[.!?:;…]$/.test(chunk) ? chunk : chunk + "."))
    .join(" ");
}

export function searchTerms(query: string): string[] {
  return [...new Set(fold(query.slice(0, 100)).split(/\s+/).filter(Boolean))].slice(0, 8);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Metni escape eder, terimlerin gectigi yerleri <mark> ile sarar. */
export function highlight(text: string, terms: string[]): string {
  const { folded, map } = foldWithMap(text);
  const ranges: Array<[number, number]> = [];
  for (const term of terms) {
    let at = folded.indexOf(term);
    while (at !== -1) {
      ranges.push([map[at], map[at + term.length]]);
      at = folded.indexOf(term, at + term.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let html = "";
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) continue;
    html += escapeHtml(text.slice(cursor, start)) + "<mark>" + escapeHtml(text.slice(start, end)) + "</mark>";
    cursor = end;
  }
  return html + escapeHtml(text.slice(cursor));
}

/** Ilk eslesmenin cevresinden kelime sinirinda kirpilmis kisa pencere. */
export function excerptAround(text: string, terms: string[], before = 70, after = 150): string | null {
  const { folded, map } = foldWithMap(text);
  let first = -1;
  for (const term of terms) {
    const at = folded.indexOf(term);
    if (at !== -1 && (first === -1 || at < first)) first = at;
  }
  if (first === -1) return null;
  const hit = map[first];
  let start = Math.max(0, hit - before);
  let end = Math.min(text.length, hit + after);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < hit) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > hit) end = space;
  }
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}
