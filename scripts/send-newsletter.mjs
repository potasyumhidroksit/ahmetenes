#!/usr/bin/env node
// pnpm send-newsletter "Başlık" "slug" ["özet"] ["kapak görseli URL (JPEG)"]
// Genelde dogrudan degil `pnpm announce <slug> --send` ile cagrilir.
// Onaylı bülten abonelerine yeni yazı duyurusu gönderir (Resend).
import { readFileSync, existsSync } from "node:fs";
import { createHmac } from "node:crypto";

const DATA = process.env.NEWSLETTER_FILE || "/var/www/ahmetenes-data/newsletter.json";
const SITE = "https://ahmetenes.com";

try {
  const raw = readFileSync("/root/ahmetenes-emdash.env", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // env dosyası yoksa ortam değişkenlerine güven
}

const API_KEY = process.env.RESEND_API_KEY;
// Sunucudaki src/lib/newsletter.ts ile ayni sir ve sema ("unsubscribe" amacli).
const SECRET = process.env.NEWSLETTER_SECRET || process.env.EMDASH_AUTH_SECRET || "newsletter-secret";
const UNSUB_TTL = 2 * 365 * 24 * 60 * 60 * 1000;
function unsubscribeToken(email) {
  const payload = email + "." + (Date.now() + UNSUB_TTL);
  return payload + "." + createHmac("sha256", SECRET).update("unsubscribe|" + payload).digest("hex");
}
const FROM = process.env.RESEND_FROM || "mail@ahmetenes.com";

const [title, slug, excerpt = "", image = ""] = process.argv.slice(2);
if (!title || !slug) {
  console.error('Kullanım: pnpm send-newsletter "Başlık" "slug" ["özet"]');
  process.exit(1);
}
// NEWSLETTER_PREVIEW=dosya.html: gondermeden ornek bir e-posta HTML'i yaz.
const PREVIEW = process.env.NEWSLETTER_PREVIEW || "";
if (!API_KEY && !PREVIEW) {
  console.error("RESEND_API_KEY bulunamadı.");
  process.exit(1);
}

function subscribers() {
  if (!existsSync(DATA)) return [];
  try {
    const d = JSON.parse(readFileSync(DATA, "utf8"));
    const arr = Array.isArray(d.subscribers) ? d.subscribers : Array.isArray(d) ? d : [];
    return arr
      .map((s) => (typeof s === "string" ? { email: s, confirmed: true } : s))
      .filter((s) => s && s.confirmed !== false)
      .map((s) => s.email);
  } catch {
    return [];
  }
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const postUrl = SITE + "/" + slug;
const list = PREVIEW ? ["ornek@example.com"] : [...new Set(subscribers())];
if (list.length === 0) {
  console.log("Onaylı abone yok.");
  process.exit(0);
}

let sent = 0;
for (const email of list) {
  const unsub = SITE + "/api/newsletter/unsubscribe?token=" + encodeURIComponent(unsubscribeToken(email));
  const html =
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;color:#1c2229">' +
    '<div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#606b6e;margin-bottom:20px">Ahmet Enes</div>' +
    (image ? '<a href="' + postUrl + '"><img src="' + esc(image) + '" alt="" width="512" style="display:block;width:100%;max-width:512px;height:auto;border-radius:8px;margin:0 0 20px"></a>' : "") +
    '<h1 style="font-weight:600;font-size:24px;line-height:1.25;margin:0 0 12px">' + esc(title) + "</h1>" +
    (excerpt ? '<p style="color:#536163;margin:0 0 20px">' + esc(excerpt) + "</p>" : "") +
    '<p style="margin:24px 0"><a href="' + postUrl + '" style="background:#1d2128;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Yazıyı oku</a></p>' +
    '<p style="color:#707a7c;font-size:12px;margin-top:28px">Bu e-postayı bültene kaydolduğun için alıyorsun. <a href="' + unsub + '" style="color:#707a7c">Bültenden çık</a>.</p>' +
    "</div>";
  if (PREVIEW) {
    (await import("node:fs")).writeFileSync(PREVIEW, html);
    console.log("önizleme yazıldı: " + PREVIEW);
    process.exit(0);
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: title,
      html,
      // Duz metin surumu (yalniz HTML spam puanini artirir).
      text: title + "\n\n" + (excerpt ? excerpt + "\n\n" : "") + "Yazıyı oku: " + postUrl + "\n\n—\nBültenden çık: " + unsub,
      // RFC 8058 tek tik cikis: saglayici token'li URL'e Origin'siz POST atar;
      // uretimde dogrulandi (200). Yetki imzali token'dadir.
      headers: {
        "List-Unsubscribe": "<mailto:info@ahmetenes.com?subject=unsubscribe>, <" + unsub + ">",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) {
    console.error("hata", email, res.status, await res.text());
    continue;
  }
  sent++;
}
console.log("gönderildi: " + sent + "/" + list.length + " abone");
