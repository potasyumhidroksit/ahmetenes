This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
pnpm dev              # Start the Astro dev server
npx emdash types      # Regenerate TypeScript types from a running site
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Content.astro` | Content-page layout: header nav, mobile drawer, search dialog, EmDash head/body wiring |
| `src/layouts/PersonaBio.astro` | Home-page layout for the profile card |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall. The docs reflect current behaviour; assumptions may not.

This repository does not ship an MCP config for it; to use the docs server, add it to your tool once -- see [docs.emdashcms.com/docs-mcp](https://docs.emdashcms.com/docs-mcp).

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields can arrive as a string path (seeded, e.g. `/blog/<slug>/cover.webp`) or an object (`{ src, alt, ... }`, after an admin/API save). Read them with `imageSrc()` and render with `ResponsiveImage` (`src/components/ResponsiveImage.astro`, helpers in `src/lib/responsive-image.ts`), which adds srcset for local `/blog/` images and falls back to `<Image>` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- Always call `Astro.cache.set(cacheHint)` on pages that query content.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## This Site

ahmetenes.com: a Turkish photography portfolio and blog (Persona Bio theme on EmDash). Operations -- deploy, Cloudflare cache, content workflow, backups -- are documented in `README.md`; read it before deploying or editing content.

## Pages

| Page        | Path               | What it shows                                                                  |
| ----------- | ------------------ | ------------------------------------------------------------------------------ |
| Home        | `/`                | Profile card (`bio_profiles/personabio`) with the primary menu                 |
| All posts   | `/posts`           | Posts in reading order (`sira`), list / grid / single views                    |
| Post / page | `/[slug]`          | Pages win over posts on a shared slug; `/posts/*` and `/pages/*` redirect here |
| Gallery     | `/galeri`, `/galeri/[id]` | Photos from Immich                                                      |
| Other       | `/ekipman`, `/medya`, `/iletisim`, `/gizlilik`, `/istatistik` | Static Astro pages                      |
| Search      | `/search`          | Posts and gallery photos                                                       |
| Category    | `/category/[slug]` | Posts filtered by category, in reading order                                   |
| Tag         | `/tag/[slug]`      | Posts filtered by tag, in reading order                                        |
| RSS         | `/rss.xml`         | Full-text feed                                                                 |

## Schema

- `posts` collection: `title`, `featured_image`, `content` (Portable Text), `excerpt` (text), `sira` (integer reading order).
- `pages` collection: `title`, `content` (Portable Text). Used for `/hakkimda`; the deleted `/now` page redirects there (seed redirect).
- `bio_profiles` collection: `title`, `description`, `avatar` -- the home-page profile card.
- Taxonomies: `category`, `tag`.
- Menus: `primary` (site navigation) and `social`; `seed/seed.json` is the source of truth.

Site settings have `title` and `tagline` -- both render in the header / footer.

## Visual character

Single typeface: **DM Sans** (`--font-personabio`, mapped to `--font-body` and headings in `src/styles/theme.css`); **JetBrains Mono** on `--font-mono` for code. Weight and size carry the hierarchy.

Colours come from the Persona Bio overrides in `src/styles/theme.css`: neutral light/dark surfaces with a near-monochrome brand colour (`--color-brand`). Posts render in a single centred column (max 800px) under a full-width hero image.

The site owner reviews visual changes and has reverted a redesign before: prefer fixes over restyling unless asked.

## Customisation

Design tokens live in `src/styles/tokens.css` with their default values. To restyle the site, override tokens in `src/styles/theme.css` -- declarations there are unlayered, so they always beat the `@layer base` defaults. Don't edit `tokens.css` or the layouts for visual changes. Theme-wide button surfaces come from the `--button-surface` rule in `src/styles/appearance.css`; a scoped `background:` on a button loses to it, so use the `.button-primary` / `.button-scrim` hooks (or add one there) instead.

Colours are defined with `light-dark(<light>, <dark>)`, so each token carries both modes. Overriding with a plain colour changes light and dark at once; use `light-dark()` in the override to keep them distinct. There is no separate dark palette to maintain.

Webfonts are configured in `astro.config.mjs` under `fonts:`. The body face is the entry bound to `cssVariable: "--font-personabio"`; `theme.css` maps it onto `--font-body`. Keep its `latin-ext` subset: Turkish ğ/ş/İ fall back to a system font without it. To give headings their own face without touching the font pipeline, override `--font-heading` in `theme.css`.

CSS variables worth knowing (see `tokens.css` for the full list):

- `--color-brand`, `--color-brand-hover`, `--color-on-brand`, `--color-brand-ring`
- `--color-bg`, `--color-bg-subtle`, `--color-surface`, `--color-text`, `--color-text-secondary`, `--color-muted`, `--color-border`, `--color-border-subtle`
- `--font-body`, `--font-heading`, `--font-mono`
- `--font-weight-heading` (600) / `--font-weight-display` (700) -- heading weights; lower them if you switch to a serif
- `--tracking-tight` / `--tracking-snug` / `--tracking-wide` / `--tracking-wider` -- letter-spacing tokens used across headings and meta labels
- `--content-width` (680px) -- article body column
- `--wide-width` (1200px) -- max container
- `--gutter-width` (200px) -- right sidebar (TOC) on article pages
- `--meta-col-width` (180px) -- left meta column on article pages
- `--avatar-size-{xs,sm,md,lg}` -- byline avatar sizes at different scales

## What not to do

- Don't use stock blog copy ("Welcome to my blog", "Stay tuned for more"); site copy is real and in Turkish.
- Post comments are enabled and moderated in the admin; keep moderation in place when touching comment code.

## Documentation language

Match the repository: code comments are Turkish written without diacritics (`Okuma sirasi`), `README.md` and commit messages are Turkish, and this file stays in English. Public interface text and editorial content are Turkish.
