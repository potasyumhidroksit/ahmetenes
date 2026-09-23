import type { APIRoute } from "astro";
import { readBody, responder } from "../../lib/form-request";
import { clientIp, isBot, rateLimit } from "../../lib/rate-limit";

export const prerender = false;

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.RESEND_FROM || "mail@ahmetenes.com";
const TO = process.env.CONTACT_TO || "info@ahmetenes.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const POST: APIRoute = async ({ request }) => {
  const { body, isForm } = await readBody(request);
  const b = body ?? {};
  const respond = responder(isForm, "/iletisim", "iletisim", "iletisim-form");
  if (!body) return respond({ ok: false, error: "Geçersiz istek." }, 400);

  // Bot korumasi: honeypot dolduysa sessizce yut; IP hiz sinirini uygula.
  if (isBot(b)) return respond({ ok: true });
  if (!rateLimit("contact:" + clientIp(request), 5, 60_000)) {
    return respond({ ok: false, error: "Çok fazla istek, lütfen biraz bekleyin." }, 429);
  }

  // Kontrol karakterleri (satir sonu vb.) konu satirina tasinmasin.
  const name = typeof b.name === "string" ? b.name.replace(/[\u0000-\u001f\u007f]+/g, " ").trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (
    name.length < 2 ||
    name.length > 120 ||
    !EMAIL_RE.test(email) ||
    message.length < 5 ||
    message.length > 5000
  ) {
    return respond({ ok: false, error: "Lütfen tüm alanları doğru doldurun." }, 400);
  }
  if (!RESEND_API_KEY) {
    return respond({ ok: false, error: "E-posta servisi yapılandırılmadı." }, 500);
  }

  const html =
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c2229">' +
    '<h2 style="font-size:20px;margin:0 0 16px">Yeni iletişim mesajı</h2>' +
    '<p style="margin:0 0 6px"><strong>Ad:</strong> ' + escapeHtml(name) + "</p>" +
    '<p style="margin:0 0 16px"><strong>E-posta:</strong> ' + escapeHtml(email) + "</p>" +
    '<div style="border-left:3px solid #1d2128;background:#f2f2f2;padding:14px 18px;border-radius:6px;white-space:pre-wrap">' +
    escapeHtml(message) +
    "</div>" +
    '<p style="margin-top:20px;font-size:12px;color:#707a7c">Ahmet Enes — ahmetenes.com</p>' +
    "</div>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: "Yeni iletişim mesajı — " + name,
        text: message + String.fromCharCode(10, 10) + "— " + name + " (" + email + ")",
        html,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return respond({ ok: false, error: "Mesaj gönderilemedi, lütfen sonra tekrar deneyin." }, 502);
    }
    return respond({ ok: true });
  } catch {
    return respond({ ok: false, error: "Mesaj gönderilemedi, lütfen sonra tekrar deneyin." }, 500);
  }
};
