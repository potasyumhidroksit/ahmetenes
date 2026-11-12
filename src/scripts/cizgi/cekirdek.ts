// Cizgi sahne cekirdegi — her cihazda ayni davranan ortak altyapi (line-art-animation kutuphanesinin ustunde).
//  - Uc katman (gok / statik / dinamik): statik mimari bir kez cizilir ve GPU dokusu olarak kalir; her karede
//    yalniz dinamik katman boyanir. Dar kapta (telefon) dunya CSS transform ile kaydirilir, viewBox degismez.
//  - Dokunma: tek dinleyici sahnenin tamaminda. Dokunulan noktaya EN YAKIN hedef tepki verir (parmak icin genis
//    pay); hedef yoksa ruzgar eser. Fare, parmak ve kalem ayni yoldan gecer. Dikey kaydirma tarayicida kalir
//    (touch-action: pan-y); yatay surukleme telefonda kamerayi kaydirir.
//  - Kalite: kare suresi olculur; yavas cihazda once murekkep titremesi kapanir, sonra 30 kare/sn'ye inilir.
//  - Saat: Istanbul saati, gun dogumu/batimi, mevsim, ay evresi. Deneme: ?saat=21.5 ?ay=1 ?kalite=2 ?debug
import { el, inkDefs, f, type Vec } from './ink';
import { clamp, lerp } from './motion';

export type Mevsim = 'kis' | 'ilkbahar' | 'yaz' | 'sonbahar';
export interface Zaman {
  saat: number; dakika: number; ay: number; haftaGunu: number;
  /** 0 gunduz … 1 gece; alacakaranlikta yumusak gecer. */
  karanlik: number;
  /** Gunduz: 0 dogum … 1 batim. Gece: 0 batim … 1 dogum (ay icin). */
  yol: number; gunduz: boolean;
  mevsim: Mevsim;
  /** 0 yeni ay … 0.5 dolunay … 1 */
  ayEvresi: number;
}
export interface Hedef {
  ad: string;
  /** Sahne koordinatinda merkez; gorunmuyorsa null. */
  yer(): Vec | null;
  /** Hedefin kendi yaricapi (sahne birimi). */
  r?: number;
  /** Cakismada one gecme (kisiler pencerelerden once). */
  oncelik?: number;
  /** Bu hedef icin dokunma payi (CSS px); verilmezse parmakta 34, farede 12. Sik dizilmis kucuk hedeflerde dar tutulur. */
  pay?: number;
  dokun(): void;
}
export interface Ruzgar { deger: number; es(yon: number, guc?: number): void }
export interface Cekirdek {
  W: number; H: number;
  /** Bu ornege ozgu on ek (ayni sayfada birden cok sahne olabilir): degrade/filtre kimlikleri icin. */
  kimlik: string;
  /** Dokunma halkasi (sahne koordinati). */
  dalga(p: Vec): void;
  gok: SVGGElement; statik: SVGGElement; dinamik: SVGGElement;
  /** Katman <defs>'leri: [gok, statik, dinamik] */
  tanimlar: SVGDefsElement[];
  /** Dinamik katmanin cizgili deseni (hasta pijamasi). */
  cizgili: string;
  ruzgar: Ruzgar;
  hedef(h: Hedef): void;
  zaman(): Zaman;
  /** Zaman her degistiginde (20 sn'de bir ya da ayarla ile) artar. */
  surum(): number;
  /** Deneme ayari: 'saat', 'ay', 'ara' gibi sorgu anahtarlarini calisirken degistirir (null = gercek degere don). */
  ayarla(anahtar: string, deger: string | null): void;
  kalite(): number;
  dar(): boolean;
  sorgu: URLSearchParams;
  basla(ciz: (t: number, dt: number) => void, odak: () => number | null): void;
}

// Ay basina kabaca gun dogumu / batimi (Istanbul, UTC+3, yaz saati yok).
const GUN: Array<[number, number]> = [[8.4, 17.1], [8.0, 17.7], [7.3, 18.3], [6.6, 19.8], [6.0, 20.2], [5.6, 20.6], [5.8, 20.5], [6.3, 20.0], [6.8, 19.3], [7.3, 18.5], [7.9, 17.0], [8.3, 16.8]];
const MEVSIM: Mevsim[] = ['kis', 'kis', 'ilkbahar', 'ilkbahar', 'ilkbahar', 'yaz', 'yaz', 'yaz', 'sonbahar', 'sonbahar', 'sonbahar', 'kis'];
const GUNLER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const yumusak = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

