import type { APIRoute } from "astro";
import { confirmSubscriber, verifyEmailToken } from "../../../lib/newsletter";

export const prerender = false;

function page(html: string): Response {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token") || "";
  const email = verifyEmailToken(token);
  if (!email) {
    return page(
      "<html><body style='font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0'><div style='text-align:center'><h2>Bağlantı geçersiz veya süresi dolmuş</h2><p><a href='/'>Ana sayfaya dön</a></p></div></body></html>"
    );
  }
  await confirmSubscriber(email);
  return page(
    "<html><body style='font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0'><div style='text-align:center'><h2>Aboneliğin onaylandı ✓</h2><p>Artık bülten e-postalarını alacaksın.</p><p><a href='/'>Ana sayfaya dön</a></p></div></body></html>"
  );
};
