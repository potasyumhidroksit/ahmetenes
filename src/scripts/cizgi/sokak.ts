// Sokak — ahmetenes.com ana sayfasının altındaki çizgi sahne (line-art-animation kütüphanesi, MIT).
// Bir fotoğrafçı İstanbul'da bir sokaktan deniz kenarına yürür: cumbalı ahşap ev, fener, çay ocağı, telde serçeler,
// basamakta bir kedi, karşıdan geçen vapur ve martılar. Fotoğrafçı denize varınca vapuru çeker; ona, kediye ya da
// kuşlara dokunulunca dünya tepki verir. İmleç rüzgârdır. Pencereler ve fener İstanbul saatine göre yanar.
// Renkler CSS'ten gelir (light-dark): mürekkep `color`, kâğıt `--paper`, düz renkler `--sk-*` değişkenleri.
import { el, pen, shape, blot, paint, limb, solid, shoe, place, toScene, inkDefs, run, f, pt, PEN, type Vec } from './ink';
import { gait } from './gait';
import { spring, pendulum, pointerWind, ease, clamp, lerp, rnd } from './motion';

export const W = 960, H = 220;
const GROUND = 198, SC = 0.86, SP = 1.15, DP = 0.6; // kaldırım, figür ölçeği, sahne kalemi, ayrıntı kalemi
const FENER = 262, DENIZ = 640, UFUK = 150;

const renk = <T extends SVGElement>(n: T, ad: string, ne: 'fill' | 'stroke' = 'fill'): T => { n.style[ne] = `var(--sk-${ad})`; return n; };
const oval = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const L2 = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// ------------------------------------------------------------------ İstanbul saati (UTC+3, yaz saati yok)
// Ay başına kabaca gün doğumu / batımı (saat, ondalık). Işıklar batımdan 20 dk önce yanar, doğumdan 20 dk sonra söner.
const GUN: Array<[number, number]> = [[8.4, 17.1], [8.0, 17.7], [7.3, 18.3], [6.6, 19.8], [6.0, 20.2], [5.6, 20.6], [5.8, 20.5], [6.3, 20.0], [6.8, 19.3], [7.3, 18.5], [7.9, 17.0], [8.3, 16.8]];
function istanbulSaati(): { saat: number; ay: number } {
  const q = new URLSearchParams(location.search).get('saat');
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', month: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const al = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { saat: q !== null ? Number(q) : al('hour') + al('minute') / 60, ay: al('month') - 1 };
}
/** 0 gündüz … 1 gece; eşik başına farklı (ışıklar tek tek yanar). */
function geceDegeri(esik = 0): number {
  const { saat, ay } = istanbulSaati();
  const [dog, bat] = GUN[ay];
  const aksam = bat - 0.33 + esik, sabah = dog + 0.33 - esik;
  return saat >= aksam || saat < sabah ? 1 : 0;
}

