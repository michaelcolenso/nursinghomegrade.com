// Before/after screenshot helper for the design overhaul.
//
// Usage:
//   node docs/design-overhaul/screenshots.cjs <baseUrl> <outDir>
//   node docs/design-overhaul/screenshots.cjs https://nursinghomegrade.com out/shots/before
//   node docs/design-overhaul/screenshots.cjs http://localhost:8787 out/shots/after
//   node docs/design-overhaul/screenshots.cjs file://$PWD/out/preview out/shots/preview
//
// With a file:// base it loads <name>.html files (including facility,
// facility-d and facility-nr fixtures) written by
// scripts/render-preview.ts (Phase 1) instead of routes.
// Uses the pre-installed Playwright; do not `playwright install`.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.argv[2] || "https://nursinghomegrade.com").replace(/\/$/, "");
const outDir = process.argv[3] || "out/shots";
const isFile = base.startsWith("file://");

// [name, route]. Facility/city/operator slugs are discovered from search.
const ROUTES = [
  ["home", "/"],
  ["search", "/search?zip=10044"],
  ["search-empty", "/search"],
  ["state", "/state/new-york"],
  ["city", "/state/new-york/new-york"],
  ["operators", "/operators"],
  ["operators-best", "/operators/best"],
  ["operators-worst", "/operators/worst"],
  ["states", "/states"],
  ["best", "/best"],
  ["worst", "/worst"],
  ["compare", "/compare"],
  ["explore", "/explore"],
  ["how-we-grade", "/how-we-grade"],
  ["methodology", "/methodology"],
  ["about", "/about"],
  ["faq", "/faq"],
  ["report-staffing", "/reports/staffing-failures"],
  ["report-repeal", "/reports/staffing-standard-repeal"],
  ["data-sources", "/data-sources"],
  ["contact", "/contact"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["glossary", "/glossary"],
  ["ask", "/ask"],
  ["not-found", "/this-page-does-not-exist"],
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const viewports = [
    ["desktop", { width: 1280, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ];
  const routes = [...ROUTES];
  if (isFile) {
    // scripts/render-preview.ts must emit these facility fixtures (A/complete,
    // D with uncorrected + jeopardy deficiencies, NR/withheld) — see PLAN §6 Phase 4.
    routes.push(["facility", ""], ["facility-d", ""], ["facility-nr", ""], ["operator", ""], ["home-no-dist", ""], ["report-state-staffing", ""], ["report-high-deficiency", ""], ["report-chains", ""], ["report-uncorrected", ""], ["state-report", ""], ["ask-answer", ""], ["subscribed", ""], ["error", ""]);
  } else {
    const probe = await browser.newPage();
    try {
      await probe.goto(base + "/search?zip=10044", { waitUntil: "domcontentloaded", timeout: 45000 });
      const fac = await probe.$eval('a[href^="/facility/"]', (a) => a.getAttribute("href")).catch(() => null);
      if (fac) routes.push(["facility", fac]);
    } catch (e) {
      console.log("probe failed:", e.message);
    }
    await probe.close();
  }
  for (const [vpName, viewport] of viewports) {
    for (const [name, route] of routes) {
      const url = isFile ? `${base}/${name}.html` : base + route;
      if (isFile && !fs.existsSync(new URL(url))) {
        console.log(`${vpName} ${name}: MISSING ${name}.html (render-preview did not emit it)`);
        continue;
      }
      // Fresh page per route so one failed navigation can't poison the next.
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
        await page.screenshot({ path: path.join(outDir, `${name}-${vpName}.png`), fullPage: false });
        await page.screenshot({ path: path.join(outDir, `${name}-${vpName}-full.png`), fullPage: true });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        console.log(`${vpName} ${name}: ok${overflow ? "  ⚠ horizontal overflow" : ""}`);
      } catch (e) {
        console.log(`${vpName} ${name}: FAILED ${e.message.split("\n")[0]}`);
      }
      await page.close();
    }
  }
  await browser.close();
})();
