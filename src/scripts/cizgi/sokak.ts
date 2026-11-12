// Sokak — ahmetenes.com ana sayfasindaki cizgi sahne (line-art-animation kutuphanesi, MIT).
// Bir fotografci Istanbul'da bir sokaktan deniz kenarina yurur: cumbali ahsap ev, fener, cay ocagi, telde serceler,
// basamakta bir kedi, karsidan gecen vapur ve martilar. Fotografci denize varinca vapuru ceker.
// Dokunma, ruzgar, kamera ve kalite ortak cekirdekte (cekirdek.ts): sahnenin herhangi bir yerine dokununca en
// yakin sey tepki verir. Renkler CSS'ten gelir: murekkep `color`, kagit `--paper`, duz renkler `--sk-*`.
import { el, pen, shape, blot, paint, limb, solid, shoe, place, toScene, f, pt, PEN, type Vec, type Limb } from './ink';
import { gait } from './gait';
import { spring, pendulum, ease, clamp, lerp, rnd } from './motion';
import { cekirdek } from './cekirdek';
import { kediKur, serceler } from './canlilar';

const W = 960, H = 220, GROUND = 198, SC = 0.86, SP = 1.15, DP = 0.6;
const FENER = 262, DENIZ = 640, UFUK = 150;

const renk = <T extends SVGElement>(n: T, ad: string, ne: 'fill' | 'stroke' = 'fill'): T => { n.style[ne] = `var(--sk-${ad})`; return n; };
const oval = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const L2 = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function kurSokak(stage: HTMLElement): void {
  const c = cekirdek(stage, { ad: 'sokak', W, H, kamY: 40, etiket: 'Çizgi çizimi: İstanbul\'da bir sokak; deniz kenarında vapuru fotoğraflayan biri, basamakta bir kedi, telde serçeler.' });
  const S = c.statik, D = c.dinamik, G = c.gok;
  const degrade = (defs: SVGDefsElement, id: string) => {
    const g = el('radialGradient', { id }, defs);
    el('stop', { offset: '0', 'stop-opacity': 0.6, style: 'stop-color:var(--sk-isik)' }, g);
    el('stop', { offset: '1', 'stop-opacity': 0, style: 'stop-color:var(--sk-isik)' }, g);
    return `url(#${id})`;
  };
  const isikD = degrade(c.tanimlar[2], `${c.kimlik}-di`);
  const isikG = el('g', {}, D);
  const isik = (cx: number, cy: number, rx: number, ry = rx) => el('ellipse', { cx, cy, rx, ry, fill: isikD, opacity: 0 }, isikG);

  // ================================================================ GOK katmani: deniz, karsi kiyi, vapur, martilar
  pen(G, DP).setAttribute('d', `M${DENIZ} ${UFUK} Q${(DENIZ + W) / 2} ${UFUK - 0.6} ${W} ${UFUK}`);
  pen(G, DP).setAttribute('d', `M${DENIZ + 10} ${UFUK} Q${DENIZ + 60} ${UFUK - 14} ${DENIZ + 120} ${UFUK - 9} Q${DENIZ + 170} ${UFUK - 5} ${DENIZ + 210} ${UFUK - 16} Q${DENIZ + 260} ${UFUK - 26} ${DENIZ + 310} ${UFUK - 8}`);
  pen(G, DP * 0.8).setAttribute('d', [DENIZ + 52, DENIZ + 62, DENIZ + 70, DENIZ + 190, DENIZ + 200, DENIZ + 214].map((x, i) => `M${x} ${UFUK - 8 - (i % 3)} l0 -3 l3 -1.6 l3 1.6 l0 3`).join(' ') + ` M${DENIZ + 246} ${UFUK - 21} l0 -16 l1.6 -4 l1.6 4 l0 16`);
  const dalga = pen(G, DP * 0.7);
  const vapurG = el('g', {}, G);
  shape(vapurG, SP * 0.7).setAttribute('d', 'M-26 -2 L27 -2 L23 5 L-23 5Z');
  blot(vapurG).setAttribute('d', 'M-23.6 3 L23.6 3 L23 5 L-23 5Z');
  shape(vapurG, SP * 0.6).setAttribute('d', 'M-17 -2 L-17 -8 Q-16 -9 -14 -9 L13 -9 Q15 -9 15 -7 L15 -2 M-12 -9 L-12 -12 L9 -12 L9 -9');
  renk(paint(vapurG, 'x', SP * 0.6), 'baca').setAttribute('d', 'M-1.4 -12 L-0.8 -18 L3.4 -18 L4 -12Z');
  pen(vapurG, DP * 0.7).setAttribute('d', Array.from({ length: 7 }, (_, i) => `M${-13 + i * 4} -6 l2 0.2`).join(' '));
  const duman = pen(vapurG, DP * 0.7);
  let vapurX = W + 40, dudukT = 0;
  const martilar = [0, 1, 2].map((i) => ({ n: pen(G, SP * 0.75), a: rnd(0, 6), hiz: rnd(0.12, 0.2) * (i % 2 ? -1 : 1), y: rnd(60, 110) }));

  // ================================================================ STATIK: korkuluk
  shape(S, SP).setAttribute('d', `M${DENIZ} ${GROUND} L${DENIZ} 168 L${W} 168 L${W} ${GROUND}`);
  pen(S, SP).setAttribute('d', `M${DENIZ - 4} 166 Q${(DENIZ + W) / 2} 165.4 ${W + 2} 166 M${DENIZ - 2} 170 L${W} 170.4`);
  pen(S, DP).setAttribute('d', Array.from({ length: 16 }, (_, i) => `M${DENIZ + 6 + i * 20} 170 q0.8 14 0 28`).join(' ') + Array.from({ length: 16 }, (_, i) => ` M${DENIZ + 16 + i * 20} 176 q-3 6 0 12 q3 -6 0 -12`).join(''));

  // ================================================================ STATIK: cumbali ahsap ev
  type Pencere = { n: SVGPathElement; g: SVGEllipseElement; cx: number; cy: number; esik: number; elle: boolean | null; yanik: boolean };
  const pencereler: Pencere[] = [];
  const pencereEkle = (n: SVGPathElement, cx: number, cy: number, rx: number, ry: number, esik: number) => { n.classList.add('pp'); pencereler.push({ n, g: isik(cx, cy, rx, ry), cx, cy, esik, elle: null, yanik: false }); };
  shape(S, SP).setAttribute('d', `M48 ${GROUND} L48 64 L222 64 L222 ${GROUND}Z`);
  shape(S, SP).setAttribute('d', 'M36 66 Q130 60 234 66 L230 58 Q130 52 40 58Z');
  pen(S, DP).setAttribute('d', Array.from({ length: 24 }, (_, i) => `M${44 + i * 8} ${61.6 - Math.sin((i / 23) * Math.PI) * 2.4} q2 3 4 0`).join(' '));
  pen(S, DP * 0.8).setAttribute('d', Array.from({ length: 10 }, (_, i) => `M50 ${136 + i * 6} L${i % 3 === 0 ? 110 : 98} ${136.2 + i * 6}`).join(' ') + Array.from({ length: 6 }, (_, i) => ` M52 ${74 + i * 6} L96 ${74.2 + i * 6}`).join(''));
  shape(S, SP).setAttribute('d', `M64 ${GROUND - 6} L64 152 Q76 140 88 152 L88 ${GROUND - 6}Z`);
  pen(S, DP).setAttribute('d', `M76 144 L76 ${GROUND - 6} M70 170 a1 1 0 1 0 0.1 0 M66 158 L86 158`);
  shape(S, SP).setAttribute('d', `M58 ${GROUND} L58 ${GROUND - 6} L94 ${GROUND - 6} L94 ${GROUND}Z`);
  const pencere = (x: number, y: number, w: number, h: number) => {
    const n = el('path', { d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h}Z`, 'stroke-width': SP, stroke: 'currentColor', 'stroke-linejoin': 'round' }, S);
    pen(S, DP).setAttribute('d', `M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h * 0.45} L${x + w} ${y + h * 0.45}`);
    pencereEkle(n, x + w / 2, y + h / 2, w * 1.4, h, rnd(0.3, 0.9));
  };
  pencere(118, 148, 22, 32);
  pen(S, DP).setAttribute('d', 'M114 148 L114 180 M144 148 L144 180 M112 182 L146 182');
  shape(S, SP).setAttribute('d', 'M104 70 L214 70 L216 126 L102 126Z');
  pen(S, SP).setAttribute('d', 'M100 126 L218 126 M106 126 L118 138 M212 126 L200 138 M159 126 L159 134');
  [114, 146, 178].forEach((x) => pencere(x, 78, 22, 40));
  pen(S, DP).setAttribute('d', 'M104 74 L214 74 M108 122 L210 122');
  shape(S, SP * 0.8).setAttribute('d', `M184 ${GROUND - 8} L182 ${GROUND - 22} L200 ${GROUND - 22} L198 ${GROUND - 8}Z`);

  // ================================================================ STATIK: fener, tel, direk
  shape(S, SP).setAttribute('d', `M${FENER - 3} ${GROUND} L${FENER - 1.6} 72 L${FENER + 1.6} 72 L${FENER + 3} ${GROUND}Z`);
  pen(S, DP).setAttribute('d', `M${FENER - 4} ${GROUND - 14} L${FENER + 4} ${GROUND - 13.8}`);
  shape(S, SP).setAttribute('d', `M${FENER - 8} 72 L${FENER + 8} 72 L${FENER + 6} 56 Q${FENER} 52 ${FENER - 6} 56Z`);
  const fenerCam = renk(el('path', { d: `M${FENER - 4.6} 70 L${FENER + 4.6} 70 L${FENER + 3.4} 59 Q${FENER} 57 ${FENER - 3.4} 59Z` }, S), 'cam');
  pen(S, DP).setAttribute('d', `M${FENER} 52 L${FENER} 47 M${FENER - 4} 47 Q${FENER} 44 ${FENER + 4} 47`);
  const fenerIsik = isik(FENER, 66, 60, 54);
  const TEL0: Vec = [228, 70], TEL1: Vec = [612, 92];
  const telY = (x: number) => { const u = clamp((x - TEL0[0]) / (TEL1[0] - TEL0[0]), 0, 1); return lerp(TEL0[1], TEL1[1], u) + Math.sin(u * Math.PI) * 14; };
  pen(S, DP).setAttribute('d', `M${TEL0[0]} ${TEL0[1]} Q${(TEL0[0] + TEL1[0]) / 2} ${(TEL0[1] + TEL1[1]) / 2 + 28} ${TEL1[0]} ${TEL1[1]}`);
  shape(S, SP).setAttribute('d', `M${TEL1[0] - 2.4} ${GROUND} L${TEL1[0] - 1.4} 84 L${TEL1[0] + 1.4} 84 L${TEL1[0] + 2.4} ${GROUND}Z`);
  pen(S, DP).setAttribute('d', `M${TEL1[0] - 8} 92 L${TEL1[0] + 8} 92 M${TEL1[0] - 6} 92 l0 -2.4 M${TEL1[0] + 6} 92 l0 -2.4`);

  // ================================================================ STATIK: cay ocagi
  shape(S, SP).setAttribute('d', `M300 ${GROUND} L300 108 L462 108 L462 ${GROUND}Z`);
  shape(S, SP).setAttribute('d', 'M316 90 L446 90 L446 106 L316 106Z');
  el('text', { x: 381, y: 102, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 500, 'letter-spacing': 2.4, fill: 'currentColor', style: 'font-family:var(--font-personabio, system-ui, sans-serif)' }, S).textContent = 'ÇAY OCAĞI';
  const vitrin = el('path', { d: 'M318 140 L444 140 L444 186 L318 186Z', 'stroke-width': SP, stroke: 'currentColor' }, S);
  pencereEkle(vitrin, 381, 162, 90, 34, 0.35);
  pen(S, DP).setAttribute('d', 'M381 140 L381 186 M318 172 L444 172.2');
  shape(S, SP * 0.7).setAttribute('d', 'M334 172 L334 160 Q340 154 346 160 L346 172Z M346 163 q5 -1 6 -4 M338 156 l4 0');
  renk(paint(S, 'x', SP * 0.6), 'cay').setAttribute('d', 'M398 172 Q396 166 399 164 Q397 160 398 158 L404 158 Q405 160 403 164 Q406 166 404 172Z M412 172 Q410 166 413 164 Q411 160 412 158 L418 158 Q419 160 417 164 Q420 166 418 172Z');
  shape(S, SP).setAttribute('d', 'M296 112 L466 112 L476 132 L286 132Z');
  Array.from({ length: 9 }, (_, i) => renk(el('path', { d: `M${300 + i * 19} 112 L${309.5 + i * 19} 112 L${306 + i * 20.5} 132 L${296.5 + i * 20.5} 132Z` }, S), 'tente'));
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
    pencereEkle(n, x + 11, y + 15, 26, 22, rnd(0.25, 0.9));
  });

  // ================================================================ STATIK: kaldirim
  pen(S, SP).setAttribute('d', `M0 ${GROUND} Q${W / 2} ${GROUND - 0.6} ${W} ${GROUND} M0 ${GROUND + 9} Q${W / 2} ${GROUND + 9.6} ${W} ${GROUND + 9}`);
  pen(S, DP).setAttribute('d', Array.from({ length: 28 }, (_, i) => `M${i * 34 + 12} ${GROUND + 0.4} q0.6 4.3 0 8.6`).join(' '));

  // ================================================================ DINAMIK: sardunya, tente sacagi, hayvanlar, fotografci
  const sardunya = pen(D, DP);
  const cicek = [0, 1, 2].map(() => renk(blot(D), 'cicek'));
  const sacak = pen(D, SP * 0.8);
  const sacakYay = spring(26, 3.4), saksiYay = spring(20, 3);
  const kuslar = serceler(D, telY, [300, 336, 372, 430, 470, 520], [290, 560]);
  const kedi = kediKur(D, 314, GROUND - 5);
  const foto = fotografci(D, isikG, isikD);

  // ================================================================ dokunma hedefleri
  c.hedef({ ad: 'fotografci', yer: () => foto.orta(), r: 22, oncelik: 3, dokun: () => foto.cek() });
  c.hedef({ ad: 'kedi', yer: () => kedi.orta(), r: 12, oncelik: 3, dokun: () => kedi.durt() });
  [330, 425, 520].forEach((x, i) => c.hedef({ ad: `serceler${i}`, yer: () => (kuslar.konan() ? [x, telY(x) - 6] : null), r: 28, oncelik: 1, dokun: () => kuslar.kacir() }));
  let fenerElle: boolean | null = null, fenerKirp = 0;
  c.hedef({ ad: 'fener', yer: () => [FENER, 64], r: 10, oncelik: 2, dokun: () => { fenerElle = !(fenerElle ?? c.zaman().karanlik > 0.45); fenerKirp = 0.5; isiklariGuncelle(); } });
  c.hedef({ ad: 'saksi', yer: () => [191, GROUND - 28], r: 14, oncelik: 1, dokun: () => saksiYay.kick(30 * (Math.random() < 0.5 ? -1 : 1)) });
  c.hedef({ ad: 'tente', yer: () => [381, 124], r: 12, oncelik: 0.6, dokun: () => sacakYay.kick(34 * (Math.random() < 0.5 ? -1 : 1)) });
  c.hedef({ ad: 'vapur', yer: () => (vapurX > DENIZ - 20 && vapurX < W + 20 ? [vapurX, UFUK - 8] : null), r: 28, oncelik: 2, dokun: () => { dudukT = 1.6; } });
  pencereler.forEach((p, i) => c.hedef({ ad: `pencere${i}`, yer: () => [p.cx, p.cy], r: i === 5 ? 30 : 13, pay: 5, oncelik: 0, dokun: () => { p.elle = !p.yanik; isiklariGuncelle(); } }));

  // ================================================================ isiklar: yalniz durum degisince statik katmana dokunur
  let fenerYanik = false;
  function isiklariGuncelle(): void {
    const k = c.zaman().karanlik;
    for (const p of pencereler) { const ol = p.elle ?? k > p.esik; if (ol !== p.yanik) { p.yanik = ol; p.n.style.fill = ol ? 'var(--sk-pencere)' : ''; } }
    const fy = fenerElle ?? k > 0.45;
    if (fy !== fenerYanik) { fenerYanik = fy; fenerCam.style.fill = fy ? 'var(--sk-pencere)' : 'var(--sk-cam)'; }
  }
  isiklariGuncelle();
  let surum = -1;

  c.basla((t, dt) => {
    const ruz = c.ruzgar.deger, gece = c.zaman().karanlik;
    if (surum !== c.surum()) { surum = c.surum(); isiklariGuncelle(); }
    pencereler.forEach((p) => p.g.setAttribute('opacity', p.yanik ? f(0.5 * Math.max(gece, 0.5)) : '0'));
    fenerKirp = Math.max(0, fenerKirp - dt);
    fenerIsik.setAttribute('opacity', fenerYanik ? f((fenerKirp > 0 && Math.sin(t * 60) > 0 ? 0.3 : 0.85 + Math.sin(t * 1.7) * 0.05) * Math.max(gece, 0.7)) : '0');

    // deniz: dalgalar, vapur, martilar
    dalga.setAttribute('d', Array.from({ length: 7 }, (_, i) => { const x = DENIZ + 20 + i * 44 + Math.sin(t * 0.5 + i) * 6, y = UFUK + 4 + (i % 3) * 3.4; return `M${f(x)} ${f(y)} q3 -1.4 6 0 q3 1.4 6 0`; }).join(' '));
    vapurX -= dt * 6;
    if (vapurX < DENIZ - 40) vapurX = W + rnd(60, 400);
    const sallanma = Math.sin(t * 0.9) * 0.6;
    vapurG.setAttribute('transform', `translate(${f(vapurX)} ${f(UFUK - 4 + sallanma * 0.4)}) scale(-1 1) rotate(${f(sallanma)})`);
    vapurG.setAttribute('opacity', vapurX > W + 30 || vapurX < DENIZ - 30 ? '0' : '1');
    dudukT = Math.max(0, dudukT - dt);
    const dm = (t * (0.6 + dudukT * 1.4)) % 1, buyu = 1 + dudukT * 1.6;
    duman.setAttribute('d', `M1 -18 q${f((-3 - dm * 4 - ruz * 6) * buyu)} ${f((-3 - dm * 3) * buyu)} ${f((-1 - dm * 8 - ruz * 10) * buyu)} ${f((-7 - dm * 4) * buyu)}`);
    martilar.forEach((m, i) => {
      const x = DENIZ + 160 + Math.sin(t * m.hiz + m.a) * 150, y = m.y + Math.sin(t * 0.7 + i) * 8, kanat = Math.sin(t * (i ? 3.1 : 2.6) + m.a) * 2.6;
      m.n.setAttribute('d', `M${f(x - 7)} ${f(y - 1 - kanat)} Q${f(x - 3.4)} ${f(y - 4 - kanat)} ${f(x)} ${f(y)} Q${f(x + 3.4)} ${f(y - 4 - kanat)} ${f(x + 7)} ${f(y - 1 - kanat)}`);
    });

    // sacak ve sardunyalar ruzgarla
    const sc = sacakYay.step(-ruz * 4 + Math.sin(t * 1.2) * 0.4, dt);
    sacak.setAttribute('d', Array.from({ length: 19 }, (_, i) => { const x = 287 + i * 10.4; return `M${f(x)} 132 q${f(2.6 + sc * 0.6)} 4 ${f(5.2 + sc)} 0.6`; }).join(' '));
    const ys = saksiYay.step(-ruz * 5 + Math.sin(t * 1.3) * 0.6, dt);
    sardunya.setAttribute('d', `M191 ${GROUND - 22} Q${f(187 + ys)} ${GROUND - 32} ${f(183 + ys * 1.6)} ${GROUND - 38} M191 ${GROUND - 22} Q${f(194 + ys)} ${GROUND - 34} ${f(198 + ys * 1.4)} ${GROUND - 40} M191 ${GROUND - 22} Q${f(191 + ys * 0.6)} ${GROUND - 30} ${f(191 + ys)} ${GROUND - 44}`);
    cicek.forEach((n, i) => { const [x, y] = [[183 + ys * 1.6, GROUND - 38], [198 + ys * 1.4, GROUND - 40], [191 + ys, GROUND - 44]][i]; n.setAttribute('d', oval(x, y, 2.6, 2.2)); });

    kuslar.ciz(t, dt, gece, foto.x);
    kedi.ciz(t, dt, gece);
    foto.ciz(t, dt, ruz, vapurX);
  }, () => foto.x);
}

// ==================================================================== fotografci
function fotografci(parent: SVGElement, isikKat: SVGElement, isikDolgu: string) {
  const fig = el('g', {}, parent);
  const renkLimb = (l: Limb, ad: string): Limb => { const n = l.g.querySelector('path'); if (n) { n.removeAttribute('fill'); n.classList.remove('pp'); n.style.fill = `var(--sk-${ad})`; } return l; };
  const farArm = limb(fig, 3.6);
  const legs = [renkLimb(solid(limb(fig, 4.2)), 'pantolon'), renkLimb(solid(limb(fig, 4.2)), 'pantolon')];
  const shoes = [blot(fig), blot(fig)];
  const ceket = shape(fig);
  const dikis = pen(fig, PEN * 0.6);
  const atkiUc = renk(paint(fig, 'x', PEN * 0.8), 'atki');
  const bas = el('ellipse', { rx: 3.6, ry: 4.6, fill: '#fdfdfc', stroke: 'currentColor', 'stroke-width': PEN }, fig); bas.classList.add('pp');
  const sac = blot(fig);
  const atki = renk(paint(fig, 'x', PEN * 0.8), 'atki');
  const aski = pen(fig, PEN * 0.6);
  const makineG = el('g', {}, fig);
  const makine = blot(makineG);
  const obj = el('circle', { r: 2.3, fill: '#fdfdfc', stroke: 'currentColor', 'stroke-width': PEN * 0.8 }, makineG); obj.classList.add('pp');
  const nearArm = limb(fig, 3.6);
  const flas = el('circle', { r: 36, fill: isikDolgu, opacity: 0 }, isikKat);

  const walk = gait({ kind: 'walk' });
  const kolYay = [spring(60, 9), spring(60, 9)];
  const makineSalla = pendulum(16, 1.6);
  const atkiYay = spring(30, 4);
  let phase = 0, x = 20, cekT = -1, denizdeCekti = false;
  const o = {
    g: fig, x,
    orta: (): Vec => [o.x, GROUND - 46 * SC],
    cek() { if (cekT < 0) cekT = 0; },
    ciz(t: number, dt: number, ruzgar: number, vapurX: number) {
      // denize varinca, vapur gorunuyorsa bir kez kendiliginden ceker
      if (!denizdeCekti && x > DENIZ + 70 && cekT < 0 && vapurX < W - 20 && vapurX > x) { cekT = 0; denizdeCekti = true; }
      let kaldir = 0, deklansor = 0;
      if (cekT >= 0) {
        cekT += dt;
        kaldir = cekT < 0.45 ? ease(cekT / 0.45) : cekT < 1.55 ? 1 : 1 - ease((cekT - 1.55) / 0.45);
        deklansor = cekT > 0.95 ? Math.max(0, 1 - (cekT - 0.95) / 0.25) : 0;
        if (cekT > 2.1) cekT = -1;
      }
      const go = 1 - clamp(kaldir * 1.4, 0, 1);
      phase += (dt / walk.period) * go;
      x += walk.speed * SC * dt * go;
      if (x > W + 40) { x = -40; denizdeCekti = false; }
      o.x = x;
      place(fig, x, GROUND, 1, SC);

      const p = walk.pose(phase, go);
      const b = p.bob;
      p.feet.forEach((fo, i) => { legs[i].draw([p.hip, fo.knee, fo.ankle], [0.3, 0.8]); shoe(shoes[i], fo.ankle, fo.pitch); });
      fig.insertBefore(legs[p.front].g, ceket); fig.insertBefore(shoes[p.front], ceket);

      const kF = p.feet[p.front].knee;
      const sh: Vec = [41, 41 + b], etek = 74 + b * 0.6;
      const fx = Math.max(kF[0] - 1, 45.6);
      ceket.setAttribute('d', `M${f(sh[0] - 6)} ${f(sh[1] + 1)} Q${f(sh[0] - 1)} ${f(sh[1] - 2.4)} ${f(sh[0] + 5)} ${f(sh[1] + 1)} L${f(fx)} ${f(etek - 4)} Q${f(fx + 0.4)} ${f(etek)} ${f(fx - 1)} ${f(etek + 0.6)} L${f(32.4)} ${f(etek + 1)} Q${f(32)} ${f(etek - 8)} ${f(33.4)} ${f(62 + b)}Z`);
      dikis.setAttribute('d', `M${f(sh[0] + 2.4)} ${f(sh[1] + 4)} Q${f(sh[0] + 3.4)} ${f(55 + b)} ${f(sh[0] + 3.2)} ${f(etek)}`);

      const hc: Vec = [42.4 + kaldir * 0.6, 31.6 + b];
      bas.setAttribute('cx', f(hc[0])); bas.setAttribute('cy', f(hc[1]));
      sac.setAttribute('d', `M${f(hc[0] + 2.2)} ${f(hc[1] - 4.2)} Q${f(hc[0] - 1.6)} ${f(hc[1] - 6.4)} ${f(hc[0] - 3.9)} ${f(hc[1] - 1.6)} Q${f(hc[0] - 4.2)} ${f(hc[1] + 1.6)} ${f(hc[0] - 3)} ${f(hc[1] + 2.6)} Q${f(hc[0] - 2.2)} ${f(hc[1] - 0.4)} ${f(hc[0] - 1)} ${f(hc[1] - 2.4)} Q${f(hc[0] + 0.6)} ${f(hc[1] - 3.8)} ${f(hc[0] + 2.2)} ${f(hc[1] - 4.2)}Z`);
      atki.setAttribute('d', `M${f(hc[0] - 4.4)} ${f(hc[1] + 4.6)} Q${f(hc[0])} ${f(hc[1] + 8.2)} ${f(hc[0] + 3.8)} ${f(hc[1] + 4.8)} L${f(hc[0] + 4.2)} ${f(hc[1] + 7.4)} Q${f(hc[0])} ${f(hc[1] + 10.8)} ${f(hc[0] - 4.6)} ${f(hc[1] + 7.2)}Z`);
      const akis = atkiYay.step(-5 - walk.speed * 0.07 * go - ruzgar * 6 + Math.sin(t * 8) * 0.6 * go, dt);
      atkiUc.setAttribute('d', `M${f(hc[0] - 3.4)} ${f(hc[1] + 6)} Q${f(hc[0] - 5.6 + akis * 0.4)} ${f(hc[1] + 9)} ${f(hc[0] - 3.6 + akis)} ${f(hc[1] + 15 + akis * 0.2)} L${f(hc[0] - 0.8 + akis * 0.9)} ${f(hc[1] + 15.6 + akis * 0.2)} Q${f(hc[0] - 2.8 + akis * 0.3)} ${f(hc[1] + 10)} ${f(hc[0] - 0.6)} ${f(hc[1] + 7.4)}Z`);

      const legSwing = (p.feet[0].ankle[0] - 40) / (walk.stride / 2);
      const farA = kolYay[0].step(-legSwing * 15 * go, dt) * Math.PI / 180;
      const nearA = kolYay[1].step(legSwing * 9 * go, dt) * Math.PI / 180;
      const shF: Vec = [sh[0] - 1, sh[1] + 2], shN: Vec = [sh[0] + 1.6, sh[1] + 2.4];

      const ivme = Math.cos(2 * Math.PI * phase * 2) * 1.4 * go;
      const sallan = makineSalla.step(-ivme - ruzgar * 0.35, dt);
      const boyun: Vec = [hc[0] - 0.6, hc[1] + 6];
      const asili: Vec = [boyun[0] + 3 + sallan * 6, boyun[1] + 16];
      const gozde: Vec = [hc[0] + 6.4, hc[1] + 0.4];
      const m = L2(asili, gozde, kaldir);
      makineG.setAttribute('transform', `translate(${pt(m)}) rotate(${f((1 - kaldir) * sallan * 40)})`);
      makine.setAttribute('d', 'M-4.4 -2.6 L-1.6 -2.6 L-0.8 -3.8 L1.6 -3.8 L2.2 -2.6 L4.4 -2.6 Q5 -2.6 5 -2 L5 2.6 Q5 3.2 4.4 3.2 L-4.4 3.2 Q-5 3.2 -5 2.6 L-5 -2 Q-5 -2.6 -4.4 -2.6Z');
      obj.setAttribute('cx', f(2.6 + kaldir * 1.4)); obj.setAttribute('cy', '0.4');
      aski.setAttribute('d', `M${f(boyun[0] - 2.4)} ${f(boyun[1] - 1)} Q${f((boyun[0] + m[0]) / 2 - 3)} ${f((boyun[1] + m[1]) / 2 + 2)} ${f(m[0] - 3.6)} ${f(m[1] - 2)} M${f(boyun[0] + 2.4)} ${f(boyun[1] - 1)} Q${f((boyun[0] + m[0]) / 2 + 2)} ${f((boyun[1] + m[1]) / 2)} ${f(m[0] + 3.6)} ${f(m[1] - 2)}`);

      const yurElF: Vec = [shF[0] + 17 * Math.sin(farA), shF[1] + 17 * Math.cos(farA)];
      const yurElN: Vec = [shN[0] + 15 * Math.sin(nearA) + 2, shN[1] + 15 * Math.cos(nearA)];
      const elN = L2([m[0] - 3, m[1] + 4], [m[0] - 1.6, m[1] + 2.6], kaldir);
      const serbestF: Vec = [yurElF[0] + 16 * Math.sin(farA + 0.25), yurElF[1] + 16 * Math.cos(farA + 0.25)];
      farArm.draw([shF, L2(yurElF, [sh[0] + 10, sh[1] + 12], kaldir), L2(serbestF, [m[0] + 4.6, m[1] + 1.6], kaldir)], [0.2, 0.5]);
      nearArm.draw([shN, L2(yurElN, [sh[0] + 4, sh[1] + 15], Math.max(kaldir, 0.6)), elN], [0.2, 0.4]);

      const [lx, ly] = toScene(x, GROUND, 1, m[0] + 5, m[1], SC);
      flas.setAttribute('cx', f(lx + 6)); flas.setAttribute('cy', f(ly)); flas.setAttribute('opacity', f(deklansor * 0.9));
    },
  };
  return o;
}