export function kurSokak(stage: HTMLElement): void {
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Çizgi çizimi: İstanbul\'da bir sokak; deniz kenarında vapuru fotoğraflayan biri, basamakta bir kedi, telde serçeler.' });
  svg.style.color = 'inherit'; // mürekkep CSS'ten (light-dark); inkDefs gündüz mürekkebini yazmasın
  const { filter } = inkDefs(svg, 'sk');
  // ışık degradesi (pencere, fener, deklanşör)
  const defs = el('defs', {}, svg);
  const rg = el('radialGradient', { id: 'sk-isik' }, defs);
  el('stop', { offset: '0', 'stop-opacity': 0.6, style: 'stop-color:var(--sk-isik)' }, rg);
  el('stop', { offset: '1', 'stop-opacity': 0, style: 'stop-color:var(--sk-isik)' }, rg);
  stage.appendChild(svg);
  const isikKat = el('g', { class: 'sk-isik-kat' }, svg);
  const isik = (cx: number, cy: number, rx: number, ry = rx) => el('ellipse', { cx, cy, rx, ry, fill: 'url(#sk-isik)', opacity: 0 }, isikKat);
  const scene = el('g', { filter }, svg);
  const wind = pointerWind(svg, 0.12);

  // ================================================================ deniz, karşı kıyı, vapur (en arkada)
  const denizG = el('g', {}, scene);
  pen(denizG, DP).setAttribute('d', `M${DENIZ} ${UFUK} Q${(DENIZ + W) / 2} ${UFUK - 0.6} ${W} ${UFUK}`);
  // karşı kıyı: alçak tepeler, birkaç ev ve bir kule
  pen(denizG, DP).setAttribute('d', `M${DENIZ + 10} ${UFUK} Q${DENIZ + 60} ${UFUK - 14} ${DENIZ + 120} ${UFUK - 9} Q${DENIZ + 170} ${UFUK - 5} ${DENIZ + 210} ${UFUK - 16} Q${DENIZ + 260} ${UFUK - 26} ${DENIZ + 310} ${UFUK - 8}`);
  pen(denizG, DP * 0.8).setAttribute('d', [DENIZ + 52, DENIZ + 62, DENIZ + 70, DENIZ + 190, DENIZ + 200, DENIZ + 214].map((x, i) => `M${x} ${UFUK - 8 - (i % 3)} l0 -3 l3 -1.6 l3 1.6 l0 3`).join(' ') + ` M${DENIZ + 246} ${UFUK - 21} l0 -16 l1.6 -4 l1.6 4 l0 16`);
  // dalga çizgileri
  const dalga = pen(denizG, DP * 0.7);
  // vapur
  const vapurG = el('g', {}, denizG);
  const govde = shape(vapurG, SP * 0.7), alt = blot(vapurG), kamara = shape(vapurG, SP * 0.6), baca = renk(paint(vapurG, 'baca', SP * 0.6), 'baca'), lumboz = pen(vapurG, DP * 0.7), duman = pen(vapurG, DP * 0.7);
  govde.setAttribute('d', 'M-26 -2 L27 -2 L23 5 L-23 5Z'); alt.setAttribute('d', 'M-23.6 3 L23.6 3 L23 5 L-23 5Z');
  kamara.setAttribute('d', 'M-17 -2 L-17 -8 Q-16 -9 -14 -9 L13 -9 Q15 -9 15 -7 L15 -2 M-12 -9 L-12 -12 L9 -12 L9 -9');
  baca.setAttribute('d', 'M-1.4 -12 L-0.8 -18 L3.4 -18 L4 -12Z');
  lumboz.setAttribute('d', Array.from({ length: 7 }, (_, i) => `M${-13 + i * 4} -6 l2 0`).join(' '));
  let vapurX = W + 40;

  // ================================================================ korkuluk ve martılar
  const kork = el('g', {}, scene);
  shape(kork, SP).setAttribute('d', `M${DENIZ} ${GROUND} L${DENIZ} 168 L${W} 168 L${W} ${GROUND}`);
  pen(kork, SP).setAttribute('d', `M${DENIZ - 4} 166 Q${(DENIZ + W) / 2} 165.4 ${W + 2} 166 M${DENIZ - 2} 170 L${W} 170`);
  pen(kork, DP).setAttribute('d', Array.from({ length: 16 }, (_, i) => `M${DENIZ + 6 + i * 20} 170 q0.8 14 0 28`).join(' ') + Array.from({ length: 16 }, (_, i) => ` M${DENIZ + 16 + i * 20} 176 q-3 6 0 12 q3 -6 0 -12`).join(''));
  const martilar = [0, 1, 2].map((i) => ({ n: pen(denizG, SP * 0.75), a: rnd(0, 6), hiz: rnd(0.12, 0.2) * (i % 2 ? -1 : 1), y: rnd(60, 110) }));

  // ================================================================ cumbalı ahşap ev
  const ev = el('g', {}, scene);
  shape(ev, SP).setAttribute('d', `M48 ${GROUND} L48 64 L222 64 L222 ${GROUND}Z`);
  // saçak, kiremit uçları
  shape(ev, SP).setAttribute('d', 'M36 66 Q130 60 234 66 L230 58 Q130 52 40 58Z');
  pen(ev, DP).setAttribute('d', Array.from({ length: 24 }, (_, i) => `M${44 + i * 8} ${61.6 - Math.sin((i / 23) * Math.PI) * 2.4} q2 3 4 0`).join(' '));
  // ahşap kaplama (yatay tahtalar, her yerde değil)
  pen(ev, DP * 0.8).setAttribute('d', Array.from({ length: 10 }, (_, i) => `M50 ${136 + i * 6} L${i % 3 === 0 ? 110 : 98} ${136 + i * 6}`).join(' ') + Array.from({ length: 6 }, (_, i) => ` M52 ${74 + i * 6} L96 ${74 + i * 6}`).join(''));
  // kapı (kemerli) ve basamak
  shape(ev, SP).setAttribute('d', `M64 ${GROUND - 6} L64 152 Q76 140 88 152 L88 ${GROUND - 6}Z`);
  pen(ev, DP).setAttribute('d', `M76 144 L76 ${GROUND - 6} M70 170 a1 1 0 1 0 0.1 0 M66 158 L86 158`);
  shape(ev, SP).setAttribute('d', `M58 ${GROUND} L58 ${GROUND - 6} L94 ${GROUND - 6} L94 ${GROUND}Z`);
  // alt pencere, kepenkler
  const pencereler: Array<{ n: SVGPathElement; g: SVGEllipseElement; esik: number }> = [];
  const pencere = (x: number, y: number, w: number, h: number, kemer = false) => {
    const n = el('path', { d: kemer ? `M${x} ${y + h} L${x} ${y + w / 2} Q${x + w / 2} ${y - w / 4} ${x + w} ${y + w / 2} L${x + w} ${y + h}Z` : `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h}Z`, 'stroke-width': SP, stroke: 'currentColor', 'stroke-linejoin': 'round' }, ev);
    n.classList.add('pp');
    pen(ev, DP).setAttribute('d', `M${x + w / 2} ${y + (kemer ? w / 4 : 0)} L${x + w / 2} ${y + h} M${x} ${y + h * 0.45} L${x + w} ${y + h * 0.45}`);
    pencereler.push({ n, g: isik(x + w / 2, y + h / 2, w * 1.4, h), esik: rnd(-0.3, 0.4) });
  };
  pencere(118, 148, 22, 32);
  pen(ev, DP).setAttribute('d', 'M114 148 L114 180 M144 148 L144 180 M112 182 L146 182');
  // cumba: öne çıkan kutu, altında payandalar, içinde üç uzun pencere
  shape(ev, SP).setAttribute('d', 'M104 70 L214 70 L216 126 L102 126Z');
  pen(ev, SP).setAttribute('d', 'M100 126 L218 126 M106 126 L118 138 M212 126 L200 138 M159 126 L159 134');
  [114, 146, 178].forEach((x) => pencere(x, 78, 22, 40));
  pen(ev, DP).setAttribute('d', 'M104 74 L214 74 M108 122 L210 122');
  // saksı ve sardunyalar cumba altında (rüzgârla)
  shape(ev, SP * 0.8).setAttribute('d', `M184 ${GROUND - 8} L182 ${GROUND - 22} L200 ${GROUND - 22} L198 ${GROUND - 8}Z`);
  const sardunya = pen(ev, DP);
  const cicek = [0, 1, 2].map(() => renk(blot(ev), 'cicek'));

  // ================================================================ fener
  const fener = el('g', {}, scene);
  shape(fener, SP).setAttribute('d', `M${FENER - 3} ${GROUND} L${FENER - 1.6} 72 L${FENER + 1.6} 72 L${FENER + 3} ${GROUND}Z`);
  pen(fener, DP).setAttribute('d', `M${FENER - 4} ${GROUND - 14} L${FENER + 4} ${GROUND - 14}`);
  shape(fener, SP).setAttribute('d', `M${FENER - 8} 72 L${FENER + 8} 72 L${FENER + 6} 56 Q${FENER} 52 ${FENER - 6} 56Z`);
  const fenerCam = renk(el('path', { d: `M${FENER - 4.6} 70 L${FENER + 4.6} 70 L${FENER + 3.4} 59 Q${FENER} 57 ${FENER - 3.4} 59Z` }, fener), 'cam');
  pen(fener, DP).setAttribute('d', `M${FENER} 52 L${FENER} 47 M${FENER - 4} 47 Q${FENER} 44 ${FENER + 4} 47`);
  const fenerIsik = isik(FENER, 66, 60, 54);

  // ================================================================ tel ve serçeler (ev saçağından direğe)
  const TEL0: Vec = [228, 70], TEL1: Vec = [612, 92];
  const telY = (x: number) => { const u = clamp((x - TEL0[0]) / (TEL1[0] - TEL0[0]), 0, 1); return lerp(TEL0[1], TEL1[1], u) + Math.sin(u * Math.PI) * 14; };
  pen(scene, DP).setAttribute('d', `M${TEL0[0]} ${TEL0[1]} Q${(TEL0[0] + TEL1[0]) / 2} ${(TEL0[1] + TEL1[1]) / 2 + 28} ${TEL1[0]} ${TEL1[1]}`);
  shape(scene, SP).setAttribute('d', `M${TEL1[0] - 2.4} ${GROUND} L${TEL1[0] - 1.4} 84 L${TEL1[0] + 1.4} 84 L${TEL1[0] + 2.4} ${GROUND}Z`);
  pen(scene, DP).setAttribute('d', `M${TEL1[0] - 8} 92 L${TEL1[0] + 8} 92 M${TEL1[0] - 6} 92 l0 -2.4 M${TEL1[0] + 6} 92 l0 -2.4`);
  const kuslar = serceler(scene, telY);

  // ================================================================ çay ocağı: tente, tabela, cam, tabure
  const cay = el('g', {}, scene);
  shape(cay, SP).setAttribute('d', `M300 ${GROUND} L300 108 L462 108 L462 ${GROUND}Z`);
  shape(cay, SP).setAttribute('d', 'M316 90 L446 90 L446 106 L316 106Z');
  el('text', { x: 381, y: 102, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 500, 'letter-spacing': 2.4, fill: 'currentColor', style: 'font-family:var(--font-personabio, system-ui, sans-serif)' }, cay).textContent = 'ÇAY OCAĞI';
  // vitrin camı, içinde demlik ve iki ince belli bardak
  const vitrin = el('path', { d: `M318 140 L444 140 L444 186 L318 186Z`, 'stroke-width': SP, stroke: 'currentColor' }, cay); vitrin.classList.add('pp');
  pencereler.push({ n: vitrin, g: isik(381, 162, 90, 34), esik: 0.1 });
  pen(cay, DP).setAttribute('d', 'M381 140 L381 186 M318 172 L444 172');
  shape(cay, SP * 0.7).setAttribute('d', 'M334 172 L334 160 Q340 154 346 160 L346 172Z M346 163 q5 -1 6 -4 M338 156 l4 0');
  renk(paint(cay, 'cay', SP * 0.6), 'cay').setAttribute('d', 'M398 172 Q396 166 399 164 Q397 160 398 158 L404 158 Q405 160 403 164 Q406 166 404 172Z M412 172 Q410 166 413 164 Q411 160 412 158 L418 158 Q419 160 417 164 Q420 166 418 172Z');
  // tente: çizgili, saçaklı; saçak rüzgârla sallanır
  const tente = el('g', {}, cay);
  shape(tente, SP).setAttribute('d', 'M296 112 L466 112 L476 132 L286 132Z');
  Array.from({ length: 9 }, (_, i) => renk(el('path', { d: `M${300 + i * 19} 112 L${309.5 + i * 19} 112 L${306 + i * 20.5} 132 L${296.5 + i * 20.5} 132Z` }, tente), 'tente'));
  const sacak = pen(tente, SP * 0.8);
  const sacakYay = spring(26, 3.4);
  // kapı ve tabure
  pen(cay, SP).setAttribute('d', `M448 ${GROUND} L448 142 M456 ${GROUND} L456 142 M448 142 L456 142`);
  shape(cay, SP * 0.8).setAttribute('d', `M472 ${GROUND - 14} L490 ${GROUND - 14} L488 ${GROUND - 12} L474 ${GROUND - 12}Z`);
  pen(cay, SP * 0.8).setAttribute('d', `M475 ${GROUND - 12} L473 ${GROUND} M487 ${GROUND - 12} L489 ${GROUND} M474 ${GROUND - 5} L488 ${GROUND - 5}`);
  shape(cay, SP * 0.8).setAttribute('d', `M300 ${GROUND} L300 ${GROUND - 5} L330 ${GROUND - 5} L330 ${GROUND}Z`);

  // ================================================================ taş ev (çay ocağıyla deniz arası)
  const ev2 = el('g', {}, scene);
  shape(ev2, SP).setAttribute('d', `M500 ${GROUND} L500 96 L590 96 L590 ${GROUND}Z`);
  shape(ev2, SP).setAttribute('d', 'M494 98 L596 98 L592 90 L498 90Z');
  pen(ev2, DP * 0.8).setAttribute('d', Array.from({ length: 9 }, (_, i) => `M${502 + (i % 2) * 8} ${110 + i * 9.6} l${i % 2 ? 22 : 18} 0 M${540 + (i % 2) * 6} ${110 + i * 9.6} l${i % 2 ? 26 : 30} 0`).join(' '));
  pencereler.push(...[[512, 108], [556, 108], [512, 150], [556, 150]].map(([x, y]) => {
    const n = el('path', { d: `M${x} ${y + 26} L${x} ${y + 8} Q${x + 11} ${y - 4} ${x + 22} ${y + 8} L${x + 22} ${y + 26}Z`, 'stroke-width': SP, stroke: 'currentColor' }, ev2); n.classList.add('pp');
    pen(ev2, DP).setAttribute('d', `M${x + 11} ${y + 2} L${x + 11} ${y + 26} M${x - 2} ${y + 28} L${x + 24} ${y + 28}`);
    return { n, g: isik(x + 11, y + 15, 26, 22), esik: rnd(-0.4, 0.3) };
  }));

  // ================================================================ kaldırım
  pen(scene, SP).setAttribute('d', `M0 ${GROUND} Q${W / 2} ${GROUND - 0.6} ${W} ${GROUND} M0 ${GROUND + 9} Q${W / 2} ${GROUND + 9.6} ${W} ${GROUND + 9}`);
  pen(scene, DP).setAttribute('d', Array.from({ length: 28 }, (_, i) => `M${i * 34 + 12} ${GROUND + 0.4} q0.6 4.3 0 8.6`).join(' '));

  // ================================================================ kedi (çay ocağının basamağında)
  const kedi = kediKur(scene, 314, GROUND - 5);

  // ================================================================ fotoğrafçı
  const foto = fotografci(scene);

  // ================================================================ tıklamalar
  foto.g.addEventListener('pointerdown', () => foto.cek());
  kedi.g.addEventListener('pointerdown', () => kedi.durt());
  kuslar.hit.addEventListener('pointerdown', () => kuslar.kacir());

  // gece/gündüz: dakikada bir bakılır; ışıklar tek tek yanar
  let sonBakis = -99, gece = 0;
  const lambalar = pencereler.map((p) => ({ ...p, yanik: 0, hedef: 0 }));

  // ekranda değilse çizme
  let gorunur = true;
  new IntersectionObserver(([e]) => { gorunur = e.isIntersecting; }).observe(stage);

  run((t, dt) => {
    if (!gorunur && !location.search.includes('debug')) return;
    wind.step(t);
    if (t - sonBakis > 60 || sonBakis < 0) {
      sonBakis = t; gece = geceDegeri();
      lambalar.forEach((l) => { l.hedef = geceDegeri(l.esik); });
    }
    lambalar.forEach((l) => {
      l.yanik += (l.hedef - l.yanik) * Math.min(1, dt * 2.5);
      l.n.style.fill = l.yanik > 0.5 ? 'var(--sk-pencere)' : '';
      l.g.setAttribute('opacity', f(l.yanik * 0.55));
    });
    fenerCam.style.fill = gece > 0.5 ? 'var(--sk-pencere)' : 'var(--sk-cam)';
    fenerIsik.setAttribute('opacity', f(gece * (0.8 + Math.sin(t * 1.7) * 0.05 + Math.sin(t * 4.3) * 0.03)));

    // dalgalar ve vapur
    const d = Array.from({ length: 7 }, (_, i) => { const x = DENIZ + 20 + i * 44 + Math.sin(t * 0.5 + i) * 6; const y = UFUK + 4 + (i % 3) * 3.4; return `M${f(x)} ${f(y)} q3 -1.4 6 0 q3 1.4 6 0`; }).join(' ');
    dalga.setAttribute('d', d);
    vapurX -= dt * 6;
    if (vapurX < DENIZ - 40) vapurX = W + rnd(60, 400);
    const sallanma = Math.sin(t * 0.9) * 0.6;
    vapurG.setAttribute('transform', `translate(${f(vapurX)} ${f(UFUK - 4 + sallanma * 0.4)}) scale(-1 1) rotate(${f(sallanma)})`);
    vapurG.setAttribute('opacity', vapurX > W + 30 || vapurX < DENIZ - 30 ? '0' : '1');
    const dm = (t * 0.6) % 1;
    duman.setAttribute('d', `M1 -18 q${f(-3 - dm * 4 - wind.value * 6)} ${f(-3 - dm * 3)} ${f(-1 - dm * 8 - wind.value * 10)} ${f(-7 - dm * 4)}`);
    martilar.forEach((m, i) => {
      const x = DENIZ + 160 + Math.sin(t * m.hiz + m.a) * 150, y = m.y + Math.sin(t * 0.7 + i) * 8;
      const kanat = Math.sin(t * (i ? 3.1 : 2.6) + m.a) * 2.6;
      m.n.setAttribute('d', `M${f(x - 7)} ${f(y - 1 - kanat)} Q${f(x - 3.4)} ${f(y - 4 - kanat)} ${f(x)} ${f(y)} Q${f(x + 3.4)} ${f(y - 4 - kanat)} ${f(x + 7)} ${f(y - 1 - kanat)}`);
    });

    // saçak ve sardunyalar rüzgârla
    const sc = sacakYay.step(-wind.value * 4 + Math.sin(t * 1.2) * 0.4, dt);
    sacak.setAttribute('d', Array.from({ length: 19 }, (_, i) => { const x = 287 + i * 10.4; return `M${f(x)} 132 q${f(2.6 + sc * 0.6)} ${f(4)} ${f(5.2 + sc)} ${f(0.6)}`; }).join(' '));
    const ys = sc * 1.2;
    sardunya.setAttribute('d', `M191 ${GROUND - 22} Q${f(187 + ys)} ${GROUND - 32} ${f(183 + ys * 1.6)} ${GROUND - 38} M191 ${GROUND - 22} Q${f(194 + ys)} ${GROUND - 34} ${f(198 + ys * 1.4)} ${GROUND - 40} M191 ${GROUND - 22} Q${f(191 + ys * 0.6)} ${GROUND - 30} ${f(191 + ys)} ${GROUND - 44}`);
    cicek.forEach((c, i) => { const [x, y] = [[183 + ys * 1.6, GROUND - 38], [198 + ys * 1.4, GROUND - 40], [191 + ys, GROUND - 44]][i]; c.setAttribute('d', oval(x, y, 2.6, 2.2)); });

    kuslar.ciz(t, dt, gece, foto.x);
    kedi.ciz(t, dt, gece);
    foto.ciz(t, dt, wind.value, vapurX);
  });
}

