// Hayvanlar: kedi (village orneginden uyarlandi), telde serceler, yerde guvercinler, fenerde pervaneler.
// (ahmetenes sokak sahnesi de kullanir: eklenenler geriye uyumlu — konustur, irkil, aksam giden guvercinler, topla;
//  kedi uyku ile oturus arasinda artik yumusak gecer; K2b: kedi yon degistirirken yerinde doner (uyuyorsa once
//  dogrulur), mama kabina bankin onune inip yer ve geri cikar.)
import { el, pen, shape, blot, f, pt, type Vec } from './ink';
import { ease, clamp, lerp, rnd } from './motion';

const SP = 1.15;
const renk = <T extends SVGElement>(n: T, ad: string, ne: 'fill' | 'stroke' = 'fill'): T => { n.style[ne] = `var(--sk-${ad})`; return n; };
const oval = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const L2 = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
// Ayni deger DOM'a ikinci kez yazilmaz: duran kus, uyuyan kedinin yuzu her karede oznitelik yazmasin.
const sonYazilan = new WeakMap<Element, Map<string, string>>();
const yaz = (n: Element, ad: string, v: string) => {
  let m = sonYazilan.get(n);
  if (!m) sonYazilan.set(n, m = new Map());
  if (m.get(ad) !== v) { m.set(ad, v); n.setAttribute(ad, v); }
};

// ==================================================================== kedi (village orneginden uyarlandi)
type Poz = { S: Vec; H: Vec; Bc: Vec; C: Vec; Bt: Vec; hd: Vec; tilt: number; ear: number; eye: number; agiz: number; F1: Vec; F2: Vec; T0: Vec; T1: Vec; T2: Vec };
const POZ: Record<string, Poz> = {
  uyku: { agiz: 0, S: [-7, -6.4], H: [7, -6.6], Bc: [0, -9.4], C: [-9, -0.2], Bt: [9.6, -0.2], hd: [-10.6, -3.6], tilt: 30, ear: 0.4, eye: 0, F1: [-11, 0], F2: [-8.6, 0], T0: [9, -2], T1: [6, 3], T2: [-5, 1.2] },
  otur: { agiz: 0, S: [-4.4, -12.6], H: [4.6, -5.4], Bc: [2.2, -11.4], C: [-6.4, -1.4], Bt: [6.6, -0.2], hd: [-5.4, -17.6], tilt: 0, ear: 1, eye: 1, F1: [-5.6, 0], F2: [-3.4, 0], T0: [6.6, -1], T1: [13, 0.6], T2: [15.6, -4.4] },
  esne: { agiz: 1, S: [-4.4, -12.8], H: [4.6, -5.4], Bc: [2.2, -11.6], C: [-6.4, -1.4], Bt: [6.6, -0.2], hd: [-5.6, -18.6], tilt: -18, ear: 0.6, eye: 0, F1: [-5.6, 0], F2: [-3.4, 0], T0: [6.6, -1], T1: [13, 0.6], T2: [15.6, -4.4] },
  gerin: { agiz: 0, S: [-9.4, -4.6], H: [5.4, -11.6], Bc: [-1, -8.6], C: [-11, -1], Bt: [7.4, -3.6], hd: [-15.6, -6.6], tilt: -6, ear: 0.7, eye: 0.3, F1: [-17.6, 0], F2: [-15, 0], T0: [7, -9.6], T1: [10, -17], T2: [8.6, -22] },
  // kaptan yer: basi asagida, arkasi hafif yukarida, kuyruk kalkik
  ye: { agiz: 0, S: [-6.4, -7.8], H: [6, -9.6], Bc: [0, -10.4], C: [-8.6, -0.8], Bt: [8.4, -0.4], hd: [-11.6, -4.6], tilt: 34, ear: 0.8, eye: 0, F1: [-9.6, 0], F2: [-7.4, 0], T0: [8, -6], T1: [13.6, -9], T2: [16, -14.6] },
};
const SIRA: Array<[string, number]> = [['otur', 0.7], ['esne', 0.9], ['otur', 0.4], ['gerin', 1.5], ['otur', 2.4], ['uyku', 1.1]];
const pozKaris = (a: Poz, b: Poz, t: number): Poz => {
  const o = {} as Record<string, unknown>;
  for (const k of Object.keys(a) as Array<keyof Poz>) { const va = a[k], vb = b[k]; o[k] = Array.isArray(va) ? L2(va as Vec, vb as Vec, t) : lerp(va as number, vb as number, t); }
  return o as Poz;
};

