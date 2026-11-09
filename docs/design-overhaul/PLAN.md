# NHG Design-System Overhaul — Implementation Plan

Status: **ready to execute** · Written 2026-11-09 against `primary` @ `11e6f26`
Audience: an autonomous coding agent (or a developer) executing it phase by phase.

---

## 0. Read this first (executor brief)

**Objective.** Re-skin every public HTML surface of nursinghomegrade.com to the new NHG brand/design system. The wordmark becomes the logo. While doing that, consolidate ~560 inline-style lines into a real stylesheet and a small component library, so the system holds afterward.

**Source of truth for the design** (now in `docs/brand/` after Phase 1, moved from the repo root):

| File | What it is | Authority |
|---|---|---|
| `nhg_design.jpg` | "Final logo" + design system board: palette, type, score badges, UI components, icons, app icon | **Primary.** Follow it unless this plan overrides it. |
| `homepage mockup.jpg` | Full homepage layout | Layout reference. Its content is partly fictional (see §2 D-10). |
| `NHG.png` | Logo exploration. Concept 1 became the final logo. Concept 2 (stars, boxed mark) is **rejected**. | Reference only |
| `.impeccable.md` | Brand voice + design principles | Voice/principles stay. Its palette section is superseded by this plan (updated in Phase 6). |

**Hard rules. Do not break these in any phase.**

1. **No fabricated content.** Do not ship "Millions of families served", "As seen in Washington Post / KFF / Reuters / Newsweek", facility photos, "Better than 83% of facilities", invented sub-scores (96/94/93/95), or the mockup's sample numbers. Every number on the page comes from D1 or from existing disclosed methodology.
2. **No scoring changes.** Grades stay A/B/C/D/F/NR with the existing bands (`src/scoring.ts:206`: A ≥ 80, B ≥ 65, C ≥ 50, D ≥ 35, else F). No plus/minus letters, even though the board shows "A-", "B+" and "C+".
3. **Preserve SEO surface.** Keep every `<h1>` text, `<title>`, meta description, canonical, robots/noindex, hreflang, JSON-LD block, breadcrumb links, and every internal `href` currently in the masthead, footer and body. Restyle them, don't remove them. The `internal-linking`, `facility-page-seo`, `city-pages`, `sitemap-*` and `trust-copy` tests guard this. Change a test only when the markup *shape* changed and the guarded behavior did not, and say so in the PR.
4. **No production actions without explicit user authorization:** no `npm run deploy`, no `--remote` D1 commands (the repo's `.claude/settings.json` pre-allows some; that is not authorization for this project), no merging PRs.
5. **Small PRs, one per phase** (AGENTS.md). Branch from `primary`. If your harness pins you to a single branch, make one commit per phase in order and open one PR per phase when possible; otherwise open one PR and list the phases in it.
6. **Accessibility is non-negotiable.** Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24px or ≥ 18.66px bold, and for UI boundaries). Visible focus, 44px targets, semantic HTML. Phase 1 adds a contrast test that enforces the token pairs.

**Baseline before you start:**

```bash
npm ci
npm test            # record pass/fail counts
node docs/design-overhaul/screenshots.cjs https://nursinghomegrade.com out/shots/before
```

In the planning container, 6 tests failed because `node_modules/wrangler` was missing (`grade2-d1-finalizer`, `deficiency-seed`, `stats-migration` shell out to wrangler). They should pass after `npm ci`. If any still fail, record them as pre-existing in the first PR and don't fix them under this plan. The viewport screenshots of the live site at planning time are in `docs/design-overhaul/before/`.

---

## 1. Current state (verified 2026-11-09)

- **Stack.** Cloudflare Worker (`src/index.ts`) renders HTML strings from `src/templates/*.ts` (25 templates). D1 for data, Cache API for HTML (`src/cache.ts`, `HTML_CACHE_VERSION = "html:v30"`). There is no static-assets binding: `/og.png` is served from a base64 module (`src/og-png.generated.ts`). `public/` is **not** served.
- **CSS.** About 1,000 lines inlined in `<style>` in `src/templates/layout.ts`, so every page carries all of it. On top of that, **562 template lines carry `style="…"`**. The worst offenders are facility (114), reports (70), operator (61), city (49), state (42), best (34) and state-report (27).
- **Brand today.** Navy `#0B1D33` ink, burgundy `#9f1239` as the accent for links and buttons, Playfair Display + Source Sans 3, square corners, heavy 2px borders. The masthead uses a hand-drawn "bars + double slash" icon that does **not** match the final logo, plus the text "NursingHomeGrade" with no ".com".
- **Live bug found during planning: every map is broken.** The Carto basemap (`basemaps.cartocdn.com/light_all`) now returns an "API KEY REQUIRED" watermark tile. I confirmed this by fetching a tile directly, and you can see it in `before/facility.png`. It affects `src/templates/home.ts:250` (search map view), `src/templates/explore.ts:51`, and the facility map (`src/templates/facility.ts` ~L915+). This is fixed in Phase 0.
- **Data available for the new homepage.** `site_stats` has `avg_grade` (excludes NR, per `scripts/stats-sql.ts`), `total_facilities` and `pct_failing`. `data_releases` has CMS release dates. `getTopRatedFacilities()` exists. **No national grade distribution exists yet** (Phase 3 adds it).
- **Search is ZIP-only** (`handleSearch`). The mockup's "facility name, city, state or ZIP" field is not supported.

---

## 2. Decisions already made (don't relitigate)