// ==================================================================== fotoğrafçı
function fotografci(parent: SVGElement) {
  const fig = el('g', { style: 'cursor:pointer' }, parent);
  const farArm = limb(fig, 3.6);
  const legs = [renkLimb(solid(limb(fig, 4.2)), 'pantolon'), renkLimb(solid(limb(fig, 4.2)), 'pantolon')];
  const shoes = [blot(fig), blot(fig)];
  const ceket = shape(fig);
  const dikis = pen(fig, PEN * 0.6);
  const atkiUc = renk(paint(fig, 'atki', PEN * 0.8), 'atki');
  const bas = el('ellipse', { rx: 3.6, ry: 4.6, fill: '#fdfdfc', stroke: 'currentColor', 'stroke-width': PEN }, fig); bas.classList.add('pp');
  const sac = blot(fig);
  const atki = renk(paint(fig, 'atki', PEN * 0.8), 'atki');
  const aski = pen(fig, PEN * 0.6);
  const makineG = el('g', {}, fig);
  const makine = blot(makineG);
  const obj = el('circle', { r: 2.3, fill: '#fdfdfc', stroke: 'currentColor', 'stroke-width': PEN * 0.8 }, makineG); obj.classList.add('pp');
  const nearArm = limb(fig, 3.6);
  const flas = el('circle', { r: 36, fill: 'url(#sk-isik)', opacity: 0 }, parent.ownerSVGElement!.querySelector('.sk-isik-kat')!);

  const walk = gait({ kind: 'walk' });
  const kolYay = [spring(60, 9), spring(60, 9)];
  const makineSalla = pendulum(16, 1.6);
  const atkiYay = spring(30, 4);
  let phase = 0, x = 20, cekT = -1, denizdeCekti = false;
  const o = {
    g: fig, x,
    cek() { if (cekT < 0) cekT = 0; },
    ciz(t: number, dt: number, ruzgar: number, vapurX: number) {
      // denize varınca, vapur görünüyorsa bir kez kendiliğinden çeker
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
      const elN: Vec = L2([m[0] - 3, m[1] + 4], [m[0] - 1.6, m[1] + 2.6], kaldir);
      const serbestF: Vec = [yurElF[0] + 16 * Math.sin(farA + 0.25), yurElF[1] + 16 * Math.cos(farA + 0.25)];
      const elF = L2(serbestF, [m[0] + 4.6, m[1] + 1.6], kaldir);
      const dirF = L2(yurElF, [sh[0] + 10, sh[1] + 12], kaldir);
      farArm.draw([shF, dirF, elF], [0.2, 0.5]);
      const dirN = L2(yurElN, [sh[0] + 4, sh[1] + 15], Math.max(kaldir, 0.6));
      nearArm.draw([shN, dirN, elN], [0.2, 0.4]);

      const [lx, ly] = toScene(x, GROUND, 1, m[0] + 5, m[1], SC);
      flas.setAttribute('cx', f(lx + 6)); flas.setAttribute('cy', f(ly)); flas.setAttribute('opacity', f(deklansor * 0.9));
    },
  };
  return o;
}

