import type { APIRoute } from "astro";
import { removeSubscriber, verifyEmailToken } from "../../../lib/newsletter";
import { statusPage } from "../../../lib/status-page";

export const prerender = false;

// Eskiden ?email= ile herkes herkesi bultenden cikarabiliyordu. Artik imzali
// token gerekir. GET yalnizca onay dugmesi gosterir (e-posta tarayicilarinin
// on-yuklemesi kimseyi cikarmasin); cikis ayni kokenli POST ile yapilir.
const invalid = () =>
  statusPage("Bağlantı geçersiz", "<p>Bu çıkış bağlantısı geçersiz. Yardım için info@ahmetenes.com.</p>", 400);

export const GET: APIRoute = ({ url }) => {
  const token = url.searchParams.get("token") || "";
  if (!verifyEmailToken(token, "unsubscribe")) return invalid();
  return statusPage(
    "Bültenden çık",
    `<p>Yeni yazı duyurularını artık almak istemiyor musun?</p>
<form method="post" action="/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}"><button type="submit">Bültenden çık</button></form>`,
  );
};

export const POST: APIRoute = async ({ url }) => {
  const email = verifyEmailToken(url.searchParams.get("token") || "", "unsubscribe");
  if (!email) return invalid();
  await removeSubscriber(email);
  return statusPage("Bültenden çıktın", "<p>Bir daha yazı duyurusu almayacaksın.</p>");
};
