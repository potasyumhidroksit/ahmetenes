#!/usr/bin/env node
// Bulten abone yonetimi.
//   pnpm newsletter list            -> abone listesi + ozet
//   pnpm newsletter export [dosya]  -> CSV disa aktarim
import { readFileSync, existsSync, writeFileSync } from "node:fs";

const FILE = process.env.NEWSLETTER_FILE || "/var/www/ahmetenes-data/newsletter.json";
const mode = process.argv[2] || "list";

function load() {
  if (!existsSync(FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8"));
    const arr = Array.isArray(parsed.subscribers) ? parsed.subscribers : Array.isArray(parsed) ? parsed : [];
    return arr.map((s) =>
      typeof s === "string" ? { email: s, confirmed: true, createdAt: "" } : s
    );
  } catch {
    return [];
  }
}

const subs = load();
const confirmed = subs.filter((s) => s.confirmed);

if (mode === "list") {
  console.log("Kaynak: " + FILE);
  console.log("Toplam: " + subs.length + " | Onayli: " + confirmed.length + " | Bekleyen: " + (subs.length - confirmed.length));
  for (const s of subs) {
    console.log((s.confirmed ? "[x] " : "[ ] ") + s.email + (s.createdAt ? "  " + s.createdAt : ""));
  }
} else if (mode === "export") {
  const out = process.argv[3] || "/root/backups/ahmetenes-aboneler.csv";
  const rows = [
    "email,confirmed,createdAt",
    ...subs.map((s) => [s.email, s.confirmed ? "1" : "0", s.createdAt || ""].join(",")),
  ];
  writeFileSync(out, rows.join("\n") + "\n");
  console.log("CSV yazildi: " + out + " (" + subs.length + " kayit)");
} else {
  console.log('Kullanim: pnpm newsletter list | pnpm newsletter export [dosya.csv]');
  process.exit(1);
}
