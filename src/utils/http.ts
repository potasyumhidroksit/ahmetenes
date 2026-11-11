import type { AstroGlobal } from "astro";

/**
 * 404 sayfasını gerçek 404 statüsüyle render eder.
 * Önceden /404'e redirect ediliyordu; bu ekstra 302 adımı crawler'ları
 * yanıltıyordu. Artık bilinmeyen URL tek adımda 404 döner.
 */
export function notFound(context: AstroGlobal): Promise<Response> {
  context.response.status = 404;
  // 404 sayfasi istenen adrese gore cizim secer; rewrite sonrasi Astro.url "/404" olur.
  (context.locals as { istenenYol?: string }).istenenYol = context.url.pathname;
  return context.rewrite("/404");
}
