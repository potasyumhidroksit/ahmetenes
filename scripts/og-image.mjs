import sharp from "sharp";

const W = 1200;
const H = 630;
const src = process.argv[2] || "public/blog/dogal-isikla-portre-teknikleri/cover.webp";
const out = process.argv[3] || "public/og-default.jpg";

const overlay =
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#0b0e12" stop-opacity="0.10"/>' +
  '<stop offset="0.55" stop-color="#0b0e12" stop-opacity="0.40"/>' +
  '<stop offset="1" stop-color="#0b0e12" stop-opacity="0.88"/>' +
  '</linearGradient></defs>' +
  '<rect width="100%" height="100%" fill="url(#g)"/>' +
  '<text x="72" y="72" font-family="Inter, Helvetica, sans-serif" font-size="22" letter-spacing="6" fill="#ffffff" opacity="0.85">AHMETENES.COM</text>' +
  '<text x="70" y="468" font-family="Georgia, Times, serif" font-size="78" fill="#ffffff">Ahmet Enes</text>' +
  '<text x="74" y="526" font-family="Inter, Helvetica, sans-serif" font-size="26" letter-spacing="3" fill="#dfe4e8">FOTOGRAF - ISIK - NOTLAR</text>' +
  '</svg>';

const base = await sharp(src).resize(W, H, { fit: "cover", position: "attention" }).toBuffer();
await sharp(base)
  .composite([{ input: Buffer.from(overlay) }])
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(out);
console.log("og image written:", out);
