import type { APIRoute } from "astro";
import { confirmSubscriber, verifyEmailToken } from "../../../lib/newsletter";
import { statusPage } from "../../../lib/status-page";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const email = verifyEmailToken(url.searchParams.get("token") || "", "confirm");
  if (!email || !(await confirmSubscriber(email))) {
    return statusPage(
      "Bağlantı geçersiz",
      "<p>Bağlantının süresi dolmuş ya da hatalı. Bülten kutusundan tekrar kaydolabilirsin.</p>",
      400,
    );
  }
  return statusPage("Aboneliğin onaylandı ✓", "<p>Yeni yazılar e-postana gelecek.</p>");
};
