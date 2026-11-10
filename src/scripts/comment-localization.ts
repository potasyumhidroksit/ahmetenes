// EmDash yorum bilesenlerinin Ingilizce etiketleri/durum metinleri (Turkce sayfada).
const comments = document.querySelector<HTMLElement>(".article-comments");
const isTurkish = comments?.dataset.commentLocale === "tr";
const commentText: Record<string, string> = {
  Name: "Adın",
  Email: "E-posta adresin",
  Comment: "Yorumun",
  "Post Comment": "Yorumu gönder",
  "Submitting...": "Gönderiliyor...",
  "Comment submitted!": "Yorumun gönderildi!",
  "Failed to submit comment.": "Yorum gönderilemedi.",
  "Network error. Please try again.": "Bağlantı hatası, lütfen tekrar dene.",
};
const tr = (value: string) => isTurkish ? commentText[value] ?? value : value;
document.querySelectorAll<HTMLLabelElement>(".article-comments .ec-comment-form-field").forEach((label) => {
  const caption = label.querySelector("span");
  const field = label.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (!caption || !field) return;
  const translatedCaption = tr(caption.textContent?.trim() ?? "");
  caption.textContent = translatedCaption;
  field.placeholder = translatedCaption;
  label.classList.add("has-placeholder-label");
});
if (comments) {
  const count = Number(comments.dataset.commentCount ?? 0);
  const heading = comments.querySelector<HTMLElement>(".ec-comments-heading");
  if (heading && isTurkish) heading.textContent = count === 0 ? "Henüz yorum yok" : `${count} yorum`;
  comments.querySelectorAll<HTMLElement>(".ec-comment-form-submit, .ec-comment-form-status").forEach((element) => {
    const localizeElement = () => {
      const value = element.textContent?.trim() ?? "";
      const translated = tr(value);
      if (translated !== value) element.textContent = translated;
    };
    localizeElement();
    new MutationObserver(localizeElement).observe(element, { childList: true, characterData: true, subtree: true });
  });
}

export {};
