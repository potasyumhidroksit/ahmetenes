// Bulten onay/cikis gibi e-postadan acilan kisa durum sayfalari. Site
// temasina yakin (koyu/acik), indekslenmez; icerik cagirandan guvenli gelir.
export function statusPage(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<meta name="color-scheme" content="dark light" />
<title>${title} — Ahmet Enes</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>
  :root { color-scheme: dark light; --bg: #11151a; --panel: #1c2229; --text: #e0e6eb; --muted: #a3afb9; --line: #2c343d; --btn: #e5e9ed; --btn-text: #1c2229; }
  @media (prefers-color-scheme: light) { :root { --bg: #f4f4f3; --panel: #fff; --text: #1c2229; --muted: #606b6e; --line: #e4e6e7; --btn: #1d2128; --btn-text: #fff; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, sans-serif; }
  main { max-width: 440px; width: 100%; padding: 32px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); text-align: center; }
  h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 8px; }
  p { color: var(--muted); margin: 0 0 20px; }
  a { color: var(--text); }
  button { font: inherit; font-weight: 600; padding: 10px 20px; border: 0; border-radius: 8px; background: var(--btn); color: var(--btn-text); cursor: pointer; }
  form { margin: 0 0 20px; }
</style>
</head>
<body><main><h1>${title}</h1>${bodyHtml}<p><a href="/">ahmetenes.com</a></p></main></body>
</html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