function renkLimb(l: ReturnType<typeof limb>, ad: string) {
  const n = l.g.querySelector('path'); if (n) { n.removeAttribute('fill'); n.style.fill = `var(--sk-${ad})`; }
  return l;
}

// ==================================================================== kedi (village örneğinden uyarlandı)
type Poz = { S: Vec; H: Vec; Bc: Vec; C: Vec; Bt: Vec; hd: Vec; tilt: number; ear: number; eye: number; F1: Vec; F2: Vec; T0: Vec; T1: Vec; T2: Vec };
const POZ: Record<string, Poz> = {
  uyku: { S: [-7, -6.4], H: [7, -6.6], Bc: [0, -9.4], C: [-9, -0.2], Bt: [9.6, -0.2], hd: [-10.6, -3.6], tilt: 30, ear: 0.4, eye: 0, F1: [-11, 0], F2: [-8.6, 0], T0: [9, -2], T1: [6, 3], T2: [-5, 1.2] },
  otur: { S: [-4.4, -12.6], H: [4.6, -5.4], Bc: [2.2, -11.4], C: [-6.4, -1.4], Bt: [6.6, -0.2], hd: [-5.4, -17.6], tilt: 0, ear: 1, eye: 1, F1: [-5.6, 0], F2: [-3.4, 0], T0: [6.6, -1], T1: [13, 0.6], T2: [15.6, -4.4] },
  esne: { S: [-4.4, -12.8], H: [4.6, -5.4], Bc: [2.2, -11.6], C: [-6.4, -1.4], Bt: [6.6, -0.2], hd: [-5.6, -18.6], tilt: -18, ear: 0.6, eye: 0, F1: [-5.6, 0], F2: [-3.4, 0], T0: [6.6, -1], T1: [13, 0.6], T2: [15.6, -4.4] },
  gerin: { S: [-9.4, -4.6], H: [5.4, -11.6], Bc: [-1, -8.6], C: [-11, -1], Bt: [7.4, -3.6], hd: [-15.6, -6.6], tilt: -6, ear: 0.7, eye: 0.3, F1: [-17.6, 0], F2: [-15, 0], T0: [7, -9.6], T1: [10, -17], T2: [8.6, -22] },
};
const SIRA: Array<[string, number]> = [['otur', 0.7], ['esne', 0.9], ['otur', 0.4], ['gerin', 1.5], ['otur', 2.4], ['uyku', 1.1]];
const pozKaris = (a: Poz, b: Poz, t: number): Poz => {
  const o = {} as Record<string, unknown>;
  for (const k of Object.keys(a) as Array<keyof Poz>) { const va = a[k], vb = b[k]; o[k] = Array.isArray(va) ? L2(va as Vec, vb as Vec, t) : lerp(va as number, vb as number, t); }
  return o as Poz;
};

