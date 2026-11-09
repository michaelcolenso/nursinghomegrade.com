import type { Facility } from "../types";
import type { HomeStats } from "../db";
import { layout, escHtml } from "./layout";
import { RN_BENCHMARK, repealDisclosureHtml } from "../staffing-standard";
import type { DataRelease } from "./data-sources";
import { dataFreshness, latestCmsRelease } from "./data-freshness";
import { bandForScore, facilityCard, section, statTile, trustPillars } from "./components";
import { icon, type IconName } from "./icons";

export interface HomePageExtras {
  /** National figures; null/undefined when unavailable (the overview card then degrades). */
  stats?: HomeStats | null;
  /** Highest-graded facilities, nationally. */
  topRated?: Facility[];
}

/**
 * Whole-number percentages of the given counts that always sum to 100
 * (largest-remainder), so three tiles never read 99% or 101%.
 */
export function sharesToPercents(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map((c) => (100 * c) / total);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remaining--;
  }
  return floors;
}

const BAR_W = 24;
const BAR_GAP = 6;
const CHART_W = 10 * BAR_W + 9 * BAR_GAP; // 294
const CHART_H = 112;
const BASE_Y = 96;
const MAX_BAR = 92;

/** Ten-bar score histogram as server-rendered SVG. Bars take the grade band of their bucket's midpoint. */
export function scoreHistogram(buckets: number[], summary: string): string {
  const max = Math.max(...buckets, 0);
  const bars = buckets
    .map((n, i) => {
      const h = max > 0 && n > 0 ? Math.max(3, Math.round((MAX_BAR * n) / max)) : 0;
      const x = i * (BAR_W + BAR_GAP);
      const band = bandForScore(i * 10 + 5);
      return `<rect class="hist-bar hist-bar--${band}" x="${x}" y="${BASE_Y - h}" width="${BAR_W}" height="${h}" rx="2"><title>${i * 10}–${i === 9 ? 100 : i * 10 + 9}: ${n.toLocaleString("en-US")} facilities</title></rect>`;
    })
    .join("");
  const axis = [0, 25, 50, 75, 100]
    .map((v) => {
      const x = Math.round((v / 100) * CHART_W);
      const anchor = v === 0 ? "start" : v === 100 ? "end" : "middle";
      return `<text class="hist-axis" x="${x}" y="${CHART_H - 2}" text-anchor="${anchor}">${v}</text>`;
    })
    .join("");
  return `<svg class="hist" viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="${escHtml(summary)}" xmlns="http://www.w3.org/2000/svg"><line class="hist-base" x1="0" y1="${BASE_Y + 1}" x2="${CHART_W}" y2="${BASE_Y + 1}"/>${bars}${axis}</svg>`;
}

function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "National overview" card: real average, real histogram, real A / B–C / D–F shares. */
function overviewCard(stats: HomeStats | null | undefined, releases: DataRelease[]): string {
  if (!stats) {
    return `<aside class="overview" aria-label="National overview"><p class="eyebrow">National overview</p><p class="overview-note">National figures are temporarily unavailable.</p></aside>`;
  }
  const latest = latestCmsRelease(releases);
  const asOf = latest ? `<p class="overview-asof">Data as of <time datetime="${latest.iso}">${latest.label}</time></p>` : "";
  const head = `<p class="eyebrow">National overview</p>
      <p class="overview-label">Average NursingHomeGrade score</p>
      <p class="overview-score"><span class="overview-score-num">${formatScore(stats.avgScore)}</span><span class="overview-score-max">/100</span></p>`;
  const dist = stats.distribution;
  if (!dist) {
    return `<aside class="overview" aria-label="National overview">${head}
      <p class="overview-note">Across ${stats.totalFacilities.toLocaleString("en-US")} graded nursing homes. Rated facilities only.</p>
      ${asOf}</aside>`;
  }
  const c = dist.gradeCounts;
  const rated = c.A + c.B + c.C + c.D + c.F;
  const [a = 0, bc = 0, df = 0] = sharesToPercents([c.A, c.B + c.C, c.D + c.F]);
  const summary = `Distribution of NursingHomeGrade scores across ${rated.toLocaleString("en-US")} rated nursing homes: ${a}% graded A, ${bc}% graded B or C, ${df}% graded D or F. Bars are coloured by the grade band at the middle of each 10-point range.`;
  return `<aside class="overview" aria-label="National overview">${head}
      ${scoreHistogram(dist.scoreBuckets, summary)}
      <div class="overview-tiles">
        ${statTile("Graded A", `<span class="grade-A">${a}%</span>`)}
        ${statTile("Graded B–C", `<span class="grade-B">${bc}%</span>`)}
        ${statTile("Graded D–F", `<span class="grade-D">${df}%</span>`)}
      </div>
      <p class="overview-note">Share of ${rated.toLocaleString("en-US")} rated nursing homes${c.NR > 0 ? `; ${c.NR.toLocaleString("en-US")} more are not rated` : ""}.</p>
      ${asOf}</aside>`;
}

