import type { AstroGlobal } from "astro";

/**
 * 404 sayfasını gerçek 404 statüsüyle render eder.
 * Önceden /404'e redirect ediliyordu; bu ekstra 302 adımı crawler'ları
 * yanıltıyordu. Artık bilinmeyen URL tek adımda 404 döner.
 */
export function notFound(context: AstroGlobal): Promise<Response> {
  context.response.status = 404;
  return context.rewrite("/404");
}
