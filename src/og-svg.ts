// Shared branded OG image markup, served as SVG at /og.svg and rasterized to
// public/og.png by scripts/generate-og-image.ts (Twitter/Facebook/LinkedIn
// don't render SVG previews, so /og.png is the default used in meta tags).
// Composed from the outlined brand assets (src/brand.generated.ts): sharp cannot
// resolve webfonts, so there is deliberately no <text> here.
import {
  APP_ICON_SVG,
  OG_TAGLINE_ASPECT,
  OG_TAGLINE_SVG_INNER,
  OG_TAGLINE_VIEWBOX,
  WORDMARK_ASPECT,
  WORDMARK_SVG_INNER_REVERSED,
  WORDMARK_VIEWBOX,
} from "./brand.generated";

const W = 1200;
const H = 630;
const ICON = 220;
const TEXT_X = 360;
const WORDMARK_W = 740;
const TAGLINE_W = 520;
const GAP = 40;

const wordmarkH = WORDMARK_W / WORDMARK_ASPECT;
const taglineH = TAGLINE_W / OG_TAGLINE_ASPECT;
const blockTop = (H - (wordmarkH + GAP + taglineH)) / 2;
const r = (n: number) => Math.round(n * 100) / 100;

// APP_ICON_SVG is a standalone <svg>; position it by adding x/y/width/height to the root.
const icon = APP_ICON_SVG.replace(
  "<svg ",
  `<svg x="80" y="${r((H - ICON) / 2)}" width="${ICON}" height="${ICON}" `,
);

export const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0B1D33"/>${icon}<svg x="${TEXT_X}" y="${r(blockTop)}" width="${WORDMARK_W}" height="${r(wordmarkH)}" viewBox="${WORDMARK_VIEWBOX}">${WORDMARK_SVG_INNER_REVERSED}</svg><svg x="${TEXT_X}" y="${r(blockTop + wordmarkH + GAP)}" width="${TAGLINE_W}" height="${r(taglineH)}" viewBox="${OG_TAGLINE_VIEWBOX}">${OG_TAGLINE_SVG_INNER}</svg></svg>`;