function kediKur(parent: SVGElement, x: number, y: number) {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  const kuyruk = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, g);
  const kuyrukIc = renk(el('path', { fill: 'none', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, g), 'kedi', 'stroke');
  const bacak = pen(g, SP * 1.2);
  const govde = shape(g, SP * 0.9);
  const leke = renk(el('path', {}, g), 'kedi');
  const basG = el('g', {}, g);
  const kulak = el('path', { stroke: 'currentColor', 'stroke-width': SP * 0.8, 'stroke-linejoin': 'round', fill: '#fdfdfc' }, basG); kulak.classList.add('pp');
  const kafa = el('ellipse', { cx: 0, cy: 0, rx: 4.6, ry: 4.1, fill: '#fdfdfc', stroke: 'currentColor', 'stroke-width': SP * 0.9 }, basG); kafa.classList.add('pp');
  const yuz = pen(basG, SP * 0.5);
  el('rect', { x: x - 20, y: y - 26, width: 42, height: 28, fill: 'transparent' }, g);
  let seqT = -1, bos = 2, kuyrukSalla = 0;
  const X = (p: Vec): Vec => [x + p[0], y + p[1]];
  return {
    g,
    durt() { if (seqT < 0) seqT = 0; },
    ciz(t: number, dt: number, gece: number) {
      const dinlen = gece > 0.5 ? POZ.otur : POZ.uyku; // gece uyanık oturur, gündüz basamakta uyur
      let poz = dinlen;
      if (seqT >= 0) {
        seqT += dt;
        let acc = 0, onceki = dinlen, simdi = POZ[SIRA[0][0]], u = 1;
        for (const [ad, d] of SIRA) { if (seqT < acc + d) { simdi = POZ[ad]; u = (seqT - acc) / d; break; } acc += d; onceki = POZ[ad]; simdi = POZ[ad]; }
        if (seqT > SIRA.reduce((a, s) => a + s[1], 0)) seqT = -1;
        poz = pozKaris(onceki, simdi, ease(Math.min(1, u * 1.6)));
      }
      const nefes = Math.sin(t * 1.8) * 0.35;
      bos -= dt; if (bos < 0) { bos = rnd(2, 6); kuyrukSalla = 1; }
      kuyrukSalla = Math.max(0, kuyrukSalla - dt * 1.6);
      const S: Vec = [X(poz.S)[0], X(poz.S)[1] - nefes], Hh: Vec = [X(poz.H)[0], X(poz.H)[1] - nefes * 0.6], Bc: Vec = [X(poz.Bc)[0], X(poz.Bc)[1] - nefes * 1.2];
      const C = X(poz.C), Bt = X(poz.Bt);
      govde.setAttribute('d', `M${pt(C)} Q${f(C[0] - 2)} ${f((C[1] + S[1]) / 2)} ${pt(S)} Q${pt(Bc)} ${pt(Hh)} Q${f(Hh[0] + 4)} ${f((Hh[1] + Bt[1]) / 2)} ${pt(Bt)} Q${f((Bt[0] + C[0]) / 2)} ${f(Math.max(Bt[1], C[1]) + 1)} ${pt(C)}Z`);
      const orta = L2(S, Hh, 0.55);
      leke.setAttribute('d', `M${f(orta[0] - 3.4)} ${f(orta[1] + 0.6)} Q${f(orta[0])} ${f(orta[1] - 3)} ${f(orta[0] + 4)} ${f(orta[1] + 0.2)} Q${f(orta[0] + 1)} ${f(orta[1] + 3.6)} ${f(orta[0] - 3.4)} ${f(orta[1] + 0.6)}Z`);
      const fl = Math.sin(t * 14) * 2.5 * kuyrukSalla;
      const T0 = X(poz.T0), T1 = X(poz.T1), T2: Vec = [X(poz.T2)[0] + fl, X(poz.T2)[1] - fl * 0.4];
      const kd = `M${pt(T0)} Q${pt(T1)} ${pt(T2)}`; kuyruk.setAttribute('d', kd); kuyrukIc.setAttribute('d', kd);
      const om: Vec = [S[0] + 1.4, S[1] + 4], F1 = X(poz.F1), F2 = X(poz.F2);
      bacak.setAttribute('d', `M${pt(om)} L${pt(F1)} M${f(om[0] + 1.6)} ${f(om[1])} L${pt(F2)}`);
      const hd: Vec = [X(poz.hd)[0], X(poz.hd)[1] - nefes];
      basG.setAttribute('transform', `translate(${pt(hd)}) rotate(${f(poz.tilt)})`);
      const e = poz.ear;
      kulak.setAttribute('d', `M-4 -2 L${f(-4.2 - (1 - e) * 1.4)} ${f(-7.4 + (1 - e) * 3)} L-1 -3.6Z M1.4 -3.8 L${f(3.6 + (1 - e) * 1.6)} ${f(-7.2 + (1 - e) * 3)} L4.4 -1.8Z`);
      yuz.setAttribute('d', (poz.eye > 0.5 ? 'M-2.6 -0.4 a0.6 0.8 0 1 0 0.1 0 M1 -0.4 a0.6 0.8 0 1 0 0.1 0' : 'M-3.2 -0.2 q0.7 0.7 1.4 0 M0.6 -0.2 q0.7 0.7 1.4 0') + ' M-1.2 1.4 l0.6 0.5 l0.6 -0.5 M-4.4 1.6 l-3.6 -0.4 M2.6 1.8 l3.4 -0.2');
    },
  };
}

