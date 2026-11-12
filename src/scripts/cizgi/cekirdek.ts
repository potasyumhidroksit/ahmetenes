// Cizgi sahne cekirdegi — her cihazda ayni davranan ortak altyapi (line-art-animation kutuphanesinin ustunde).
//  - Uc katman (gok / statik / dinamik): statik mimari bir kez cizilir ve GPU dokusu olarak kalir; her karede
//    yalniz dinamik katman boyanir. Dar kapta (telefon) dunya CSS transform ile kaydirilir, viewBox degismez.
//  - Dokunma: tek dinleyici sahnenin tamaminda. Dokunulan noktaya EN YAKIN hedef tepki verir (parmak icin genis
//    pay); hedef yoksa ruzgar eser. Fare, parmak ve kalem ayni yoldan gecer. Dikey kaydirma tarayicida kalir
//    (touch-action: pan-y); yatay surukleme telefonda kamerayi kaydirir.
//  - Klavye: sahne odaklanabilir; ←/→ hedefler arasinda gezer, Enter/Bosluk dokunur, Esc birakir.
//  - Kalite: kare suresi olculur; yavas cihazda once murekkep titremesi kapanir, sonra 30 kare/sn'ye inilir
//    (sureye gore: ekrani 30 Hz'e kisilmis cihazda kare atlanmaz). Uzun sure iyi giderse bir kademe geri cikar.
//  - Dongu yalniz sahne gorunurken doner (gizli sayfa, ekran disi, arka plan sekmesi: rAF durur).
//  - Saat: Istanbul duvar saati; gun dogumu/batimi gune gore hesaplanir; mevsim, ay evresi.
//    Deneme: ?saat=21.5 ?tarih=2026-12-24 ?ay=1 ?kalite=2 ?debug
import { el, inkDefs, f, type Vec } from './ink';
import { clamp, lerp } from './motion';

export type Mevsim = 'kis' | 'ilkbahar' | 'yaz' | 'sonbahar';
export interface Zaman {
  saat: number; dakika: number; ay: number;
  /** 0 Pazar … 6 Cumartesi. */
  haftaGunu: number;
  /** Ayin gunu (1–31), yilin gunu (1–366) ve YYYY-AA-GG; hepsi Istanbul'a gore. */
  gun: number; yilGunu: number; tarih: string;
  /** Gun dogumu ve batimi (ondalik saat, Istanbul). */
  dogum: number; batim: number;
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
  /** false: klavye gezintisine girmez (onlarca pencere gibi sik hedefler). */
  klavye?: boolean;
  /** Klavyeyle secilince ekran okuyucuya soylenen kisa ad ("kedi", "saat kulesi"). */
  etiket?: string;
  dokun(): void;
}
export interface Ruzgar { deger: number; es(yon: number, guc?: number): void }
export interface Cekirdek {
  W: number; H: number;
  /** Bu ornege ozgu on ek (ayni sayfada birden cok sahne olabilir): degrade/filtre kimlikleri icin. */
  kimlik: string;
  /** Ince halka (sahne koordinati). Dokunuslarda cikmaz; sahne ilk ipucu icin kullanir. */
  dalga(p: Vec): void;
  /** Bos yere dokunuldugunda cagrilir (nokta, ruzgar yonu ±1): sahne yaprak savurabilir. */
  bosDokunus(fn: (p: Vec, yon: number) => void): void;
  gok: SVGGElement; statik: SVGGElement; dinamik: SVGGElement;
  /** Katman <defs>'leri: [gok, statik, dinamik] */
  tanimlar: SVGDefsElement[];
  /** Dinamik katmanin cizgili deseni (hasta pijamasi). */
  cizgili: string;
  ruzgar: Ruzgar;
  hedef(h: Hedef): void;
  zaman(): Zaman;
  /** Zaman her yenilendiginde (20 sn'de bir, sahne yeniden gorununce ya da ayarla ile) artar. */
  surum(): number;
  /** Deneme ayari: 'saat', 'tarih', 'ay', 'ara' gibi sorgu anahtarlarini calisirken degistirir (null = gercek degere don). */
  ayarla(anahtar: string, deger: string | null): void;
  kalite(): number;
  dar(): boolean;
  sorgu: URLSearchParams;
  basla(ciz: (t: number, dt: number) => void, odak: () => number | null): void;
  /** Sahneyi soker: dongu, gozlemciler, dinleyiciler ve DOM. */
  kapat(): void;
}

