// Sokak — ahmetenes.com ana sayfasindaki cizgi sahne (line-art-animation kutuphanesi, MIT).
// Bir fotografci Istanbul'da bir sokaktan gecer: cumbali ahsap ev, fener, cay ocagi, telde serceler, basamakta bir
// kedi, tas ev, deniz kenarinda korkuluk, karsidan gecen vapur ve martilar. Her gecis baska: bazen soldan bazen
// sagdan gelir, bazen bir sure hic yoktur; cay ocaginin vitrinini, kediyi ya da denizi durak yapar. Gunduz
// korkuluga oturup denize bakar (profil fotografiyla kafiyeli), gece sehpa kurup vapurun isigini uzun pozlar.
// Yaz geceleri tas evin duvarinda yazlik sinema oynar.
// Dokunma, ruzgar, kamera ve kalite ortak cekirdekte (cekirdek.ts): sahnenin herhangi bir yerine dokununca en
// yakin sey tepki verir. Renkler CSS'ten gelir: murekkep `color`, kagit `--paper`, duz renkler `--sk-*`.
// Deneme: ?saat=13 ?saat=22 ?tarih=2026-07-15&saat=21.5 (yazlik sinema) ?debug (+ window.__sokak)
import { el, pen, shape, blot, paint, limb, solid, shoe, place, toScene, f, pt, PEN, type Vec, type Limb } from './ink';
import { gait, type Pose } from './gait';
import { spring, pendulum, ease, clamp, lerp, rnd, seeded } from './motion';
import { cekirdek, gunTohumu, type Zaman } from './cekirdek';
import { kediKur, serceler, pervaneler } from './canlilar';

const W = 960, H = 220, GROUND = 198, SC = 0.86, SP = 1.15, DP = 0.6;
const FENER = 262, DENIZ = 640, UFUK = 150, KEDI = 314, VITRIN = 381, TABURE = 481;
/** Fotografcinin yurudugu cizgi: kaldirimin onu (binalarin, kedinin, sandalyelerin onunden gecer). */
const YOL = GROUND + 4;
/** Korkulugun ust tirabzani. */
const KORKULUK = 166;
/** Yazlik sinema perdesi (tas evin duvari). */
const PERDE = { x0: 507, x1: 583, y0: 105, y1: 157 };

const renk = <T extends SVGElement>(n: T, ad: string, ne: 'fill' | 'stroke' = 'fill'): T => { n.style[ne] = `var(--sk-${ad})`; return n; };
const oval = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const L2 = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** 0→1 gecis: [a, b] araliginda yumusak. */
const ara = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a), 0, 1));
/** Kare basina yazim yalniz deger degisince (A6): ayni dizgiyi DOM'a ikinci kez yazmaz. */
const onbellek = new WeakMap<Element, Record<string, string>>();
const yaz = (n: Element, ad: string, v: string): void => {
  let o = onbellek.get(n);
  if (!o) onbellek.set(n, (o = {}));
  if (o[ad] !== v) { o[ad] = v; n.setAttribute(ad, v); }
};
const goster = (n: Element, acik: boolean) => yaz(n, 'display', acik ? 'inline' : 'none');

declare global { interface Window { __sokak?: Record<string, unknown> } }

