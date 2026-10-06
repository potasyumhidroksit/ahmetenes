// Yazi ara basliklari icin kalici, okunur baglanti kimligi ("Işığı Okumak" -> "isigi-okumak").
import { fold } from "./search-text";

type Span = { text?: unknown };

/** Portable Text blogunun duz metni. */
export function blockText(children: unknown): string {
  return Array.isArray(children) ? children.map((child) => (typeof (child as Span)?.text === "string" ? (child as Span).text : "")).join("") : "";
}

export function headingId(children: unknown): string {
  const slug = fold(blockText(children)).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "");
  return slug || "bolum";
}