export function kediKur(parent: SVGElement, x: number, y: number) {
  const g = el('g', {}, parent);
  const kuyruk = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, g);
  const kuyrukIc = renk(el('path', { fill: 'none', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, g), 'kedi', 'stroke');
  const bacak = pen(g, SP * 1.2);
  const govde = shape(g, SP * 0.9);
  const leke = renk(el('path', {}, g), 'kedi');
  const basG = el('g', {}, g);
  const kulak = el('path', { stroke: 'currentColor', 'stroke-width': SP * 0.8, 'stroke-linejoin': 'round', fill: '#fdfdfc' }, basG); kulak.classList.add('pp');
  const kafa = el('ellipse', { cx: 0, cy: 0, rx: 4.6, ry: 4.1, fill: '#fdfdfc', stroke: 'currentColor', 'stroke-width': SP * 0.9 }, basG); kafa.classList.add('pp');
  const yuz = pen(basG, SP * 0.5);
  const agiz = renk(el('path', { stroke: 'currentColor', 'stroke-width': SP * 0.4 }, basG), 'agiz');
  let seqT = -1, bos = 2, kuyrukSalla = 0, dinK = -1, yonu: 1 | -1 = -1, kipT = -1;
  // donus: hedef yon, donme zamani ve aynalama (1 sola bakar … -1 saga); mama: zaman, inis yeri, yeme suresi
  let hedefYon: 1 | -1 = -1, donT = -1, sx = 1, ox = 0, oy = 0, sonTr = '', mamaT = -1, mamaD: Vec = [0, 0], mamaSure = 0, uyurDurt = false;
  const X = (p: Vec): Vec => [x + p[0], y + p[1]];
  const MAMA = { uyan: 0.7, egil: 0.35, atla: 0.45, don: 0.35, cik: 0.5 };
  return {
    g,
    orta: (): Vec => [x + ox, y + oy - 9],
    durt() { if (seqT < 0 && mamaT < 0) seqT = 0; },
    /** Hafif tepki (yaninda bir sey olunca): uyanmadan kulagini oynatir, basini bir an kaldirip bakar. */
    kipirda() { if (kipT < 0 && seqT < 0 && mamaT < 0) kipT = 0; },
    /** Yuzunu cevirir (-1 sol, varsayilan; 1 sag): yanina oturana doner. Uyuyorsa once dogrulur, sonra yerinde doner. */
    yon(y: 1 | -1) { hedefYon = y; },
    /** Mama kabina iner: (dx, dy) kadar ileri-asagi atlar, `sure` sn yer, bankina geri cikar. */
    mama(dx: number, dy: number, sure: number) { if (mamaT < 0) { mamaT = 0; mamaD = [dx, dy]; mamaSure = sure; seqT = -1; } },
    /** Mama fasli suruyor mu; yiyorsa 0…1 ilerleme (kaptaki mama azalir). */
    yiyor: (): number | null => {
      if (mamaT < 0) return null;
      const b = MAMA.uyan + MAMA.egil + MAMA.atla;
      return clamp((mamaT - b) / mamaSure, 0, 1);
    },
    ciz(t: number, dt: number, gece: number) {
      // gece > 0.5: uyanik oturur, degilse uyur; ikisi arasinda ~1 sn'de yumusak gecer (sicramaz)
      const hedefK = gece > 0.5 ? 1 : 0;
      dinK = dinK < 0 ? hedefK : dinK + clamp(hedefK - dinK, -dt * 0.9, dt * 0.9);
      const dinlen = dinK <= 0 ? POZ.uyku : dinK >= 1 ? POZ.otur : pozKaris(POZ.uyku, POZ.otur, ease(dinK));
      let poz = dinlen;
      if (seqT >= 0) {
        seqT += dt;
        let acc = 0, onceki = dinlen, simdi = POZ[SIRA[0][0]], u = 1;
        for (const [ad, d] of SIRA) { if (seqT < acc + d) { simdi = POZ[ad]; u = (seqT - acc) / d; break; } acc += d; onceki = POZ[ad]; simdi = POZ[ad]; }
        if (seqT > SIRA.reduce((a, s) => a + s[1], 0)) seqT = -1;
        poz = pozKaris(onceki, simdi, ease(Math.min(1, u * 1.6)));
      }
      // mama: uyan → egil → atla (yay) → ye → egil → geri atla
      if (mamaT >= 0) {
        mamaT += dt;
        const d0 = MAMA.uyan, d1 = d0 + MAMA.egil, d2 = d1 + MAMA.atla, d3 = d2 + mamaSure, d4 = d3 + MAMA.don, d5 = d4 + MAMA.cik;
        const T = mamaT, yay = (u: number) => Math.sin(Math.PI * u) * 5;
        if (T < d0 || donT >= 0 || hedefYon !== yonu) { poz = pozKaris(dinlen, POZ.otur, ease(clamp(T / d0, 0, 1))); if (T >= d0) mamaT = d0; }
        else if (T < d1) poz = pozKaris(POZ.otur, POZ.gerin, ease((T - d0) / MAMA.egil));
        else if (T < d2) { const u = (T - d1) / MAMA.atla, e = ease(u); poz = pozKaris(POZ.gerin, POZ.ye, e); ox = mamaD[0] * e; oy = mamaD[1] * e - yay(u); }
        else if (T < d3) { poz = { ...POZ.ye, hd: [POZ.ye.hd[0], POZ.ye.hd[1] + (Math.sin(T * 7) > 0.2 ? 0.7 : 0)] }; ox = mamaD[0]; oy = mamaD[1]; }
        else if (T < d4) { poz = pozKaris(POZ.ye, POZ.gerin, ease((T - d3) / MAMA.don)); ox = mamaD[0]; oy = mamaD[1]; }
        else if (T < d5) { const u = (T - d4) / MAMA.cik, e = ease(u); poz = pozKaris(POZ.gerin, dinlen, e); ox = mamaD[0] * (1 - e); oy = mamaD[1] * (1 - e) - yay(u) * 1.6; }
        else { mamaT = -1; ox = 0; oy = 0; }
      }
      if (kipT >= 0) {
        kipT += dt;
        const k = Math.sin(Math.PI * clamp(kipT / 1.2, 0, 1));
        poz = { ...poz, ear: poz.ear + k * 0.5 + Math.sin(kipT * 34) * 0.22 * k, eye: k > 0.45 ? 1 : poz.eye, tilt: poz.tilt - 12 * k, hd: [poz.hd[0], poz.hd[1] - 1.8 * k] };
        if (kipT > 1.2 || seqT >= 0 || mamaT >= 0) kipT = -1;
      }
      // donus: uyuyorsa once dogrulur (uyanma dizisi), sonra yerinde doner (aynalama 0.35 sn'de sifirdan gecer)
      if (hedefYon !== yonu && donT < 0) {
        const uyur = dinK < 0.5 && seqT < 0 && mamaT < 0;
        if (uyur && !uyurDurt) { uyurDurt = true; seqT = 0; }
        if (!uyur || (seqT > 0.5 && seqT < 2)) { donT = 0; uyurDurt = false; }
      }
      if (donT >= 0) {
        donT += dt; const u = clamp(donT / 0.35, 0, 1), bas = yonu === 1 ? -1 : 1;
        sx = bas * Math.cos(Math.PI * ease(u));
        if (Math.abs(sx) < 0.08) sx = 0.08 * (u < 0.5 ? bas : -bas);
        if (u >= 1) { yonu = hedefYon; sx = yonu === 1 ? -1 : 1; donT = -1; }
      }
      const tr = sx === 1 && ox === 0 && oy === 0 ? '' : `translate(${f(x + ox)} ${f(oy)}) scale(${f(sx)} 1) translate(${-x} 0)`;
      if (tr !== sonTr) { sonTr = tr; yaz(g, 'transform', tr); }
      const nefes = Math.sin(t * 1.8) * 0.35;
      bos -= dt; if (bos < 0) { bos = rnd(2, 6); kuyrukSalla = 1; }
      kuyrukSalla = Math.max(0, kuyrukSalla - dt * 1.6);
      const S: Vec = [X(poz.S)[0], X(poz.S)[1] - nefes], Hh: Vec = [X(poz.H)[0], X(poz.H)[1] - nefes * 0.6], Bc: Vec = [X(poz.Bc)[0], X(poz.Bc)[1] - nefes * 1.2];
      const C = X(poz.C), Bt = X(poz.Bt);
      yaz(govde, 'd', `M${pt(C)} Q${f(C[0] - 2)} ${f((C[1] + S[1]) / 2)} ${pt(S)} Q${pt(Bc)} ${pt(Hh)} Q${f(Hh[0] + 4)} ${f((Hh[1] + Bt[1]) / 2)} ${pt(Bt)} Q${f((Bt[0] + C[0]) / 2)} ${f(Math.max(Bt[1], C[1]) + 1)} ${pt(C)}Z`);
      const orta = L2(S, Hh, 0.55);
      yaz(leke, 'd', `M${f(orta[0] - 3.4)} ${f(orta[1] + 0.6)} Q${f(orta[0])} ${f(orta[1] - 3)} ${f(orta[0] + 4)} ${f(orta[1] + 0.2)} Q${f(orta[0] + 1)} ${f(orta[1] + 3.6)} ${f(orta[0] - 3.4)} ${f(orta[1] + 0.6)}Z`);
      const fl = Math.sin(t * 14) * 2.5 * kuyrukSalla;
      const T0 = X(poz.T0), T1 = X(poz.T1), T2: Vec = [X(poz.T2)[0] + fl, X(poz.T2)[1] - fl * 0.4];
      const kd = `M${pt(T0)} Q${pt(T1)} ${pt(T2)}`; yaz(kuyruk, 'd', kd); yaz(kuyrukIc, 'd', kd);
      const om: Vec = [S[0] + 1.4, S[1] + 4], F1 = X(poz.F1), F2 = X(poz.F2);
      yaz(bacak, 'd', `M${pt(om)} L${pt(F1)} M${f(om[0] + 1.6)} ${f(om[1])} L${pt(F2)}`);
      const hd: Vec = [X(poz.hd)[0], X(poz.hd)[1] - nefes];
      yaz(basG, 'transform', `translate(${pt(hd)}) rotate(${f(poz.tilt)})`);
      const e = poz.ear;
      yaz(kulak, 'd', `M-4 -2 L${f(-4.2 - (1 - e) * 1.4)} ${f(-7.4 + (1 - e) * 3)} L-1 -3.6Z M1.4 -3.8 L${f(3.6 + (1 - e) * 1.6)} ${f(-7.2 + (1 - e) * 3)} L4.4 -1.8Z`);
      yaz(agiz, 'd', poz.agiz > 0.1 ? oval(-0.6, 2.7, 1.2 * poz.agiz, 1.6 * poz.agiz) : '');
      yaz(yuz, 'd', (poz.eye > 0.5 ? 'M-2.6 -0.4 a0.6 0.8 0 1 0 0.1 0 M1 -0.4 a0.6 0.8 0 1 0 0.1 0' : 'M-3.2 -0.2 q0.7 0.7 1.4 0 M0.6 -0.2 q0.7 0.7 1.4 0') + ' M-1.2 1.4 l0.6 0.5 l0.6 -0.5 M-4.4 1.6 l-3.6 -0.4 M2.6 1.8 l3.4 -0.2');
    },
  };
}

