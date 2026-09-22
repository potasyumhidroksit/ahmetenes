import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";

export type Subscriber = { email: string; confirmed: boolean; createdAt: string };

const DIR = process.env.DATA_DIR || "/app/data";
const FILE = path.join(DIR, "newsletter.json");
const SECRET =
  process.env.NEWSLETTER_SECRET || process.env.EMDASH_AUTH_SECRET || "newsletter-secret";

let cache: Subscriber[] | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function load(): Promise<Subscriber[]> {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as {
      subscribers?: unknown;
    };
    const arr = Array.isArray(parsed.subscribers)
      ? parsed.subscribers
      : Array.isArray(parsed)
        ? (parsed as unknown[])
        : [];
    cache = arr.map((s) => {
      if (typeof s === "string") return { email: s.toLowerCase(), confirmed: true, createdAt: "" };
      const o = s as { email?: string; confirmed?: boolean; createdAt?: string };
      return { email: String(o.email || "").toLowerCase(), confirmed: !!o.confirmed, createdAt: String(o.createdAt || "") };
    });
  } catch {
    cache = [];
  }
  return cache;
}

function persist(list: Subscriber[]): Promise<void> {
  cache = list;
  writeChain = writeChain.then(async () => {
    try {
      await mkdir(DIR, { recursive: true });
      await writeFile(FILE, JSON.stringify({ subscribers: list }, null, 2));
    } catch {
      // yazılamazsa siteyi etkilemesin
    }
  });
  return writeChain;
}

export async function addSubscriber(email: string): Promise<{ ok: boolean; pending: boolean; message: string }> {
  const list = await load();
  const normalized = email.toLowerCase();
  const existing = list.find((x) => x.email === normalized);
  if (existing && existing.confirmed) return { ok: false, pending: false, message: "Bu e-posta zaten kayıtlı." };
  if (existing) return { ok: true, pending: true, message: "Doğrulama e-postası tekrar gönderildi." };
  await persist([...list, { email: normalized, confirmed: false, createdAt: new Date().toISOString() }]);
  return { ok: true, pending: true, message: "Doğrulama e-postası gönderildi — lütfen onaylayın." };
}

export async function confirmSubscriber(email: string): Promise<boolean> {
  const list = await load();
  const normalized = email.toLowerCase();
  const sub = list.find((x) => x.email === normalized);
  if (!sub) return false;
  await persist(list.map((x) => (x.email === normalized ? { ...x, confirmed: true } : x)));
  return true;
}

export async function removeSubscriber(email: string): Promise<boolean> {
  const list = await load();
  const normalized = email.toLowerCase();
  if (!list.some((x) => x.email === normalized)) return false;
  await persist(list.filter((x) => x.email !== normalized));
  return true;
}

export async function getSubscribers(): Promise<Subscriber[]> {
  return load();
}

/**
 * Imzali e-posta token'i: "<email>.<bitis>.<imza>". Imza amaca (confirm /
 * unsubscribe) baglidir; biri digerinin yerine kullanilamaz.
 */
export type TokenPurpose = "confirm" | "unsubscribe";

function tokenSignature(purpose: TokenPurpose, payload: string): string {
  return createHmac("sha256", SECRET).update(purpose + "|" + payload).digest("hex");
}

export function signEmailToken(email: string, ttlMs: number, purpose: TokenPurpose = "confirm"): string {
  const payload = email + "." + (Date.now() + ttlMs);
  return payload + "." + tokenSignature(purpose, payload);
}

export function verifyEmailToken(token: string, purpose: TokenPurpose = "confirm"): string | null {
  // Sagdan ayristir: e-posta adresi (alan adi) nokta icerir. Eskiden "." ile
  // bolup tam 3 parca bekleniyordu; her gecerli token reddediliyordu.
  const sigAt = token.lastIndexOf(".");
  if (sigAt <= 0) return null;
  const payload = token.slice(0, sigAt);
  const sig = token.slice(sigAt + 1);
  const expAt = payload.lastIndexOf(".");
  if (expAt <= 0) return null;
  const email = payload.slice(0, expAt);
  const exp = Number(payload.slice(expAt + 1));
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(tokenSignature(purpose, payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return email;
}
