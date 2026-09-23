// Formlar hem JS (fetch + JSON) hem JS'siz (form POST) calisir. JS'siz
// gonderimde yanit, formun oldugu sayfaya 303 + durum parametresidir.

export type FormBody = Record<string, unknown>;

export async function readBody(request: Request): Promise<{ body: FormBody | null; isForm: boolean }> {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      const body = await request.json();
      return { body: body && typeof body === "object" ? (body as FormBody) : {}, isForm: false };
    } catch {
      return { body: null, isForm: false };
    }
  }
  try {
    const data = await request.formData();
    const body: FormBody = {};
    for (const [key, value] of data) body[key] = typeof value === "string" ? value : "";
    return { body, isForm: true };
  } catch {
    return { body: null, isForm: true };
  }
}

/** Yalnizca site ici goreli yol ("/..."), aksi halde varsayilan. */
export function safeReturnPath(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value.split("#")[0].split("?")[0]
    : fallback;
}

type Result = { ok?: boolean; error?: string; message?: string; [key: string]: unknown };

/** JSON istemcisine JSON; form gonderimine geri sayfaya 303 (?param=ok|mesaj#anchor). */
export function responder(isForm: boolean, back: string, param: string, anchor: string) {
  return (data: Result, status = 200): Response => {
    if (!isForm) return Response.json(data, { status });
    const url = new URL(back, "https://ahmetenes.com");
    url.searchParams.set(param, data.ok ? "ok" : String(data.error || data.message || "Bir şeyler ters gitti."));
    return new Response(null, { status: 303, headers: { location: url.pathname + url.search + "#" + anchor } });
  };
}
