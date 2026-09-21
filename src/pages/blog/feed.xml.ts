import type { APIRoute } from "astro";

// Legacy feed path from the previous Next.js site. EmDash redirect rules skip
// paths with a file extension, so this route handles the hand-off explicitly.
export const GET: APIRoute = ({ url }) =>
  Response.redirect(new URL("/rss.xml", url.origin), 301);