// ==================================================================== serceler (telde; dokununca ya da geceleyin kacar)
export function serceler(parent: SVGElement, telY: (x: number) => number, yerler: number[], ara: [number, number]) {
  const g = el('g', {}, parent);
  type Ozel = { y: number; kalan: number };
  type Kus = { x: number; yon: 1 | -1; durum: 'kon' | 'uc' | 'yok'; t: number; sonraki: number; zipT: number; zipA: number; zipB: number; yol: null | { p0: Vec; c1: Vec; c2: Vec; p1: Vec; sure: number; uzak: boolean; ozel?: Ozel }; ozel: Ozel | null; gor: boolean; govde: SVGPathElement; bas: SVGPathElement; gaga: SVGPathElement; kuyruk: SVGPathElement; kanat: SVGPathElement; kg: SVGGElement };
  const kuslar: Kus[] = yerler.slice(0, 5).map((x) => {
    const kg = el('g', {}, g);
    return { x: x + rnd(-6, 6), yon: Math.random() < 0.5 ? -1 : 1, durum: 'kon', t: 0, sonraki: rnd(1, 4), zipT: -1, zipA: 0, zipB: 0, yol: null, ozel: null, gor: true, kuyruk: pen(kg, SP * 0.7), govde: shape(kg, SP * 0.6), bas: renk(el('path', {}, kg), 'serce'), gaga: blot(kg), kanat: pen(kg, SP * 0.7), kg };
  });
  const merkezX = (ara[0] + ara[1]) / 2;
  const bez = (p: NonNullable<Kus['yol']>, u: number): Vec => { const a = 1 - u; return [0, 1].map((k) => a * a * a * p.p0[k] + 3 * a * a * u * p.c1[k] + 3 * a * u * u * p.c2[k] + u * u * u * p.p1[k]) as Vec; };
  const konY = (b: Kus) => (b.ozel ? b.ozel.y : telY(b.x) - 2.4);
  const kalk = (b: Kus, uzak: boolean) => {
    const y0 = konY(b);
    const nx = uzak ? (Math.random() < 0.5 ? -30 : 990) : clamp(yerler[(Math.random() * yerler.length) | 0] + rnd(-8, 8), ara[0], ara[1]);
    const yuk = rnd(30, 55);
    b.yol = { p0: [b.x, y0], c1: [b.x + rnd(-70, 70), y0 - yuk], c2: [nx + rnd(-50, 50), y0 - yuk * rnd(0.6, 1.1)], p1: [nx, uzak ? rnd(10, 40) : telY(nx) - 2.4], sure: rnd(1.6, 2.8), uzak };
    b.durum = 'uc'; b.t = 0; b.ozel = null;
  };
  return {
    orta: (): Vec => [merkezX, telY(merkezX) - 4],
    konan: () => kuslar.filter((b) => b.durum === 'kon' && !b.ozel).length,
    kacir() { kuslar.forEach((b) => { if (b.durum === 'kon') kalk(b, Math.random() < 0.4); }); },
    /** Telde konan bir serce (x, y) noktasina ucup `sure` sn orada durur, sonra tele doner (fenerin tepesi gibi). */
    konustur(x: number, y: number, sure = 5): boolean {
      const b = kuslar.filter((q) => q.durum === 'kon' && !q.ozel).sort((p, q) => Math.abs(p.x - x) - Math.abs(q.x - x))[0];
      if (!b) return false;
      const y0 = konY(b);
      b.yol = { p0: [b.x, y0], c1: [b.x + (x - b.x) * 0.3, y0 - 24], c2: [x + (b.x < x ? -16 : 16), y - 18], p1: [x, y], sure: rnd(1.1, 1.5), uzak: false, ozel: { y, kalan: sure } };
      b.durum = 'uc'; b.t = 0; b.ozel = null;
      return true;
    },
    ciz(t: number, dt: number, gece: number, fotoX: number) {
      kuslar.forEach((b, i) => {
        if (b.durum === 'kon' && gece > 0.5) kalk(b, true);
        // biri telin altindan gecerken yakindaki kus bazen kalkar
        if (b.durum === 'kon' && !b.ozel && Math.abs(fotoX - b.x) < 12 && Math.random() < dt * 0.6) kalk(b, false);
        if (b.durum === 'yok') {
          if (gece < 0.5 && Math.random() < dt * 0.15) { const hx = yerler[i] + rnd(-6, 6); b.yol = { p0: [Math.random() < 0.5 ? -20 : 980, rnd(10, 50)], c1: [rnd(ara[0], ara[1]), rnd(10, 50)], c2: [hx + rnd(-40, 40), telY(hx) - 40], p1: [hx, telY(hx) - 2.4], sure: rnd(2, 3.2), uzak: false }; b.durum = 'uc'; b.t = 0; }
          if (b.gor) { b.gor = false; yaz(b.kg, 'opacity', '0'); }
          return;
        }
        if (!b.gor) { b.gor = true; yaz(b.kg, 'opacity', '1'); }
        let x: number, y: number, ucuyor = false;
        if (b.durum === 'uc' && b.yol) {
          b.t += dt; const u = clamp(b.t / b.yol.sure, 0, 1);
          [x, y] = bez(b.yol, ease(u));
          b.yon = bez(b.yol, ease(Math.min(1, u + 0.02)))[0] >= x ? 1 : -1;
          ucuyor = u < 0.97;
          if (u >= 1) { if (b.yol.uzak) b.durum = 'yok'; else { b.durum = 'kon'; b.x = x; b.sonraki = rnd(0.6, 3); b.ozel = b.yol.ozel ?? null; } }
        } else {
          b.sonraki -= dt;
          if (b.ozel) { b.ozel.kalan -= dt; if (b.ozel.kalan < 0) { kalk(b, false); } }
          if (b.sonraki < 0) {
            b.sonraki = rnd(0.8, 3.6);
            if (!b.ozel && Math.random() < 0.4) { b.zipT = 0; b.zipA = b.x; b.zipB = clamp(b.x + b.yon * rnd(4, 9), ara[0], ara[1]); } else b.yon = b.yon === 1 ? -1 : 1;
          }
          if (b.zipT >= 0) { b.zipT += dt / 0.22; b.x = lerp(b.zipA, b.zipB, ease(Math.min(1, b.zipT))); if (b.zipT >= 1) b.zipT = -1; }
          x = b.x; y = konY(b) - (b.zipT >= 0 ? Math.sin(Math.PI * b.zipT) * 3 : 0);
        }
        const d = b.yon, X = (dx: number) => f(x + dx * d);
        yaz(b.govde, 'd', oval(x, y - 2.8, 3.1, 2.4));
        yaz(b.bas, 'd', `M${X(0.8)} ${f(y - 5.4)} a2 1.8 0 0 1 ${f(3.6 * d)} 0Z`);
        yaz(b.gaga, 'd', `M${X(4.4)} ${f(y - 5)} L${X(6)} ${f(y - 4.6)} L${X(4.4)} ${f(y - 4.1)}Z`);
        yaz(b.kuyruk, 'd', `M${X(-2.4)} ${f(y - 2.6)} L${X(-6)} ${f(y - 0.8)}`);
        const fl = Math.sin(t * 34 + i) * 4;
        yaz(b.kanat, 'd', ucuyor ? `M${X(0)} ${f(y - 3.4)} L${X(-2)} ${f(y - 3.4 - fl)} M${X(0.6)} ${f(y - 3)} L${X(2.4)} ${f(y - 3 - fl * 0.8)}` : `M${X(-1.6)} ${f(y - 3.6)} Q${X(0.6)} ${f(y - 2.2)} ${X(-2.2)} ${f(y - 1.4)}`);
      });
    },
  };
}