export function zamanHesapla(sorgu: URLSearchParams, simdi = new Date()): Zaman {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', month: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(simdi);
  const al = (t: string) => p.find((x) => x.type === t)?.value ?? '0';
  let saat = Number(al('hour')) + Number(al('minute')) / 60;
  let ay = Number(al('month')) - 1;
  if (sorgu.has('saat')) saat = Number(sorgu.get('saat'));
  if (sorgu.has('ay')) ay = clamp(Number(sorgu.get('ay')) - 1, 0, 11);
  const [dog, bat] = GUN[ay];
  // alacakaranlik: batimdan 25 dk once baslar, 30 dk sonra tam gece; dogumda tersi
  const karanlik = Math.max(yumusak(bat - 0.42, bat + 0.5, saat), 1 - yumusak(dog - 0.5, dog + 0.42, saat));
  const gunduz = saat >= dog && saat < bat;
  const geceUzun = 24 - bat + dog;
  const yol = gunduz ? (saat - dog) / (bat - dog) : (saat >= bat ? saat - bat : saat + 24 - bat) / geceUzun;
  const gunSayisi = (simdi.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return { saat, dakika: Math.floor((saat % 1) * 60 + 1e-6), ay, haftaGunu: Math.max(0, GUNLER.indexOf(al('weekday'))), karanlik, yol, gunduz, mevsim: MEVSIM[ay], ayEvresi: ((gunSayisi / 29.53059) % 1 + 1) % 1 };
}

declare global { interface Window { __step?: (seconds?: number) => number; __sahne?: Record<string, unknown> } }
let ornekSayisi = 0;

export function cekirdek(stage: HTMLElement, o: { ad: string; W: number; H: number; kamY: number; etiket: string }): Cekirdek {
  const { W, H } = o;
  const kimlik = ++ornekSayisi === 1 ? o.ad : `${o.ad}-${ornekSayisi}`;
  const sorgu = new URLSearchParams(location.search);
  const debug = sorgu.has('debug');
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', o.etiket);
  if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
  stage.style.overflow = 'hidden';
  stage.style.touchAction = 'pan-y';
  stage.style.userSelect = 'none';
  stage.style.setProperty('-webkit-user-select', 'none');
  stage.style.setProperty('-webkit-tap-highlight-color', 'transparent');
  stage.style.setProperty('-webkit-touch-callout', 'none');

  const dunya = document.createElement('div');
  dunya.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:100%;transform-origin:0 0;will-change:transform;';
  stage.appendChild(dunya);
  const tanimlar: SVGDefsElement[] = [];
  const filtreler: string[] = [];
  let cizgili = '';
  const katman = (ek: string): { svg: SVGSVGElement; kok: SVGGElement } => {
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMax meet', 'aria-hidden': 'true', focusable: 'false' });
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;color:inherit;transform:translateZ(0);';
    const d = inkDefs(svg, `${kimlik}-${ek}`);
    // Filtre alani kutuya gore degil sahneye gore: WebKit sifir yukseklikli (yatay) cizgileri kutuya katmiyor ve
    // alt kenardaki yol cizgilerini kirpiyordu. Sabit alan her karede kutu hesabini da kaldirir.
    const flt = d.defs.querySelector('filter');
    if (flt) { flt.setAttribute('filterUnits', 'userSpaceOnUse'); flt.setAttribute('x', '-24'); flt.setAttribute('y', '-24'); flt.setAttribute('width', String(W + 48)); flt.setAttribute('height', String(H + 48)); }
    el('style', {}, d.defs).textContent = '.pp{fill:var(--paper)}';
    tanimlar.push(d.defs); filtreler.push(d.filter);
    if (ek === 'd') cizgili = d.stripes;
    dunya.appendChild(svg);
    const kok = el('g', {}, svg);
    // WebKit filtre kaynagini grubun geometri kutusuna kirpiyor (cizgi kalinligi dahil degil): kutunun en altindaki
    // yatay yol cizgileri kayboluyordu. Gorunmez bir cerceve kutuyu butun sahneye yayar.
    el('rect', { x: -12, y: -12, width: W + 24, height: H + 24, fill: 'none' }, kok);
    return { svg, kok };
  };
  const kGok = katman('g'), kStatik = katman('s'), kDinamik = katman('d');
  kStatik.kok.setAttribute('filter', filtreler[1]);
  const svgler = [kGok.svg, kStatik.svg, kDinamik.svg];

  // ---------------------------------------------------------------- kalite
  const kaba = matchMedia('(pointer: coarse)').matches;
  // Dokunmatik cihazlarda, az cekirdekli makinelerde ve Safari'de (SVG filtresi islemcide calisir) kisilerin
  // murekkep titremesi bastan kapalidir; mimarideki titreme (bir kez cizilen statik katman) her yerde kalir.
  const elma = /Apple/.test(navigator.vendor || '');
  let kalite = sorgu.has('kalite') ? clamp(Number(sorgu.get('kalite')), 0, 2) : (kaba || elma || (navigator.hardwareConcurrency || 8) <= 4 ? 1 : 0);
  const kaliteUygula = () => { if (kalite === 0) kDinamik.kok.setAttribute('filter', filtreler[2]); else kDinamik.kok.removeAttribute('filter'); };
  kaliteUygula();

  // ---------------------------------------------------------------- yerlesim: tam gorunum ya da kamera
  let dar = false, olcek = 1, kayX = 0, kayY = 0, vw = W, vbY = 0, kamX = 0, kamHiz = 0, elSon = -99, ilkKamera = true;
  const yerles = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    // Kamera kipi kabin bicimine gore: kap sahneden belirgin bicimde daha dikse (telefon icin CSS'te verilen oran)
    // dunya yakinlasir ve kaydirilir. Esik genislik degil oran oldugu icin kirilim noktasini yalniz CSS belirler.
    dar = w / h < (W / H) * 0.75;
    if (dar) {
      vbY = o.kamY; const vbH = H - vbY;
      olcek = h / vbH; vw = Math.min(W, w / olcek); kayX = 0; kayY = 0;
      dunya.style.width = `${f(W * olcek)}px`;
      svgler.forEach((s) => s.setAttribute('viewBox', `0 ${vbY} ${W} ${vbH}`));
      kamX = clamp(kamX, 0, W - vw);
    } else {
      vbY = 0; olcek = Math.min(w / W, h / H); vw = W; kamX = 0;
      kayX = (w - W * olcek) / 2; kayY = h - H * olcek;
      dunya.style.width = '100%'; dunya.style.transform = '';
      svgler.forEach((s) => s.setAttribute('viewBox', `0 0 ${W} ${H}`));
    }
  };
  yerles();
  new ResizeObserver(yerles).observe(stage);
  const sahneye = (cx: number, cy: number): Vec => {
    const r = stage.getBoundingClientRect();
    return dar ? [(cx - r.left) / olcek + kamX, vbY + (cy - r.top) / olcek] : [(cx - r.left - kayX) / olcek, (cy - r.top - kayY) / olcek];
  };
  const ekrana = (p: Vec): Vec => {
    const r = stage.getBoundingClientRect();
    return dar ? [r.left + (p[0] - kamX) * olcek, r.top + (p[1] - vbY) * olcek] : [r.left + kayX + p[0] * olcek, r.top + kayY + p[1] * olcek];
  };

  // ---------------------------------------------------------------- ruzgar
  let hedefRuzgar = 0.12, t = 0;
  const ruzgar: Ruzgar = { deger: 0.12, es(yon, guc = 1.6) { hedefRuzgar = clamp(hedefRuzgar + yon * guc, -2.6, 2.6); } };

  // ---------------------------------------------------------------- dokunma
  const hedefler: Hedef[] = [];
  const dalgalar = Array.from({ length: 4 }, () => ({ n: el('circle', { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.1, opacity: 0, r: 0 }), yas: 9 }));
  let sonDokunus: { ad: string; t: number } | null = null;
  const dalga = (p: Vec) => { const d = dalgalar.reduce((a, b) => (b.yas > a.yas ? b : a)); d.yas = 0; d.n.setAttribute('cx', f(p[0])); d.n.setAttribute('cy', f(p[1])); };
  const enYakin = (s: Vec, pay: number): Hedef | null => {
    let iyi: Hedef | null = null, puan = Infinity;
    for (const h of hedefler) {
      const p = h.yer(); if (!p) continue;
      const kenar = Math.hypot(p[0] - s[0], p[1] - s[1]) * olcek - (h.r ?? 0) * olcek;
      if (kenar > (h.pay ?? pay)) continue;
      const pn = kenar - (h.oncelik ?? 0) * 14;
      if (pn < puan) { puan = pn; iyi = h; }
    }
    return iyi;
  };
  const dokunus = (cx: number, cy: number, parmak: boolean) => {
    const s = sahneye(cx, cy);
    const h = enYakin(s, parmak ? 34 : 12);
    if (h) {
      h.dokun(); dalga(h.yer() ?? s); sonDokunus = { ad: h.ad, t };
      if (parmak) { try { navigator.vibrate?.(8); } catch { /* yoksay */ } }
    }
    else { ruzgar.es(s[0] < kamX + vw / 2 ? 1 : -1, 1.7); dalga(s); sonDokunus = { ad: 'ruzgar', t }; }
  };
  let basili: { id: number; x0: number; y0: number; x: number; t0: number; kay: boolean } | null = null;
  let fareX: number | null = null, fareT = 0, imlecT = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    basili = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t0: performance.now(), kay: false };
    kamHiz = 0;
  });
  stage.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (basili && e.pointerId === basili.id) {
      const tx = e.clientX - basili.x0, ty = e.clientY - basili.y0;
      if (!basili.kay && Math.abs(tx) > 8 && Math.abs(tx) > Math.abs(ty)) { basili.kay = true; try { stage.setPointerCapture(e.pointerId); } catch { /* yoksay */ } }
      if (basili.kay) {
        const dx = e.clientX - basili.x;
        if (dar) { kamX = clamp(kamX - dx / olcek, 0, W - vw); kamHiz = lerp(kamHiz, clamp(-dx / olcek / Math.max(0.008, (now - fareT) / 1000), -1100, 1100), 0.5); elSon = t; }
        ruzgar.es(Math.sign(dx), Math.min(0.5, Math.abs(dx) * 0.02));
      }
      basili.x = e.clientX; fareT = now;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    // fare gezinmesi: ruzgar + hedef ustunde el imleci
    if (fareX !== null) ruzgar.es(Math.sign(e.clientX - fareX), Math.min(0.35, (Math.abs(e.clientX - fareX) / Math.max(8, now - fareT)) * 0.8));
    fareX = e.clientX; fareT = now;
    if (now - imlecT > 90) { imlecT = now; stage.style.cursor = enYakin(sahneye(e.clientX, e.clientY), 12) ? 'pointer' : ''; }
  });
  const birak = (e: PointerEvent, iptal: boolean) => {
    if (!basili || e.pointerId !== basili.id) return;
    const b = basili; basili = null;
    if (iptal) return;
    if (b.kay) { if (dar) { elSon = t; if (performance.now() - fareT > 80) kamHiz = 0; } return; } // parmak durup kalktiysa savrulma yok
    if (performance.now() - b.t0 < 700 && Math.hypot(e.clientX - b.x0, e.clientY - b.y0) < 12) dokunus(e.clientX, e.clientY, e.pointerType !== 'mouse');
  };
  stage.addEventListener('pointerup', (e) => birak(e, false));
  stage.addEventListener('pointercancel', (e) => birak(e, true));
  stage.addEventListener('pointerleave', () => { fareX = null; stage.style.cursor = ''; if (basili && !basili.kay) basili = null; });

  // ---------------------------------------------------------------- zaman (20 sn'de bir yenilenir)
  let zmn = zamanHesapla(sorgu), zmnT = 0, surum = 0;

  // ---------------------------------------------------------------- dongu
  let gorunur = true, kareMs = 16.7, yavasSayac = 0, atla = false;
  new IntersectionObserver(([e]) => { gorunur = e.isIntersecting; }).observe(stage);

  const c: Cekirdek = {
    W, H, kimlik, dalga, gok: kGok.kok, statik: kStatik.kok, dinamik: kDinamik.kok, tanimlar, cizgili, ruzgar, sorgu,
    hedef(h) { hedefler.push(h); },
    zaman: () => zmn,
    surum: () => surum,
    ayarla(anahtar, deger) { if (deger === null) sorgu.delete(anahtar); else sorgu.set(anahtar, deger); zmn = zamanHesapla(sorgu); zmnT = t; surum++; },
    kalite: () => kalite,
    dar: () => dar,
    basla(ciz, odak) {
      dalgalar.forEach((d) => kDinamik.kok.appendChild(d.n)); // en ustte
      const adim = (dt: number) => {
        t += dt;
        if (t - zmnT > 20) { zmnT = t; zmn = zamanHesapla(sorgu); surum++; }
        hedefRuzgar = lerp(hedefRuzgar, 0.12 + 0.25 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.67), 1 - Math.exp(-dt * 0.7));
        ruzgar.deger = lerp(ruzgar.deger, hedefRuzgar, 1 - Math.exp(-dt * 3));
        ciz(t, dt);
        for (const d of dalgalar) {
          if (d.yas > 0.6) { if (d.yas < 9) { d.n.setAttribute('opacity', '0'); d.yas = 9; } continue; }
          d.yas += dt; d.n.setAttribute('r', f(3 + d.yas * 46)); d.n.setAttribute('opacity', f(Math.max(0, 0.7 * (1 - d.yas / 0.6))));
        }
        if (dar) {
          // kamera: el degmediyse odagi izler; suruklemeden sonra bir sure bekler
          if (basili?.kay) { /* parmak surukluyor */ }
          else if (t - elSon < 4) { kamX = clamp(kamX + kamHiz * dt, 0, W - vw); kamHiz *= Math.exp(-dt * 4); }
          else {
            const ox = odak();
            if (ox !== null) {
              const hdf = clamp(ox - vw * 0.45, 0, W - vw);
              if (ilkKamera) { kamX = hdf; ilkKamera = false; }
              else kamX += clamp((hdf - kamX) * Math.min(1, dt * 2.6), -300 * dt, 300 * dt);
            }
          }
          dunya.style.transform = `translate3d(${f(-kamX * olcek)}px,0,0)`;
        }
      };
      window.__sahne = window.__sahne || {};
      window.__sahne[kimlik] = {
        t: () => t, kalite: () => kalite, kareMs: () => kareMs, dar: () => dar, kamX: () => kamX, ruzgar: () => ruzgar.deger, son: () => sonDokunus,
        zaman: () => zmn,
        hedefler: () => hedefler.map((h) => { const p = h.yer(); if (!p) return null; const e = ekrana(p); return { ad: h.ad, x: e[0], y: e[1], r: (h.r ?? 0) * olcek, pay: h.pay ?? null }; }).filter(Boolean),
      };
      if (debug) {
        adim(1 / 60);
        window.__step = (s = 1) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) adim(1 / 60); return t; };
        return;
      }
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // hareket azaltilmis: sahne birkac saniye ileri sarilir ve tek, dolu bir kare olarak kalir
        for (let i = 0; i < 300; i++) adim(1 / 30);
        return;
      }
      adim(1 / 60); // ilk kare hemen: tarayici ilk rAF'i gec verse de (yukleme sirasinda) sahne eksiksiz gorunur
      let onceki = 0;
      const kare = (now: number) => {
        requestAnimationFrame(kare);
        if (!onceki) { onceki = now; return; }
        const ham = now - onceki; onceki = now;
        if (!gorunur) return;
        // kalite: uzun sure yavas giderse bir kademe dus (yukseltme yok, salinmasin)
        if (ham < 250) {
          kareMs = kareMs * 0.95 + ham * 0.05;
          yavasSayac = kareMs > 24 ? yavasSayac + ham : 0; // yavas gecen sure (ms)
          if (yavasSayac > 1500 && kalite < 2) { kalite++; kaliteUygula(); yavasSayac = 0; kareMs = 16.7; }
        }
        if (kalite === 2) { atla = !atla; if (atla) { onceki -= ham; return; } }
        adim(Math.min(0.1, ham / 1000));
      };
      requestAnimationFrame(kare);
    },
  };
  return c;
}
