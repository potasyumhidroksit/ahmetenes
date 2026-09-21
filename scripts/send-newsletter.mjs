#!/usr/bin/env node
// pnpm send-newsletter "Başlık" "slug" ["özet"]
// Onaylı bülten abonelerine yeni yazı duyurusu gönderir (Resend).
import { readFileSync, existsSync } from "node:fs";

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
const FROM = process.env.RESEND_FROM || "mail@ahmetenes.com";

const [title, slug, excerpt = ""] = process.argv.slice(2);
if (!title || !slug) {
  console.error('Kullanım: pnpm send-newsletter "Başlık" "slug" ["özet"]');
  process.exit(1);
}
if (!API_KEY) {
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
const list = [...new Set(subscribers())];
if (list.length === 0) {
  console.log("Onaylı abone yok.");
  process.exit(0);
}

let sent = 0;
for (const email of list) {
  const unsub = SITE + "/api/newsletter/unsubscribe?email=" + encodeURIComponent(email);
  const html =
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;color:#1c2229">' +
    '<div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#0066cc;margin-bottom:20px">Ahmet Enes</div>' +
    '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.25;margin:0 0 12px">' + esc(title) + "</h1>" +
    (excerpt ? '<p style="color:#536163;margin:0 0 20px">' + esc(excerpt) + "</p>" : "") +
    '<p style="margin:24px 0"><a href="' + postUrl + '" style="background:#0066cc;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Yazıyı oku</a></p>' +
    '<p style="color:#707a7c;font-size:12px;margin-top:28px">Bu e-postayı bültene kaydolduğun için alıyorsun. <a href="' + unsub + '" style="color:#707a7c">Bültenden çık</a>.</p>' +
    "</div>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [email], subject: title, html }),
  });
  if (!res.ok) {
    console.error("hata", email, res.status, await res.text());
    continue;
  }
  sent++;
}
console.log("gönderildi: " + sent + "/" + list.length + " abone");
