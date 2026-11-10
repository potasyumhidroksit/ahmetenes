// Galeri: kategori filtresi ve lightbox (adres /galeri/<id>, eski #kare-<id> baglantilari, kaydirma, paylasim).
import { flashLabel, shareOrCopy } from "./share";

// Kareler /galeri/<id> baglantisidir (JS'siz, yeni sekmede acma, tarayicilar);
// normal tiklama lightbox'i acar.
const items = document.querySelectorAll<HTMLAnchorElement>("[data-gallery-item]");
document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter || "tumu";
    document.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    items.forEach((item) => {
      item.hidden = !(filter === "tumu" || item.dataset.category === filter);
    });
  });
});

const dialog = document.querySelector<HTMLDialogElement>("[data-lightbox]");
if (dialog) {
  const img = dialog.querySelector<HTMLImageElement>("[data-lightbox-img]");
  const title = dialog.querySelector<HTMLElement>("[data-lightbox-title]");
  const meta = dialog.querySelector<HTMLElement>("[data-lightbox-meta]");
  const story = dialog.querySelector<HTMLElement>("[data-lightbox-story]");
  const count = dialog.querySelector<HTMLElement>("[data-lightbox-count]");
  const postLink = dialog.querySelector<HTMLAnchorElement>("[data-lightbox-post]");
  const sizes = img?.getAttribute("sizes") || "100vw";
  const visibleItems = () => Array.from(items).filter((el) => !el.hidden);
  let current = -1;
  let lastFocus: HTMLElement | null = null;

  // Komsu kareleri arka planda isit: ok/kaydirma aninda gecsin.
  const preload = (item?: HTMLAnchorElement) => {
    if (!item) return;
    const pre = new Image();
    pre.sizes = sizes;
    if (item.dataset.fullSrcset) pre.srcset = item.dataset.fullSrcset;
    pre.src = item.dataset.full || "";
  };

  const fill = (item: HTMLAnchorElement) => {
    if (!img || !title || !meta || !story) return;
    // Adres cubugu karenin kendi sayfasi (/galeri/<id>): kopyalanan baglanti
    // o karenin onizlemesiyle paylasilir. Eski #kare-<id> baglantilari da acar.
    history.replaceState(null, "", "/galeri/" + item.id.replace(/^kare-/, ""));
    // Oran CSS'e: görsel ekrana kendi oranıyla sığar, dikey kare geniş ekranda bilgiyi yanına alır.
    const ar = Number(item.dataset.ar);
    if (ar > 0) { dialog.style.setProperty("--ar", String(ar)); dialog.dataset.orient = ar < 1 ? "portrait" : "landscape"; }
    else { dialog.style.removeProperty("--ar"); delete dialog.dataset.orient; }
    img.srcset = item.dataset.fullSrcset || "";
    img.src = item.dataset.full || "";
    img.alt = item.dataset.title || "";
    title.textContent = item.dataset.title || "";
    meta.textContent = [item.dataset.exif, item.dataset.location, item.dataset.year].filter(Boolean).join(" · ");
    story.textContent = item.dataset.story || "";
    if (postLink) {
      postLink.hidden = !item.dataset.postHref;
      postLink.href = item.dataset.postHref || "";
      postLink.textContent = item.dataset.postTitle ? "Yazıda: " + item.dataset.postTitle + " →" : "";
    }
    const list = visibleItems();
    if (count) count.textContent = list.length > 1 ? `${current + 1} / ${list.length}` : "";
    if (list.length > 1) {
      preload(list[(current + 1) % list.length]);
      preload(list[(current - 1 + list.length) % list.length]);
    }
  };

  const step = (delta: number) => {
    const list = visibleItems();
    if (list.length === 0) return;
    current = (current + delta + list.length) % list.length;
    fill(list[current]);
  };

  items.forEach((item) => {
    item.addEventListener("click", (event) => {
      // Cmd/Ctrl/Shift/orta tik: tarayici bağlantıyı yeni sekmede/pencerede acar.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      current = visibleItems().indexOf(item);
      lastFocus = item;
      fill(item);
      dialog.showModal();
    });
  });

  dialog.addEventListener("close", () => {
    history.replaceState(null, "", "/galeri" + location.search);
    if (lastFocus) lastFocus.focus();
  });

  const linked = location.hash.startsWith("#kare-") ? document.getElementById(location.hash.slice(1)) : null;
  if (linked instanceof HTMLAnchorElement && linked.matches("[data-gallery-item]")) linked.click();
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Belge duzeyinde: derin baglantiyla acilista odak body'de kalabiliyor.
  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
  });
  // Dokunmatik: yatay kaydirma ile onceki/sonraki kare.
  let touchX = 0;
  let touchY = 0;
  dialog.addEventListener("touchstart", (event) => {
    touchX = event.changedTouches[0].clientX;
    touchY = event.changedTouches[0].clientY;
  }, { passive: true });
  dialog.addEventListener("touchend", (event) => {
    const dx = event.changedTouches[0].clientX - touchX;
    const dy = event.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  // Paylas: adres cubugu zaten karenin sayfasi (/galeri/<id>).
  const shareButton = dialog.querySelector<HTMLButtonElement>("[data-lightbox-share]");
  shareButton?.addEventListener("click", async () => {
    const result = await shareOrCopy(location.origin + location.pathname, title?.textContent || document.title);
    if (result === "copied") flashLabel(shareButton, "Bağlantı kopyalandı");
    if (result === "failed") flashLabel(shareButton, "Kopyalanamadı");
  });
  dialog.querySelector("[data-lightbox-close]")?.addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => step(-1));
  dialog.querySelector("[data-lightbox-next]")?.addEventListener("click", () => step(1));
}