// ==================================================================== serçeler (telde; dokununca ya da geceleyin kaçar)
function serceler(parent: SVGElement, telY: (x: number) => number) {
  const g = el('g', {}, parent);
  const yerler = [300, 336, 372, 430, 470, 520];
  type Kus = { x: number; yon: 1 | -1; durum: 'kon' | 'uc' | 'yok'; t: number; sonraki: number; zipT: number; zipA: number; zipB: number; yol: null | { p0: Vec; c1: Vec; c2: Vec; p1: Vec; sure: number; uzak: boolean }; govde: SVGPathElement; bas: SVGPathElement; gaga: SVGPathElement; kuyruk: SVGPathElement; kanat: SVGPathElement; kg: SVGGElement };
  const kuslar: Kus[] = yerler.slice(0, 5).map((x) => {
    const kg = el('g', {}, g);
    return { x: x + rnd(-6, 6), yon: Math.random() < 0.5 ? -1 : 1, durum: 'kon', t: 0, sonraki: rnd(1, 4), zipT: -1, zipA: 0, zipB: 0, yol: null, kuyruk: pen(kg, SP * 0.7), govde: shape(kg, SP * 0.6), bas: renk(el('path', {}, kg), 'serce'), gaga: blot(kg), kanat: pen(kg, SP * 0.7), kg };
  });
  const hit = el('path', { fill: 'transparent', style: 'cursor:pointer', d: `M280 ${telY(280) - 16} L560 ${telY(560) - 16} L560 ${telY(560) + 6} L280 ${telY(280) + 6}Z` }, g);
  const bez = (p: NonNullable<Kus['yol']>, u: number): Vec => { const a = 1 - u; return [0, 1].map((k) => a * a * a * p.p0[k] + 3 * a * a * u * p.c1[k] + 3 * a * u * u * p.c2[k] + u * u * u * p.p1[k]) as Vec; };
  const kalk = (b: Kus, uzak: boolean) => {
    const y0 = telY(b.x) - 2.4;
    const nx = uzak ? (Math.random() < 0.5 ? -30 : 990) : clamp(yerler[(Math.random() * yerler.length) | 0] + rnd(-8, 8), 290, 560);
    const yuk = rnd(30, 55);
    b.yol = { p0: [b.x, y0], c1: [b.x + rnd(-70, 70), y0 - yuk], c2: [nx + rnd(-50, 50), y0 - yuk * rnd(0.6, 1.1)], p1: [nx, uzak ? rnd(10, 40) : telY(nx) - 2.4], sure: rnd(1.6, 2.8), uzak };
    b.durum = 'uc'; b.t = 0;
  };
  return {
    hit,
    kacir() { kuslar.forEach((b) => { if (b.durum === 'kon') kalk(b, Math.random() < 0.4); }); },
    ciz(t: number, dt: number, gece: number, fotoX: number) {
      kuslar.forEach((b, i) => {
        if (b.durum === 'kon' && gece > 0.5) kalk(b, true);
        // fotoğrafçı telin altından geçerken yakındaki kuş bazen kalkar
        if (b.durum === 'kon' && Math.abs(fotoX - b.x) < 12 && Math.random() < dt * 0.6) kalk(b, false);
        if (b.durum === 'yok') {
          if (gece < 0.5 && Math.random() < dt * 0.15) { const hx = yerler[i] + rnd(-6, 6); b.yol = { p0: [Math.random() < 0.5 ? -20 : 980, rnd(10, 50)], c1: [rnd(300, 600), rnd(10, 50)], c2: [hx + rnd(-40, 40), telY(hx) - 40], p1: [hx, telY(hx) - 2.4], sure: rnd(2, 3.2), uzak: false }; b.durum = 'uc'; b.t = 0; }
          b.kg.setAttribute('opacity', '0'); return;
        }
        b.kg.setAttribute('opacity', '1');
        let x: number, y: number, ucuyor = false;
        if (b.durum === 'uc' && b.yol) {
          b.t += dt; const u = clamp(b.t / b.yol.sure, 0, 1);
          [x, y] = bez(b.yol, ease(u));
          b.yon = bez(b.yol, ease(Math.min(1, u + 0.02)))[0] >= x ? 1 : -1;
          ucuyor = u < 0.97;
          if (u >= 1) { if (b.yol.uzak) b.durum = 'yok'; else { b.durum = 'kon'; b.x = x; b.sonraki = rnd(0.6, 3); } }
        } else {
          b.sonraki -= dt;
          if (b.sonraki < 0) {
            b.sonraki = rnd(0.8, 3.6);
            if (Math.random() < 0.4) { b.zipT = 0; b.zipA = b.x; b.zipB = clamp(b.x + b.yon * rnd(4, 9), 290, 560); } else b.yon = b.yon === 1 ? -1 : 1;
          }
          if (b.zipT >= 0) { b.zipT += dt / 0.22; b.x = lerp(b.zipA, b.zipB, ease(Math.min(1, b.zipT))); if (b.zipT >= 1) b.zipT = -1; }
          x = b.x; y = telY(b.x) - 2.4 - (b.zipT >= 0 ? Math.sin(Math.PI * b.zipT) * 3 : 0);
        }
        const d = b.yon, X = (dx: number) => f(x + dx * d);
        b.govde.setAttribute('d', oval(x, y - 2.8, 3.1, 2.4));
        b.bas.setAttribute('d', `M${X(0.8)} ${f(y - 5.4)} a2 1.8 0 0 1 ${f(3.6 * d)} 0Z`);
        b.gaga.setAttribute('d', `M${X(4.4)} ${f(y - 5)} L${X(6)} ${f(y - 4.6)} L${X(4.4)} ${f(y - 4.1)}Z`);
        b.kuyruk.setAttribute('d', `M${X(-2.4)} ${f(y - 2.6)} L${X(-6)} ${f(y - 0.8)}`);
        const fl = Math.sin(t * 34 + i) * 4;
        b.kanat.setAttribute('d', ucuyor ? `M${X(0)} ${f(y - 3.4)} L${X(-2)} ${f(y - 3.4 - fl)} M${X(0.6)} ${f(y - 3)} L${X(2.4)} ${f(y - 3 - fl * 0.8)}` : `M${X(-1.6)} ${f(y - 3.6)} Q${X(0.6)} ${f(y - 2.2)} ${X(-2.2)} ${f(y - 1.4)}`);
      });
    },
  };
}
