// Resend ile e-posta (iletisim formu, bulten onayi). Anahtar yalniz sunucuda.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.RESEND_FROM || "mail@ahmetenes.com";

/** Gonderir ve Resend yanitini doner; ag hatasi/zaman asiminda firlatir. */
export function sendEmail(message: Record<string, unknown>, timeoutMs: number): Promise<Response> {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, ...message }),
    signal: AbortSignal.timeout(timeoutMs),
  });
}
