import type { APIRoute } from "astro";
import { readBody, responder, safeReturnPath } from "../../../lib/form-request";
import { CONFIRM_TTL_MS, addSubscriber, removeSubscriber, signEmailToken } from "../../../lib/newsletter";
import { clientIp, isBot, rateLimit } from "../../../lib/rate-limit";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.RESEND_FROM || "mail@ahmetenes.com";

export const POST: APIRoute = async ({ request, url }) => {
  const { body, isForm } = await readBody(request);
  const b = body ?? {};
  const respond = responder(isForm, safeReturnPath(body?.donus, "/iletisim"), "bulten", "bulten");
  if (!body) return respond({ ok: false, error: "Geçersiz istek." }, 400);
  if (isBot(b)) return respond({ ok: true, message: "Teşekkürler!" });
  if (!rateLimit("newsletter:" + clientIp(request), 5, 60_000)) {
    return respond({ ok: false, error: "Çok fazla istek, lütfen biraz bekleyin." }, 429);
  }
  const raw = typeof b.email === "string" ? b.email : "";
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return respond({ ok: false, error: "Geçerli bir e-posta girin." }, 400);
  }

  const result = await addSubscriber(email);

  // Ayni adrese en fazla 10 dakikada bir onay e-postasi: farkli IP'lerle
  // birinin gelen kutusunu onay mailiyle doldurmak mumkun olmasin.
  if (result.ok && result.pending && !rateLimit("newsletter-mail:" + email, 1, 10 * 60_000)) {
    return respond({ ok: true, pending: true, message: "Onay e-postası az önce gönderildi — gelen kutunu (ve spam klasörünü) kontrol et." });
  }

  if (result.ok && result.pending && RESEND_API_KEY) {
    const token = signEmailToken(email, CONFIRM_TTL_MS, "confirm");
    // Link Host basligindan degil, yapilandirilmis site adresinden uretilir.
    const confirmUrl = new URL(
      "/api/newsletter/confirm?token=" + encodeURIComponent(token),
      process.env.SITE_URL || url.origin
    ).toString();
    const html =
      "<!doctype html><html><body style='font-family:system-ui,sans-serif;padding:24px;color:#1c2229;background:#fff'>" +
      "<h2 style='margin-bottom:8px'>Bülten onayı</h2>" +
      "<p>Bültenimize kayıt olduğun için teşekkürler. Aboneliğini tamamlamak için aşağıdaki butona tıkla:</p>" +
      "<p style='margin:24px 0'><a href='" + confirmUrl + "' style='background:#1d2128;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600'>Aboneliği Onayla</a></p>" +
      "<p style='color:#707a7c;font-size:13px'>Bu isteği sen yapmadıysan bu e-postayı yoksayabilirsin. Onay 7 gün geçerli.</p>" +
      "</body></html>";
    // Duz metin surumu: yalniz HTML iletiler spam filtrelerinde puan kaybeder.
    const text =
      "Bülten onayı\n\nBültene kayıt olduğun için teşekkürler. Aboneliğini tamamlamak için bu bağlantıyı aç:\n" +
      confirmUrl +
      "\n\nBu isteği sen yapmadıysan bu e-postayı yoksayabilirsin. Onay 7 gün geçerli.\n— Ahmet Enes, ahmetenes.com";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [email], subject: "Bülten aboneliğini onayla", html, text }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error("resend " + res.status);
    } catch {
      await removeSubscriber(email);
      return respond({ ok: false, error: "Doğrulama e-postası gönderilemedi, tekrar dene." }, 500);
    }
  }

  return respond(result);
};