// ==================================================================== guvercinler (yerde; aksam ucup gider, sabah doner)
export function guvercinKur(parent: SVGElement, yerler: number[], ara: [number, number], GROUND: number) {
  const g = el('g', {}, parent);
  type G = { x: number; y: number; yon: 1 | -1; durum: 'yer' | 'uc' | 'yok'; t: number; sonraki: number; gaga: number; gor: boolean; yol: null | { p0: Vec; c: Vec; p1: Vec; sure: number; gider: boolean }; kg: SVGGElement; govde: SVGPathElement; bas: SVGPathElement; boyun: SVGPathElement; ayak: SVGPathElement; kanat: SVGPathElement; kuyruk: SVGPathElement };
  /** topla(): bir noktanin cevresinde toplanirlar (bankta biri simit yerken); sure bitince yerlerine doner. */
  let topX = 0, topSure = 0;
  const alan = (): [number, number] => (topSure > 0 ? [topX - 34, topX + 34] : ara);
  const ks: G[] = yerler.map((x) => { const kg = el('g', {}, g); return { x, y: GROUND, yon: Math.random() < 0.5 ? -1 : 1, durum: 'yer', t: 0, sonraki: rnd(0.5, 2), gaga: 0, gor: true, yol: null, kg,
    kuyruk: pen(kg, SP * 0.7), govde: shape(kg, SP * 0.7), boyun: renk(el('path', {}, kg), 'guvercin'), bas: shape(kg, SP * 0.6), ayak: pen(kg, SP * 0.5), kanat: pen(kg, SP * 0.6) }; });
  const kalk = (b: G, mesafe = rnd(40, 80), yuk = rnd(40, 70), sure = rnd(1.1, 1.6), hedef?: number) => {
    const [a0, a1] = alan();
    const nx = hedef ?? clamp(b.x + (Math.random() < 0.5 ? -1 : 1) * mesafe, a0, a1);
    b.yol = { p0: [b.x, GROUND], c: [(b.x + nx) / 2, GROUND - yuk], p1: [nx, GROUND], sure, gider: false }; b.durum = 'uc'; b.t = 0;
  };
  /** Aksam: sahneden ucup gider. */
  const git = (b: G) => {
    const nx = b.x < (ara[0] + ara[1]) / 2 ? -40 : 1000;
    b.yol = { p0: [b.x, b.durum === 'uc' && b.yol ? b.y : GROUND], c: [(b.x + nx) / 2, rnd(30, 70)], p1: [nx, rnd(10, 50)], sure: rnd(2.4, 3.4), gider: true }; b.durum = 'uc'; b.t = 0;
  };
  return {
    kuslar: ks,
    kacir(x: number) { ks.forEach((b) => { if (b.durum === 'yer' && Math.abs(b.x - x) < 40) kalk(b); }); },
    /** Irkilme: yerdekiler kisa bir sicrayisla kanat cirpip hemen yanina konar. */
    irkil() { ks.forEach((b) => { if (b.durum === 'yer') kalk(b, rnd(3, 10), rnd(7, 12), rnd(0.4, 0.6)); }); },
    /** Yerdekiler x'in cevresine ucup `sure` sn orada gezinir (yem bekler), sonra eski alanlarina doner. */
    topla(x: number, sure: number) {
      topX = x; topSure = sure;
      ks.forEach((b, i) => { if (b.durum === 'yer') kalk(b, 0, rnd(20, 34), rnd(1, 1.5), x + [-26, -12, 12, 26][i % 4] + rnd(-4, 4)); });
    },
    ciz(t: number, dt: number, gece: number, yurur: number[]) {
      if (topSure > 0) { topSure -= dt; if (topSure <= 0) ks.forEach((b) => { if (b.durum === 'yer' && (b.x < ara[0] || b.x > ara[1])) kalk(b, 0, rnd(30, 50), rnd(1.2, 1.6), rnd(ara[0], ara[1])); }); }
      ks.forEach((b, i) => {
        if (gece > 0.5 && (b.durum === 'yer' || (b.durum === 'uc' && b.yol && !b.yol.gider))) git(b);
        if (b.durum === 'yok') {
          // sabah: biri uzaktan gelip konar
          if (gece < 0.4 && Math.random() < dt * 0.12) { const hx = yerler[i] + rnd(-10, 10), sx = Math.random() < 0.5 ? -30 : 990; b.yol = { p0: [sx, rnd(10, 50)], c: [(sx + hx) / 2, rnd(20, 60)], p1: [hx, GROUND], sure: rnd(2.2, 3), gider: false }; b.durum = 'uc'; b.t = 0; }
          if (b.gor) { b.gor = false; yaz(b.kg, 'opacity', '0'); }
          return;
        }
        if (!b.gor) { b.gor = true; yaz(b.kg, 'opacity', '1'); }
        if (b.durum === 'yer' && yurur.some((x) => Math.abs(x - b.x) < 22)) kalk(b);
        let x = b.x, y = GROUND, ucuyor = false;
        if (b.durum === 'uc' && b.yol) {
          b.t += dt; const u = clamp(b.t / b.yol.sure, 0, 1), a = 1 - u;
          x = a * a * b.yol.p0[0] + 2 * a * u * b.yol.c[0] + u * u * b.yol.p1[0];
          y = a * a * b.yol.p0[1] + 2 * a * u * b.yol.c[1] + u * u * b.yol.p1[1];
          b.y = y;
          b.yon = b.yol.p1[0] >= b.yol.p0[0] ? 1 : -1; ucuyor = u < 0.96;
          if (u >= 1) { if (b.yol.gider) { b.durum = 'yok'; return; } b.durum = 'yer'; b.x = x; b.y = GROUND; b.sonraki = rnd(0.6, 2); }
        } else {
          b.sonraki -= dt;
          if (b.sonraki < 0) { b.sonraki = rnd(0.5, 2.2); if (Math.random() < 0.5) b.gaga = 1; else { b.yon = b.yon === 1 ? -1 : 1; } }
          if (b.gaga > 0) { b.gaga = Math.max(0, b.gaga - dt * 2.4); }
          const [a0, a1] = alan(), disarida = b.x < a0 || b.x > a1;
          b.x = disarida ? b.x : clamp(b.x + b.yon * dt * 3 * (b.gaga > 0 ? 0 : 1), a0, a1);
          x = b.x;
        }
        const d = b.yon, X = (dx: number) => f(x + dx * d);
        const pk = Math.sin(Math.PI * b.gaga) * 3.4;
        yaz(b.govde, 'd', `M${X(-6)} ${f(y - 5)} Q${X(-1)} ${f(y - 10)} ${X(4)} ${f(y - 7.4)} Q${X(5)} ${f(y - 3)} ${X(1)} ${f(y - 2.6)} Q${X(-4)} ${f(y - 2.4)} ${X(-6)} ${f(y - 5)}Z`);
        yaz(b.boyun, 'd', `M${X(2.4)} ${f(y - 8.6)} Q${X(4.6)} ${f(y - 7)} ${X(4.4)} ${f(y - 5)} L${X(3)} ${f(y - 5.6)}Z`);
        yaz(b.bas, 'd', oval(x + 5 * d, y - 10.6 + pk, 1.9, 1.7) + ` M${X(6.8)} ${f(y - 10.6 + pk)} l${f(1.4 * d)} 0.6`);
        yaz(b.kuyruk, 'd', `M${X(-5.6)} ${f(y - 5.2)} L${X(-9)} ${f(y - 4.2)}`);
        yaz(b.ayak, 'd', ucuyor ? '' : `M${X(-0.6)} ${f(y - 2.6)} l0 2.6 M${X(1.4)} ${f(y - 2.6)} l0 2.6`);
        const fl = Math.sin(t * 30 + i) * 5;
        yaz(b.kanat, 'd', ucuyor ? `M${X(-1)} ${f(y - 8)} L${X(-4)} ${f(y - 8 - fl)} M${X(0.6)} ${f(y - 8)} L${X(3)} ${f(y - 8 - fl * 0.8)}` : `M${X(-4)} ${f(y - 6)} Q${X(-0.6)} ${f(y - 7.4)} ${X(2)} ${f(y - 5)}`);
      });
    },
  };
}

