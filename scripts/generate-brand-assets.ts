// Brand asset generator (PLAN §4). Outlines the NursingHomeGrade wordmark and
// the NHG icon from font glyphs, rasterizes favicon/app icons with sharp, and
// writes src/brand.generated.ts (committed; the Worker has no static assets).
//
//   python3 scripts/brand/instance-fonts.py   # once: fetch fonts + cut static instances into data/fonts/
//   npm run brand-assets
//
// Fonts are SIL OFL 1.1 (Playfair Display, Inter); outlined glyphs in a logo
// are permitted. See docs/brand/FONTS-LICENSE.md.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import * as opentypeNs from "opentype.js";

// opentype.js ships no type declarations; keep the surface we use explicit.
interface BBox { x1: number; y1: number; x2: number; y2: number }
interface OTPath { toPathData(decimals?: number): string; getBoundingBox(): BBox }
interface OTFont {
  unitsPerEm: number;
  tables: { os2: { sCapHeight: number } };
  getPath(text: string, x: number, y: number, size: number, opts?: { kerning?: boolean }): OTPath;
  getAdvanceWidth(text: string, size: number, opts?: { kerning?: boolean }): number;
  charToGlyph(ch: string): unknown;
  getKerningValue(left: unknown, right: unknown): number;
}
type OpenType = { parse(buf: ArrayBuffer): OTFont };
// tsx may surface the package as a namespace or behind `default` depending on the module format.
const ns = opentypeNs as unknown as OpenType & { default?: OpenType };
const opentype: OpenType = typeof ns.parse === "function" ? ns : (ns.default as OpenType);

const NAVY = "#0B1D33";
const TEAL = "#16897A";
const MUTED_TEAL = "#9DBDB8"; // the board's muted teal-gray bars
const WHITE = "#FFFFFF";


// opentype.js 2.0's multi-glyph getPath() emits NaN coordinates for these fonts,
// so lay text out glyph by glyph: advance widths + kern-table pairs, in font units.
function layoutText(font: OTFont, text: string, x0: number, y0: number, size: number, tracking = 0) {
  const scale = size / font.unitsPerEm;
  let x = x0;
  const parts: { d: string; box: BBox }[] = [];
  const chars = [...text];
  chars.forEach((ch, i) => {
    // opentype.js 2.0 returns NaN for x offsets carrying float noise (70.10000000000001); snap to 0.1 unit.
    const p = font.getPath(ch, Math.round(x * 10) / 10, y0, size);
    parts.push({ d: p.toPathData(2), box: p.getBoundingBox() });
    x += font.getAdvanceWidth(ch, size) + tracking;
    const next = chars[i + 1];
    if (next) x += (font.getKerningValue(font.charToGlyph(ch), font.charToGlyph(next)) || 0) * scale;
  });
  // Whitespace legitimately has no outline; every other glyph must produce a finite path.
  const bad = parts.map((p, i) => (p.d.includes("NaN") || (!p.d && (chars[i] ?? "").trim() !== "") ? (chars[i] ?? "") + "@" + p.d.slice(0, 20) : "")).filter(Boolean);
  if (bad.length) throw new Error(`Bad glyph path while laying out "${text}": ${bad.join(" ")}`);
  return { parts, advance: x - x0 };
}

