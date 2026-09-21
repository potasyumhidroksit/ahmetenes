import type { APIRoute } from "astro";
import { getPulseStatus } from "../../lib/services";

export const prerender = false;

export const GET: APIRoute = async () => {
  const data = await getPulseStatus();
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
