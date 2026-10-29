# ahmetenes.com — Style Reference
> Quiet photographer's notebook: neutral slate surfaces, one typeface, soft pastel glow, glass navigation.

**Theme:** dark by default, light on request (`html[data-appearance="light"]`, stored in `localStorage["persona-bio-appearance"]`).

This file documents the tokens and rules the site **already uses** (read from `src/styles/*.css`), so agents can
make changes that fit. It is not a redesign brief. The owner reviews visual changes and has reverted a redesign
before: prefer fixes over restyling. Structure borrowed from `ui-refs/makemymd/prose.md`.

## Where the styles live

| File | Scope |
|------|-------|
| `src/styles/tokens.css` | EmDash template defaults in `@layer base` (type scale, spacing, layout widths). Do not edit; override in theme.css. |
| `src/styles/theme.css` | Content pages: `html[data-public-theme="personabio-content"]` overrides, archive/post/search layout, nav. |
| `src/styles/personabio.css` | Home page profile card: `html[data-public-theme="personabio-bio"]`. |
| `src/styles/appearance.css` | Shared by both: glass tokens, 8px radius normalisation, button surface system, light/dark switch, footer, print. Loaded **last** — it wins ties. |

Every colour is written as `light-dark(<light>, <dark>)`. Keep both values when you add one.

## Tokens — Colors (content pages)

| Token | Light | Dark | Role |
|-------|-------|------|------|
| page background (`body`) | `#f4f4f3` | `#11151a` | Area around the panel / card. |
| `--color-bg` / panel | `#fff` | `#1c2229` | `.content-panel`, `.personabio-card`, post cards. |
| `--color-bg-subtle` | `#f2f2f2` | `#11151a` | Rare quiet fills. |
| `--color-surface` | `#f5f5f6` | `#252c35` | Inputs, placeholders. |
| `--color-text` | `#536163` | `#e0e6eb` | Body text (slate, not black). |
| `--color-text-secondary` | `#667174` | `#b2bcc4` | Secondary copy. |
| `--color-muted` | `#606b6e` | `#a3afb9` | Meta, excerpts, labels. |
| `--color-brand` | `#1d2128` | `#e5e9ed` | Near-monochrome "ink": primary buttons, current item. |
| `--color-brand-hover` | `#424b52` | `#fff` | |
| `--color-on-brand` | `#fff` | `#1c2229` | Text on brand fills. |
| `--color-border` | `#e4e6e7` | `#3b434d` | Card/control borders. |
| `--color-border-subtle` | `#eceeef` | `#303841` | Section dividers inside the panel. |
| strong text (inline) | `#1d2128` | `#e5e9ed` | Hover text, links on `.card-read`. |

Glass (appearance.css, both layouts):

| Token | Value | Role |
|-------|-------|------|
| `--nav-glass` | 135° white gradient over `light-dark(#e8edf366, #252c3573)` | Nav bar, menu buttons, social icons, comment fields. |
| `--nav-glass-active` | brighter white gradient | Hover / `aria-current`. |
| `--glass-border` | `rgb(83 97 99 / 7.45%)` / `rgb(255 255 255 / 8.04%)` | Hairline on glass. |
| `--glass-border-active` | 17.45% of the same | Hover / current / focus-within. |

Glass always pairs with `backdrop-filter: blur(20px) saturate(160%)` and falls back to a flat
`light-dark(#eef0f3, #252c35)` under `prefers-reduced-transparency` or without backdrop-filter support.

Accent glow: pastel radial gradients — pink `#ffc6d8`, blue `#bee1ff`, lavender `#d7cbff` (dark: `#683a55`,
`#32557a`, `#51447b`, low alpha) — on the home card (`.personabio-card::before`, follows the pointer) and at the
top of the content panel (`.content-panel::before`). These are the only "colour" in the UI; photos supply the rest.

## Tokens — Typography

### DM Sans — the only UI face · `--font-personabio` → `--font-body` → `--font-heading`
- Loaded in `astro.config.mjs` (Google, weights 400/500/600, subsets `latin` + `latin-ext` — required for ğ, ş, İ).
- Headings are **weight 500**, never bold; hierarchy comes from size and tight tracking.

### JetBrains Mono · `--font-mono` — code only (400/500).

### Type scale (content pages, as used)

| Role | Size | Line height | Tracking |
|------|------|-------------|----------|
| page / archive title | `clamp(36px, 4.8vw, 58px)` | 1.1 | -.045em |
| article title | `clamp(32px, 3.5vw, 48px)` | 1.2 | -.035em |
| article h2 | `clamp(24px, 2.2vw, 28px)` | 1.25 | -.02em |
| article h3 | 20px | 1.2 | -.01em |
| card title | 26px (21px in "more", 24px mobile) | 1.25 | -.025em |
| article body | 18px desktop / 17px ≤800px | 1.8 / 1.9 | — |
| excerpt / description | 18–19px, muted | | |
| body UI | 16px | 1.7 | |
| nav item | 14px / 500 (12–13px mobile) | 1.4 | |
| meta, footer | 12–13px, muted | | |
| section label | 11px, muted | | .16em |

Home card (`personabio-bio`) uses a scaled root (`font-size: 24px` → 17.33px ≤1680 → 14.67px ≤980) and rem
units; name `h1` 54/48/40/42px weight 500, bio 1.125rem line-height 1.875.

