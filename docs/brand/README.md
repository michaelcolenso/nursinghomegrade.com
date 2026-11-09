# NursingHomeGrade brand and design system

Source of truth for how the site looks. Values here mirror `src/styles/tokens.ts` (colors, type, spacing) and
`src/templates/components.ts` (components); if they disagree, the code wins and this file is stale. `test/design-tokens.test.ts`
enforces the contrast pairs below.

Reference artwork: `NHG.png` (icon), `nhg_design.jpg` (brand board), `homepage-mockup.jpg` (homepage target).
Font licensing: `FONTS-LICENSE.md`.

## Logo

Both marks are embedded as outlined SVG paths by `scripts/generate-brand-assets.ts` into `src/brand.generated.ts`
(committed; the Worker has no static assets). Never edit the generated file by hand.

The wordmark (v3) is supplied artwork, not generated from fonts: source files, PNG exports, proof sheet and designer notes
live in `docs/brand/wordmark/`. The generator reads `wordmark-primary.svg` and derives the reversed variant from it.

| Mark | Use | Code |
|---|---|---|
| Wordmark v3: "NursingHome" navy + "Grade" navy on a yellow (#F4D35E) highlight, outlined serif | Site header, footer, OG image, anywhere the name appears as a logo | `wordmark()` in `components.ts`; `WORDMARK_SVG_INNER[_REVERSED]` |
| Icon: two muted-teal bars, teal slash, navy block with "NHG" | App icon, avatar, small square slots | `ICON_SVG`, `APP_ICON_SVG`, PNG exports |
| Favicon: bars and slash only, no lettering (illegible at 16px) | Browser tab | `FAVICON_SVG`, `FAVICON_32_PNG_BASE64` |

Rules (recommendations from the brand brief, not contract requirements):

- **Clear space:** the SVG viewBox already includes a small margin; keep at least the height of the "N" clear on every side.
- **Minimum size:** horizontal wordmark no narrower than ~200px (site: 34px tall desktop, 26px on phones ≈ 216px wide);
  the designer flags 240px as the legibility limit. Below that use `wordmark-stacked.svg` or the icon.
- **Color:** navy (#0B1F3B) on light backgrounds. Reversed (on navy): "NursingHome" in cream (#FFFDF7), "Grade" stays navy
  on the yellow highlight. The supplied `wordmark-reversed.svg` puts cream on yellow (~1.1:1, unreadable) and is not used.
  Monochrome (`wordmark-monochrome.svg`, no highlight) for print/single-ink. No other recolors, gradients, outlines or shadows.
- Do not use an "A" grade seal as the company icon; it can be confused with a facility rating.
- **Never** stretch, rotate, re-set in another font, or pair the logo with star icons (the site rates by letter grade, not stars).

Regenerate after any wordmark, font or geometry change:

```
python3 scripts/brand/instance-fonts.py   # once: fetch fonts, cut static instances into data/fonts/
npm run brand-assets                      # rewrites src/brand.generated.ts
npx tsx scripts/generate-og-image.ts      # rewrites public/og.png and src/og-png.generated.ts
```

The social-share image (`/og.png`, also `/og.svg`) is composed in `src/og-svg.ts` from those outlines: navy field, icon left,
reversed wordmark, and the tagline "Independent nursing home grades from official CMS data" as outlined Inter Medium.
It deliberately contains no `<text>`: the rasterizer cannot resolve webfonts and a fallback serif would silently change the brand.

## Color

| Token | Hex | Role |
|---|---|---|
| `--navy-900` | `#0B1D33` | Ink, primary buttons, dark bands |
| `--navy-800` | `#1A2E4A` | Primary button hover |
| `--teal-600` | `#16897A` | Brand teal: fills, marks, large numerals. Large text and UI only |
| `--teal-700` | `#0F6E62` | Links, teal buttons, small teal text, focus ring |
| `--teal-800` | `#0B5A50` | Teal hover |
| `--teal-50` | `#E8F3F1` | Tint panels |
| `--slate-600` | `#60717D` | Muted text |
| `--line` | `#E6EBEF` | Rules and card borders. Decorative only, never the sole edge of a control |
| `--line-strong` | `#7F8F9B` | Input and secondary-button borders |
| `--bg` / `--surface` | `#F7F9FA` / `#FFFFFF` | Page / cards |

There is no burgundy. "Bad" is expressed with `--alarm` (= `--grade-F-ink`).

### Contrast (computed from the hex values above, WCAG 2.x ratio)

| Foreground | Background | Ratio | Use |
|---|---|---|---|
| navy-900 | white / bg | 16.97 / 16.07 | Body text |
| teal-700 | white / bg | 6.13 / 5.80 | Links, small teal text |
| teal-600 | white | 4.29 | Large text and UI only (fails 4.5 for small text) |
| slate-600 | white / bg | 5.05 / 4.79 | Muted text |
| line-strong | white / bg | 3.33 / 3.15 | Control borders (needs 3.0, WCAG 1.4.11) |
| #D3DEE7 (OG tagline) | navy-900 | 12.42 | OG image |

## Typography

- `--font-display`: Playfair Display, Georgia, serif. Headings (`h1`, `h2`), the home `.display`, the wordmark.
- `--font-ui`: Inter, system-ui, sans-serif. Body (17px / 1.6), `h3`, labels, controls, all numerals.
- Numerals (scores, stats): Inter 700 with `font-variant-numeric: tabular-nums`.
- Eyebrows: 0.75rem, 600, uppercase, 0.08em tracking, slate-600.
- Prose measure 72ch; layout container 1200px; page gutter 16px up to 640px, 24px above.

Both families are loaded from Google Fonts at runtime (`src/templates/layout.ts`).

## Grades

Letter, descriptor and color are always shown together; color is never the only signal.
Descriptors are absolute bands, never relative ("above average" is not used). Thresholds live in `src/scoring.ts`
and are explained on `/how-we-grade`.

| Grade | Descriptor | Fill (bars, borders, meter) | Ink (text) | Ink on tint |
|---|---|---|---|---|
| A | Strong | `#12805D` | `#12805D` | 4.54 |
| B | Good | `#1FA38C` | `#177968` | 4.73 |
| C | Fair | `#F5B23D` | `#8A5A00` | 5.43 |
| D | Poor | `#E4573D` | `#B4361C` | 5.25 |
| F | Failing | `#B91C1C` | `#B91C1C` | 5.56 |
| NR | Not rated | `#C9D2D9` | `#60717D` | 4.53 |

Tints (`--grade-X-tint`) are panel backgrounds. Use **ink**, not fill, for any text. The score meter is ten segments of ten points
and is decorative: the number is always present as text. Withheld grades render as NR with a notice, never as a low grade.

## Components

All in `src/templates/components.ts` unless noted; styles in `src/styles/components.ts`.

`wordmark` · `scoreMeter` · `scoreChip` (and its browser twin `COMPARE_CHIP_JS`) · `gradePill` · `starRating` (CMS star data only) ·
`statTile` · `breadcrumb` · `gradeDistribution` · `scoreBar` / `scoreTrack` · `compareToggle` · `facilityCard` · `operatorCard` ·
`section` · `trustPillars`. Helpers: `gradeKey`, `gradeDescriptor`, `bandForScore`, `facilityHref`.
Icons are inline Lucide (ISC) plus brand glyphs in `src/templates/icons.ts`. Shared escaping is in `src/templates/escape.ts`.

Conventions:

- No inline `style` attributes (enforced by test). Add a class instead.
- Motion is 150ms ease-out color/border/shadow only; `prefers-reduced-motion` disables it.
- Interactive targets are at least 44px on touch.
- Print: chrome hidden, content black, grade letters preserved (`src/styles/print.ts`).
- The stylesheet is external and content-hashed (`/assets/site.<hash>.css`). Changing rendered HTML requires bumping `HTML_CACHE_VERSION` in `src/cache.ts`.

Do not add a new page-specific pattern if a component above fits; extend the component instead.
