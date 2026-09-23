#!/usr/bin/env node
// pnpm analytics [gun]  -> ziyaret ozeti (varsayilan son 14 gun)
import { readFileSync, existsSync } from "node:fs";

const FILE = process.env.ANALYTICS_FILE || "/var/www/ahmetenes-data/analytics.json";
if (!existsSync(FILE)) {
  console.log("Analitik dosyasi yok: " + FILE);
  process.exit(0);
}
const d = JSON.parse(readFileSync(FILE, "utf8"));
const days = d.days || {};
const paths = d.paths || {};
const keys = Object.keys(days).sort();
const limit = Number(process.argv[2] || 14);
const recent = keys.slice(-limit);
const total = Object.values(days).reduce((a, b) => a + b, 0);
console.log("Toplam goruntuleme: " + total + " | Gun sayisi: " + keys.length);
console.log("--- son " + recent.length + " gun ---");
for (const k of recent) console.log(k + ": " + days[k]);
const top = Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log("--- en cok goruntulenen yollar ---");
for (const [p, c] of top) console.log(c + "  " + p);
const missing = Object.entries(d.missing || {}).sort((a, b) => b[1].n - a[1].n).slice(0, 10);
if (missing.length) {
  console.log("--- kirik baglantilar (404) ---");
  for (const [p, m] of missing) console.log(m.n + "  " + p + "  (son " + m.last + (m.ref ? ", kaynak " + m.ref : "") + ")");
}
