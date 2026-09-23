// Dipnotlar (eski blogdaki "[^n]" sozdizimi): metindeki [^n] isaretleri
// #dipnot-n'e giden ust simge baglanti olur; "[^n]: ..." ile baslayan
// paragraflar govdeden cikarilip yazinin sonunda "Dipnotlar" listesi olur.
// Icerik degismez; yalnizca gosterim donusumu (duzenleme modunda uygulanmaz).

type Span = { _type?: string; _key?: string; text?: string; marks?: string[] };
type MarkDef = { _key: string; _type: string; href?: string };
export type FootnoteBlock = {
  _type?: string;
  _key?: string;
  children?: Span[];
  markDefs?: MarkDef[];
  [key: string]: unknown;
};
export type Footnote = { n: number; block: FootnoteBlock };

const REF = /\[\^(\d{1,3})\]/g;
const HAS_REF = /\[\^\d{1,3}\]/;
// Goc bazi tanimlarin basindaki "["i yuttu: "^1]: ..." da tanim sayilir.
const DEF = /^\s*\[?\^(\d{1,3})\]:\s*/;

const hasMarker = (block: FootnoteBlock) =>
  (block.children ?? []).some((span) => typeof span.text === "string" && span.text.includes("^"));

function withRefs(block: FootnoteBlock): FootnoteBlock {
  const children = block.children ?? [];
  if (!children.some((span) => typeof span.text === "string" && HAS_REF.test(span.text))) return block;
  const markDefs = [...(block.markDefs ?? [])];
  const out: Span[] = [];
  for (const [i, span] of children.entries()) {
    const text = span.text ?? "";
    if (!HAS_REF.test(text)) {
      out.push(span);
      continue;
    }
    let last = 0;
    let part = 0;
    for (const match of text.matchAll(REF)) {
      const at = match.index ?? 0;
      if (at > last) out.push({ ...span, _key: `${span._key ?? i}-t${part++}`, text: text.slice(last, at) });
      const key = `dipnot-${block._key ?? "b"}-${i}-${part}`;
      markDefs.push({ _key: key, _type: "link", href: "#dipnot-" + Number(match[1]) });
      out.push({ _type: "span", _key: `${span._key ?? i}-r${part++}`, text: String(Number(match[1])), marks: [...(span.marks ?? []), key] });
      last = at + match[0].length;
    }
    if (last < text.length) out.push({ ...span, _key: `${span._key ?? i}-t${part}`, text: text.slice(last) });
  }
  return { ...block, children: out, markDefs };
}

export function extractFootnotes(blocks: unknown): { body: unknown; notes: Footnote[] } {
  if (!Array.isArray(blocks) || !blocks.some((b) => (b as FootnoteBlock)?._type === "block" && hasMarker(b as FootnoteBlock))) {
    return { body: blocks, notes: [] };
  }
  const body: unknown[] = [];
  const notes: Footnote[] = [];
  for (const raw of blocks as FootnoteBlock[]) {
    if (raw?._type !== "block") {
      body.push(raw);
      continue;
    }
    const first = raw.children?.[0];
    const def = typeof first?.text === "string" ? first.text.match(DEF) : null;
    if (def && first) {
      const children = [{ ...first, text: first.text!.slice(def[0].length) }, ...(raw.children ?? []).slice(1)];
      notes.push({ n: Number(def[1]), block: withRefs({ ...raw, children }) });
      continue;
    }
    body.push(withRefs(raw));
  }
  notes.sort((a, b) => a.n - b.n);
  return { body, notes };
}
