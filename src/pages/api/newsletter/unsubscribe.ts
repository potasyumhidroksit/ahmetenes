import type { APIRoute } from "astro";
import { removeSubscriber } from "../../../lib/newsletter";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET: APIRoute = async ({ url }) => {
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return new Response("Geçersiz e-posta.", { status: 400 });
  await removeSubscriber(email);
  const html =
    "<html><body style='font-family:system-ui,sans-serif;background:#fff;color:#1c2229;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0'>" +
    "<div style='text-align:center;padding:24px'>" +
    "<h1 style='font-family:Georgia,serif;font-weight:400'>Bültenden çıktın</h1>" +
    "<p style='color:#707a7c'>Bir daha yazı duyurusu almayacaksın.</p>" +
    "<p><a href='https://ahmetenes.com' style='color:#0066cc'>ahmetenes.com</a></p>" +
    "</div></body></html>";
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
