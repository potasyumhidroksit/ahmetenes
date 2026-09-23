// Paylasim: destekleyen cihazda sistem paylasim menusu (mobil), yoksa
// baglantiyi panoya kopyalar. Instagram gibi paylasim adresi olmayan
// uygulamalar icin tek yol.
export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareOrCopy(url: string, title: string): Promise<ShareResult> {
  if (typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Dugmenin etiketini kisa sure sonuc mesajiyla degistirir (aria-live ile okunur). */
export function flashLabel(target: HTMLElement, text: string, ms = 2000): void {
  const original = target.dataset.label ?? target.textContent ?? "";
  target.dataset.label = original;
  target.textContent = text;
  window.setTimeout(() => {
    target.textContent = original;
  }, ms);
}