export function kurSokak(stage: HTMLElement): void {
  const c = cekirdek(stage, { ad: 'sokak', W, H, kamY: 40, etiket: 'Çizgi çizimi: İstanbul\'da bir sokak; bir fotoğrafçı, basamakta bir kedi, telde serçeler, deniz kenarında korkuluk ve geçen vapur.' });
  const S = c.statik, D = c.dinamik, G = c.gok;
  const degrade = (defs: SVGDefsElement, id: string) => {
    const g = el('radialGradient', { id }, defs);
    el('stop', { offset: '0', 'stop-opacity': 0.6, style: 'stop-color:var(--sk-isik)' }, g);
    el('stop', { offset: '1', 'stop-opacity': 0, style: 'stop-color:var(--sk-isik)' }, g);
    return `url(#${id})`;
  };
  const isikD = degrade(c.tanimlar[2], `${c.kimlik}-di`);
  const isikGok = degrade(c.tanimlar[0], `${c.kimlik}-gi`);
  const isikG = el('g', {}, D);
  const isik = (cx: number, cy: number, rx: number, ry = rx) => el('ellipse', { cx, cy, rx, ry, fill: isikD, opacity: 0 }, isikG);

  // ================================================================ durum: saat degisince (surum) hesaplanir
  const durum = { gece: 0, sinema: false, ocakAcik: true, aksam: false, saat: 12 };
  const durumHesapla = (z: Zaman) => {
    durum.gece = z.karanlik; durum.saat = z.saat;
    // yazlik sinema: Haziran–Eylul, 21:00–24:00
    durum.sinema = z.ay >= 5 && z.ay <= 8 && z.saat >= 21 && z.saat < 24;
    durum.ocakAcik = durum.sinema || (z.saat >= 6.5 && z.saat < 23.5);
    durum.aksam = durum.ocakAcik && !durum.sinema && z.saat >= z.batim - 1.2 && z.saat < 23.2;
  };
  durumHesapla(c.zaman());

  // ================================================================ GOK katmani: deniz, karsi kiyi, vapur, uzun pozlama izi
  pen(G, DP).setAttribute('d', `M${DENIZ} ${UFUK} Q${(DENIZ + W) / 2} ${UFUK - 0.6} ${W} ${UFUK}`);
  pen(G, DP).setAttribute('d', `M${DENIZ + 10} ${UFUK} Q${DENIZ + 60} ${UFUK - 14} ${DENIZ + 120} ${UFUK - 9} Q${DENIZ + 170} ${UFUK - 5} ${DENIZ + 210} ${UFUK - 16} Q${DENIZ + 260} ${UFUK - 26} ${DENIZ + 310} ${UFUK - 8}`);
  pen(G, DP * 0.8).setAttribute('d', [DENIZ + 52, DENIZ + 62, DENIZ + 70, DENIZ + 190, DENIZ + 200, DENIZ + 214].map((x, i) => `M${x} ${UFUK - 8 - (i % 3)} l0 -3 l3 -1.6 l3 1.6 l0 3`).join(' ') + ` M${DENIZ + 246} ${UFUK - 21} l0 -16 l1.6 -4 l1.6 4 l0 16`);
  const dalga = pen(G, DP * 0.7);
  // uzun pozlama izi: vapurun pencere sirasinin isigi, poz suresince birikir, sonra bir sure kalip soner
  const izKalin = renk(el('path', { fill: 'none', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, G), 'isik', 'stroke');
  const izInce = renk(el('path', { fill: 'none', 'stroke-width': 0.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, G), 'pencere', 'stroke');
  const vapurParlak = el('ellipse', { cx: 0, cy: 0, rx: 22, ry: 9, fill: isikGok, opacity: 0 }, G);
  const vapurG = el('g', {}, G);
  shape(vapurG, SP * 0.7).setAttribute('d', 'M-26 -2 Q0 -2.6 27 -2 L23 5 Q0 5.4 -23 5Z');
  blot(vapurG).setAttribute('d', 'M-23.6 3 L23.6 3 L23 5 L-23 5Z');
  shape(vapurG, SP * 0.6).setAttribute('d', 'M-17 -2 L-17 -8 Q-16 -9 -14 -9 L13 -9 Q15 -9 15 -7 L15 -2 M-12 -9 L-12 -12 L9 -12 L9 -9');
  renk(paint(vapurG, 'x', SP * 0.6), 'baca').setAttribute('d', 'M-1.4 -12 L-0.8 -18 L3.4 -18 L4 -12Z');
  const vapurCam = renk(el('path', { d: Array.from({ length: 7 }, (_, i) => `M${-13.2 + i * 4} -7 h2.4 v2.2 h-2.4Z`).join(' ') + ' M-9 -11.4 h3 v1.6 h-3Z M2 -11.4 h3 v1.6 h-3Z' }, vapurG), 'pencere');
  pen(vapurG, DP * 0.7).setAttribute('d', Array.from({ length: 7 }, (_, i) => `M${-13 + i * 4} -6 l2 0.2`).join(' '));
  const direkIsik = blot(vapurG); direkIsik.setAttribute('d', 'M-12.6 -14.4 a0.9 0.9 0 1 0 1.8 0 a0.9 0.9 0 1 0 -1.8 0Z');
  pen(vapurG, DP * 0.6).setAttribute('d', 'M-11.7 -12 L-11.7 -13.6');
  const duman = pen(vapurG, DP * 0.7);
  const buharlar = [0, 1, 2].map(() => shape(vapurG, DP * 0.7));
  let vapurX = W + 40, dudukT = 0;
  const vapurGorunur = () => vapurX > DENIZ - 24 && vapurX < W + 26;

  // ================================================================ STATIK: korkuluk
  shape(S, SP).setAttribute('d', `M${DENIZ} ${GROUND} L${DENIZ} 168 L${W} 168 L${W} ${GROUND}`);
  pen(S, SP).setAttribute('d', `M${DENIZ - 4} 166 Q${(DENIZ + W) / 2} 165.4 ${W + 2} 166 M${DENIZ - 2} 170 L${W} 170.4`);
  pen(S, DP).setAttribute('d', Array.from({ length: 16 }, (_, i) => `M${DENIZ + 6 + i * 20} 170 q0.8 14 0 28`).join(' ') + Array.from({ length: 16 }, (_, i) => ` M${DENIZ + 16 + i * 20} 176 q-3 6 0 12 q3 -6 0 -12`).join(''));

  // ================================================================ STATIK: cumbali ahsap ev
  type Pencere = {
    n: SVGPathElement; g: SVGEllipseElement; esik: number; sonu: number; yanik: boolean;
    x: number; y: number; w: number; h: number; kemer: boolean; cubuk: string; vitrin: boolean;
  };
  const pencereler: Pencere[] = [];
  const pencereEkle = (n: SVGPathElement, x: number, y: number, w: number, h: number, gr: [number, number], esik: number, kemer: boolean, cubuk: string, vitrin = false) => {
    n.classList.add('pp');
    pencereler.push({ n, g: isik(x + w / 2, y + h / 2, gr[0], gr[1]), esik, sonu: vitrin ? 23.5 : rnd(23, 26.5), yanik: false, x, y, w, h, kemer, cubuk, vitrin });
  };
  shape(S, SP).setAttribute('d', `M48 ${GROUND} L48 64 L222 64 L222 ${GROUND}Z`);
  shape(S, SP).setAttribute('d', 'M36 66 Q130 60 234 66 L230 58 Q130 52 40 58Z');
  pen(S, DP).setAttribute('d', Array.from({ length: 24 }, (_, i) => `M${44 + i * 8} ${61.6 - Math.sin((i / 23) * Math.PI) * 2.4} q2 3 4 0`).join(' '));
  pen(S, DP * 0.8).setAttribute('d', Array.from({ length: 10 }, (_, i) => `M50 ${136 + i * 6} L${i % 3 === 0 ? 110 : 98} ${136.2 + i * 6}`).join(' ') + Array.from({ length: 6 }, (_, i) => ` M52 ${74 + i * 6} L96 ${74.2 + i * 6}`).join(''));
  shape(S, SP).setAttribute('d', `M64 ${GROUND - 6} L64 152 Q76 140 88 152 L88 ${GROUND - 6}Z`);
  pen(S, DP).setAttribute('d', `M76 144 L76 ${GROUND - 6} M70 170 a1 1 0 1 0 0.1 0 M66 158 L86 158`);
  shape(S, SP).setAttribute('d', `M58 ${GROUND} L58 ${GROUND - 6} L94 ${GROUND - 6} L94 ${GROUND}Z`);
  const pencere = (x: number, y: number, w: number, h: number) => {
    const n = el('path', { d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h}Z`, 'stroke-width': SP, stroke: 'currentColor', 'stroke-linejoin': 'round' }, S);
    const cubuk = `M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h * 0.45} L${x + w} ${y + h * 0.45}`;
    pen(S, DP).setAttribute('d', cubuk);
    pencereEkle(n, x, y, w, h, [w * 1.4, h], rnd(0.3, 0.9), false, cubuk);
  };
  pencere(118, 148, 22, 32);
  pen(S, DP).setAttribute('d', 'M114 148 L114 180 M144 148 L144 180 M112 182 L146 182');
  shape(S, SP).setAttribute('d', 'M104 70 L214 70 L216 126 L102 126Z');
  pen(S, SP).setAttribute('d', 'M100 126 L218 126 M106 126 L118 138 M212 126 L200 138 M159 126 L159 134');
  [114, 146, 178].forEach((x) => pencere(x, 78, 22, 40));
  pen(S, DP).setAttribute('d', 'M104 74 L214 74 M108 122 L210 122');
  shape(S, SP * 0.8).setAttribute('d', `M184 ${GROUND - 8} L182 ${GROUND - 22} L200 ${GROUND - 22} L198 ${GROUND - 8}Z`);

  // ================================================================ STATIK: fener diregi, tel, direk (fenerin basi dinamikte: sallanir)
  shape(S, SP).setAttribute('d', `M${FENER - 3} ${GROUND} L${FENER - 1.6} 72 L${FENER + 1.6} 72 L${FENER + 3} ${GROUND}Z`);
  pen(S, DP).setAttribute('d', `M${FENER - 4} ${GROUND - 14} L${FENER + 4} ${GROUND - 13.8}`);
  const TEL0: Vec = [228, 70], TEL1: Vec = [612, 92];
  const telY = (x: number) => { const u = clamp((x - TEL0[0]) / (TEL1[0] - TEL0[0]), 0, 1); return lerp(TEL0[1], TEL1[1], u) + Math.sin(u * Math.PI) * 14; };
  pen(S, DP).setAttribute('d', `M${TEL0[0]} ${TEL0[1]} Q${(TEL0[0] + TEL1[0]) / 2} ${(TEL0[1] + TEL1[1]) / 2 + 28} ${TEL1[0]} ${TEL1[1]}`);
  shape(S, SP).setAttribute('d', `M${TEL1[0] - 2.4} ${GROUND} L${TEL1[0] - 1.4} 84 L${TEL1[0] + 1.4} 84 L${TEL1[0] + 2.4} ${GROUND}Z`);
  pen(S, DP).setAttribute('d', `M${TEL1[0] - 8} 92 L${TEL1[0] + 8} 92 M${TEL1[0] - 6} 92 l0 -2.4 M${TEL1[0] + 6} 92 l0 -2.4`);

  // ================================================================ STATIK: cay ocagi (tabela ve tente kenarlari hafif kavisli)
  shape(S, SP).setAttribute('d', `M300 ${GROUND} L300 108 L462 108 L462 ${GROUND}Z`);
  shape(S, SP).setAttribute('d', 'M316 90 Q381 89.3 446 90 Q446.7 98 446 106 Q381 106.6 316 106 Q315.4 98 316 90Z');
  el('text', { x: 381, y: 102, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 500, 'letter-spacing': 2.4, fill: 'currentColor', style: 'font-family:var(--font-personabio, system-ui, sans-serif)' }, S).textContent = 'ÇAY OCAĞI';
  const vitrin = el('path', { d: 'M318 140 L444 140 L444 186 L318 186Z', 'stroke-width': SP, stroke: 'currentColor' }, S);
  pencereEkle(vitrin, 318, 140, 126, 46, [90, 34], 0.35, false, '', true);
  pen(S, DP).setAttribute('d', 'M381 140 L381 186 M318 172 L444 172.2');
  shape(S, SP * 0.7).setAttribute('d', 'M334 172 L334 160 Q340 154 346 160 L346 172Z M346 163 q5 -1 6 -4 M338 156 l4 0');
  renk(paint(S, 'x', SP * 0.6), 'cay').setAttribute('d', 'M398 172 Q396 166 399 164 Q397 160 398 158 L404 158 Q405 160 403 164 Q406 166 404 172Z M412 172 Q410 166 413 164 Q411 160 412 158 L418 158 Q419 160 417 164 Q420 166 418 172Z');
  shape(S, SP).setAttribute('d', 'M296 112 Q381 111.3 466 112 Q471 122 476 132 Q381 132.8 286 132 Q291 122 296 112Z');
  Array.from({ length: 9 }, (_, i) => renk(el('path', { d: `M${300 + i * 19} 112 L${309.5 + i * 19} 112 Q${308 + i * 19.75} 122.2 ${306 + i * 20.5} 132 L${296.5 + i * 20.5} 132 Q${298 + i * 19.75} 121.8 ${300 + i * 19} 112Z` }, S), 'tente'));
  pen(S, SP).setAttribute('d', `M448 ${GROUND} L448 142 M456 ${GROUND} L456 142 M448 142 L456 142`);
  shape(S, SP * 0.8).setAttribute('d', `M472 ${GROUND - 14} L490 ${GROUND - 14} L488 ${GROUND - 12} L474 ${GROUND - 12}Z`);
  pen(S, SP * 0.8).setAttribute('d', `M475 ${GROUND - 12} L473 ${GROUND} M487 ${GROUND - 12} L489 ${GROUND} M474 ${GROUND - 5} L488 ${GROUND - 5}`);
  shape(S, SP * 0.8).setAttribute('d', `M300 ${GROUND} L300 ${GROUND - 5} L330 ${GROUND - 5} L330 ${GROUND}Z`);

  // ================================================================ STATIK: tas ev
  shape(S, SP).setAttribute('d', `M500 ${GROUND} L500 96 L590 96 L590 ${GROUND}Z`);
  shape(S, SP).setAttribute('d', 'M494 98 L596 98 L592 90 L498 90Z');
  pen(S, DP * 0.8).setAttribute('d', Array.from({ length: 9 }, (_, i) => `M${502 + (i % 2) * 8} ${110 + i * 9.6} l${i % 2 ? 22 : 18} 0.2 M${540 + (i % 2) * 6} ${110 + i * 9.6} l${i % 2 ? 26 : 30} 0.2`).join(' '));
  [[512, 108], [556, 108], [512, 150], [556, 150]].forEach(([x, y]) => {
    const n = el('path', { d: `M${x} ${y + 26} L${x} ${y + 8} Q${x + 11} ${y - 4} ${x + 22} ${y + 8} L${x + 22} ${y + 26}Z`, 'stroke-width': SP, stroke: 'currentColor' }, S);
    pen(S, DP).setAttribute('d', `M${x + 11} ${y + 2} L${x + 11} ${y + 26} M${x - 2} ${y + 28} L${x + 24} ${y + 28}`);
    pencereEkle(n, x, y, 22, 26, [26, 22], rnd(0.25, 0.9), true, `M${x + 11} ${y + 2} L${x + 11} ${y + 26}`);
  });

  // ================================================================ STATIK: kaldirim
  pen(S, SP).setAttribute('d', `M0 ${GROUND} Q${W / 2} ${GROUND - 0.6} ${W} ${GROUND} M0 ${GROUND + 9} Q${W / 2} ${GROUND + 9.6} ${W} ${GROUND + 9}`);
  pen(S, DP).setAttribute('d', Array.from({ length: 28 }, (_, i) => `M${i * 34 + 12} ${GROUND + 0.4} q0.6 4.3 0 8.6`).join(' '));

  // ================================================================ DINAMIK: pencerelerde perde ve bakan biri (B7)
  // Her pencerede bagli iki perde kanadi (bir kez cizilir). Dokununca bir kanat aralanir, biri bakar, sonra perde
  // geri duser. Gece yanan pencerede bakan kisi isiga karsi siluettir.
  type Bakan = { p: Pencere; perde: SVGPathElement; grup: SVGGElement; kafa: SVGPathElement; sac: SVGPathElement; cubuk: SVGPathElement; t: number; topuz: boolean; sag: boolean };
  const perdeYolu = (p: Pencere, ac: number, sagAc: number) => {
    const ust = p.kemer ? p.y + 8 : p.y + 1, bag = p.y + p.h * 0.6, kenar = (k: number) => p.w * (0.42 - k * 0.3);
    const sol = kenar(ac), sag = kenar(sagAc);
    return `M${f(p.x + 1)} ${f(ust)} Q${f(p.x + sol)} ${f(lerp(ust, bag, 0.45))} ${f(p.x + 1.6)} ${f(bag)} M${f(p.x + 1.2)} ${f(ust + 2)} Q${f(p.x + sol * 0.55)} ${f(lerp(ust, bag, 0.5))} ${f(p.x + 1.4)} ${f(bag - 2)}` +
      ` M${f(p.x + p.w - 1)} ${f(ust)} Q${f(p.x + p.w - sag)} ${f(lerp(ust, bag, 0.45))} ${f(p.x + p.w - 1.6)} ${f(bag)} M${f(p.x + p.w - 1.2)} ${f(ust + 2)} Q${f(p.x + p.w - sag * 0.55)} ${f(lerp(ust, bag, 0.5))} ${f(p.x + p.w - 1.4)} ${f(bag - 2)}`;
  };
  const bakanlar: Bakan[] = pencereler.filter((p) => !p.vitrin).map((p, i) => {
    const kirp = el('clipPath', { id: `${c.kimlik}-pk${i}` }, c.tanimlar[2]);
    el('path', { d: p.kemer ? `M${p.x} ${p.y + 26} L${p.x} ${p.y + 8} Q${p.x + 11} ${p.y - 4} ${p.x + 22} ${p.y + 8} L${p.x + 22} ${p.y + 26}Z` : `M${p.x} ${p.y} h${p.w} v${p.h} h${-p.w}Z` }, kirp);
    const grup = el('g', { 'clip-path': `url(#${c.kimlik}-pk${i})`, display: 'none' }, D);
    const kafa = shape(grup, DP * 1.4), sac = blot(grup);
    const cubuk = pen(D, DP); cubuk.setAttribute('d', p.cubuk); cubuk.setAttribute('display', 'none');
    const perde = pen(D, DP * 0.7); perde.setAttribute('d', perdeYolu(p, 0, 0));
    return { p, perde, grup, kafa, sac, cubuk, t: -1, topuz: Math.random() < 0.5, sag: Math.random() < 0.5 };
  });
  const bakanCiz = (b: Bakan, dt: number) => {
    if (b.t < 0) return;
    b.t += dt;
    const T = b.t, p = b.p;
    if (T > 3.8) { b.t = -1; goster(b.grup, false); goster(b.cubuk, false); yaz(b.perde, 'd', perdeYolu(p, 0, 0)); return; }
    const ac = ara(T, 0, 0.6) * (1 - ara(T, 3.1, 3.8));
    yaz(b.perde, 'd', perdeYolu(p, b.sag ? 0 : ac, b.sag ? ac : 0));
    const yuksel = ara(T, 0.35, 0.95) * (1 - ara(T, 2.7, 3.3));
    const cx = p.x + p.w * (b.sag ? 0.66 : 0.34) + Math.sin(Math.min(T, 2.7) * 1.4) * 0.6, alt = p.y + p.h + 2;
    const cy = lerp(alt + 6, p.y + p.h * 0.5, yuksel);
    // omuzlar + bas; bas hafif egilir (sokaga bakar)
    yaz(b.kafa, 'd', `M${f(cx - 7)} ${f(alt + 8)} Q${f(cx - 6.6)} ${f(cy + 6.6)} ${f(cx - 2)} ${f(cy + 5.2)} L${f(cx - 1.4)} ${f(cy + 3.4)} M${f(cx + 1.4)} ${f(cy + 3.4)} L${f(cx + 2)} ${f(cy + 5.2)} Q${f(cx + 6.6)} ${f(cy + 6.6)} ${f(cx + 7)} ${f(alt + 8)}Z ` + oval(cx, cy, 2.6, 3.2));
    yaz(b.sac, 'd', `M${f(cx - 2.8)} ${f(cy)} Q${f(cx - 2.8)} ${f(cy - 3.8)} ${f(cx)} ${f(cy - 3.6)} Q${f(cx + 2.8)} ${f(cy - 3.8)} ${f(cx + 2.8)} ${f(cy)} Q${f(cx)} ${f(cy - 2)} ${f(cx - 2.8)} ${f(cy)}Z` + (b.topuz ? oval(cx, cy - 4.4, 1.4, 1.2) : ''));
  };
  const bakanBaslat = (b: Bakan) => {
    if (b.t >= 0) return;
    b.t = 0; b.sag = Math.random() < 0.5;
    // gece yanan pencerede siluet: ici murekkep
    if (b.p.yanik) { b.kafa.classList.remove('pp'); b.kafa.style.fill = 'var(--sk-film)'; } else { b.kafa.classList.add('pp'); b.kafa.style.fill = ''; }
    goster(b.grup, true); goster(b.cubuk, true);
  };

  // ================================================================ DINAMIK: fenerin basi (dokununca sallanir, gece titrer)
  const fenerG = el('g', {}, D);
  shape(fenerG, SP).setAttribute('d', `M${FENER - 8} 72 L${FENER + 8} 72 L${FENER + 6} 56 Q${FENER} 52 ${FENER - 6} 56Z`);
  const fenerCam = renk(el('path', { d: `M${FENER - 4.6} 70 L${FENER + 4.6} 70 L${FENER + 3.4} 59 Q${FENER} 57 ${FENER - 3.4} 59Z` }, fenerG), 'cam');
  pen(fenerG, DP).setAttribute('d', `M${FENER} 52 L${FENER} 47 M${FENER - 4} 47 Q${FENER} 44 ${FENER + 4} 47`);
  const fenerIsik = isik(FENER, 66, 60, 54);
  const fenerYay = pendulum(26, 2.4);
  let fenerKirp = -1;
  const pervane = pervaneler(D, FENER, 66, 3);

  // ================================================================ DINAMIK: yazlik sinema (Haziran–Eylul 21–24)
  const sinemaG = el('g', { display: 'none' }, D);
  const koniDegrade = el('linearGradient', { id: `${c.kimlik}-koni`, gradientUnits: 'userSpaceOnUse', x1: TABURE + 10, y1: GROUND - 20, x2: 545, y2: 125 }, c.tanimlar[2]);
  el('stop', { offset: '0', 'stop-opacity': 0.55, style: 'stop-color:var(--sk-isik)' }, koniDegrade);
  el('stop', { offset: '1', 'stop-opacity': 0.1, style: 'stop-color:var(--sk-isik)' }, koniDegrade);
  const koni = el('path', { d: `M${TABURE + 10} ${GROUND - 20} L${PERDE.x0} ${PERDE.y0} L${PERDE.x1} ${PERDE.y0} L${PERDE.x1} ${PERDE.y1}Z`, fill: `url(#${c.kimlik}-koni)`, display: 'none' }, isikG);
  pen(sinemaG, DP).setAttribute('d', `M${PERDE.x0 + 2} 98 L${PERDE.x0 + 2} ${PERDE.y0} M${PERDE.x1 - 2} 98 L${PERDE.x1 - 2} ${PERDE.y0}`);
  const perde = renk(el('path', { d: `M${PERDE.x0} ${PERDE.y0} Q545 ${PERDE.y0 + 1} ${PERDE.x1} ${PERDE.y0} Q${PERDE.x1 + 0.6} 131 ${PERDE.x1} ${PERDE.y1} Q545 ${PERDE.y1 + 1.2} ${PERDE.x0} ${PERDE.y1} Q${PERDE.x0 - 0.6} 131 ${PERDE.x0} ${PERDE.y0}Z`, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, sinemaG), 'perde');
  const filmKirp = el('clipPath', { id: `${c.kimlik}-film` }, c.tanimlar[2]);
  el('path', { d: `M${PERDE.x0 + 1} ${PERDE.y0 + 1} H${PERDE.x1 - 1} V${PERDE.y1 - 1} H${PERDE.x0 + 1}Z` }, filmKirp);
  const filmG = el('g', { 'clip-path': `url(#${c.kimlik}-film)` }, sinemaG);
  const filmA = renk(el('path', { fill: 'none', 'stroke-width': 0.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, filmG), 'film', 'stroke');
  const filmB = renk(el('path', { 'stroke-width': 0.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, filmG), 'film', 'stroke');
  filmB.style.fill = 'var(--sk-perde)';
  const cizik = renk(el('path', { fill: 'none', 'stroke-width': 0.35 }, filmG), 'film', 'stroke');
  // sandalyeler (arkadan) ve iki izleyici
  const SANDALYE = [518, 538, 558, 578];
  const izleyiciG = el('g', {}, sinemaG);
  const izleyiciler = [1, 3].map((i, k) => {
    const x = SANDALYE[i];
    const bas = el('ellipse', { cx: x, cy: GROUND - 30, rx: 2.6, ry: 3.2, 'stroke-width': DP * 1.3, stroke: 'currentColor' }, izleyiciG); bas.classList.add('pp');
    const sac = blot(izleyiciG);
    shape(izleyiciG, DP * 1.3).setAttribute('d', `M${x - 6} ${GROUND - 16} Q${x - 5.6} ${GROUND - 25} ${x - 1.6} ${GROUND - 26} L${x + 1.6} ${GROUND - 26} Q${x + 5.6} ${GROUND - 25} ${x + 6} ${GROUND - 16}Z`);
    return { x, bas, sac, kasket: k === 0 };
  });
  SANDALYE.forEach((x) => {
    shape(sinemaG, DP * 1.2).setAttribute('d', `M${x - 4.6} ${GROUND - 21} Q${x} ${GROUND - 22} ${x + 4.6} ${GROUND - 21} L${x + 4.6} ${GROUND - 15.5} Q${x} ${GROUND - 15} ${x - 4.6} ${GROUND - 15.5}Z`);
    pen(sinemaG, DP * 1.2).setAttribute('d', `M${x - 5} ${GROUND} L${x - 4.6} ${GROUND - 21} M${x + 5} ${GROUND} L${x + 4.6} ${GROUND - 21} M${x - 4.8} ${GROUND - 11} L${x + 4.8} ${GROUND - 11} M${x - 4.8} ${GROUND - 4} L${x - 2} ${GROUND - 11} M${x + 4.8} ${GROUND - 4} L${x + 2} ${GROUND - 11}`);
  });
  // projektor tabure ustunde (cay ocaginin elektrigi), iki makara doner
  const projG = el('g', {}, sinemaG);
  shape(projG, SP * 0.8).setAttribute('d', `M${TABURE - 7} ${GROUND - 14} L${TABURE - 7} ${GROUND - 22} Q${TABURE - 7} ${GROUND - 23} ${TABURE - 6} ${GROUND - 23} L${TABURE + 6} ${GROUND - 23} Q${TABURE + 7} ${GROUND - 23} ${TABURE + 7} ${GROUND - 22} L${TABURE + 7} ${GROUND - 14}Z M${TABURE + 7} ${GROUND - 21.4} L${TABURE + 10.4} ${GROUND - 21.8} L${TABURE + 10.4} ${GROUND - 18.2} L${TABURE + 7} ${GROUND - 18.6}`);
  const makaralar = [[TABURE - 3.4, GROUND - 28], [TABURE + 4, GROUND - 29]].map(([x, y]) => {
    const g = el('g', {}, projG);
    const m = el('circle', { cx: x, cy: y, r: 4.6, 'stroke-width': DP * 1.2, stroke: 'currentColor' }, g); m.classList.add('pp');
    pen(g, DP).setAttribute('d', [0, 1, 2].map((k) => { const a = (k * 2 * Math.PI) / 3; return `M${f(x)} ${f(y)} L${f(x + Math.cos(a) * 4)} ${f(y + Math.sin(a) * 4)}`; }).join(' '));
    return { g, x, y };
  });
  pen(projG, DP).setAttribute('d', `M${TABURE - 3.4} ${GROUND - 23.4} L${TABURE - 3.4} ${GROUND - 26} M${TABURE + 4} ${GROUND - 23.4} L${TABURE + 4} ${GROUND - 27}`);
  const lensIsik = isik(TABURE + 10.6, GROUND - 20, 9, 7);
  let filmKare = -1, kopmaT = -1;
  const filmCiz = (t: number, dt: number) => {
    makaralar.forEach((m, i) => yaz(m.g, 'transform', `rotate(${f((t * (i ? 70 : 95)) % 360)} ${m.x} ${m.y})`));
    if (kopmaT >= 0) kopmaT += dt;
    if (kopmaT > 1.6) kopmaT = -1;
    // film saniyede 12 kare: titreme ve cizikler bu hizda degisir
    const kare = Math.floor(t * 12);
    if (kare === filmKare) return;
    filmKare = kare;
    if (kopmaT >= 0) {
      // film koptu: perde bembeyaz yanip soner, sonra geri gelir
      goster(filmG, false);
      yaz(perde, 'opacity', kare % 3 ? '1' : '0.7');
      yaz(lensIsik, 'opacity', kare % 3 ? '0.9' : '0.3');
      return;
    }
    goster(filmG, true); yaz(perde, 'opacity', '1');
    const titre = 0.78 + ((kare * 7919) % 23) / 100;
    yaz(filmG, 'opacity', f(titre)); yaz(koni, 'opacity', f(0.75 + titre * 0.2)); yaz(lensIsik, 'opacity', f(0.7 * titre));
    const s = t % 16;
    const { x0, x1, y0, y1 } = PERDE;
    if (s < 6) {
      // yol: ufuk, tepe, ay ve yuruyen biri
      const fx = x0 + 6 + (x1 - x0 - 12) * (s / 6), a = Math.abs(((s * 2.4) % 2) - 1) * 4.4 - 2.2;
      yaz(filmA, 'd', `M${x0} 146 Q545 144 ${x1} 146 M${x0} 146 Q528 134 550 142 Q566 137 ${x1} 143 ` + oval(566, 116, 3.4, 3.4));
      yaz(filmB, 'd', oval(fx, 134.4, 1.5, 1.8) + ` M${f(fx)} 136.4 L${f(fx)} 141.6 L${f(fx + a)} 146 M${f(fx)} 141.6 L${f(fx - a)} 146 M${f(fx)} 137.6 L${f(fx - a * 0.6)} 140.4 M${f(fx)} 137.6 L${f(fx + a * 0.6)} 140.4`);
    } else if (s < 11) {
      // iki yuz birbirine yaklasir
      const k = (s - 6) * 1.1, yuz = (x: number, d: number) =>
        // profilden bas (burun one), boyun ve omuz
        `M${f(x - d * 4.6)} 131 Q${f(x - d * 5.6)} 120 ${f(x)} 119.6 Q${f(x + d * 5)} 119.8 ${f(x + d * 5)} 126 L${f(x + d * 6.6)} 128.4 L${f(x + d * 5)} 129.4 Q${f(x + d * 4.6)} 133.4 ${f(x + d * 1.4)} 133.6 L${f(x + d * 1.6)} 138 Q${f(x + d * 8)} 139 ${f(x + d * 10)} ${y1} M${f(x - d * 4.6)} 131 Q${f(x - d * 3.4)} 135 ${f(x - d * 3)} 138 Q${f(x - d * 9)} 140 ${f(x - d * 11)} ${y1}`;
      yaz(filmA, 'd', `M${x0} ${y0 + 6} L${x1} ${y0 + 6}`);
      yaz(filmB, 'd', yuz(526 + k, 1) + ' ' + yuz(564 - k, -1));
    } else {
      // tren gecer
      const tx = x0 - 40 + (s - 11) * 26;
      yaz(filmA, 'd', `M${x0} 147 L${x1} 147 M${x0} 149.4 L${x1} 149.4 ` + Array.from({ length: 8 }, (_, i) => `M${x0 + 4 + i * 10} 147 l0 2.4`).join(' '));
      yaz(filmB, 'd', [0, 1, 2].map((i) => { const x = tx - i * 17; return `M${f(x)} 145 L${f(x)} 135 L${f(x + 15)} 135 L${f(x + 15)} 145Z ` + oval(x + 3.6, 145.6, 1.6, 1.6) + ' ' + oval(x + 11.4, 145.6, 1.6, 1.6); }).join(' ') + ` M${f(tx + 9)} 135 L${f(tx + 9)} 131 L${f(tx + 12)} 131 L${f(tx + 12)} 135 ` + oval(tx + 14 - (s - 11) * 2, 126, 3 + (s - 11), 2));
    }
    yaz(cizik, 'd', kare % 5 < 2 ? `M${f(x0 + 6 + ((kare * 37) % 64))} ${y0} l0.4 ${y1 - y0}` : '');
  };

  // ================================================================ DINAMIK: sardunya, tente sacagi, buhar, hayvanlar
  const sardunya = pen(D, DP);
  const cicek = [0, 1, 2].map(() => renk(blot(D), 'cicek'));
  const yaprak = renk(paint(D, 'x', DP * 0.8), 'cicek'); yaprak.setAttribute('display', 'none');
  let yaprakT = -1, yaprakX = 0, yaprakY0 = 0;
  const sacak = pen(D, SP * 0.8);
  const sacakYay = spring(26, 3.4), saksiYay = spring(20, 3);
  const buhar = pen(D, DP * 0.8);
  let buharT = -1;
  const kuslar = serceler(D, telY, [300, 336, 372, 430, 470, 520], [290, 560]);
  const kedi = kediKur(D, KEDI, GROUND - 5);
  const musteri = musteriKur(D);
  const martilar = martiKur(D);
  const foto = fotografci(D, isikG, isikD, {
    kedi: (hafif) => (hafif ? kedi.kipirda() : kedi.durt()),
    vapurX: () => vapurX,
    vapurCagir: () => { if (vapurX > W + 26) vapurX = W + 26; },
    izBasla: () => izBasla(), izBitir: () => izBitir(),
    durum, tohum: () => gunTohumu(c.zaman(), 'fotografci'),
  });

  // ================================================================ uzun pozlama izi (gece, sehpa)
  let izNoktalar: Vec[] = [], izPoz = false, izSon = -1, izSure = 0;
  function izBasla() { izNoktalar = []; izPoz = true; izSon = -1; izSure = 0; }
  function izBitir() { izPoz = false; izSon = 0; }
  const izCiz = (dt: number) => {
    if (izPoz) {
      izSure += dt;
      if (vapurGorunur() && (izNoktalar.length === 0 || Math.abs(izNoktalar[izNoktalar.length - 1][0] - vapurX) > 2)) izNoktalar.push([vapurX, UFUK - 9.4 + Math.sin(izSure * 0.9) * 0.3]);
    } else if (izSon >= 0) izSon += dt;
    if (izSon > 9) { izSon = -1; izNoktalar = []; }
    // poz suresince iz yavas belirir (sensorde birikir); bitince 5 sn kalir, 4 sn'de soner
    const op = izPoz ? Math.min(1, izSure / 3) : izSon >= 0 ? 1 - clamp((izSon - 5) / 4, 0, 1) : 0;
    const d = izNoktalar.length > 1 ? 'M' + izNoktalar.map(pt).join('L') : '';
    yaz(izKalin, 'd', d); yaz(izInce, 'd', d);
    yaz(izKalin, 'opacity', f(op * 0.55)); yaz(izInce, 'opacity', f(op * 0.9));
  };

  // ================================================================ dokunma hedefleri (etiket: ekran okuyucuya)
  c.hedef({ ad: 'fotografci', etiket: 'fotoğrafçı', yer: () => foto.orta(), r: 22, oncelik: 3, dokun: () => foto.dokun() });
  c.hedef({ ad: 'kedi', etiket: 'kedi', yer: () => kedi.orta(), r: 12, oncelik: 3, dokun: () => kedi.durt() });
  [330, 425, 520].forEach((x, i) => c.hedef({ ad: `serceler${i}`, etiket: 'serçeler', klavye: i === 1, yer: () => (kuslar.konan() ? [x, telY(x) - 6] : null), r: 28, oncelik: 1, dokun: () => kuslar.kacir() }));
  c.hedef({ ad: 'fener', etiket: 'sokak lambası', yer: () => [FENER, 64], r: 10, oncelik: 2, dokun: () => { fenerYay.kick(2.2 * (Math.random() < 0.5 ? -1 : 1)); if (fenerYanik) fenerKirp = 0; } });
  c.hedef({ ad: 'saksi', etiket: 'sardunya', yer: () => [191, GROUND - 28], r: 14, oncelik: 1, dokun: () => { saksiYay.kick(30 * (Math.random() < 0.5 ? -1 : 1)); if (yaprakT < 0) yaprakT = 0; } });
  c.hedef({ ad: 'tente', etiket: 'tente', yer: () => [381, 124], r: 12, oncelik: 0.6, dokun: () => sacakYay.kick(34 * (Math.random() < 0.5 ? -1 : 1)) });
  c.hedef({ ad: 'cay', etiket: 'çay ocağı', yer: () => (durum.ocakAcik ? [345, 163] : null), r: 14, oncelik: 1.2, dokun: () => { buharT = 0; } });
  c.hedef({ ad: 'vapur', etiket: 'vapur', yer: () => (vapurGorunur() ? [vapurX, UFUK - 8] : null), r: 28, oncelik: 2, dokun: () => { dudukT = 2.2; martilar.izle(); } });
  c.hedef({ ad: 'martilar', etiket: 'martılar', yer: () => martilar.orta(durum.gece), r: 24, oncelik: 0.8, dokun: () => martilar.urkut() });
  c.hedef({ ad: 'musteri', etiket: 'çay içen adam', yer: () => (musteri.gorunur() ? [TABURE - 4, GROUND - 30] : null), r: 12, oncelik: 2, dokun: () => musteri.dokun() });
  c.hedef({ ad: 'sinema', etiket: 'yazlık sinema', yer: () => (durum.sinema ? [545, 131] : null), r: 30, oncelik: 0.4, dokun: () => { if (kopmaT < 0) kopmaT = 0; } });
  bakanlar.forEach((b, i) => c.hedef({ ad: `pencere${i}`, etiket: 'pencere', klavye: false, yer: () => (durum.sinema && b.p.x > 500 && b.p.x < 590 ? null : [b.p.x + b.p.w / 2, b.p.y + b.p.h / 2]), r: 13, pay: 5, oncelik: 0, dokun: () => bakanBaslat(b) }));

  // ================================================================ isiklar: yalniz durum degisince statik katmana dokunur
  let fenerYanik = false;
  function isiklariGuncelle(): void {
    const k = durum.gece, gy = durum.saat < 6 ? durum.saat + 24 : durum.saat;
    for (const p of pencereler) {
      const ol = p.vitrin ? durum.ocakAcik && k > p.esik : k > p.esik && gy < p.sonu;
      if (ol !== p.yanik) { p.yanik = ol; p.n.style.fill = ol ? 'var(--sk-pencere)' : ''; }
    }
    const fy = k > 0.45;
    if (fy !== fenerYanik) { fenerYanik = fy; fenerCam.style.fill = fy ? 'var(--sk-pencere)' : 'var(--sk-cam)'; }
    goster(sinemaG, durum.sinema); goster(koni, durum.sinema);
    goster(vapurCam, k > 0.5); goster(direkIsik, k > 0.5);
    if (!durum.sinema) yaz(lensIsik, 'opacity', '0');
  }
  isiklariGuncelle();
  let surum = -1, perviz = false;

  if (c.sorgu.has('debug')) {
    window.__sokak = { foto: () => foto.durum(), zorla: (d: Durak[], y: 1 | -1, x0?: number) => foto.zorla(d, y, x0), gecisler: () => foto.gecisler, vapurX: () => vapurX, martilar: () => martilar.durum(), durum: () => ({ ...durum }) };
  }

  c.basla((t, dt) => {
    const ruz = c.ruzgar.deger;
    if (surum !== c.surum()) { surum = c.surum(); durumHesapla(c.zaman()); isiklariGuncelle(); }
    const gece = durum.gece;
    for (const p of pencereler) yaz(p.g, 'opacity', p.yanik ? f(0.5 * Math.max(gece, 0.5)) : '0');

    // fener: sallanma yalniz hareket varken yazilir; gece dokununca ampul titrer, pervaneler doner
    if (Math.abs(fenerYay.a) > 0.0015 || Math.abs(fenerYay.v) > 0.0015) {
      fenerYay.step(-ruz * 0.02, dt);
      yaz(fenerG, 'transform', `rotate(${f(fenerYay.a * 57.3)} ${FENER} 72)`);
    }
    let fop = fenerYanik ? (0.85 + Math.sin(t * 1.7) * 0.05) * Math.max(gece, 0.7) : 0;
    if (fenerKirp >= 0) { fenerKirp += dt; if (fenerKirp > 0.9) fenerKirp = -1; else if (Math.floor(fenerKirp * 14) % 3 === 1) fop *= 0.25; }
    yaz(fenerIsik, 'opacity', f(fop));
    if (gece > 0.55) { pervane.ciz(t, gece); perviz = true; } else if (perviz) { pervane.ciz(t, 0); perviz = false; }

    // deniz: dalgalar, vapur, duduk buhari, martilar
    yaz(dalga, 'd', Array.from({ length: 7 }, (_, i) => { const x = DENIZ + 20 + i * 44 + Math.sin(t * 0.5 + i) * 6, y = UFUK + 4 + (i % 3) * 3.4; return `M${f(x)} ${f(y)} q3 -1.4 6 0 q3 1.4 6 0`; }).join(' '));
    vapurX -= dt * 6;
    if (vapurX < DENIZ - 40) vapurX = W + rnd(60, 400);
    const vg = vapurGorunur();
    goster(vapurG, vg);
    yaz(vapurParlak, 'opacity', vg && gece > 0.5 ? '0.8' : '0');
    if (vg) {
      const sallanma = Math.sin(t * 0.9) * 0.6;
      yaz(vapurG, 'transform', `translate(${f(vapurX)} ${f(UFUK - 4 + sallanma * 0.4)}) scale(-1 1) rotate(${f(sallanma)})`);
      dudukT = Math.max(0, dudukT - dt);
      const dm = (t * 0.6) % 1;
      yaz(duman, 'd', `M1 -18 q${f(-3 - dm * 4 - ruz * 6)} ${f(-3 - dm * 3)} ${f(-1 - dm * 8 - ruz * 10)} ${f(-7 - dm * 4)}`);
      // duduk: bacanin onunden uc beyaz buhar topu kabarir ve dagilir
      buharlar.forEach((n, i) => {
        const u = dudukT > 0 ? clamp((2.2 - dudukT - i * 0.18) / 1.6, 0, 1) : 0;
        yaz(n, 'd', u > 0 && u < 1 ? oval(-5 - i * 3.4 - u * 5 - ruz * 3 * u, -17 - u * 8 - i * 1.6, 1.8 + u * 3.2, 1.4 + u * 2.4) : '');
        yaz(n, 'opacity', f(1 - u * u));
      });
      if (gece > 0.5) { yaz(vapurParlak, 'cx', f(vapurX)); yaz(vapurParlak, 'cy', f(UFUK - 8)); }
    }
    izCiz(dt);
    martilar.ciz(t, dt, gece, vapurX);

    // sacak ve sardunyalar ruzgarla; dokununca bir yaprak duser
    const sc = sacakYay.step(-ruz * 4 + Math.sin(t * 1.2) * 0.4, dt);
    yaz(sacak, 'd', Array.from({ length: 19 }, (_, i) => { const x = 287 + i * 10.4; return `M${f(x)} 132 q${f(2.6 + sc * 0.6)} 4 ${f(5.2 + sc)} 0.6`; }).join(' '));
    const ys = saksiYay.step(-ruz * 5 + Math.sin(t * 1.3) * 0.6, dt);
    yaz(sardunya, 'd', `M191 ${GROUND - 22} Q${f(187 + ys)} ${GROUND - 32} ${f(183 + ys * 1.6)} ${GROUND - 38} M191 ${GROUND - 22} Q${f(194 + ys)} ${GROUND - 34} ${f(198 + ys * 1.4)} ${GROUND - 40} M191 ${GROUND - 22} Q${f(191 + ys * 0.6)} ${GROUND - 30} ${f(191 + ys)} ${GROUND - 44}`);
    cicek.forEach((n, i) => { const [x, y] = [[183 + ys * 1.6, GROUND - 38], [198 + ys * 1.4, GROUND - 40], [191 + ys, GROUND - 44]][i]; yaz(n, 'd', oval(x, y, 2.6, 2.2)); });
    if (yaprakT >= 0) {
      if (yaprakT === 0) { yaprakX = 198 + ys * 1.4; yaprakY0 = GROUND - 40; goster(yaprak, true); }
      yaprakT += dt;
      const dus = Math.min(1, yaprakT / 2.6), y = lerp(yaprakY0, GROUND - 1, dus * dus * (3 - 2 * dus)), sal = Math.sin(yaprakT * 4.2) * 5 * (1 - dus);
      yaprakX += (ruz * 6 + 2) * dt * (1 - dus);
      const x = yaprakX + sal, a = Math.cos(yaprakT * 4.2) * 0.9 * (1 - dus);
      yaz(yaprak, 'd', `M${f(x - 2)} ${f(y - a)} Q${f(x)} ${f(y - 1.8)} ${f(x + 2)} ${f(y + a)} Q${f(x)} ${f(y + 1.2)} ${f(x - 2)} ${f(y - a)}Z`);
      yaz(yaprak, 'opacity', f(1 - clamp((yaprakT - 5) / 1.5, 0, 1)));
      if (yaprakT > 6.5) { yaprakT = -1; goster(yaprak, false); }
    }
    // cay ocagi: dokununca caydanliktan buhar
    if (buharT >= 0) {
      buharT += dt;
      yaz(buhar, 'd', [0, 1, 2].map((i) => {
        const u = clamp((buharT - i * 0.35) / 2.2, 0, 1); if (u <= 0 || u >= 1) return '';
        const y = 157 - u * 15, x = 351 + i * 0.8 + u * (2 - ruz * 3), s = Math.sin(u * 9 + i) * 1.6;
        return `M${f(x)} ${f(y + 4)} q${f(s)} -2 0 -4 q${f(-s)} -2 0 -4`;
      }).join(' '));
      yaz(buhar, 'opacity', f(1 - clamp((buharT - 2) / 1, 0, 1)));
      if (buharT > 3.2) { buharT = -1; yaz(buhar, 'd', ''); }
    }
    bakanlar.forEach((b) => bakanCiz(b, dt));

    if (durum.sinema) {
      filmCiz(t, dt);
      izleyiciler.forEach((v, i) => {
        // izleyiciler: bas hafifce yana egilir, arada biri digerine doner
        const egil = Math.sin(t * 0.13 + i * 2) > 0.85 ? (i ? -1.2 : 1.2) : 0;
        yaz(v.bas, 'cx', f(v.x + egil)); yaz(v.sac, 'd', v.kasket ? `M${f(v.x + egil - 3)} ${GROUND - 31} Q${f(v.x + egil)} ${GROUND - 36} ${f(v.x + egil + 3)} ${GROUND - 31}Z` : `M${f(v.x + egil - 2.8)} ${GROUND - 29.4} Q${f(v.x + egil - 3)} ${GROUND - 34} ${f(v.x + egil)} ${GROUND - 33.6} Q${f(v.x + egil + 3)} ${GROUND - 34} ${f(v.x + egil + 2.8)} ${GROUND - 29.4} Q${f(v.x + egil)} ${GROUND - 31} ${f(v.x + egil - 2.8)} ${GROUND - 29.4}Z ` + oval(v.x + egil, GROUND - 34.6, 1.4, 1.2));
      });
    }

    kuslar.ciz(t, dt, gece, foto.gorunur() ? foto.x() : -999);
    kedi.ciz(t, dt, gece);
    musteri.ciz(t, dt, durum.aksam);
    foto.ciz(t, dt, ruz);
  }, () => (foto.gorunur() ? foto.x() : null));
}

// ==================================================================== martilar (B6): suzulerek cember, arada cirpma
function martiKur(parent: SVGElement) {
  type Marti = { n: SVGPathElement; b: SVGPathElement; x: number; y: number; px: number; py: number; a: number; w: number; r: number; cirp: number; sonraki: number; konX: number; kondu: boolean; yon: 1 | -1 };
  const KON = [668, 694, 932];
  const ms: Marti[] = [0, 1, 2].map((i) => ({
    b: shape(parent, DP * 1.1), n: pen(parent, SP * 0.75), x: 760 + i * 50, y: 70 + i * 14, px: 0, py: 0,
    a: rnd(0, 6.28), w: rnd(0.28, 0.42) * (i === 1 ? -1 : 1), r: rnd(34, 60), cirp: 0, sonraki: rnd(2, 7), konX: KON[i], kondu: false, yon: 1,
  }));
  let mod: 'daire' | 'izle' | 'kon' = 'daire', izleT = 0, merkezX = 800, merkezY = 80, merkezSonra = 0;
  return {
    orta: (gece: number): Vec | null => (gece > 0.5 ? null : [ms[1].x, ms[1].y]),
    izle() { if (mod !== 'kon') { mod = 'izle'; izleT = 10; ms.forEach((m) => { m.cirp = 1.2; }); } },
    urkut() { ms.forEach((m) => { m.cirp = 1.4; m.y -= 2; }); merkezY = Math.max(40, merkezY - 14); },
    durum: () => ({ mod, konan: ms.filter((m) => m.kondu).length, xy: ms.map((m) => [Math.round(m.x), Math.round(m.y)]) }),
    ciz(t: number, dt: number, gece: number, vapurX: number) {
      if (gece > 0.5) mod = 'kon';
      else if (mod === 'kon') { mod = 'daire'; ms.forEach((m) => { m.kondu = false; m.cirp = 1.6; }); }
      if (mod === 'izle' && ((izleT -= dt) < 0 || vapurX > W + 20 || vapurX < DENIZ)) mod = 'daire';
      // daire merkezi arada baska yere kayar
      if ((merkezSonra -= dt) < 0) { merkezSonra = rnd(8, 16); merkezX = rnd(700, 880); merkezY = rnd(50, 100); }
      ms.forEach((m, i) => {
        m.px = m.x; m.py = m.y;
        let tx: number, ty: number;
        if (mod === 'kon') { tx = m.konX; ty = KORKULUK - 0.6; }
        else if (mod === 'izle') { tx = vapurX + 20 + i * 13; ty = UFUK - 26 - i * 5; }
        else { m.a += m.w * dt; tx = merkezX + (i - 1) * 30 + Math.cos(m.a) * m.r; ty = merkezY + (i - 1) * 8 + Math.sin(m.a) * m.r * 0.32; }
        const uzak = Math.hypot(tx - m.x, ty - m.y);
        if (m.kondu) { tx = m.konX; ty = KORKULUK - 0.6; }
        const k = 1 - Math.exp(-dt * (mod === 'daire' ? 3 : 1.6));
        m.x += (tx - m.x) * k; m.y += (ty - m.y) * k;
        if (mod === 'kon' && uzak < 0.8) m.kondu = true;
        const vx = (m.x - m.px) / Math.max(dt, 1e-3), vy = (m.y - m.py) / Math.max(dt, 1e-3);
        if (Math.abs(vx) > 2) m.yon = vx > 0 ? 1 : -1;
        if (m.kondu) {
          // konmus marti: govde, bas, gaga, kuyruk; arada basini cevirir
          if ((m.sonraki -= dt) < 0) { m.sonraki = rnd(2, 6); m.yon = m.yon === 1 ? -1 : 1; }
          const d = m.yon, X = (dx: number) => f(m.x + dx * d), y = m.y;
          yaz(m.b, 'd', `M${X(-5)} ${f(y - 2.6)} Q${X(-1)} ${f(y - 6)} ${X(3)} ${f(y - 4.4)} Q${X(4)} ${f(y - 1)} ${X(0)} ${f(y - 0.4)} Q${X(-3)} ${f(y - 0.6)} ${X(-5)} ${f(y - 2.6)}Z ` + oval(m.x + 3.4 * d, y - 6.6, 1.6, 1.5));
          yaz(m.n, 'd', `M${X(4.8)} ${f(y - 6.6)} l${f(1.8 * d)} 0.5 M${X(-5)} ${f(y - 2.6)} l${f(-2.4 * d)} -0.4 M${X(-1.6)} ${f(y - 3.6)} Q${X(0.8)} ${f(y - 3)} ${X(1.6)} ${f(y - 2)} M${X(-0.6)} ${f(y - 0.4)} l0 0.6 M${X(1)} ${f(y - 0.4)} l0 0.6`);
          return;
        }
        yaz(m.b, 'd', '');
        // ucan marti: kanatlar suzulurken V'de durur, donuste yatar; arada (ve hizlaninca) cirpar
        if ((m.sonraki -= dt) < 0) { m.sonraki = rnd(3, 8); m.cirp = Math.max(m.cirp, 0.9); }
        if (mod !== 'daire' && uzak > 14) m.cirp = Math.max(m.cirp, 0.3);
        m.cirp = Math.max(0, m.cirp - dt);
        const cirpma = m.cirp > 0 ? Math.sin(t * 17 + i) * 2.8 : 0;
        const yat = clamp(vy * 0.08, -1.6, 1.6) * m.yon;
        const x = m.x, y = m.y, k1 = 1.4 + cirpma - yat, k2 = 1.4 + cirpma + yat;
        yaz(m.n, 'd', `M${f(x - 7)} ${f(y - 1 - k1)} Q${f(x - 3.4)} ${f(y - 3.6 - k1 * 0.8)} ${f(x)} ${f(y)} Q${f(x + 3.4)} ${f(y - 3.6 - k2 * 0.8)} ${f(x + 7)} ${f(y - 1 - k2)}`);
      });
    },
  };
}

// ==================================================================== aksam cay ocaginda oturan musteri (B9)
function musteriKur(parent: SVGElement) {
  const g = el('g', { display: 'none' }, parent);
  const pantolon = (l: Limb): Limb => { const n = l.g.querySelector('path'); if (n) { n.removeAttribute('fill'); n.classList.remove('pp'); n.style.fill = 'var(--sk-pantolon)'; } return l; };
  const uzakKol = limb(g, 3.6);
  const bacak = [pantolon(solid(limb(g, 4.2))), pantolon(solid(limb(g, 4.2)))];
  const ayak = [blot(g), blot(g)];
  const ceket = shape(g);
  const bas = el('ellipse', { cx: 42, cy: 58.6, rx: 3.6, ry: 4.5, 'stroke-width': PEN, stroke: 'currentColor' }, g); bas.classList.add('pp');
  const kasket = blot(g);
  const bardak = renk(paint(g, 'x', PEN * 0.6), 'cay');
  const yakinKol = limb(g, 3.6);
  place(g, TABURE, GROUND, -1, SC);
  let yudumT = -1, sonraki = 3, kadehT = -1, acik = false;
  const hip: Vec = [40, 101];
  bacak[0].draw([hip, [57.5, 99], [55, 118.4]], [0.3, 0.8]); shoe(ayak[0], [55, 118.4], 0);
  bacak[1].draw([[41, 101.6], [54, 100.4], [50.6, 118.4]], [0.3, 0.8]); shoe(ayak[1], [50.6, 118.4], 0);
  uzakKol.draw([[40.6, 72], [42.4, 87], [52, 95.6]], [0.2, 0.5]);
  return {
    gorunur: () => acik,
    dokun() { if (kadehT < 0 && yudumT < 0) kadehT = 0; },
    ciz(t: number, dt: number, aksam: boolean) {
      if (aksam !== acik) { acik = aksam; goster(g, aksam); }
      if (!acik) return;
      const nefes = Math.sin(t * 1.7) * 0.3;
      // yudum: bardak agiza gelir, egilir, iner; dokununca bardagi kaldirip selamlar
      if (yudumT < 0 && kadehT < 0 && (sonraki -= dt) < 0) { yudumT = 0; sonraki = rnd(5, 10); }
      let u = 0, kadeh = 0;
      if (yudumT >= 0) { yudumT += dt; u = ara(yudumT, 0, 0.6) * (1 - ara(yudumT, 1.4, 2)); if (yudumT > 2) yudumT = -1; }
      if (kadehT >= 0) { kadehT += dt; kadeh = ara(kadehT, 0, 0.5) * (1 - ara(kadehT, 1.6, 2.2)); if (kadehT > 2.2) kadehT = -1; }
      const sh: Vec = [41.6, 70 + nefes];
      yaz(ceket, 'd', `M${f(sh[0] - 5.6)} ${f(sh[1] + 1)} Q${f(sh[0])} ${f(sh[1] - 2.2)} ${f(sh[0] + 5)} ${f(sh[1] + 1)} Q${f(sh[0] + 6.4)} ${f(sh[1] + 16)} ${f(sh[0] + 6.2)} 99 Q${f(sh[0] + 9)} 100.4 ${f(sh[0] + 9.6)} 102.4 L${f(sh[0] - 6.6)} 103.4 Q${f(sh[0] - 7.2)} ${f(sh[1] + 14)} ${f(sh[0] - 5.6)} ${f(sh[1] + 1)}Z`);
      const hc: Vec = [42 + u * 0.8 - kadeh * 0.3, 58.6 + nefes - u * 0.4];
      yaz(bas, 'cx', f(hc[0])); yaz(bas, 'cy', f(hc[1]));
      yaz(kasket, 'd', `M${f(hc[0] - 3.9)} ${f(hc[1] - 0.6)} Q${f(hc[0] - 3.6)} ${f(hc[1] - 5.4)} ${f(hc[0] + 0.6)} ${f(hc[1] - 5)} Q${f(hc[0] + 3.6)} ${f(hc[1] - 4.6)} ${f(hc[0] + 3.8)} ${f(hc[1] - 2)} L${f(hc[0] + 6.4)} ${f(hc[1] - 1.6)} Q${f(hc[0] + 4)} ${f(hc[1] - 0.8)} ${f(hc[0] - 3.9)} ${f(hc[1] - 0.6)}Z`);
      const elDiz: Vec = [52.6, 84.4], elAgiz: Vec = [47.6, 62.4], elHavada: Vec = [55, 66];
      const el1 = L2(L2(elDiz, elAgiz, u), elHavada, kadeh);
      const dirsek = L2(L2([46.6, 86.6], [50.6, 76], u), [53, 76.6], kadeh);
      yakinKol.draw([[sh[0] + 1, sh[1] + 2], dirsek, el1], [0.2, 0.4]);
      const egik = u * 50 + kadeh * -10;
      const r = (egik * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
      const B = (x: number, y: number) => `${f(el1[0] + x * cs - y * sn)} ${f(el1[1] - 1 + x * sn + y * cs)}`;
      // ince belli cay bardagi
      yaz(bardak, 'd', `M${B(-1.5, -4)} L${B(1.5, -4)} Q${B(0.7, -1.4)} ${B(1.3, 0.6)} L${B(1.4, 2)} L${B(-1.4, 2)} L${B(-1.3, 0.6)} Q${B(-0.7, -1.4)} ${B(-1.5, -4)}Z`);
    },
  };
}

// ==================================================================== fotografci
type Durak = 'cay' | 'kedi' | 'deniz' | 'sinema';
type Is =
  | { ad: 'yuru'; hedef: number; dur: boolean; acil?: boolean; durFaz?: number; r0?: number; otur?: boolean }
  | { ad: 'kedi'; t: number; cekti: boolean }
  | { ad: 'cek'; t: number; cekti: boolean }
  | { ad: 'arka'; tur: 'cay' | 'deniz' | 'sehpa' | 'sinema'; t: number; sure: number; kamera: boolean; cekti: boolean; izde: boolean; cekT?: number }
  | { ad: 'yok'; t: number; sure: number };
type Gecis = { yon: 1 | -1; duraklar: Durak[]; imza: string };
interface FotoBag {
  /** hafif: kedi uyanmadan kulagini oynatir, basini bir an kaldirir; degilse tam uyanir. */
  kedi(hafif?: boolean): void; vapurX(): number; vapurCagir(): void; izBasla(): void; izBitir(): void;
  durum: { gece: number; sinema: boolean };
  tohum(): number;
}

function fotografci(parent: SVGElement, isikKat: SVGElement, isikDolgu: string, bag: FotoBag) {
  const pantolon = (l: Limb): Limb => { const n = l.g.querySelector('path'); if (n) { n.removeAttribute('fill'); n.classList.remove('pp'); n.style.fill = 'var(--sk-pantolon)'; } return l; };
  const flas = el('circle', { r: 14, fill: isikDolgu, opacity: 0 }, isikKat);

  // ------------------------------------------------ YAN gorunus (yururken, comelirken)
  const yan = el('g', {}, parent);
  const farArm = limb(yan, 3.6);
  const legs = [pantolon(solid(limb(yan, 4.2))), pantolon(solid(limb(yan, 4.2)))];
  const shoes = [blot(yan), blot(yan)];
  const ceket = shape(yan);
  const dikis = pen(yan, PEN * 0.6);
  const atkiUc = renk(paint(yan, 'x', PEN * 0.8), 'atki');
  const basG = el('g', {}, yan);
  const bas = el('ellipse', { cx: 0, cy: 0, rx: 3.6, ry: 4.6, 'stroke-width': PEN, stroke: 'currentColor' }, basG); bas.classList.add('pp');
  const sac = blot(basG);
  const atki = renk(paint(yan, 'x', PEN * 0.8), 'atki');
  const aski = pen(yan, PEN * 0.6);
  const makineG = el('g', {}, yan);
  // makinenin sabit cizimi bir kez yazilir (A6)
  blot(makineG).setAttribute('d', 'M-4.4 -2.6 L-1.6 -2.6 L-0.8 -3.8 L1.6 -3.8 L2.2 -2.6 L4.4 -2.6 Q5 -2.6 5 -2 L5 2.6 Q5 3.2 4.4 3.2 L-4.4 3.2 Q-5 3.2 -5 2.6 L-5 -2 Q-5 -2.6 -4.4 -2.6Z');
  const obj = el('circle', { cx: 2.6, cy: 0.4, r: 2.3, 'stroke-width': PEN * 0.8, stroke: 'currentColor' }, makineG); obj.classList.add('pp');
  const nearArm = limb(yan, 3.6);
  let onAyak = -1;

  // ------------------------------------------------ ARKA gorunus (vitrine, denize, perdeye donuk)
  const arka = el('g', { display: 'none' }, parent);
  const sehpaG = el('g', {}, arka);
  const sehpaAyak = pen(sehpaG, PEN * 0.9);
  const sehpaBas = blot(sehpaG);
  const kablo = pen(arka, PEN * 0.4);
  const aLegs = [pantolon(solid(limb(arka, 4.2))), pantolon(solid(limb(arka, 4.2)))];
  const aShoes = [blot(arka), blot(arka)];
  const aCeket = shape(arka);
  const aDikis = pen(arka, PEN * 0.6);
  const aKol = [limb(arka, 3.6), limb(arka, 3.6)];
  const aAtkiUc = renk(paint(arka, 'x', PEN * 0.8), 'atki');
  const aAtki = renk(paint(arka, 'x', PEN * 0.8), 'atki');
  const aMakine = blot(arka);
  const aBas = el('ellipse', { cx: 40, cy: 31.6, rx: 3.6, ry: 4.6, 'stroke-width': PEN, stroke: 'currentColor' }, arka); aBas.classList.add('pp');
  const aSac = blot(arka);
  const aYuz = pen(arka, PEN * 0.5);

  const walk = gait({ kind: 'walk' });
  const DONGU = walk.speed * SC * walk.period;
  const GECIS = 0.31; // ayaklarin yan yana geldigi faz (yarim dongude)
  const kolYay = [spring(60, 9), spring(60, 9)];
  const makineSalla = pendulum(16, 1.6);
  const atkiYay = spring(30, 4);
  const bakYay = spring(14, 6);

  // ------------------------------------------------ yurume: govde basan ayaga gore ilerler (ayak kaymaz, A5)
  let x = 140, yon: 1 | -1 = 1, phase = 0.1, go = 1, gor = true;
  let tem: [number, number] = [0, 0], tk = 0;
  const temas = (fo: { ankle: Vec; pitch: number }) => { const r = (fo.pitch * Math.PI) / 180; return fo.ankle[0] + 4.2 * Math.cos(r) - 1.6 * Math.sin(r); };
  let p: Pose = walk.pose(phase, go);
  const temasKur = () => { p = walk.pose(phase, go); tem = [temas(p.feet[0]), temas(p.feet[1])]; };
  const adimla = (dFaz: number) => {
    phase += dFaz;
    p = walk.pose(phase, go);
    const ham = walk.pose(phase, 1);
    const s0 = ham.feet[0].stance, s1 = ham.feet[1].stance;
    let k = tk;
    if (s0 && s1) k = ham.feet[0].pitch <= ham.feet[1].pitch ? 0 : 1; else if (s0) k = 0; else if (s1) k = 1;
    const yeni: [number, number] = [temas(p.feet[0]), temas(p.feet[1])];
    x += yon * (tem[k] - yeni[k]) * SC;
    tem = yeni; tk = k;
  };
  temasKur();

  // ------------------------------------------------ gecis plani (B3): gune ozgu tohum + gecis sirasi
  const gecisler: string[] = [];
  let gecisNo = 0, oncekiImza = '';
  const kuyruk: Is[] = [];
  let is: Is = { ad: 'yok', t: 0, sure: 0 };
  let zorunlu: { yon: 1 | -1; duraklar: Durak[]; x0?: number } | null = null;
  const planla = (ilk: boolean) => {
    const r = seeded((bag.tohum() + gecisNo * 7919) % 2147483646 || 1);
    gecisNo++;
    const gece = bag.durum.gece > 0.5;
    let g: Gecis = { yon: 1, duraklar: [], imza: '' };
    for (let deneme = 0; deneme < 6; deneme++) {
      const yon: 1 | -1 = ilk || r() < 0.62 ? 1 : -1;
      const d: Durak[] = [];
      if (r() < 0.4) d.push('cay');
      if (r() < (gece ? 0.3 : 0.45)) d.push('kedi');
      if (bag.durum.sinema && r() < 0.85) d.push('sinema');
      if (r() < 0.7) d.push('deniz');
      const imza = `${yon > 0 ? '→' : '←'} ${d.length ? d.map((k) => (k === 'deniz' && gece ? 'sehpa' : k)).join('+') : 'düz'}`;
      g = { yon, duraklar: d, imza };
      if (imza !== oncekiImza) break; // ust uste ayni gecis olmasin
    }
    if (zorunlu) { g = { yon: zorunlu.yon, duraklar: zorunlu.duraklar, imza: 'zorunlu' }; }
    oncekiImza = g.imza;
    gecisler.push(g.imza);
    yon = g.yon;
    const dx = (d: Durak) => d === 'kedi' ? KEDI - yon * (yon > 0 ? 36 : 27) : d === 'cay' ? VITRIN + r(-18, 18) : d === 'sinema' ? r(612, 630) : gece ? r(736, 876) : r(700, 890);
    const duraklar = g.duraklar.map((d) => ({ d, x: dx(d) })).sort((a, b) => (a.x - b.x) * yon);
    x = zorunlu?.x0 ?? (ilk ? r(70, 180) : yon > 0 ? -30 : W + 30);
    zorunlu = null;
    phase = r(0, 1); go = 1; temasKur(); gor = true;
    goster(yan, true); goster(arka, false);
    for (const { d, x: hx } of duraklar) {
      if ((hx - x) * yon < 8) continue;
      kuyruk.push({ ad: 'yuru', hedef: hx, dur: true });
      if (d === 'kedi') kuyruk.push({ ad: 'kedi', t: 0, cekti: false });
      else {
        const tur = d === 'deniz' ? (gece ? 'sehpa' : 'deniz') : d;
        const sure = tur === 'deniz' ? r(8, 14) : tur === 'sehpa' ? r(10, 14) : tur === 'sinema' ? r(10, 16) : r(1.2, 3);
        kuyruk.push({ ad: 'arka', tur, t: 0, sure, kamera: tur === 'cay' ? r() < 0.65 : r() < 0.5, cekti: false, izde: false });
      }
    }
    kuyruk.push({ ad: 'yuru', hedef: yon > 0 ? W + 34 : -34, dur: false });
    // sonra bir sure yok: cogu kez kisa, bazen uzun
    kuyruk.push({ ad: 'yok', t: 0, sure: r() < 0.3 ? r(22, 40) : r(3, 12) });
  };

  // ------------------------------------------------ cizim durumu (her kare isler belirler)
  const st = { don: 0, comel: 0, kaldir: 0, nisan: 0, flas: 0, bakis: 0, yZ: YOL, otur: 0, kolA: 'yan' as Kol, kolB: 'yan' as Kol, kolU: 0, bak: 0, sehpa: -1 };
  type Kol = 'yan' | 'kamera' | 'korkuluk' | 'cep' | 'kablo';
  let bakT = -1, kediYanT = -1;

  const sonraki = () => { is = kuyruk.shift() ?? { ad: 'yok', t: 0, sure: 0 }; if (is.ad === 'yuru') temasKur(); };
  const dokunma = { cek: false };

  const yuruIs = (w: Extract<Is, { ad: 'yuru' }>, dt: number) => {
    if (w.durFaz === undefined) {
      // kalkis: ayaklar yan yana durustan adim acilir
      if (go < 1) go = Math.min(1, go + dt / 0.35);
      const hiz = ease(go);
      const dur = w.acil || (w.dur && (() => {
        const m = ((phase % 0.5) + 0.5) % 0.5;
        let ileri = (GECIS - m + 0.5) % 0.5; if (ileri < 0.15) ileri += 0.5;
        return (w.hedef - (x + yon * ileri * DONGU)) * yon < DONGU / 4;
      })());
      if (dur && go >= 1) {
        const m = ((phase % 0.5) + 0.5) % 0.5;
        let ileri = (GECIS - m + 0.5) % 0.5; if (ileri < 0.15) ileri += 0.5;
        w.durFaz = phase + ileri; w.r0 = ileri;
      } else {
        adimla((dt / walk.period) * hiz);
        if (!w.dur && (x - w.hedef) * yon > 0) { gor = false; goster(yan, false); sonraki(); }
        return;
      }
    }
    // durus: faz ve govde birlikte yavaslar, ayaklar yan yana gelince durur; sonra ayaklar topuklanir
    const kalan = (w.durFaz as number) - phase;
    if (kalan > 1e-6) {
      const hiz = 0.18 + 0.82 * ease(clamp(kalan / (w.r0 as number), 0, 1));
      adimla(Math.min(kalan, (dt / walk.period) * hiz));
      return;
    }
    go = Math.max(0, go - dt / 0.3);
    adimla(0);
    if (go <= 0) { go = 0; sonraki(); }
  };

  const o = {
    gecisler,
    x: () => x,
    gorunur: () => gor,
    orta(): Vec | null {
      if (!gor) return null;
      if (st.don >= 0.5) return [x, st.otur > 0.5 ? 148 : YOL - 50 * SC];
      return [x, YOL - (46 - st.comel * 12) * SC];
    },
    dokun() {
      if (is.ad === 'yuru' && is.durFaz === undefined && go >= 1) {
        // yururken: bir adimda durur, makineyi kaldirip ceker, yoluna devam eder
        kuyruk.unshift({ ad: 'cek', t: 0, cekti: false }, { ...is, acil: false, durFaz: undefined, r0: undefined });
        is.acil = true;
      } else if (st.don >= 0.5) bakT = 0; // arkasi donukken omzunun ustunden bakar
      else dokunma.cek = true; // comelmisken bir kare daha
    },
    /** ?debug: sonraki gecisi zorla (yakin cekim denemeleri icin). */
    zorla(duraklar: Durak[], y: 1 | -1, x0?: number) { zorunlu = { yon: y, duraklar, x0 }; kuyruk.length = 0; is = { ad: 'yok', t: 0, sure: 0 }; if (gecisNo === 0) gecisNo = 1; },
    durum: () => ({ is: is.ad, tur: is.ad === 'arka' ? is.tur : null, x, go, phase, ayak: [0, 1].map((i) => x + yon * (tem[i] - 40) * SC), bilek: sonBilek.slice(), tk, gor }),
    ciz(t: number, dt: number, ruzgar: number) {
      // ---------- isler
      st.don = 0; st.comel = 0; st.kaldir = 0; st.nisan = 0; st.flas = 0; st.bakis = 0;
      st.yZ = YOL; st.otur = 0; st.kolA = 'yan'; st.kolB = 'yan'; st.kolU = 0; st.sehpa = -1;
      if (is.ad === 'yok') {
        is.t += dt;
        if (is.t >= is.sure) { if (gecisNo === 0) planla(true); else planla(false); sonraki(); }
      } else if (is.ad === 'yuru') {
        yuruIs(is, dt);
        // kediyi gecerken basini ona cevirir; kedi bazen uyanir (A1)
        const kd = Math.abs(x - KEDI);
        if (kd < 30 && is.ad === 'yuru') st.bakis = (1 - kd / 30) * 16;
        if (kd < 6 && kediYanT < 0) { kediYanT = 0; bag.kedi(Math.random() < 0.6); }
        if (kd > 40) kediYanT = -1;
      } else if (is.ad === 'cek') {
        is.t += dt;
        const T = is.t;
        st.kaldir = ara(T, 0, 0.45) * (1 - ara(T, 1.55, 2));
        if (T > 0.95 && !is.cekti) { is.cekti = true; }
        st.flas = T > 0.95 && T < 1.15 ? 1 - (T - 0.95) / 0.2 : 0;
        if (T > 2.1) sonraki();
      } else if (is.ad === 'kedi') {
        // B2: kedinin yaninda comelir, ceker (kucuk flas), kedi uyanir
        is.t += dt;
        const T = is.t;
        st.comel = ara(T, 0, 0.7) * (1 - ara(T, 3.9, 4.6));
        st.kaldir = ara(T, 0.5, 0.95) * (1 - ara(T, 3.4, 3.9));
        st.nisan = 24 * st.kaldir;
        if (T > 1.4 && !is.cekti) { is.cekti = true; bag.kedi(true); }
        st.flas = T > 1.4 && T < 1.56 ? 1 - (T - 1.4) / 0.16 : 0;
        if (dokunma.cek && st.kaldir > 0.9) { is.t = Math.min(is.t, 1.3); is.cekti = true; dokunma.cek = false; }
        if (T > 4.6) sonraki();
      } else if (is.ad === 'arka') {
        is.t += dt;
        const T = is.t, S = is.sure;
        if (is.tur === 'cay') {
          // vitrine doner; ya fotografini ceker ya da camdan iceri bakar
          st.don = ara(T, 0, 0.35) * (1 - ara(T, 2.5 + S, 2.85 + S));
          st.kolA = 'yan'; st.kolB = is.kamera ? 'kamera' : 'cep';
          st.kolU = ara(T, 0.35, 0.85) * (1 - ara(T, 1.9 + S, 2.4 + S));
          if (is.kamera && T > 1.3 && !is.cekti) is.cekti = true;
          st.flas = is.kamera && bag.durum.gece > 0.5 && T > 1.3 && T < 1.45 ? 0.7 : 0;
          if (T > 2.85 + S) sonraki();
        } else if (is.tur === 'sinema') {
          st.don = ara(T, 0, 0.35) * (1 - ara(T, 0.9 + S, 1.25 + S));
          st.kolA = 'yan'; st.kolB = 'cep'; st.kolU = ara(T, 0.35, 0.9) * (1 - ara(T, 0.5 + S, 0.9 + S));
          if (T > 1.25 + S) sonraki();
        } else if (is.tur === 'deniz') {
          // B1: korkuluga oturur, denize bakar; vapur gecerse bir kare ceker; kalkar, yoluna devam eder
          const kalk = 1.6 + S;
          st.don = ara(T, 0, 0.35) * (1 - ara(T, kalk + 1.2, kalk + 1.55));
          st.otur = ara(T, 0.8, 1.6) * (1 - ara(T, kalk, kalk + 0.8));
          // korkuluga yaklasir, oturunca kalca tirabzana iner (etek ust tirabzanda durur)
          st.yZ = lerp(YOL, GROUND, ara(T, 0.35, 0.8) * (1 - ara(T, kalk + 0.8, kalk + 1.2))) + st.otur * 4;
          st.kolA = 'yan'; st.kolB = 'korkuluk'; st.kolU = ara(T, 0.8, 1.4) * (1 - ara(T, kalk, kalk + 0.6));
          const vx = bag.vapurX();
          if (is.kamera && !is.cekti && T > 3 && T < kalk - 3 && Math.abs(vx - x) < 150) { is.cekti = true; is.cekT = T; }
          const cT = is.cekT;
          if (cT !== undefined) {
            const u = ara(T, cT, cT + 0.5) * (1 - ara(T, cT + 2, cT + 2.5));
            if (u > 0) { st.kolA = 'korkuluk'; st.kolB = 'kamera'; st.kolU = u; }
          }
          if (T > kalk + 1.55) sonraki();
        } else {
          // B4: gece sehpa kurar, vapurun isigini uzun pozlar, toplar
          const top = 1.8 + S + 1;
          st.don = ara(T, 0, 0.35) * (1 - ara(T, top + 1.3, top + 1.65));
          st.sehpa = ara(T, 0.35, 1.8) * (1 - ara(T, top, top + 1.2));
          st.kolA = 'yan'; st.kolB = 'kablo'; st.kolU = ara(T, 1.2, 1.8) * (1 - ara(T, top - 0.4, top));
          if (T > 0.4 && !is.cekti) { is.cekti = true; bag.vapurCagir(); }
          if (T > 1.8 && T <= 1.8 + S && !is.izde) { is.izde = true; bag.izBasla(); }
          if (T > 1.8 + S && is.izde) { is.izde = false; bag.izBitir(); }
          if (T > top + 1.65) sonraki();
        }
      }
      if (!gor) return;
      if (bakT >= 0) { bakT += dt; st.bak = ara(bakT, 0, 0.4) * (1 - ara(bakT, 1.4, 1.9)); if (bakT > 1.9) bakT = -1; } else st.bak = 0;
      if (is.ad === 'arka' && is.tur === 'deniz' && st.otur > 0.9) {
        // oturan: vapur goruse girince basini ona cevirir
        const vx = bag.vapurX();
        const hedef = vx > DENIZ && vx < W ? clamp((x - vx) / 160, -1, 1) * 0.6 * yon : 0;
        st.bak = Math.abs(st.bak) > 0.01 ? st.bak : bakYay.step(hedef, dt);
      } else bakYay.step(0, dt);
      // ekran disinda hicbir sey yazilmaz
      if (x < -26 || x > W + 26) return;
      if (st.don < 0.5) yanCiz(t, dt, ruzgar); else arkaCiz(t, dt, ruzgar);
      const [lx, ly] = st.don < 0.5 ? toScene(x, YOL, yon, sonMakine[0] + 5, sonMakine[1], SC) : [x, st.yZ - 76 * SC];
      if (st.flas > 0) { yaz(flas, 'cx', f(lx + 4 * yon)); yaz(flas, 'cy', f(ly)); }
      yaz(flas, 'opacity', f(st.flas * 0.75));
    },
  };

  // ------------------------------------------------ yan cizim
  let sonMakine: Vec = [0, 0];
  const sonBilek = [0, 0];
  let gorunus: 'yan' | 'arka' = 'yan';
  const sacYan = (k: number) => {
    // k: 0 yandan, 1 neredeyse arkadan (donerken sac yuzu ortmeye baslar)
    const P = [[2.2, -4.2], [-1.6, -6.4], [-3.9, -1.6], [-4.2, 1.6], [-3, 2.6], [-2.2, -0.4], [-1, -2.4], [0.6, -3.8]];
    const Q = [[3.4, -3.2], [0.4, -6.6], [-3.9, -1.6], [-4.2, 1.6], [-2.6, 2.8], [1, 2.6], [3.6, 1.2], [3.8, -1.4]];
    const R = P.map((a, i) => [lerp(a[0], Q[i][0], k), lerp(a[1], Q[i][1], k)]);
    return `M${pt(R[0])} Q${pt(R[1])} ${pt(R[2])} Q${pt(R[3])} ${pt(R[4])} Q${pt(R[5])} ${pt(R[6])} Q${pt(R[7])} ${pt(R[0])}Z`;
  };
  yaz(sac, 'd', sacYan(0));
  // comelme pozu: on ayak one atilir, arka diz yere iner
  const COMEL = { hip: [36.4, 95.4] as Vec, on: [53, 118.4] as Vec, arkaDiz: [31.4, 117.4] as Vec, arkaBilek: [13.6, 116.2] as Vec };
  function yanCiz(t: number, dt: number, ruzgar: number) {
    if (gorunus !== 'yan') { gorunus = 'yan'; goster(arka, false); goster(yan, true); }
    place(yan, x, YOL, yon, SC);
    const u = st.comel;
    const b = p.bob;
    const hip: Vec = L2(p.hip, COMEL.hip, u);
    // oncu ayak: durusta onde kalan ayak comelirken one atilir
    const on = p.feet[0].ankle[0] >= p.feet[1].ankle[0] ? 0 : 1;
    p.feet.forEach((fo, i) => {
      let ankle = fo.ankle, knee = fo.knee, pitch = fo.pitch;
      if (u > 0) {
        if (i === on) { ankle = L2(fo.ankle, COMEL.on, u); const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1], d = Math.min(Math.hypot(dx, dy), 45.9), a = Math.atan2(dy, dx) - Math.acos(clamp(d / 46, -1, 1)); knee = [hip[0] + 23 * Math.cos(a), hip[1] + 23 * Math.sin(a)]; }
        else { ankle = L2(fo.ankle, COMEL.arkaBilek, u); knee = L2(fo.knee, COMEL.arkaDiz, u); pitch = lerp(fo.pitch, 46, u); }
      }
      legs[i].draw([hip, knee, ankle], [0.3, 0.8]); shoe(shoes[i], ankle, pitch);
      sonBilek[i] = x + yon * (ankle[0] - 40) * SC;
    });
    // one dusen bacak ustte: yalniz degisince yer degistirir (A6)
    const front = u > 0.5 ? on : p.front;
    if (front !== onAyak) { onAyak = front; yan.insertBefore(legs[front].g, ceket); yan.insertBefore(shoes[front], ceket); }

    const kF = u > 0 ? [lerp(p.feet[front].knee[0], 50, u), 0] : p.feet[front].knee;
    const egil = u * 5.4, dy = hip[1] - p.hip[1];
    const sh: Vec = [41 + egil, 41 + b + dy + u * 2];
    const etek = 74 + b * 0.6 + dy;
    const arkaX = 32.4 + egil * 0.4;
    const fx = Math.max(kF[0] - 1, 45.6 + egil * 0.6);
    // ceket: kenarlar hafif kavisli (dokunmatikte titreme filtresi yok, B8)
    yaz(ceket, 'd', `M${f(sh[0] - 6)} ${f(sh[1] + 1)} Q${f(sh[0] - 1)} ${f(sh[1] - 2.4)} ${f(sh[0] + 5)} ${f(sh[1] + 1)} Q${f((sh[0] + 5 + fx) / 2 + 1)} ${f((sh[1] + etek) / 2 - 1)} ${f(fx)} ${f(etek - 4)} Q${f(fx + 0.4)} ${f(etek)} ${f(fx - 1)} ${f(etek + 0.6)} Q${f((fx + arkaX) / 2)} ${f(etek + 1.6)} ${f(arkaX)} ${f(etek + 1)} Q${f(arkaX - 0.6)} ${f(etek - 8)} ${f(33.4 + egil * 0.8)} ${f(62 + b + dy)} Q${f(sh[0] - 7.4)} ${f(sh[1] + 10)} ${f(sh[0] - 6)} ${f(sh[1] + 1)}Z`);
    yaz(dikis, 'd', `M${f(sh[0] + 2.4)} ${f(sh[1] + 4)} Q${f(sh[0] + 3.4)} ${f(55 + b + dy)} ${f(sh[0] + 3.2 - egil * 0.3)} ${f(etek)}`);

    const kaldir = st.kaldir;
    const hc: Vec = [42.4 + kaldir * 0.6 + egil * 1.15, 31.6 + b + dy + u * 2.6];
    const donK = clamp(st.don * 2, 0, 1);
    yaz(basG, 'transform', `translate(${f(hc[0])} ${f(hc[1])}) rotate(${f(st.bakis + st.nisan * 0.5)})`);
    if (donK > 0 || gorunusSac !== 0) { gorunusSac = donK; yaz(sac, 'd', sacYan(donK)); }
    yaz(atki, 'd', `M${f(hc[0] - 4.4)} ${f(hc[1] + 4.6)} Q${f(hc[0])} ${f(hc[1] + 8.2)} ${f(hc[0] + 3.8)} ${f(hc[1] + 4.8)} Q${f(hc[0] + 4.2)} ${f(hc[1] + 6)} ${f(hc[0] + 4.2)} ${f(hc[1] + 7.4)} Q${f(hc[0])} ${f(hc[1] + 10.8)} ${f(hc[0] - 4.6)} ${f(hc[1] + 7.2)}Z`);
    const yurur = is.ad === 'yuru' ? go : 0;
    const akis = atkiYay.step(-5 - walk.speed * 0.07 * yurur - ruzgar * 6 * yon + (yurur > 0 ? Math.sin(t * 8) * 0.6 : 0), dt);
    yaz(atkiUc, 'd', `M${f(hc[0] - 3.4)} ${f(hc[1] + 6)} Q${f(hc[0] - 5.6 + akis * 0.4)} ${f(hc[1] + 9)} ${f(hc[0] - 3.6 + akis)} ${f(hc[1] + 15 + akis * 0.2)} L${f(hc[0] - 0.8 + akis * 0.9)} ${f(hc[1] + 15.6 + akis * 0.2)} Q${f(hc[0] - 2.8 + akis * 0.3)} ${f(hc[1] + 10)} ${f(hc[0] - 0.6)} ${f(hc[1] + 7.4)}Z`);

    // kollar: ust kol 21 + on kol 19; serbest el uylukta biter (B8)
    const legSwing = (p.feet[0].ankle[0] - 40) / (walk.stride / 2);
    const farA = kolYay[0].step(-legSwing * 15 * yurur, dt) * Math.PI / 180;
    const nearA = kolYay[1].step(legSwing * 9 * yurur, dt) * Math.PI / 180;
    const shF: Vec = [sh[0] - 1, sh[1] + 2], shN: Vec = [sh[0] + 1.6, sh[1] + 2.4];
    const ivme = Math.cos(2 * Math.PI * phase * 2) * 1.4 * yurur;
    const sallan = makineSalla.step(-ivme - ruzgar * 0.35, dt);
    const boyun: Vec = [hc[0] - 0.6, hc[1] + 6];
    const asili: Vec = [boyun[0] + 3 + sallan * 6 + u * 2, boyun[1] + 16 - u * 2];
    const gozde: Vec = [hc[0] + 6.4, hc[1] + 0.4 + st.nisan * 0.08];
    const m = L2(asili, gozde, kaldir);
    sonMakine = m;
    yaz(makineG, 'transform', `translate(${pt(m)}) rotate(${f((1 - kaldir) * sallan * 40 + st.nisan * kaldir)})`);
    yaz(obj, 'cx', f(2.6 + kaldir * 1.4));
    yaz(aski, 'd', `M${f(boyun[0] - 2.4)} ${f(boyun[1] - 1)} Q${f((boyun[0] + m[0]) / 2 - 3)} ${f((boyun[1] + m[1]) / 2 + 2)} ${f(m[0] - 3.6)} ${f(m[1] - 2)} M${f(boyun[0] + 2.4)} ${f(boyun[1] - 1)} Q${f((boyun[0] + m[0]) / 2 + 2)} ${f((boyun[1] + m[1]) / 2)} ${f(m[0] + 3.6)} ${f(m[1] - 2)}`);

    const yurElF: Vec = [shF[0] + 21 * Math.sin(farA), shF[1] + 21 * Math.cos(farA)];
    const yurElN: Vec = [shN[0] + 17 * Math.sin(nearA) + 2, shN[1] + 17 * Math.cos(nearA)];
    const elN = L2([m[0] - 3, m[1] + 4], [m[0] - 1.6, m[1] + 2.6], kaldir);
    const serbestF: Vec = [yurElF[0] + 19 * Math.sin(farA + 0.25), yurElF[1] + 19 * Math.cos(farA + 0.25)];
    // comelirken bos el dize yaslanir
    const dizEl: Vec = [kF[0] + 1, hip[1] - 4];
    const farEl = L2(L2(serbestF, dizEl, u * (1 - kaldir)), [m[0] + 4.6, m[1] + 1.6], kaldir);
    farArm.draw([shF, L2(L2(yurElF, [shF[0] + 6, shF[1] + 17], u), [sh[0] + 10, sh[1] + 12], kaldir), farEl], [0.2, 0.5]);
    nearArm.draw([shN, L2(yurElN, [sh[0] + 4, sh[1] + 15], Math.max(kaldir, 0.6)), elN], [0.2, 0.4]);
  }
  let gorunusSac = 0;

  // ------------------------------------------------ arka cizim
  const KOL: Record<Kol, [Vec, Vec, Vec, Vec]> = {
    // [sol dirsek, sol el, sag dirsek, sag el]
    yan: [[31.4, 62.4], [31, 83], [48.6, 62.4], [49, 83]],
    kamera: [[27.4, 48.6], [34.4, 33.6], [52.6, 48.6], [45.6, 33.6]],
    korkuluk: [[30, 61], [29.6, 82.6], [50, 61], [50.4, 82.6]],
    cep: [[30.6, 61], [34.6, 72], [49.4, 61], [45.4, 72]],
    kablo: [[31.4, 62.4], [31, 83], [49.6, 60], [44.6, 67]],
  };
  function arkaCiz(t: number, dt: number, ruzgar: number) {
    if (gorunus !== 'arka') { gorunus = 'arka'; goster(yan, false); goster(arka, true); }
    place(arka, x, st.yZ, yon, SC);
    const nefes = Math.sin(t * 1.6) * 0.3, kay = st.otur > 0.5 ? 0 : Math.sin(t * 0.5) * 0.5;
    const bk = st.bak, donK = 1 - clamp((st.don - 0.5) * 2, 0, 1); // donusun ilk karelerinde bas hala yana bakar
    const hb = clamp(bk + donK * 0.7, -1, 1);
    // bacaklar: oturunca kivrilip korkulugun ardina gecer
    const o = st.otur;
    const bacakGor = o < 0.72;
    goster(aLegs[0].g, bacakGor); goster(aLegs[1].g, bacakGor); goster(aShoes[0], bacakGor); goster(aShoes[1], bacakGor);
    if (bacakGor) {
      [-1, 1].forEach((s, i) => {
        const hip: Vec = [40 + s * 2.6 + kay, 75];
        const ank: Vec = [40 + s * (3 + o * 3) + kay * 0.4, lerp(118.4, 86, o)];
        const knee: Vec = [lerp((hip[0] + ank[0]) / 2, 40 + s * 7, o), lerp((hip[1] + ank[1]) / 2, 82, o)];
        aLegs[i].draw([hip, knee, ank], [0.3, 0.8]);
        yaz(aShoes[i], 'd', oval(ank[0], ank[1] + 0.8, 2.1, 1.2));
      });
    }
    const sy = 42 + nefes;
    const kal = o * 2; // oturunca kalca ve etek yanlara acilir
    yaz(aCeket, 'd', `M${f(32.6 + kay)} ${f(sy)} Q${f(40 + kay)} ${f(sy - 3.2)} ${f(47.4 + kay)} ${f(sy)} Q${f(48.8 + kay + kal * 0.5)} 60 ${f(47.6 + kay * 0.6 + kal)} 78 Q40 ${f(79.6 + o * 0.6)} ${f(32.4 + kay * 0.6 - kal)} 78 Q${f(31.2 + kay - kal * 0.5)} 60 ${f(32.6 + kay)} ${f(sy)}Z`);
    yaz(aDikis, 'd', `M40 66 Q40.2 72 40 78 M${f(36.4 + kay)} ${f(sy - 1.4)} Q${f(40 + kay)} ${f(sy + 0.6)} ${f(43.6 + kay)} ${f(sy - 1.4)}`);
    // kollar: iki kip arasinda karisir
    const A = KOL[st.kolA], B = KOL[st.kolB], u = st.kolU;
    const omuz: [Vec, Vec] = [[33.6 + kay, sy + 1.6], [46.4 + kay, sy + 1.6]];
    [0, 1].forEach((i) => aKol[i].draw([omuz[i], L2(A[i * 2], B[i * 2], u), L2(A[i * 2 + 1], B[i * 2 + 1], u)], [0.2, 0.5]));
    const kameraU = (st.kolA === 'kamera' ? 1 - u : 0) + (st.kolB === 'kamera' ? u : 0);
    yaz(aMakine, 'd', kameraU > 0.7 ? `M33.4 30.6 Q40 30 46.6 30.6 L46.8 35.2 Q40 35.8 33.2 35.2Z` : '');
    // bas ve sac: arkadan sac basin cogunu orter; omzunun ustunden bakinca yuz kenari gorunur
    const hx = 40 + kay + hb * 0.9, hy = 31.6 + nefes * 0.6 + (st.sehpa > 0.5 ? 1.2 : 0);
    yaz(aBas, 'cx', f(hx)); yaz(aBas, 'cy', f(hy));
    const sx = hx - hb * 1.6;
    yaz(aSac, 'd', oval(sx, hy - 0.2, 3.9, 4.8));
    yaz(aYuz, 'd', Math.abs(hb) > 0.35 ? `M${f(hx + hb * 3.6)} ${f(hy - 0.6)} l${f(hb * 1.3)} 1 l${f(-hb * 1.1)} 0.5` : '');
    yaz(aAtki, 'd', `M${f(35.4 + kay)} ${f(36.4 + nefes)} Q40 ${f(39.4 + nefes)} ${f(44.6 + kay)} ${f(36.4 + nefes)} L${f(44.8 + kay)} ${f(39.2 + nefes)} Q40 ${f(42 + nefes)} ${f(35.2 + kay)} ${f(39.2 + nefes)}Z`);
    const akis = atkiYay.step(-ruzgar * 5 * yon, dt);
    yaz(aAtkiUc, 'd', `M${f(36.4 + kay)} ${f(39 + nefes)} Q${f(35 + akis * 0.3)} ${f(44 + nefes)} ${f(35.6 + akis)} ${f(51 + nefes)} L${f(38.4 + akis * 0.9)} ${f(51.4 + nefes)} Q${f(38.2 + akis * 0.3)} ${f(45 + nefes)} ${f(39 + kay)} ${f(40 + nefes)}Z`);
    // sehpa: ayaklar acilir, makine bas hizasinda; kablo eline gider
    const sp = st.sehpa;
    goster(sehpaG, sp > 0); goster(kablo, sp > 0.6);
    if (sp > 0) {
      const ac = ease(clamp(sp * 1.3, 0, 1)), boy = lerp(0.55, 1, ease(clamp(sp * 1.6 - 0.2, 0, 1)));
      const ty = 120 - 86 * boy, ust: Vec = [40, ty + 2];
      yaz(sehpaAyak, 'd', `M${pt(ust)} L${f(40 - 18 * ac)} 121.4 M${pt(ust)} L${f(40 + 18 * ac)} 121.4 M${pt(ust)} L40 ${f(lerp(121, 116, ac))} M40 ${f(ty + 2)} L40 ${f(ty + 10)}`);
      yaz(sehpaBas, 'd', `M${f(34.4)} ${f(ty - 2.6)} Q40 ${f(ty - 3.2)} ${f(45.6)} ${f(ty - 2.6)} L${f(45.8)} ${f(ty + 2)} Q40 ${f(ty + 2.4)} ${f(34.2)} ${f(ty + 2)}Z`);
      if (sp > 0.6) { const el1 = L2(KOL.yan[3], KOL.kablo[3], u); yaz(kablo, 'd', `M${pt(el1)} Q${f(el1[0] - 4)} ${f(el1[1] + 10)} 40 ${f(ty + 4)}`); }
    }
  }

  return o;
}
