// Shared branded OG image markup, served as SVG at /og.svg and rasterized to
// public/og.png by scripts/generate-og-image.ts (Twitter/Facebook/LinkedIn
// don't render SVG previews, so /og.png is the default used in meta tags).
export const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B1D33"/>
  <rect x="80" y="200" width="70" height="200" rx="6" fill="#E6EBEF"/>
  <rect x="200" y="200" width="70" height="200" rx="6" fill="#E6EBEF"/>
  <line x1="80" y1="400" x2="270" y2="200" stroke="#16897A" stroke-width="22" stroke-linecap="round"/>
  <line x1="110" y1="400" x2="300" y2="200" stroke="#16897A" stroke-width="22" stroke-linecap="round"/>
  <text x="360" y="300" font-family="Playfair Display,Georgia,serif" font-size="66" fill="#F7F9FA" font-weight="700">NursingHomeGrade</text>
  <text x="362" y="360" font-family="Playfair Display,Georgia,serif" font-size="26" fill="#16897A">Independent ratings · CMS data</text>
  <text x="362" y="398" font-family="Playfair Display,Georgia,serif" font-size="26" fill="#16897A">No conflicts of interest</text>
</svg>`;