| # | Decision | Rationale |
|---|---|---|
| D-1 | **Logo = wordmark only** in the masthead and footer: "NursingHomeGrade" in navy plus ".com" in teal. The NHG icon mark is used **only** for the favicon, app icons and the OG image. | That's what was asked for. Also, the icon+wordmark lockup is too wide on 390px phones next to a menu button. |
| D-2 | Wordmark ships as an **outlined inline SVG** (glyph paths, not `<text>`), generated once from Playfair Display by a script and committed as a TS module. | No dependency on webfont loading. Renders identically in sharp (OG/PNG), print and every browser. Today's OG image uses `<text font-family="Playfair Display">`, which sharp can't resolve, so it falls back to a system serif. |
| D-3 | Fonts: **Playfair Display** (display and headings only) + **Inter** (UI, body, all numerals), per the board. **Source Sans 3 is removed.** Google Fonts, trimmed to Playfair 600/700 and Inter 400/500/600/700. | Matches the board. Fewer weights means less font payload. |
| D-4 | **Burgundy is retired.** Teal is the action and link color. Alarm and danger use the grade-F red. | The board has no burgundy. Two "accent" reds next to the grade reds muddle the meaning. |
| D-5 | Teal splits into **two tokens**. `--teal-600 #16897A` (brand teal) is for fills, marks, large numerals and borders. `--teal-700 #0F6E62` is for link text and white-on-teal buttons. | `#16897A` on white is 4.29:1, which fails AA for body text. `#0F6E62` is 6.13:1. |
| D-6 | Every grade color has a **fill** (bars, chip borders, meters; uses the board's hex) and an **ink** (text; AA-safe on white). See §3.1. | The board's "Above avg" `#1FA38C` (3.15:1), "Average" `#F5B23D` (1.86:1) and "Below avg" `#E4573D` (3.67:1) fail as text colors. |
| D-7 | Grade descriptors are **A Strong · B Good · C Fair · D Poor · F Failing · NR Not rated**, not the board's "Excellent / Above avg / Average / Below avg / Poor". | Bands are absolute thresholds, not percentiles. "Above average" would be a false relative claim, which matters for an independence/trust brand. |
| D-8 | The score meter is **10 segments** (10 points each). `filled = Math.round(score / 10)`, colored with the grade fill. It is `aria-hidden`, and the numeric score is always shown as text. | Matches the board's chip. The text carries the meaning. |
| D-9 | Shape language: 4px radius on controls, 8px on cards and chips, 12px on the hero panel. 1px `--line` borders. Shadows are near-flat (one subtle level). Square corners and 2px black borders are dropped. | Matches the board. |
| D-10 | Homepage mockup substitutions: **"National overview" card** uses real `avg_grade`, a real 10-point histogram, and real A / B–C / D–F shares. **"Top rated"** uses cards with no photos, showing the real inputs (RN hrs, deficiencies, CMS quality ★, CMS staffing ★) instead of fake sub-scores. **The press/"Millions" band** becomes a navy facts band (facilities graded = `total_facilities`, latest CMS release date, "No facility payments", "Open methodology"). The **search field** stays ZIP-only, labelled honestly, with "Use my location". | Hard rule 1. No facility imagery exists. Name search doesn't exist. |
| D-11 | The homepage H1 becomes **"Independent nursing home grades."** with the sub-head "Better decisions, from official CMS inspection and staffing data." | Keeps the ranking phrase "nursing home grades" and adopts the mockup's two-beat headline. This is the only H1 copy change in the whole plan. Note it in the PR. |
| D-12 | CSS moves to **one external, content-hashed stylesheet** served by the Worker at `/assets/site.<hash>.css` with `immutable` caching. Any other `/assets/site.*.css` returns the current CSS with `max-age=300` (so HTML cached before a deploy never renders unstyled). | Removes ~30 KB of repeated CSS from ~15k cached pages. No bundler needed: the hash is a sync FNV-1a computed at module init. |
| D-13 | Bump `HTML_CACHE_VERSION` in **every PR that changes rendered HTML** (v30 → v31 → …). | Otherwise stale cached HTML is served next to new CSS. |
| D-14 | Icons: Lucide (ISC license) path data, inlined via `src/templates/icons.ts`, only the ~14 icons needed. Copy them from the `lucide-static` npm package at a pinned exact version (check the current version and its license at execution time). Don't add a runtime dependency. | The board's icon style is a 1.5–2px line set, and Lucide matches it. |
| D-15 | Navigation: same hrefs as today. The labels become **Find Facilities · States · Best · Worst · Compare · How We Grade**, plus a navy **Search** button. No dropdowns. | Mockup's "Resources ▾ / About ▾" adds JS and a11y surface for no gain. The current link set is SEO-tested. "About" stays in the footer, where it already is. |
| D-16 | Light mode only, kept. Print styles are kept and restyled (facility pages are shared and printed). | `.impeccable.md` principle 5. |
| D-17 | Map tiles: switch Carto to **OpenStreetMap standard tiles** (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution "© OpenStreetMap contributors", maxZoom 19), defined in one shared constant. Check the OSM tile usage policy (operations.osmfoundation.org/policies/tiles) at execution time. If traffic later justifies it, move to a keyed provider or self-hosted vector tiles. | Free, keyless, fixes a live bug today. Moving to MapLibre/vector tiles would be a larger change and out of scope. |

---

## 3. Design tokens (exact values)

These go in `src/styles/tokens.ts` as `:root` custom properties.

### 3.1 Color

```css
/* Brand */
--navy-900: #0B1D33;   /* ink, primary buttons, dark bands      16.97:1 on white */
--navy-800: #1A2E4A;   /* primary button hover                    */
--teal-600: #16897A;   /* brand teal: fills, marks, big numerals  4.29:1 (large/UI only) */
--teal-700: #0F6E62;   /* links, teal buttons, small teal text    6.13:1 */
--teal-800: #0B5A50;   /* teal hover                              */
--teal-50:  #E8F3F1;   /* tint panels (CTA band, selected rows)   */
--slate-600:#60717D;   /* muted text                              5.05:1 on white, 4.79 on --bg */
--line:     #E6EBEF;   /* rules, card borders (board "Light gray") */
--line-strong:#7F8F9B; /* input + secondary-button borders: 3.33:1 on white, 3.15:1 on --bg (WCAG 1.4.11) */
--bg:       #F7F9FA;   /* page background (board "Off white")     */
--surface:  #FFFFFF;

/* Grades: fill = board hex (bars/borders/meters); ink = text-safe */
--grade-A-fill:#12805D; --grade-A-ink:#12805D;   /* 4.92 */
--grade-B-fill:#1FA38C; --grade-B-ink:#177968;   /* 5.29 */
--grade-C-fill:#F5B23D; --grade-C-ink:#8A5A00;   /* 5.93 */
--grade-D-fill:#E4573D; --grade-D-ink:#B4361C;   /* 6.03 */
--grade-F-fill:#B91C1C; --grade-F-ink:#B91C1C;   /* 6.47 */
--grade-NR-fill:#C9D2D9; --grade-NR-ink:#60717D;
--grade-A-tint:#E7F3EE; --grade-B-tint:#E8F5F2; --grade-C-tint:#FDF4E3; --grade-D-tint:#FCECE8; --grade-F-tint:#FBEAEA; --grade-NR-tint:#F0F3F5;

/* Semantic */
--alarm: var(--grade-F-ink);       /* replaces burgundy wherever it meant "bad" */
--focus: #0F6E62;                  /* 2px outline, 2px offset */
```

**Legacy aliases (Phase 1 only, deleted in Phase 6).** These let un-migrated templates pick up the new palette immediately:
`--ink: var(--navy-900)`, `--muted: var(--slate-600)`, `--rule: var(--line)`, `--accent: var(--teal-700)`, `--accent-hover: var(--teal-800)`, `--accent-positive: var(--teal-700)`, `--grade-X: var(--grade-X-ink)`.
⚠ `var(--accent)` has 35 uses. Some mean "action" (→ teal, fine) and some mean "alarm" (e.g. the home lede's red failing-staffing stat). Grep every use and switch the alarm ones to `var(--alarm)` in Phase 1.

### 3.2 Typography

```css
--font-display: "Playfair Display", Georgia, "Times New Roman", serif;
--font-ui: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

| Role | Font | Size | Weight / LH / tracking |
|---|---|---|---|
| `.display` (home hero) | display | `clamp(2.5rem, 6vw, 4rem)` | 700 / 1.05 / -0.01em |
| `h1` | display | `clamp(2rem, 4.5vw, 3rem)` | 700 / 1.1 |
| `h2` | display | `clamp(1.5rem, 3vw, 2rem)` | 700 / 1.15. **Remove** the global `border-top` + `5rem` margin; sections own spacing. |
| `h3` | ui | `1.125rem`–`1.25rem` | 600 / 1.3 |
| body | ui | `1.0625rem` (17px) | 400 / 1.6 |
| small/meta | ui | `0.875rem` | 400–500 / 1.5 |
| `.eyebrow` | ui | `0.75rem` | 600 / uppercase / 0.08em / `--slate-600` |
| numerals (scores, stats) | ui | per component | 700, `font-variant-numeric: tabular-nums` |
| `.lede` | ui | `1.25rem` | 400 / 1.5 / max 62ch. **Not** Playfair any more. |

Prose max width is 72ch. The layout container is **1200px** (was 1040), with `padding-inline: 16px` up to 640px wide and 24px above.

### 3.3 Space, shape, elevation

Keep the existing `--space-*` scale as is (`3xs`…`3xl`). Add:
`--radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --shadow-1: 0 1px 2px rgba(11,29,51,.06), 0 1px 1px rgba(11,29,51,.04); --shadow-2: 0 4px 16px -4px rgba(11,29,51,.10);`
Motion: 150ms ease-out color/border/shadow transitions only. No translate-on-hover (remove the `translateY(-4px)` card lifts). Keep the reduced-motion block.

---

## 4. Brand assets

**Generator.** `scripts/generate-brand-assets.ts`, run manually with `npx tsx scripts/generate-brand-assets.ts` and add `"brand-assets"` to `package.json` scripts. It writes **`src/brand.generated.ts`** (committed, with a header comment saying how to regenerate) exporting:

| Export | Spec |
|---|---|
| `WORDMARK_SVG_INNER`, `WORDMARK_VIEWBOX`, `WORDMARK_ASPECT` | "NursingHomeGrade" in Playfair Display **SemiBold 600**, fill `#0B1D33`. Then ".com" in Playfair **Regular 400**, fill `#16897A`, at **0.52×** the cap size, sharing the baseline, with a 0.03em gap. Glyph outlines with kerning applied. Tight viewBox. |
| `WORDMARK_SVG_INNER_REVERSED` | The same, with navy swapped for `#FFFFFF` (".com" stays teal-600; check ≥ 3:1 on navy. It is 3.95:1, which passes for large text). For dark bands and the OG image. |
| `ICON_SVG` | Final mark from `nhg_design.jpg` §1: a navy block (`#0B1D33`) containing "NHG" in Inter **ExtraBold 800**, white, outlined. Above it, two square bars in muted teal-gray `#9DBDB8` and a teal `#16897A` parallelogram slash, matching the board's proportions. |
| `APP_ICON_SVG` | `ICON_SVG` centered on a navy rounded square (radius ≈ 22% of side) with the NHG block reversed as on the board's "Favicon / App icon" tile. |
| `FAVICON_SVG` | ≤ 32px variant: a navy rounded square with the two bars and the slash only. **No "NHG" text** (illegible at 16px). |
| `FAVICON_32_PNG_BASE64`, `APPLE_TOUCH_180_PNG_BASE64`, `ICON_192_PNG_BASE64`, `ICON_512_PNG_BASE64` | Rasterized with `sharp` (already a devDependency), the same way `scripts/generate-og-image.ts` does it. |

**Font source.** Download the variable TTFs from the `google/fonts` GitHub repo (`ofl/playfairdisplay/`, `ofl/inter/`) into `data/fonts/`, which is gitignored. Parse them with **`opentype.js`** (add it as an exact-pinned devDependency; check the current version on npm). Both fonts are SIL OFL 1.1, and outlined glyphs in a logo are permitted. Add `docs/brand/FONTS-LICENSE.md` noting OFL and the sources. If variable-font instancing is awkward in opentype.js, download the static instances instead (`static/PlayfairDisplay-SemiBold.ttf` etc.) where the repo provides them.
**Fallback** if the font download is blocked: emit `<text>` SVG using `font-family="Playfair Display"` for the in-page wordmark only (the page loads the font anyway). Mark it `// TODO(outline)` and report it. Do **not** ship the fallback in OG/PNG assets; hand-trace those instead or block and report.

**Serving (`src/index.ts`, next to `/og.png`):** `/favicon.svg`, `/favicon.ico` → 32px PNG (`image/png` is fine for modern browsers; or skip `.ico` and return 404, but decide and test). Also `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, and `/site.webmanifest` (name "NursingHomeGrade.com", `theme_color #0B1D33`, `background_color #F7F9FA`, the two icons). All `Cache-Control: public, max-age=31536000, immutable` except the manifest (86400).
**Head tags** (replace the data-URI favicon at `layout.ts:70`): `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<link rel="icon" href="/favicon-32.png" sizes="32x32">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, `<link rel="manifest" href="/site.webmanifest">`, `<meta name="theme-color" content="#0B1D33">`.

**Wordmark sizing.** Masthead height is **28px desktop (≥ 900px), 24px tablet, 20px at ≤ 400px**. Check that it never exceeds `100vw − 32px gutter − 44px menu button − 12px gap` at 360px width. Footer height is 24px. Markup:

```html
<a href="/" class="brand" aria-label="NursingHomeGrade.com — home">
  <svg class="brand-wordmark" viewBox="…" role="img" aria-hidden="true" focusable="false">…</svg>
</a>
```

**OG image.** Rewrite `src/og-svg.ts`: navy background, `APP_ICON_SVG` on the left, reversed wordmark, and the tagline "Independent nursing home grades from official CMS data", set as outlined Inter or as plain `<text>` *only if* it renders correctly through sharp. Verify by looking at the PNG. Then regenerate `og.png` / `og-png.generated.ts` with `scripts/generate-og-image.ts`.

**Housekeeping.** `git mv NHG.png nhg_design.jpg "homepage mockup.jpg" docs/brand/` and rename the last one to `homepage-mockup.jpg`. Move the stale root screenshots `nursinghomegrade-*.png` to `docs/archive/` (they show the pre-2026 design). Delete `public/NHG.png` (an unreferenced duplicate, not served). Leave the `9a151e…txt` key file alone because a route serves it.

---

## 5. Component library

New file **`src/templates/components.ts`** (pure functions returning HTML strings; escape every interpolated value with `escHtml`). New file **`src/templates/icons.ts`**. Every list or card surface on the site must render through these. No page-local re-implementations.

| Component | Signature (suggested) | Notes |
|---|---|---|
| `wordmark(opts?: { reversed?: boolean })` | → `<svg>` | From `brand.generated.ts`. |
| `gradeDescriptor(letter)` | → `"Strong" \| … \| "Not rated"` | D-7. |
| `scoreMeter(score, letter)` | → 10-segment `<span class="meter meter--A" aria-hidden="true">` | D-8. NR renders an empty meter. |
| `scoreChip(f, { size: "sm" \| "md" \| "lg", completeness? })` | → board "score badge" | Layout: big score numeral (Inter 700, grade **ink** color, tabular), a vertical rule, the letter (Inter 700) above `gradeDescriptor` (eyebrow), and `scoreMeter` along the bottom. Border is 1px `--line` with a 3px top border in the grade **fill**. Inside an `<a>` it must not be the only link text. **NR:** shows "—" with the "Not rated" descriptor and links to `/how-we-grade#not-rated` (no anchor exists today: add `id="not-rated"` to the "Insufficient / Not rated" item at `src/templates/how-we-grade.ts:42`). **Partial completeness:** adds a small "Partial data" tag with `title`/visually-hidden explanation from `scoreToSummary`. sm is about 72px tall (list rows), md is the default card size, lg is the facility hero. |
| `facilityCard(f, opts)` | → `<article class="fcard">` | One card used by search results, city, state top list, best/worst, operator facilities, facility "nearby", and home "top rated". Contents: name (h3 link), city/state (plus distance if given), `scoreChip` sm/md, a stat row (RN hrs/resident-day with the benchmark check, deficiencies, CMS quality ★/5, CMS staffing ★/5, each "Not reported" when null), an optional rank badge ("#1"), the optional Compare toggle (keep `id="save-<cms_id>"`, `aria-pressed`, `.compare-toggle-label` exactly, because the layout script depends on them), and an optional summary line. Variants: `layout: "row"` (lists; chip on the right on desktop, top on mobile) and `"tile"` (grids). |
| `statTile(label, value, sub?)` | → national overview figures, snapshot cards | |
| `starRating(n)` | → "4/5" text with an `aria-label`. Optional dot scale like the board's "Metric Rating (1–5)". | Replace the ★★★★★ glyph strings. |
| `section({ id, eyebrow?, title, intro?, body, tone?: "plain" \| "tint" \| "dark" })` | → `<section>` with consistent spacing | Owns the vertical rhythm that global `h2` margins used to provide. |
| `trustPillars()` | → the board's bottom strip: Independent / Transparent / Data-driven / For families | Copy: "No facility payments." / "Public data. Clear methodology." / "Official CMS data, updated with each release." / "Better information. Better decisions." Icons: shield-check, circle (or eye), bar-chart, users. |
| `dataFreshness(releases)` | **restyle** the existing `src/templates/data-freshness.ts` | Compact single-line variant ("CMS data as of Oct 8, 2026 · Sources →") for heroes. The current full box is kept for `/data-sources`. Keep the existing tests green. |
| Buttons (CSS only) | `.btn` + `--primary` (navy), `--action` (teal-700, for search submit), `--secondary` (white, 1px `--line-strong`, navy text), `--ghost`; `.link-arrow` (teal-700 text + →) | Mixed case, 600 weight, 4px radius, 44px min height. **Drop the uppercase + letter-spacing button style.** |
| Forms (CSS only) | `.field`, `.input`, `.select`, `.search-field` (input with a leading search icon + attached action button, board "Search for a facility…") | 1px `--line-strong` border, 4px radius, focus ring `--focus`. |
| `breadcrumb(items)` | restyle: sentence case, slate, `›` separators, 44px tap targets kept | Keep the JSON-LD `BreadcrumbList` wherever it is emitted today. |
| `icons.ts` | `icon(name, { size=20, label? })` | Lucide: `search, shield-check, database, users, building-2, clipboard-list, bar-chart-3, trending-up, trending-down, bookmark, download, info, map-pin, chevron-right, arrow-right, menu, x, printer, scale` (compare). `aria-hidden` unless `label` is given. |

**CSS architecture** in `src/styles/`: `tokens.ts`, `base.ts` (reset, type, links, focus), `layout.ts` (container, masthead, footer, grid utilities), `components.ts` (one block per component above), `pages.ts` (page-specific leftovers; keep it small), `print.ts`, and `index.ts` exporting `SITE_CSS` and `SITE_CSS_HREF`. Class naming is flat kebab-case, matching the existing code: `.fcard`, `.fcard-name`, `.chip`, `.chip--lg`, `.meter`, `.meter--A`. Grade modifiers always use the letter: `--A … --F`, `--NR`.

**Inline-style policy.** After a page is migrated, its template may contain `style="` **only** for CSS custom properties carrying data, e.g. `style="--pct:42%"` for bar widths. Enforce it with a test (§8).

---

## 6. Phases

Each phase is one PR, branched from the latest `primary`, and each has an acceptance list. Bump `HTML_CACHE_VERSION` in each phase that changes HTML.

### Phase 0 — Fix broken maps (tiny PR, ship first, independent)
- Add `src/templates/map-tiles.ts` exporting `TILE_URL`, `TILE_ATTRIBUTION`, `TILE_MAX_ZOOM` (D-17). Use it in `home.ts`, `explore.ts` and `facility.ts`, replacing the three Carto URLs.
- Test: no template contains `basemaps.cartocdn.com`; the rendered facility page contains the OSM attribution.
- Accept: `npm test` green. Run a local Playwright check of `/explore` or the facility map in `wrangler dev` (or the preview renderer from Phase 1 if it exists by then) and confirm tiles render. Look at the screenshot.
- Bump the cache version.

### Phase 1 — Foundation: tokens, stylesheet, fonts, brand, chrome
1. Create `src/styles/*` (§5) and move **all** CSS from `layout.ts` into it, unchanged at first (one commit: "Extract site CSS"). Then apply the §3 tokens and legacy aliases in a second commit.
2. Serve the stylesheet (D-12): route in `src/index.ts` **before** other routes. `layout()` emits `<link rel="stylesheet" href="${SITE_CSS_HREF}">` and drops the `<style>` block. Keep the Google Fonts preload trick, with the URL changed to `family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap`.
3. Brand assets (§4): generator, `brand.generated.ts`, icon routes, head tags, `git mv` housekeeping.
4. Rebuild the masthead to the mockup: white bar, 1px bottom line, wordmark left, nav center-right (D-15), and a navy "Search" button that links to `/search`. A mobile menu button opens a full-width panel. **Keep** the existing toggle JS contract (`.masthead-toggle`, `aria-expanded`, `.masthead-nav.is-open`), or update the script in the same commit. 72px tall desktop, 60px mobile, sticky. No search icon button (a duplicate of the Search button).
5. Rebuild the footer to the mockup: wordmark plus the existing tagline, four columns with **identical hrefs** (Explore / Resources / Company / Stay informed), the newsletter form (keep `action="/subscribe"`, field names, hidden input), social icons, and the bottom legal row. The repeal disclosure stays where it is rendered today.
6. Restyle the comparison bar (`#comparison-bar`): navy, 4px teal top border, Inter, `.btn--secondary` reversed. Move its inline styles into CSS but **keep its element IDs**. Remove the stray `'Inter'` inline font reference (`layout.ts:1270`).
7. Global element restyle: links, h1–h3 (§3.2), `.btn*`, forms, tables (`.table-container`, zebra-free, 1px lines, sticky header cell styling), `.breadcrumb`, focus states, print.
8. Audit every `var(--accent)` use: action stays (teal); alarm moves to `var(--alarm)`.
9. Add `scripts/render-preview.ts` (`npm run preview:render`). It renders every page template with fixture data (reuse/extend the fixtures in `test/*.template.test.ts`) to `out/preview/<name>.html` (names must match `ROUTES` in `docs/design-overhaul/screenshots.cjs`, plus `facility.html` (A/complete), `facility-d.html` (D, uncorrected + jeopardy deficiencies) and `facility-nr.html` (NR/withheld)) and writes the CSS to `out/preview/assets/…` with relative hrefs rewritten. Then `node docs/design-overhaul/screenshots.cjs file://$PWD/out/preview out/shots/preview`. This is the visual-verification loop for every later phase, and it needs no D1 or network beyond fonts.
- **Accept:** the stylesheet route returns 200 with `text/css` and immutable caching. A stale hash returns 200 with `max-age=300`. Favicons and the manifest resolve. `layout()` output contains no `<style>` and no `#9f1239` or "Source Sans". The masthead shows the wordmark at all three breakpoints with no horizontal overflow at 360/390px (the screenshot script flags overflow). Contrast test (§8) passes. All existing tests pass. Screenshots attached to the PR.

### Phase 2 — Components + listing surfaces
- Implement `components.ts` / `icons.ts` (§5) with unit tests.
- Migrate to `facilityCard` / `scoreChip`, with zero static inline styles left: **search results and search form** (`home.ts` `searchResultsPage`, `searchFormPage`), **city** (`city.ts`), **state** + **states hub** (`state.ts`), **best/worst** (`best.ts`), **operator** pages and hubs (`operator.ts`), **compare** (`compare.ts`, where the comparison table gets a chip per column header), **explore** sidebar/legend (`explore.ts`; map marker colors use the grade **fill** tokens, read from CSS or duplicated in one constant with a comment).
- Results header per board: count + "Sort / Filter" controls as `.select` with labels (keep the GET param names `sort`, `min_grade`), and the map toggle as `.btn--secondary` with the map icon.
- **Accept:** these templates contain no `style="` except custom properties. The NR, partial and null-metric cases render correctly (tests). Rank badges and Compare toggles work (manual check in preview: add 2 facilities, and the comparison bar appears). Screenshots desktop + mobile.

### Phase 3 — Homepage (mockup) + national distribution data
**3a. Data (do this first, separate commit).**
- New table, idempotent, no `ALTER`: `migrations/014_site_grade_distribution.sql` → `CREATE TABLE IF NOT EXISTS site_grade_distribution (bucket TEXT PRIMARY KEY, n INTEGER NOT NULL, computed_at TEXT NOT NULL);`. Buckets are `'A'…'F','NR'` and `'s00'…'s90'` (10-point score buckets, rated facilities only, with 100 folded into `s90`). The migration also backfills from `facilities`.
- `scripts/stats-sql.ts`: add `SITE_GRADE_DISTRIBUTION_REFRESH_SQL`. It must **begin with the same `CREATE TABLE IF NOT EXISTS`**, so the production data refresh self-heals even if migration 014 was never applied remotely. Then `DELETE` + `INSERT … SELECT`. Add it next to `SITE_STATS_REFRESH_SQL` in `scripts/ingest.ts` (~L453) and anywhere else `SITE_STATS_REFRESH_SQL` is used (grep `scripts/recompute-grades.ts`).
- Also add `retry_execute --file=migrations/014_site_grade_distribution.sql` to `.github/workflows/production-data-refresh.yml` next to the 012 line (~L146), and say in the PR that the workflow changed.
- `src/db.ts`: `getHomeStats(env)` returns `{ avgScore, totalFacilities, gradeCounts, scoreBuckets, computedAt } | null`. Wrap it in try/catch so a missing table yields `null` for the distribution, never a 503.
- Extend `test/stats-migration.test.ts` (it runs local D1 via wrangler) to cover the migration backfill and refresh, including NR exclusion from score buckets.
- ⚠ Do **not** apply 014 to remote D1 or run the refresh workflow. The user does that after review.

**3b. Template** (`homePage`, rewritten; keep `searchFormPage` / `searchResultsPage` from Phase 2). Sections, top to bottom:
1. **Hero** (`--bg`, two columns ≥ 960px):
   - Left: H1 per D-11 (`.display`), lede (one sentence: grades for every Medicare/Medicaid-certified nursing home, built from CMS inspection, staffing and quality data), three pillar items with teal circle icons (Independent / Data-driven / For families), and a search field (`.search-field`: ZIP input, label "ZIP code", placeholder "Enter a ZIP code", teal Search action, plus a secondary "Use my location" button, which keeps `id="geo-btn"` and `input[name="zip"]` because the layout script depends on them). Below it, `.link-arrow` "Browse by state" → `/states` (replaces the mockup's "Advanced search").
   - Right: **National overview** card (white, `--radius-lg`, `--shadow-2`): eyebrow "National overview", label "Average NursingHomeGrade score", `avgScore` big in teal-600 with "/100", a histogram of `scoreBuckets` (inline SVG built server-side: 10 bars, each bar uses its band's grade fill, axis labels 0/25/50/75/100, `role="img"` with an `aria-label` summarizing the shares), then three stat tiles "Graded A" / "Graded B–C" / "Graded D–F" as % of rated facilities, then "Data as of <CMS release date>" from `releases`. If the distribution is `null`, show the average plus total only, with no histogram.
   - Then the **current staffing stat** (`pctFailing`, "X% of homes that report RN staffing are below the 2024 benchmark") plus the existing repeal disclosure line. It moves **below the hero** as a full-width alarm callout (`--alarm` numeral) so the evidence-based claim and its disclosure survive. Keep the exact disclosure wording that `trust-copy` / `staffing-standard` tests guard.
2. **How we grade** (white band): H2, one-line explainer, "Learn our methodology →" `/how-we-grade`, and four columns: **RN staffing 35% · Health inspections 30% · Quality measures 20% · Staffing consistency 15%** (labels and sub-copy taken from the existing `how-we-grade.ts` wording, not the mockup's), plus a one-line note that uncorrected deficiencies and harm-level citations subtract points (link `/methodology`). Icons: users, shield-check (or clipboard-list), bar-chart-3, building-2.
3. **Top-rated nursing homes**: H2, sub "Highest NursingHomeGrade scores nationally", "View all →" `/best`, and 4 `facilityCard` tiles from `getTopRatedFacilities(env, 4)` (add to the handler; same 1h page cache). Horizontal scroll-snap on mobile, with no carousel JS.
4. **Facts band** (navy, D-10): `totalFacilities` "nursing homes graded", "Updated with each CMS release" + date, "0 facility payments", "Open methodology". Then `trustPillars()` and a link to `/about`.
5. **Full-story CTA** (`--teal-50` panel): "See the full story behind the score." + copy + `.btn--primary` "Find a facility" → `/search` + `.link-arrow` "Browse all states" → `/states`. Use the clipboard-list icon, not an illustration.
6. Keep the "Why this site exists" referral-fee pull quote (`home.ts:28`) somewhere on the page, restyled as a quiet editorial aside; it's core positioning. Its "$3,500" figure is sourced on `/about` (`about.ts:80`: Washington Post + Senate investigation), and its "Read more" link must keep pointing there.
- **Accept:** a test asserts the homepage contains none of `Millions`, `As seen in`, `Washington Post`, `Reuters`, `Newsweek`, `KFF`, `<img`. It renders with `distribution=null`. Histogram bar count = 10. Percentages come from counts (unit test with fixtures). Lighthouse-style sanity (manual): no CLS from the hero card (reserve height). Screenshots at 1280/390.

### Phase 4 — Facility page
`src/templates/facility.ts` (1,113 lines, 114 inline-style lines) is the highest-value page. Restructure the **presentation only**. Keep every section, id/anchor, data point, disclosure, JSON-LD and test-guarded class (`table-container quality-breakdown`, `quality-table`, `quality-value-cell` from `facility.template.test.ts`, unless you update the test with justification).
- **Header:** breadcrumb, name (h1), address + CCN + phone (`.meta`), action row (Compare toggle, Print, Share/copy-link via `navigator.share` with a fallback), and `scoreChip(lg)` on the right (desktop) or under the h1 (mobile). The giant 12rem letter goes away.
- **Sticky in-page nav** (desktop ≥ 1024px, left rail or top tabs; mobile becomes a horizontal scroll chip row) linking to the existing section ids: Summary, Staffing (`#staffing`), Inspections (`#inspections` / `#records`), Enforcement (`#enforcement`), Ownership (`#contact`), Reviews (`#reviews`), Sources (`#sources`). Mirrors the mockup's mobile list (Summary / Inspection History / Quality Measures / Staffing / About This Facility). Pure CSS/anchors.
- **Summary card:** the verdict text (`renderVerdict`), the four inputs as `statTile`s with benchmark context (RN vs the 0.55 benchmark, with the repeal note), the trajectory (`renderTrajectory`: trending-up/down icons, grade-ink colors), and the completeness notice when partial/withheld.
- **Deficiencies:** cards with a severity pill (grade-ink scale: low = slate, potential harm = C ink, actual harm = D ink, jeopardy = F ink on its tint), F-tag mono-ish label, status (corrected / uncorrected = `--alarm`). Keep the cycle grouping.
- **Staffing comparison:** horizontal bar rows (facility vs state vs national) using `--pct` custom properties.
- **Nearby / related:** `facilityCard` tiles.
- **Map:** card with `--radius-md`, uses the Phase 0 tiles.
- **Print:** chrome hidden; chip, summary, deficiencies and sources print in black with grade letters intact; URL printed after the h1.
- **Accept:** zero static inline styles. All existing facility tests pass (or are justified-updated). Preview screenshots of three fixture facilities: A/complete, D with uncorrected + jeopardy deficiencies, and NR/withheld. Print-emulation screenshot (`page.emulateMedia({ media: "print" })`).

### Phase 5 — Editorial, report and utility pages
Migrate the rest with the same rules (tokens, components, no static inline styles, prose at 72ch, tables via `.table-container`):
`about.ts`, `how-we-grade.ts` (four-weight strip reused from the home section; the scoring example keeps its guarded content), `methodology.ts`, `data-sources.ts` (full `dataFreshness` box), `faq.ts`, `glossary.ts`, `reports.ts` (all 5 report routes + state variants), `staffing-repeal.ts`, `state-report.ts`, `ask.ts` (AI search page: the input uses `.search-field`), `contact.ts`, `privacy.ts`, `terms.ts`, `subscribe.ts` (incl. `errorPage` + 404), `trust.ts`, `glossary`/FAQ JSON-LD untouched.
- Reports: charts/bars use grade fills + `--pct`. Big stat numerals use Inter 700 tabular, not Playfair.
- **Accept:** `grep -c 'style="' src/templates/*.ts` is 0 for every file except custom-property uses. The screenshot script runs clean (no overflow, no failures) across all routes at both widths.

### Phase 6 — Cleanup, OG, docs
- Delete the legacy aliases (§3.1) and every orphaned class (grep each selector in `src/styles` against `src/templates`; delete the unused ones).
- OG image rewrite + regenerate (§4).
- Update `.impeccable.md`: replace "Burgundy accent (#9f1239)…" and the font line with the new palette/type summary and point to `docs/brand/`. Keep users, voice and principles verbatim.
- Write `docs/brand/README.md`: logo usage (clear space = height of the "N"; min wordmark height 16px; never recolor except reversed; never pair with stars), the palette with contrast table, type, grade colors/descriptors, and component inventory.
- Refresh `docs/design-overhaul/after/` screenshots from the deployed site *after the user deploys* (or from preview if not deployed, clearly labelled).

---

## 7. File map (expected changes)

New: `src/styles/{tokens,base,layout,components,pages,print,index}.ts`, `src/templates/{components,icons,map-tiles}.ts`, `src/brand.generated.ts`, `scripts/generate-brand-assets.ts`, `scripts/render-preview.ts`, `migrations/014_site_grade_distribution.sql`, `docs/brand/{README.md,FONTS-LICENSE.md}`, tests in §8.
Modified: `src/index.ts` (asset routes), `src/cache.ts` (version), `src/db.ts` (`getHomeStats`), `src/handlers/home.ts`, `src/og-svg.ts`, `src/og-png.generated.ts`, all 25 `src/templates/*.ts`, `scripts/stats-sql.ts`, `scripts/ingest.ts`, possibly `scripts/recompute-grades.ts`, `.github/workflows/production-data-refresh.yml`, `package.json` (scripts, `opentype.js` devDep), `.impeccable.md`, `.gitignore` (`data/fonts/` is already covered by `data/`).
Moved: brand images → `docs/brand/`, old screenshots → `docs/archive/`. Deleted: `public/NHG.png`.

## 8. Tests to add

| Test file | Asserts |
|---|---|
| `test/design-tokens.test.ts` | WCAG contrast (implement the relative-luminance formula) ≥ 4.5 for: navy/slate-600/teal-700/every `--grade-*-ink` on `--surface` and `--bg`; white on navy-900/teal-700/grade-F-ink. ≥ 3.0 for teal-600 on white, and `--line-strong` vs both `--surface` and `--bg` (non-text UI boundary). `--line` is decorative only (cards/rules); never use it as the sole boundary of a control. Parses values from `src/styles/tokens.ts` so it can't drift. |
| `test/styles-route.test.ts` | Hashed CSS route: 200, `text/css`, immutable. Stale hash: 200, short max-age. `layout()` links `SITE_CSS_HREF`, has no `<style>`, no `#9f1239`, no `Source Sans`. Favicon/manifest routes. |
| `test/components.test.ts` | `scoreChip` for A–F/NR/partial (descriptor text, `meter--X`, filled segment count, escaping of names), `facilityCard` null metrics → "Not reported", compare-toggle id/aria contract, `gradeDescriptor` mapping. |
| `test/no-inline-styles.test.ts` | Reads each migrated `src/templates/*.ts` and fails on `style="` not followed by `--`. Starts with an allowlist of un-migrated files that each phase shrinks; empty by Phase 5. |
| `test/home.template.test.ts` | Hard-rule-1 banned strings, D-11 H1, histogram with/without distribution, % math, required internal links present. |
| extend `test/stats-migration.test.ts` | Migration 014 backfill + refresh SQL self-creates its table. |
| extend `test/internal-linking.test.ts` if needed | Masthead/footer href set unchanged. |

## 9. Verification checklist (per PR)

1. `npm test`: all green except documented pre-existing failures.
2. `npx tsc --noEmit -p .`. In the planning container it failed only because `@cloudflare/workers-types` wasn't installed; after `npm ci`, record the baseline error count and don't add new errors.
3. `npm run preview:render && node docs/design-overhaul/screenshots.cjs file://$PWD/out/preview out/shots/preview`. Open the PNGs and look at them, desktop and mobile. Attach the key ones to the PR.
4. Closer to prod: the owner checks the PR's Cloudflare Workers preview URL (Access-protected; see §10). The agent can use `scripts/load-local.sh` (needs `npm run ingest` output) + `npm run dev`, then `node docs/design-overhaul/screenshots.cjs http://localhost:8787 out/shots/local`.
5. Keyboard pass on the masthead menu, search, compare toggle and facility in-page nav (Playwright: Tab through, screenshot focus).
6. The PR description lists the user-visible changes, the cache version bump, any test changed and why, and any schema/workflow/seed impact (AGENTS.md).

## 10. Risks and open items for the owner

| Risk / open item | Handling |
|---|---|
| **Remote migration + refresh workflow ordering** (Phase 3) | The refresh SQL self-creates its table, so either order is safe. The owner still applies 014 remotely when ready. |
| **Deploys run through Cloudflare Workers Builds** (Git integration on the `nursinghomegrade` Worker). It posted a build on this plan's own PR (#73), so PRs get builds too. Whether merging to `primary` deploys production automatically has not been verified, but treat it as likely. | Treat **merge = production deploy**. Only the owner merges. Each PR build gets Branch and Commit Preview URLs (in the Cloudflare bot comment), but they sit behind **Cloudflare Access** (they redirect to `colenso.cloudflareaccess.com`), so an agent can't screenshot them without an Access service token. The executor uses the §9 preview renderer, and the owner reviews the real-data preview URL in a browser. Previews likely use the Worker's production bindings (D1/KV). That's unverified, so treat previews as read-only and don't submit `/subscribe` from one. |
| **Search-engine re-render.** Every page's HTML changes at once. | No URLs, titles, H1s (except home, D-11), canonicals or links change, so SEO risk is low. Watch Search Console coverage for 2 weeks after Phase 2–4 deploys. |
| **OSM tile policy** at higher traffic | Recorded in D-17. Revisit if map views grow. |
| **Social links** `twitter.com/nursinghomegrade` and `linkedin.com/company/nursinghomegrade` are in the footer today, and whether these accounts exist is **unverified**. | Kept as-is (not this plan's scope). The owner should confirm or remove them. |
| **Font download blocked** in the executor's sandbox | Use the §4 fallback for the in-page wordmark only, and report it. OG/PNG assets need outlines. |
| Board shows +/- grades and relative descriptors | Overridden by D-7 and hard rule 2. If the owner wants +/- later, that's a scoring and methodology change with its own PR. |

## 11. Effort estimate (agent-hours, rough)

Phase 0: 0.5 · Phase 1: 4–6 · Phase 2: 4–6 · Phase 3: 4–5 · Phase 4: 4–6 · Phase 5: 4–6 · Phase 6: 1–2. **Total ≈ 22–32 agent-hours**, dominated by inline-style removal in facility/reports/operator/city/state.

---

## Appendix A — Prompt to hand the executing agent

> You are executing `docs/design-overhaul/PLAN.md` in `michaelcolenso/nursinghomegrade.com`. Read the whole plan, `AGENTS.md`, `.impeccable.md`, and look at the images in `docs/brand/` (or the repo root if Phase 1 hasn't moved them yet) before writing code. Start with the baseline in §0. Execute phases in order (Phase 0 can ship alone), one PR per phase from `primary`, following §6 acceptance lists and §9 verification. Decisions in §2 are final; do not reopen them. If reality contradicts the plan (a file moved, a test guards something the plan didn't anticipate, the font download is blocked), choose the option that best preserves the hard rules in §0, note it in the PR under "Deviations from plan", and continue. Never deploy, run remote D1 commands, or merge. Stop after each PR is opened and CI is green, and report: what changed, test results, screenshots reviewed, deviations, and anything needing the owner's decision.