Text wrapping: headings and card titles `text-wrap: balance`; body, list items, excerpts `text-wrap: pretty`.
Reading measure: paragraphs capped at 680px inside an 800px article column on desktop.

## Tokens — Spacing & Shapes

- **Radius:** effectively **8px everywhere** — `appearance.css` sets `--public-control-radius: 8px` and applies it to
  panel, cards, nav, buttons, inputs, tags. (theme.css still contains older 12/20/30px values; appearance.css overrides
  them. Do not reintroduce large rounded corners.) Circles (`50%`) only for avatars, social icons, appearance toggles.
- **Panel:** `.content-shell` `min(1280px, 100% - 96px)`; `.content-panel` padding 60px → 40px (≤1100) → 30px 22px (≤600).
- **Grid gaps:** posts 32px (24px mobile), related posts 20px. Cards 12px inner padding, body 24px 16px.
- **Touch targets:** 44px minimum (nav items, icon buttons, search, share, photo-back). Keep it.
- **Shadows:** essentially none. Card hover is `translateY(-3px)` + `0 12px 32px #1d212808`. No drop shadows on buttons.

## Components

### Glass navigation (`.content-nav`, `.personabio-menu-items a`)
Glass surface + hairline border; items 44px tall (home menu 58–68px), 14px/500. Current page: `--nav-glass-active`,
weight 600, `--glass-border-active`. Mobile (≤736px): right-side drawer with blurred backdrop.

### Buttons (`appearance.css` button system)
Background = `linear-gradient(var(--button-hover-tint)) , var(--button-surface)`. Surfaces: transparent (default),
`--nav-glass` (menu/social/comment submit), `--nav-glass-active` (current), ink `light-dark(#1d2128, #e5e9ed)` for
`.search-button`, `.button-primary`, 404/empty CTAs, `rgb(0 0 0 / 45%)` for `.button-scrim` over photos. Hover only
tints (`@media (hover: hover)`), never moves.

### Post card (`.post-card`)
Panel-coloured, 1px `--color-border-subtle`, 12px padding, 16:9 image, title 26px/500, muted excerpt 15px/1.8,
"Yazıyı oku" row with a 36px ink circle arrow.

### Article
Full-width hero (max `min(56vh, 540px)`, `object-fit: cover`), caption tucked 12px under it, centred 800px column,
underlined links (`text-underline-offset: 4px`), figures `margin: 2.4em 0`.

### Focus
`outline: 2px solid light-dark(#536163, #e0e6eb)` (3px on home menu), offset 3–5px. Never remove.

## Motion

- Durations .18–.32s, `ease` / `cubic-bezier(.22,1,.36,1)` for the drawer. Hover lifts ≤3px.
- Scroll reveal (theme.css, end): in-article figures and related-post cards fade up 24px as they enter, pure CSS
  `animation-timeline: view()`, screen only, inside `@supports` and `prefers-reduced-motion: no-preference`.
  Never apply it to the hero image, the home card, or anything above the fold (LCP).
  Trap: keep `animation-timeline` in a separate rule from the `animation` shorthand — the build minifier folds them into
  one shorthand that Chrome rejects, and the effect silently disappears.
- Every transition/transform has a `prefers-reduced-motion: reduce` off-switch; glass has a
  `prefers-reduced-transparency` fallback. Keep both when adding effects.

## Do's and Don'ts

### Do
- Write colours as `light-dark()` and check both themes (dark is the default).
- Put a media query **after** the base rule of the same specificity (twice a rule silently lost to source order).
- Scope content-page rules under `[data-public-theme="personabio-content"]`.
- Keep Turkish glyph coverage (`latin-ext`) when touching fonts.
- Prefer CSS-only effects; the CSP is `script-src 'self' 'unsafe-inline'` (src/middleware.ts) — no third-party scripts/CDNs.

### Don't
- Don't add a second typeface, bold (700) headings, saturated accent colours, or heavy shadows.
- Don't round corners beyond 8px or edit `tokens.css` directly.
- Don't animate the LCP element (hero / profile card) or hide content behind JS.
- Don't add React islands or JS libraries for decoration; reach for CSS first.

## Imagery

The owner's own photographs are the colour. Covers are 16:9 in cards, wide and cropped on posts; in-article
figures full column width. Use `ResponsiveImage` / `BlogImage` (srcset for `/blog/` images).

## Layout

- Home (`/`): one centred two-column card (profile | menu), single column ≤736px.
- Content pages: header (identity + glass nav) → rounded panel → footer. Archives in a 2-column card grid,
  related posts in 3 (2 ≤1100px, 1 ≤600px).
- Breakpoints in use: 1680, 1100, 980, 940, 800, 736, 600, 480, 420, 360.

## Agent Prompt Guide

Quick reference: panel `#fff`/`#1c2229` on `#f4f4f3`/`#11151a`; text slate `#536163`/`#e0e6eb`; ink
`#1d2128`/`#e5e9ed`; DM Sans 500 headings with negative tracking; 8px radius; glass nav; 44px targets.

Example prompts:
- "Add a 'Fotoğraf bilgisi' block under the article hero: 13px muted DM Sans, no border, 8px radius chip for each
  EXIF value on `--nav-glass`, both themes, reduced-transparency fallback."
- "Style an empty state for /search: muted 16px copy and one ink CTA button (`.button-primary`), 44px tall."