function pillarItem(name: IconName, title: string, text: string): string {
  return `<li class="hero-pillar"><span class="pillar-icon">${icon(name, { size: 20 })}</span><span class="pillar-text"><strong>${title}</strong><span>${text}</span></span></li>`;
}

const WEIGHTS: Array<{ icon: IconName; pct: string; label: string; text: string }> = [
  { icon: "users", pct: "35%", label: "RN staffing", text: `Reported RN hours per resident per day, against the 2024 benchmark of ${RN_BENCHMARK} hours.` },
  { icon: "shield-check", pct: "30%", label: "Inspection record", text: "Health deficiencies CMS records for the most recent rating cycle." },
  { icon: "bar-chart-3", pct: "20%", label: "Quality measures", text: "The CMS quality-measure star rating." },
  { icon: "building-2", pct: "15%", label: "Staffing rating", text: "The CMS staffing star rating." },
];

export function homePage(pctFailing: number, releases: DataRelease[] = [], extras: HomePageExtras = {}): string {
  const { stats = null, topRated = [] } = extras;
  const latest = latestCmsRelease(releases);

  const hero = `
    <section class="home-hero">
      <div class="container home-hero-grid">
        <div class="home-hero-copy">
          <h1 class="display">Independent nursing home grades.</h1>
          <p class="home-tagline">Better decisions, from official CMS inspection and staffing data.</p>
          <p class="lede">NursingHomeGrade.com grades every Medicare- and Medicaid-certified nursing home in the U.S. from CMS inspection, staffing and quality data, so families can choose with confidence.</p>
          <ul class="hero-pillars list-plain">
            ${pillarItem("shield-check", "Independent", "No facility payments. No conflicts of interest.")}
            ${pillarItem("database", "Data-driven", "Official CMS inspection, staffing and quality data.")}
            ${pillarItem("users", "For families", "Clear information. Better decisions.")}
          </ul>
          <form action="/search" method="GET" class="home-search">
            <label for="zip-search" class="field-label">ZIP code</label>
            <div class="search-field">
              <span class="search-field-icon">${icon("search", { size: 20 })}</span>
              <input type="text" id="zip-search" name="zip" placeholder="Enter a ZIP code" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code" inputmode="numeric">
              <button type="submit" class="btn btn--action">Search</button>
            </div>
            <button type="button" id="geo-btn" class="btn btn--secondary geo-btn">${icon("map-pin", { size: 18 })} Use my location</button>
          </form>
          <p class="hero-links">
            <a class="link-arrow" href="/states">Browse by state ${icon("arrow-right", { size: 16 })}</a>
            <a class="link-arrow" href="/ask">Or ask a question about nursing home care ${icon("arrow-right", { size: 16 })}</a>
          </p>
        </div>
        ${overviewCard(stats, releases)}
      </div>
    </section>`;

  const staffing = `
    <section class="home-alert">
      <div class="container">
        <div class="alert-card">
          <p class="alert-num" aria-hidden="true">${pctFailing}%</p>
          <div>
            <p class="alert-text"><strong>${pctFailing}% of U.S. nursing homes that report RN staffing</strong> staff below the level the 2024 federal rule would have required. Independent grades based on CMS data — no facility payments, no conflicts.</p>
            ${repealDisclosureHtml()}
          </div>
        </div>
      </div>
    </section>`;

  const howWeGrade = section({
    id: "how-we-grade",
    title: "How we grade nursing homes",
    intro: "We combine four areas of CMS data into a single 0–100 score and an A–F grade.",
    action: `<a class="link-arrow" href="/how-we-grade">Learn our methodology ${icon("arrow-right", { size: 16 })}</a>`,
    body: `<ul class="weights list-plain">
        ${WEIGHTS.map((w) => `<li class="weight"><span class="weight-icon">${icon(w.icon, { size: 28 })}</span><span class="weight-pct">${w.pct}</span><h3 class="weight-label">${w.label}</h3><p class="weight-text">${w.text}</p></li>`).join("")}
      </ul>
      <p class="weights-note">Uncorrected deficiencies and harm-level citations then subtract points. <a href="/methodology">See the full methodology.</a></p>
      ${dataFreshness(releases)}`,
  });

  const top = topRated.length
    ? section({
        id: "top-rated",
        tone: "plain",
        title: "Top-rated nursing homes",
        intro: "Highest NursingHomeGrade scores nationally.",
        action: `<a class="btn btn--secondary" href="/best">View all ${icon("arrow-right", { size: 16 })}</a>`,
        body: `<div class="tile-scroller">${topRated
          .slice(0, 4)
          .map((f, i) => facilityCard({ ...f, address: undefined }, { layout: "tile", rank: `#${i + 1}`, headingLevel: 3 }))
          .join("")}</div>`,
      })
    : "";

  const facts = [
    stats ? { value: stats.totalFacilities.toLocaleString("en-US"), label: "nursing homes graded" } : { value: "Every", label: "CMS-certified nursing home graded" },
    latest ? { value: `<time datetime="${latest.iso}">${latest.label}</time>`, label: "latest CMS data release" } : { value: "Each release", label: "grades refresh with CMS data" },
    { value: "$0", label: "taken from nursing facilities" },
    { value: `<a href="/how-we-grade">Open</a>`, label: "every weight and rule is published" },
  ];
  const factsBand = section({
    id: "facts",
    tone: "dark",
    className: "on-dark",
    title: "Built on public data. Paid by no one in the industry.",
    body: `<ul class="facts list-plain">${facts.map((f) => `<li class="fact"><span class="fact-value">${f.value}</span><span class="fact-label">${f.label}</span></li>`).join("")}</ul>
      ${trustPillars()}
      <p class="facts-link"><a class="link-arrow" href="/about">About NursingHomeGrade ${icon("arrow-right", { size: 16 })}</a></p>`,
  });

  const cta = section({
    id: "full-story",
    tone: "plain",
    body: `<div class="cta-panel">
        <span class="cta-icon">${icon("clipboard-list", { size: 44 })}</span>
        <div class="cta-copy">
          <h2 class="section-title">See the full story behind the score.</h2>
          <p>Go beyond the overall grade. Explore inspection details, staffing data and quality measures for any facility.</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn--primary" href="/search">Find a facility</a>
          <a class="link-arrow" href="/states">Browse all states ${icon("arrow-right", { size: 16 })}</a>
        </div>
      </div>`,
  });

  const why = `
    <section class="home-why">
      <div class="container">
        <blockquote class="pull-quote">
          <strong>Why this site exists</strong> A Place for Mom earns up to $3,500 per family they refer to a facility —
          paid by the facility. Their incentive is placement, not quality. We do not take payments from nursing facilities, and outside referral relationships never change our grades.
          <a class="link-arrow" href="/about">Read more ${icon("arrow-right", { size: 16 })}</a>
        </blockquote>
      </div>
    </section>`;

  const body = `${hero}${staffing}${howWeGrade}${top}${factsBand}${cta}${why}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "NursingHomeGrade",
      "url": "https://nursinghomegrade.com/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://nursinghomegrade.com/search?zip={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "NursingHomeGrade",
      "url": "https://nursinghomegrade.com/",
      "description": "Independent ratings for U.S. nursing homes based on federal CMS data."
    }
  ];

  return layout(
    "NursingHomeGrade — Independent Nursing Home Ratings",
    `${pctFailing}% of U.S. nursing homes reporting RN staffing fall short of the 2024 federal rule. Unbiased A–F grades from CMS data — no facility payments.`,
    body,
    { jsonLd, canonicalPath: "/", bare: true },
  );
}
