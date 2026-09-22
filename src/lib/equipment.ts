export type GearItem = {
  name: string;
  detail: string;
  category: string;
  /** Galeri karelerinin EXIF'inde bu ekipmani tanitan kalip (gövde ya da objektif). */
  exif?: { field: "camera" | "lens"; match: RegExp };
};

export const gearCategories: { id: string; label: string }[] = [
  { id: "kamera", label: "Kamera" },
  { id: "lens", label: "Lens" },
  { id: "filtre", label: "Filtre" },
  { id: "ses", label: "Ses" },
  { id: "isik", label: "Işık" },
  { id: "aksesuar", label: "Aksesuar" },
];

export const equipment: GearItem[] = [
  { name: "Fujifilm X-T5", detail: "Mirrorless Kamera · APS-C 1.5x", category: "kamera", exif: { field: "camera", match: /X-T5/i } },
  { name: "Sigma Art 17-40mm F1.8", detail: "F1.8 DC Art Zoom Objektif", category: "lens", exif: { field: "lens", match: /17-40mm/i } },
  { name: "Sigma 56mm F1.4", detail: "F1.4 DC DN Contemporary Objektif", category: "lens", exif: { field: "lens", match: /56mm F1\.4/i } },
  { name: "K&F Concept 67mm Difüzyon", detail: "Sinematik yumuşatma filtresi", category: "filtre" },
  { name: "Marumi DHG ND32 67mm", detail: "ND32 nötr yoğunluk filtresi", category: "filtre" },
  { name: "Hoya PRO ND 16 55mm", detail: "ND16 nötr yoğunluk filtresi", category: "filtre" },
  { name: "DJI Mic 3", detail: "2 TX + 1 RX Mikrofon Seti", category: "ses" },
  { name: "Godox TT685II-F", detail: "TTL Uyumlu Tepe Flaşı", category: "isik" },
  { name: "Fujifilm EF-X8", detail: "Kompakt Tepe Flaşı", category: "isik" },
  { name: "Ulanzi LE20 20W Pocket", detail: "RGB Video Led Işık", category: "isik" },
  { name: "Peak Design Capture Clip v3", detail: "Kamera Çanta Klipsi", category: "aksesuar" },
];
