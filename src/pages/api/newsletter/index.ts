import type { APIRoute } from "astro";
import { addSubscriber, removeSubscriber, signEmailToken } from "../../../lib/newsletter";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.RESEND_FROM || "mail@ahmetenes.com";

export const POST: APIRoute = async ({ request, url }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }
  const raw = typeof (body as Record<string, unknown> | null)?.email === "string"
    ? ((body as Record<string, unknown>).email as string)
    : "";
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "Geçerli bir e-posta girin." }, { status: 400 });
  }

  const result = await addSubscriber(email);

  if (result.ok && result.pending && RESEND_API_KEY) {
    const token = signEmailToken(email, 7 * 24 * 60 * 60 * 1000);
    const confirmUrl = new URL(
      "/api/newsletter/confirm?token=" + encodeURIComponent(token),
      url
    ).toString();
    const html =
      "<!doctype html><html><body style='font-family:system-ui,sans-serif;padding:24px;color:#1c2229;background:#fff'>" +
      "<h2 style='margin-bottom:8px'>Bülten onayı</h2>" +
      "<p>Bültenimize kayıt olduğun için teşekkürler. Aboneliğini tamamlamak için aşağıdaki butona tıkla:</p>" +
      "<p style='margin:24px 0'><a href='" + confirmUrl + "' style='background:#0066cc;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600'>Aboneliği Onayla</a></p>" +
      "<p style='color:#707a7c;font-size:13px'>Bu isteği sen yapmadıysan bu e-postayı yoksayabilirsin. Onay 7 gün geçerli.</p>" +
      "</body></html>";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [email], subject: "Bülten aboneliğini onayla", html }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error("resend " + res.status);
    } catch {
      await removeSubscriber(email);
      return Response.json(
        { ok: false, error: "Doğrulama e-postası gönderilemedi, tekrar dene." },
        { status: 500 }
      );
    }
  }

  return Response.json(result);
};