// ==================================================================== pervaneler (gece, fenerin cevresinde)
export function pervaneler(parent: SVGElement, cx: number, cy: number, adet = 3) {
  const ns = Array.from({ length: adet }, (_, i) => ({ n: blot(parent), a: rnd(0, 6), hiz: rnd(1.6, 2.8) * (i % 2 ? -1 : 1), r: rnd(6, 13), f: rnd(0, 6) }));
  let sonG = -1;
  return {
    ciz(t: number, gece: number) {
      const g = clamp((gece - 0.6) * 3, 0, 1);
      if (g === 0 && sonG === 0) return; // gorunmuyor: yazma
      ns.forEach((m) => {
        const r = m.r + Math.sin(t * 2.3 + m.f) * 3, a = t * m.hiz + m.a + Math.sin(t * 1.3 + m.f) * 0.6;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.7, k = 0.9 + Math.sin(t * 40 + m.f) * 0.5;
        yaz(m.n, 'd', `M${f(x - 1.6)} ${f(y - k)} L${f(x)} ${f(y)} L${f(x + 1.6)} ${f(y - k)} L${f(x)} ${f(y + 0.5)}Z`);
        if (g !== sonG) yaz(m.n, 'opacity', f(g));
      });
      sonG = g;
    },
  };
}