function loadFont(file: string): OTFont {
  const path = `data/fonts/${file}`;
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run: python3 scripts/brand/instance-fonts.py`);
  }
  const buf = readFileSync(path);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

const r = (n: number) => Math.round(n * 100) / 100;

// ── Wordmark ──────────────────────────────────────────────────────────────
// "NursingHomeGrade" Playfair SemiBold (navy) + ".com" Playfair Regular (teal)
// at 0.52x, sharing the baseline, 0.03em gap. Drawn at 100 units per em.
function buildWordmark() {
  const semi = loadFont("PlayfairDisplay-SemiBold.ttf");
  const regular = loadFont("PlayfairDisplay-Regular.ttf");
  const SIZE = 100;
  const main = layoutText(semi, "NursingHomeGrade", 0, 0, SIZE);
  const com = layoutText(regular, ".com", main.advance + 0.03 * SIZE, 0, SIZE * 0.52);
  const all = [...main.parts, ...com.parts];
  const x1 = Math.min(...all.map((p) => p.box.x1));
  const y1 = Math.min(...all.map((p) => p.box.y1));
  const x2 = Math.max(...all.map((p) => p.box.x2));
  const y2 = Math.max(...all.map((p) => p.box.y2));
  const w = x2 - x1;
  const h = y2 - y1;
  const mainD = main.parts.map((p) => p.d).join("");
  const comD = com.parts.map((p) => p.d).join("");
  return {
    viewBox: `${r(x1)} ${r(y1)} ${r(w)} ${r(h)}`,
    aspect: r(w / h),
    inner: (ink: string) => `<path fill="${ink}" d="${mainD}"/><path fill="${TEAL}" d="${comD}"/>`,
  };
}

// ── OG tagline ────────────────────────────────────────────────────────────
// Outlined Inter Medium, two lines, for the social-share image (src/og-svg.ts).
// Outlines, not <text>: sharp cannot resolve webfonts, and a fallback serif would
// silently change the brand.
function buildOgTagline() {
  const inter = loadFont("Inter-Medium.ttf");
  const SIZE = 100;
  const LINE_HEIGHT = 135;
  const lines = ["Independent nursing home grades", "from official CMS data"];
  const laid = lines.map((t, i) => layoutText(inter, t, 0, i * LINE_HEIGHT, SIZE));
  const all = laid.flatMap((l) => l.parts).filter((p) => p.d); // spaces have no outline (and a 0,0,0,0 box)
  const x1 = Math.min(...all.map((p) => p.box.x1));
  const y1 = Math.min(...all.map((p) => p.box.y1));
  const x2 = Math.max(...all.map((p) => p.box.x2));
  const y2 = Math.max(...all.map((p) => p.box.y2));
  return {
    viewBox: `${r(x1)} ${r(y1)} ${r(x2 - x1)} ${r(y2 - y1)}`,
    aspect: r((x2 - x1) / (y2 - y1)),
    inner: `<path fill="#D3DEE7" d="${all.map((p) => p.d).join("")}"/>`,
  };
}

// ── Icon mark (board §1 "Icon / Mark") ────────────────────────────────────
// Native grid 117 x 110: two muted-teal squares, a teal parallelogram slash
// above the right half, and a navy block with "NHG" in Inter ExtraBold.
const MARK_W = 117;
const MARK_H = 110;
const BARS_AND_SLASH = [
  `<rect x="0" y="9" width="24" height="34" fill="${MUTED_TEAL}"/>`,
  `<rect x="28" y="9" width="24" height="34" fill="${MUTED_TEAL}"/>`,
  `<polygon points="57,43 91,43 117,0 86,0" fill="${TEAL}"/>`,
].join("");

function buildNhgLetters(): string {
  const inter = loadFont("Inter-ExtraBold.ttf");
  const capRatio = inter.tables.os2.sCapHeight / inter.unitsPerEm;
  const CAP = 32;
  const size = CAP / capRatio;
  const tracking = -0.02 * size;
  const layout = (ox: number, oy: number) => layoutText(inter, "NHG", ox, oy, size, tracking).parts;
  const first = layout(0, 0);
  const x1 = Math.min(...first.map((p) => p.box.x1));
  const x2 = Math.max(...first.map((p) => p.box.x2));
  const y1 = Math.min(...first.map((p) => p.box.y1));
  const y2 = Math.max(...first.map((p) => p.box.y2));
  // Center the glyph box in the navy block (y 52..110).
  const cx = MARK_W / 2;
  const cy = 52 + (MARK_H - 52) / 2;
  const ox = cx - (x1 + x2) / 2;
  const oy = cy - (y1 + y2) / 2;
  return layout(ox, oy).map((p) => p.d).join("");
}

function markInner(opts: { block: boolean }): string {
  const d = buildNhgLetters();
  return [
    BARS_AND_SLASH,
    opts.block ? `<rect x="0" y="52" width="${MARK_W}" height="${MARK_H - 52}" fill="${NAVY}"/>` : "",
    `<path d="${d}" fill="${WHITE}"/>`,
  ].join("");
}

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_W} ${MARK_H}" role="img" aria-label="NHG">${markInner({ block: true })}</svg>`;

function appIcon(opts: { rounded: boolean }): string {
  const SIZE = 512;
  const target = 300; // mark width inside the tile
  const s = target / MARK_W;
  const tx = (SIZE - target) / 2;
  const ty = (SIZE - MARK_H * s) / 2;
  const radius = opts.rounded ? 112 : 0; // ~22% of the side
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="NursingHomeGrade"><rect width="${SIZE}" height="${SIZE}" rx="${radius}" fill="${NAVY}"/><g transform="translate(${r(tx)} ${r(ty)}) scale(${r(s)})">${markInner({ block: false })}</g></svg>`;
}

// Small-size favicon: no "NHG" text (illegible at 16px); chunkier bars + slash.
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${NAVY}"/><rect x="5" y="12" width="5.5" height="11" fill="${MUTED_TEAL}"/><rect x="12.5" y="12" width="5.5" height="11" fill="${MUTED_TEAL}"/><polygon points="19.5,23 24.5,23 28,8 23,8" fill="${TEAL}"/></svg>`;

// Render at 2x the target (SVG user units are 1px at 72 dpi), then downsample.
async function png(svg: string, px: number, nativeSize: number): Promise<string> {
  const buf = await sharp(Buffer.from(svg), { density: Math.round(72 * (px / nativeSize) * 2) })
    .resize(px, px)
    .png()
    .toBuffer();
  return buf.toString("base64");
}

async function main() {
  const wm = buildWordmark();
  const tag = buildOgTagline();
  const roundedApp = appIcon({ rounded: true });
  const squareApp = appIcon({ rounded: false });

  const out = `// Generated by scripts/generate-brand-assets.ts. Do not edit by hand.
// Regenerate: python3 scripts/brand/instance-fonts.py && npm run brand-assets
// Wordmark and "NHG" lettering are outlined glyphs (Playfair Display, Inter; SIL OFL 1.1).
export const WORDMARK_VIEWBOX = ${JSON.stringify(wm.viewBox)};
export const WORDMARK_ASPECT = ${wm.aspect};
export const WORDMARK_SVG_INNER = ${JSON.stringify(wm.inner(NAVY))};
export const WORDMARK_SVG_INNER_REVERSED = ${JSON.stringify(wm.inner(WHITE))};
export const OG_TAGLINE_VIEWBOX = ${JSON.stringify(tag.viewBox)};
export const OG_TAGLINE_ASPECT = ${tag.aspect};
export const OG_TAGLINE_SVG_INNER = ${JSON.stringify(tag.inner)};
export const ICON_SVG = ${JSON.stringify(ICON_SVG)};
export const APP_ICON_SVG = ${JSON.stringify(roundedApp)};
export const FAVICON_SVG = ${JSON.stringify(FAVICON_SVG)};
export const FAVICON_32_PNG_BASE64 = ${JSON.stringify(await png(FAVICON_SVG, 32, 32))};
export const APPLE_TOUCH_180_PNG_BASE64 = ${JSON.stringify(await png(squareApp, 180, 512))};
export const ICON_192_PNG_BASE64 = ${JSON.stringify(await png(roundedApp, 192, 512))};
export const ICON_512_PNG_BASE64 = ${JSON.stringify(await png(roundedApp, 512, 512))};
`;
  writeFileSync("src/brand.generated.ts", out);
  console.log(`Wrote src/brand.generated.ts (${out.length} bytes); wordmark viewBox ${wm.viewBox}, aspect ${wm.aspect}`);
}

main();