const MEVSIM: Mevsim[] = ['kis', 'kis', 'ilkbahar', 'ilkbahar', 'ilkbahar', 'yaz', 'yaz', 'yaz', 'sonbahar', 'sonbahar', 'sonbahar', 'kis'];
const GUNLER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const yumusak = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const iki = (n: number) => String(n).padStart(2, '0');

/** Gun dogumu ve batimi (ondalik saat, UTC+3): NOAA yaklasik formulu, Istanbul (41,01 K; 28,98 D). */
export function gunesSaatleri(yilGunu: number): [number, number] {
  const g = (2 * Math.PI / 365) * (yilGunu - 1);
  const denklem = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const egim = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const enlem = 41.01 * Math.PI / 180;
  const aci = Math.acos(Math.cos(90.833 * Math.PI / 180) / (Math.cos(enlem) * Math.cos(egim)) - Math.tan(enlem) * Math.tan(egim)) * 180 / Math.PI;
  const ogle = 720 - 4 * 28.98 - denklem + 180; // dakika, UTC+3
  return [(ogle - 4 * aci) / 60, (ogle + 4 * aci) / 60];
}

export function zamanHesapla(sorgu: URLSearchParams, simdi = new Date()): Zaman {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(simdi);
  const al = (t: string) => p.find((x) => x.type === t)?.value ?? '0';
  let saat = Number(al('hour')) + Number(al('minute')) / 60;
  let yil = Number(al('year')), ay = Number(al('month')) - 1, gun = Number(al('day'));
  let haftaGunu = Math.max(0, GUNLER.indexOf(al('weekday')));
  let ayAni = simdi.getTime();
  if (sorgu.has('saat')) saat = Number(sorgu.get('saat'));
  const tarih = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(sorgu.get('tarih') ?? '');
  if (tarih) { yil = Number(tarih[1]); ay = clamp(Number(tarih[2]) - 1, 0, 11); gun = clamp(Number(tarih[3]), 1, 31); }
  else if (sorgu.has('ay')) { ay = clamp(Number(sorgu.get('ay')) - 1, 0, 11); gun = 15; }
  if (tarih || sorgu.has('ay')) { haftaGunu = new Date(Date.UTC(yil, ay, gun)).getUTCDay(); ayAni = Date.UTC(yil, ay, gun, saat - 3); }
  const yilGunu = Math.round((Date.UTC(yil, ay, gun) - Date.UTC(yil, 0, 0)) / 86400000);
  const [dog, bat] = gunesSaatleri(yilGunu);
  // alacakaranlik: batimdan 25 dk once baslar, 30 dk sonra tam gece; dogumda tersi
  const karanlik = Math.max(yumusak(bat - 0.42, bat + 0.5, saat), 1 - yumusak(dog - 0.5, dog + 0.42, saat));
  const gunduz = saat >= dog && saat < bat;
  const geceUzun = 24 - bat + dog;
  const yol = gunduz ? (saat - dog) / (bat - dog) : (saat >= bat ? saat - bat : saat + 24 - bat) / geceUzun;
  const gunSayisi = (ayAni - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return {
    saat, dakika: Math.floor((saat % 1) * 60 + 1e-6), ay, haftaGunu, gun, yilGunu, tarih: `${yil}-${iki(ay + 1)}-${iki(gun)}`,
    dogum: dog, batim: bat, karanlik, yol, gunduz, mevsim: MEVSIM[ay], ayEvresi: ((gunSayisi / 29.53059) % 1 + 1) % 1,
  };
}

/** Gune ozgu tohum: ayni gun ayni, ertesi gun farkli (hava, gunun olaylari). `tuz` ile ayri diziler alinir. */
export function gunTohumu(z: Zaman, tuz = ''): number {
  let h = 2166136261;
  for (const ch of z.tarih + tuz) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

declare global { interface Window { __step?: (seconds?: number) => number; __sahne?: Record<string, unknown> } }
let ornekSayisi = 0;
/** ?debug: sayfadaki butun sahnelerin adimlayicilari (window.__step hepsini birlikte ilerletir). */
const adimcilar = new Map<string, (s?: number) => number>();

export function cekirdek(stage: HTMLElement, o: { ad: string; W: number; H: number; kamY: number; etiket: string }): Cekirdek {
  const { W, H } = o;
  const kimlik = ++ornekSayisi === 1 ? o.ad : `${o.ad}-${ornekSayisi}`;
  const sorgu = new URLSearchParams(location.search);
  const debug = sorgu.has('debug');
  const iptal = new AbortController();
  const dinle = { signal: iptal.signal };
  // Sahne bir resimden fazlasi: odaklanilir ve klavyeyle gezilir. "group" icindeki canli bolge secilen hedefi soyler.
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', o.etiket);
  stage.tabIndex = 0;
  if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
  stage.style.overflow = 'hidden';
  stage.style.touchAction = 'pan-y pinch-zoom'; // dikey kaydirma ve iki parmakla yakinlastirma tarayicida kalir
  stage.style.userSelect = 'none';
  stage.style.setProperty('-webkit-user-select', 'none');
  stage.style.setProperty('-webkit-tap-highlight-color', 'transparent');
  stage.style.setProperty('-webkit-touch-callout', 'none');

  const dunya = document.createElement('div');
  dunya.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:100%;transform-origin:0 0;will-change:transform;';
  stage.appendChild(dunya);
  const soyle = document.createElement('span');
  soyle.setAttribute('aria-live', 'polite');
  soyle.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;';
  stage.appendChild(soyle);
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
  const kaliteSabit = sorgu.has('kalite');
  const tabanKalite = kaba || elma || (navigator.hardwareConcurrency || 8) <= 4 ? 1 : 0;
  let kalite = kaliteSabit ? clamp(Number(sorgu.get('kalite')), 0, 2) : tabanKalite;
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
  const boyutGozcu = new ResizeObserver(yerles);
  boyutGozcu.observe(stage);
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
  const dalgalar = Array.from({ length: 2 }, () => ({ n: el('circle', { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.1, opacity: 0, r: 0 }), yas: 9 }));
  // Bos yere dokunma: halka yerine ruzgar yonunde kayip sonen birkac kivrik cizgi.
  const esintiler = Array.from({ length: 5 }, () => ({ n: el('path', { d: 'M0 0C6 -3.2 12 -3.2 18 0S27 3.6 31 .4', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: 0 }), yas: 9, x: 0, y: 0, yon: 1, hiz: 60, omur: 0.8 }));
  const odakHalka = el('circle', { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-dasharray': '3.5 3', opacity: 0, r: 0 });
  let sonDokunus: { ad: string; t: number } | null = null;
  let bosDinleyici: ((p: Vec, yon: number) => void) | null = null;
  const dalga = (p: Vec) => { const d = dalgalar.reduce((a, b) => (b.yas > a.yas ? b : a)); d.yas = 0; d.n.setAttribute('cx', f(p[0])); d.n.setAttribute('cy', f(p[1])); };
  const esinti = (p: Vec, yon: number) => {
    esintiler.slice(0, 4).forEach((e, i) => {
      e.yas = -i * 0.07; e.yon = yon; e.omur = 0.7 + Math.random() * 0.35; e.hiz = 46 + Math.random() * 40;
      e.x = p[0] - yon * (16 + Math.random() * 14); e.y = p[1] + (i - 1.5) * 7 + (Math.random() - 0.5) * 4;
    });
  };
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
  // Hareket azaltilmissa dongu donmez: tepki, sahne biraz ileri sarilip tek kare cizilerek gosterilir.
  let durgunIlerlet: ((sn: number) => void) | null = null, durgunSayac = 0;
  const tepkiGoster = () => {
    if (!durgunIlerlet) return;
    durgunIlerlet(0.6);
    clearTimeout(durgunSayac);
    durgunSayac = window.setTimeout(() => durgunIlerlet?.(4), 2600); // jest bitsin, sahne yine dinlenme karesinde kalsin
  };
  const bosaDokun = (s: Vec) => {
    const yon = s[0] < kamX + vw / 2 ? 1 : -1;
    ruzgar.es(yon, 1.7); esinti(s, yon); bosDinleyici?.(s, yon); sonDokunus = { ad: 'ruzgar', t };
  };
  const dokunus = (cx: number, cy: number, parmak: boolean) => {
    const s = sahneye(cx, cy);
    const h = enYakin(s, parmak ? 34 : 12);
    if (h) {
      h.dokun(); sonDokunus = { ad: h.ad, t };
      if (parmak) { try { navigator.vibrate?.(8); } catch { /* yoksay */ } }
    } else bosaDokun(s);
    tepkiGoster();
  };
  let basili: { id: number; x0: number; y0: number; x: number; t0: number; kay: boolean } | null = null;
  let fareX: number | null = null, fareT = 0, imlecT = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    basili = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t0: performance.now(), kay: false };
    kamHiz = 0;
  }, dinle);
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
  }, dinle);
  const birak = (e: PointerEvent, vazgec: boolean) => {
    if (!basili || e.pointerId !== basili.id) return;
    const b = basili; basili = null;
    if (vazgec) return;
    if (b.kay) { if (dar) { elSon = t; if (performance.now() - fareT > 80) kamHiz = 0; } return; } // parmak durup kalktiysa savrulma yok
    if (performance.now() - b.t0 < 700 && Math.hypot(e.clientX - b.x0, e.clientY - b.y0) < 12) dokunus(e.clientX, e.clientY, e.pointerType !== 'mouse');
  };
  stage.addEventListener('pointerup', (e) => birak(e, false), dinle);
  stage.addEventListener('pointercancel', (e) => birak(e, true), dinle);
  stage.addEventListener('pointerleave', () => { fareX = null; stage.style.cursor = ''; if (basili && !basili.kay) basili = null; }, dinle);

  // ---------------------------------------------------------------- klavye: ←/→ hedefler arasinda, Enter/Bosluk dokunur
  let secili: Hedef | null = null;
  const sec = (h: Hedef | null) => { secili = h; soyle.textContent = h?.etiket ?? ''; if (h) elSon = -99; };
  stage.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') { if (secili) { sec(null); e.preventDefault(); } return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (secili?.yer()) { secili.dokun(); sonDokunus = { ad: secili.ad, t }; }
      else bosaDokun([kamX + vw / 2 + (Math.random() - 0.5) * vw * 0.5, H * 0.45]);
      tepkiGoster();
      return;
    }
    const yon = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!yon && e.key !== 'Home' && e.key !== 'End') return;
    const sira = hedefler.filter((h) => h.klavye !== false).map((h) => ({ h, p: h.yer() })).filter((x): x is { h: Hedef; p: Vec } => !!x.p).sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
    if (!sira.length) return;
    e.preventDefault();
    const i = sira.findIndex((x) => x.h === secili);
    const yeni = e.key === 'Home' ? 0 : e.key === 'End' ? sira.length - 1 : i < 0 ? (yon > 0 ? 0 : sira.length - 1) : (i + yon + sira.length) % sira.length;
    sec(sira[yeni].h);
    if (durgunIlerlet) durgunIlerlet(1 / 30);
  }, dinle);
  stage.addEventListener('blur', () => sec(null), dinle);

  // ---------------------------------------------------------------- zaman: duvar saatine bagli (sahne gizliyken de ilerler)
  let zmn = zamanHesapla(sorgu), zmnDuvar = Date.now(), surum = 0;
  const zamanYenile = () => { zmn = zamanHesapla(sorgu); zmnDuvar = Date.now(); surum++; };

  // ---------------------------------------------------------------- dongu: yalniz gorunurken doner
  let gorunur = true, kareMs = 16.7, yavasMs = 0, iyiMs = 0, yukseltme = 0, rafId = 0, calisiyor = false, kuruldu = false;
  let onceki = 0, sonCizim = 0, basT = 0;
  let adim: (dt: number) => void = () => {};
  const azaltMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const uygun = () => gorunur && document.visibilityState === 'visible';
  const kare = (now: number) => {
    rafId = requestAnimationFrame(kare);
    if (!onceki) { onceki = sonCizim = basT = now; return; }
    const ham = now - onceki; onceki = now;
    // Kalite: ilk 3 sn (yukleme, sekmeye donus) sayilmaz. Uzun sure yavassa bir kademe duser; uzun sure iyi giderse
    // geri cikar (her cikista bekleme iki katina cikar, en cok uc kez: salinmasin).
    if (!kaliteSabit && ham < 250 && now - basT > 3000) {
      kareMs = kareMs * 0.95 + ham * 0.05;
      if (kareMs > 24) { yavasMs += ham; iyiMs = 0; } else { yavasMs = 0; iyiMs += ham; }
      if (yavasMs > 1500 && kalite < 2) { kalite++; kaliteUygula(); yavasMs = 0; kareMs = 16.7; }
      else if (kalite > tabanKalite && yukseltme < 3 && kareMs < 19 && iyiMs > 30000 * 2 ** yukseltme) { kalite--; yukseltme++; kaliteUygula(); iyiMs = 0; }
    }
    // 30 kare/sn kademesi sureye gore: 60 Hz'te iki karede bir cizer, zaten 30 Hz'e kisilmis ekranda kare atlamaz.
    if (kalite === 2 && now - sonCizim < 30) return;
    const dt = Math.min(0.1, (now - sonCizim) / 1000); sonCizim = now;
    adim(dt);
  };
  const durdur = () => { calisiyor = false; cancelAnimationFrame(rafId); };
  const baslat = () => { if (calisiyor || !kuruldu || debug || azaltMQ.matches || !uygun()) return; calisiyor = true; onceki = 0; rafId = requestAnimationFrame(kare); };
  const gorunurlukDegisti = () => {
    if (!uygun()) { durdur(); return; }
    if (durgunIlerlet) { if (Date.now() - zmnDuvar > 20000) { zamanYenile(); durgunIlerlet(2); } } else baslat();
  };
  const gozcu = new IntersectionObserver(([e]) => { gorunur = e.isIntersecting; gorunurlukDegisti(); });
  gozcu.observe(stage);
  document.addEventListener('visibilitychange', gorunurlukDegisti, dinle);
  window.addEventListener('pageshow', gorunurlukDegisti, dinle); // geri/ileri onbelleginden donus
  let dakikaSayaci = 0;

  const c: Cekirdek = {
    W, H, kimlik, dalga, gok: kGok.kok, statik: kStatik.kok, dinamik: kDinamik.kok, tanimlar, cizgili, ruzgar, sorgu,
    hedef(h) { hedefler.push(h); },
    bosDokunus(fn) { bosDinleyici = fn; },
    zaman: () => zmn,
    surum: () => surum,
    ayarla(anahtar, deger) { if (deger === null) sorgu.delete(anahtar); else sorgu.set(anahtar, deger); zamanYenile(); },
    kalite: () => kalite,
    dar: () => dar,
    basla(ciz, odak) {
      [...dalgalar, ...esintiler].forEach((d) => kDinamik.kok.appendChild(d.n)); // en ustte
      kDinamik.kok.appendChild(odakHalka);
      adim = (dt: number) => {
        t += dt;
        if (Date.now() - zmnDuvar > 20000) zamanYenile();
        hedefRuzgar = lerp(hedefRuzgar, 0.12 + 0.25 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.67), 1 - Math.exp(-dt * 0.7));
        ruzgar.deger = lerp(ruzgar.deger, hedefRuzgar, 1 - Math.exp(-dt * 3));
        ciz(t, dt);
        for (const d of dalgalar) {
          if (d.yas > 0.6) { if (d.yas < 9) { d.n.setAttribute('opacity', '0'); d.yas = 9; } continue; }
          d.yas += dt; d.n.setAttribute('r', f(3 + d.yas * 46)); d.n.setAttribute('opacity', f(Math.max(0, 0.7 * (1 - d.yas / 0.6))));
        }
        for (const e of esintiler) {
          if (e.yas >= e.omur) { if (e.yas < 9) { e.n.setAttribute('opacity', '0'); e.yas = 9; } continue; }
          e.yas += dt; if (e.yas < 0) continue;
          const k = e.yas / e.omur;
          e.n.setAttribute('transform', `translate(${f(e.x + e.yon * e.hiz * e.yas)} ${f(e.y - 5 * k * k)}) scale(${e.yon} 1)`);
          e.n.setAttribute('opacity', f(0.75 * Math.sin(Math.PI * Math.min(1, k))));
        }
        const sp = secili?.yer() ?? null;
        if (secili && !sp) sec(null);
        if (sp && secili) { odakHalka.setAttribute('cx', f(sp[0])); odakHalka.setAttribute('cy', f(sp[1])); odakHalka.setAttribute('r', f((secili.r ?? 8) + 4)); odakHalka.setAttribute('opacity', '0.9'); }
        else if (odakHalka.getAttribute('opacity') !== '0') odakHalka.setAttribute('opacity', '0');
        if (dar) {
          // kamera: el degmediyse odagi (klavyeyle secilen hedef varsa onu) izler; suruklemeden sonra bir sure bekler
          if (basili?.kay) { /* parmak surukluyor */ }
          else if (t - elSon < 4) { kamX = clamp(kamX + kamHiz * dt, 0, W - vw); kamHiz *= Math.exp(-dt * 4); }
          else {
            const ox = sp ? sp[0] : odak();
            if (ox !== null) {
              const hdf = clamp(ox - vw * 0.45, 0, W - vw);
              if (ilkKamera) { kamX = hdf; ilkKamera = false; }
              // izlenen kisi degisince kamera savrulmasin: yumusak yaklasir, hizi sinirli
              else kamX += clamp((hdf - kamX) * Math.min(1, dt * 2.2), -170 * dt, 170 * dt);
            }
          }
          dunya.style.transform = `translate3d(${f(-kamX * olcek)}px,0,0)`;
        }
      };
      const ilerlet = (s = 1) => { for (let i = 0, n = Math.max(1, Math.round(s * 60)); i < n; i++) adim(1 / 60); return t; };
      window.__sahne = window.__sahne || {};
      window.__sahne[kimlik] = {
        t: () => t, kalite: () => kalite, kareMs: () => kareMs, dar: () => dar, kamX: () => kamX, ruzgar: () => ruzgar.deger, son: () => sonDokunus,
        zaman: () => zmn, calisiyor: () => calisiyor, secili: () => secili?.ad ?? null, step: ilerlet,
        hedefler: () => hedefler.map((h) => { const p = h.yer(); if (!p) return null; const e = ekrana(p); return { ad: h.ad, x: e[0], y: e[1], r: (h.r ?? 0) * olcek, pay: h.pay ?? null }; }).filter(Boolean),
      };
      kuruldu = true;
      if (debug) {
        adim(1 / 60);
        adimcilar.set(kimlik, ilerlet);
        window.__step = (s = 1) => { let son = 0; adimcilar.forEach((fn) => { son = fn(s); }); return son; };
        return;
      }
      // Hareket azaltilmis: sahne birkac saniye ileri sarilir ve tek, dolu bir kare olarak kalir. Saat dakikada bir
      // yenilenir (gece olunca isiklar yanar); dokunma ve klavye tek karelik tepki gosterir. Ayar degisirse kip de degisir.
      const durgunKur = () => {
        durdur();
        durgunIlerlet = (sn) => { for (let i = 0, n = Math.max(1, Math.round(sn * 30)); i < n; i++) adim(1 / 30); };
        durgunIlerlet(10);
        dakikaSayaci = window.setInterval(() => { if (uygun()) { zamanYenile(); durgunIlerlet?.(2); } }, 60000);
      };
      const hareketliKur = () => { durgunIlerlet = null; clearInterval(dakikaSayaci); clearTimeout(durgunSayac); baslat(); };
      azaltMQ.addEventListener('change', () => (azaltMQ.matches ? durgunKur() : hareketliKur()), dinle);
      if (azaltMQ.matches) { durgunKur(); return; }
      adim(1 / 60); // ilk kare hemen: tarayici ilk rAF'i gec verse de (yukleme sirasinda) sahne eksiksiz gorunur
      baslat();
    },
    kapat() {
      durdur(); iptal.abort(); gozcu.disconnect(); boyutGozcu.disconnect();
      clearInterval(dakikaSayaci); clearTimeout(durgunSayac);
      adimcilar.delete(kimlik); if (window.__sahne) delete window.__sahne[kimlik];
      dunya.remove(); soyle.remove(); stage.removeAttribute('tabindex');
    },
  };
  return c;
}
