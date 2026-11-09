// Shared HTML components (pure functions returning strings). Every interpolated
// value is escaped with escHtml. Visual rules live in src/styles/components.ts.
import { WORDMARK_SVG_INNER, WORDMARK_SVG_INNER_REVERSED, WORDMARK_VIEWBOX } from "../brand.generated";
import { RN_BENCHMARK, benchmarkLabel } from "../staffing-standard";
import { scoreToGrade, scoreToSummary, type ScoreInputKey } from "../scoring";
import { escHtml } from "./escape";

export type GradeKey = "A" | "B" | "C" | "D" | "F" | "NR";

const GRADE_KEYS: readonly GradeKey[] = ["A", "B", "C", "D", "F", "NR"];

/** Descriptors are absolute bands, not percentiles: never "above average" (PLAN D-7). */
export const GRADE_DESCRIPTORS: Record<GradeKey, string> = {
  A: "Strong",
  B: "Good",
  C: "Fair",
  D: "Poor",
  F: "Failing",
  NR: "Not rated",
};

/** Normalise a stored letter/score pair to a displayable grade key. Withheld grades (-1 or "NR") become NR. */
export function gradeKey(letter: string | null | undefined, score?: number | null): GradeKey {
  if (!letter || letter === "NR") return "NR";
  if (typeof score === "number" && score < 0) return "NR";
  return (GRADE_KEYS as readonly string[]).includes(letter) ? (letter as GradeKey) : "NR";
}

export function gradeDescriptor(letter: string | null | undefined): string {
  return GRADE_DESCRIPTORS[gradeKey(letter)];
}

/** Letter band for a 0-100 score using the site's scoring thresholds. */
export function bandForScore(score: number): GradeKey {
  return scoreToGrade(score) as GradeKey;
}

/** The NursingHomeGrade.com wordmark as an outlined inline SVG. Size it with CSS height. */
export function wordmark(opts: { reversed?: boolean } = {}): string {
  const inner = opts.reversed ? WORDMARK_SVG_INNER_REVERSED : WORDMARK_SVG_INNER;
  return `<svg class="brand-wordmark" viewBox="${WORDMARK_VIEWBOX}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

// ── Score meter + chip ───────────────────────────────────────────────────

/** Ten segments of ten points each, coloured by grade. Decorative: the number is always shown as text. */
export function scoreMeter(score: number | null, letter: string): string {
  const key = gradeKey(letter, score);
  const filled = key === "NR" || score === null ? 0 : Math.max(0, Math.min(10, Math.round(score / 10)));
  const segments = Array.from({ length: 10 }, (_, i) => (i < filled ? `<i class="on"></i>` : `<i></i>`)).join("");
  return `<span class="meter meter--${key}" aria-hidden="true">${segments}</span>`;
}

export interface ChipFacility {
  grade_letter: string;
  grade_score: number;
  grade_completeness?: "complete" | "partial" | "insufficient";
}

export interface ChipOptions {
  size?: "sm" | "md" | "lg";
  /** Make the "Not rated" descriptor a link to the explanation. Disable when the chip sits inside another link. */
  linkNr?: boolean;
}

/** The score badge: big score, grade letter + descriptor, and a ten-segment meter. */
export function scoreChip(f: ChipFacility, opts: ChipOptions = {}): string {
  const { size = "md", linkNr = true } = opts;
  const key = gradeKey(f.grade_letter, f.grade_score);
  const rated = key !== "NR";
  const num = rated ? String(f.grade_score) : "—";
  const desc = GRADE_DESCRIPTORS[key];
  const descHtml =
    !rated && linkNr
      ? `<a class="chip-desc" href="/how-we-grade#not-rated">${desc}</a>`
      : `<span class="chip-desc">${desc}</span>`;
  const partial =
    rated && f.grade_completeness === "partial"
      ? `<span class="chip-tag" title="Some score inputs were unavailable. Missing inputs earn no points, so the score is a lower bound.">Partial data</span>`
      : "";
  return `<div class="chip chip--${size} chip--${key}">
    <div class="chip-body">
      <span class="chip-score"><span class="visually-hidden">Score </span><span class="chip-num grade-${key}">${num}</span>${rated ? `<span class="chip-max">/100</span>` : ""}</span>
      <span class="chip-rule" aria-hidden="true"></span>
      <span class="chip-grade"><span class="chip-letter grade-${key}"><span class="visually-hidden">Grade </span>${key}</span>${descHtml}</span>
    </div>
    ${scoreMeter(rated ? f.grade_score : null, key)}
    ${partial}
  </div>`;
}

/**
 * Browser-side twin of scoreChip(f, { size: "sm", linkNr: false }) for tables the
 * client builds (the compare page). test/components.test.ts runs this against
 * scoreChip so the two cannot drift. Plain ES5 string concatenation: it is
 * embedded in a <script> inside a template literal.
 */
export const COMPARE_CHIP_JS = `function chipHtml(f) {
  var desc = ${JSON.stringify(GRADE_DESCRIPTORS)};
  var nr = f.grade_letter === "NR" || Number(f.grade_score) < 0 || !desc[f.grade_letter];
  var key = nr ? "NR" : f.grade_letter;
  var score = Number(f.grade_score);
  var filled = nr ? 0 : Math.max(0, Math.min(10, Math.round(score / 10)));
  var meter = "";
  for (var i = 0; i < 10; i++) meter += i < filled ? '<i class="on"></i>' : "<i></i>";
  var tag = !nr && f.grade_completeness === "partial"
    ? '<span class="chip-tag" title="Some score inputs were unavailable. Missing inputs earn no points, so the score is a lower bound.">Partial data</span>'
    : "";
  return '<div class="chip chip--sm chip--' + key + '"><div class="chip-body"><span class="chip-score"><span class="visually-hidden">Score </span><span class="chip-num grade-' + key + '">' + (nr ? "\u2014" : score) + '</span>' + (nr ? "" : '<span class="chip-max">/100</span>') + '</span><span class="chip-rule" aria-hidden="true"></span><span class="chip-grade"><span class="chip-letter grade-' + key + '"><span class="visually-hidden">Grade </span>' + key + '</span><span class="chip-desc">' + desc[key] + '</span></span></div><span class="meter meter--' + key + '" aria-hidden="true">' + meter + '</span>' + tag + '</div>';
}`;

/** Compact inline grade for tables: letter in the grade ink on its tint. */
export function gradePill(letter: string, score?: number | null): string {
  const key = gradeKey(letter, score);
  return `<span class="pill pill--${key}" title="${GRADE_DESCRIPTORS[key]}">${key}</span>`;
}

// ── Small pieces ─────────────────────────────────────────────────────────

/** "4/5" with an accessible name; "Not reported" for null/undefined. */
export function starRating(n: number | null | undefined): string {
  if (n === null || n === undefined) return `<span class="muted">Not reported</span>`;
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return `<span class="stars"><span class="visually-hidden">${v} out of 5</span><span aria-hidden="true">${"★".repeat(v)}<span class="stars-off">${"★".repeat(5 - v)}</span> ${v}/5</span></span>`;
}

export function statTile(label: string, value: string, sub?: string): string {
  return `<div class="stat-tile"><div class="stat-tile-label">${escHtml(label)}</div><div class="stat-tile-value">${value}</div>${sub ? `<div class="stat-tile-sub">${sub}</div>` : ""}</div>`;
}

export interface Crumb {
  label: string;
  href?: string;
}

/** The last crumb is the current page. JSON-LD BreadcrumbList stays with each page's own schema. */
export function breadcrumb(items: Crumb[]): string {
  const parts = items.map((c, i) =>
    c.href && i < items.length - 1
      ? `<a href="${escHtml(c.href)}">${escHtml(c.label)}</a>`
      : `<span class="breadcrumb-current" aria-current="page">${escHtml(c.label)}</span>`,
  );
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${parts.join(`<span class="breadcrumb-sep">›</span>`)}</nav>`;
}

// ── Grade distribution ───────────────────────────────────────────────────

const RATED: readonly GradeKey[] = ["A", "B", "C", "D", "F"];

/**
 * Stacked A–F bar plus legend. Percentages use rated facilities only; the
 * not-rated count is explained below the bar so the bar never implies it.
 */
export function gradeDistribution(dist: Record<string, number>, opts: { size?: "sm" | "md" } = {}): string {
  const { size = "md" } = opts;
  const rated = RATED.reduce((sum, l) => sum + (dist[l] ?? 0), 0);
  const notRated = dist.NR ?? 0;
  const label = `Grade distribution: ${RATED.map((l) => `${l} ${dist[l] ?? 0}`).join(", ")}`;
  const segments = RATED.filter((l) => (dist[l] ?? 0) > 0)
    .map((l) => {
      const count = dist[l] ?? 0;
      const pct = rated > 0 ? (count / rated) * 100 : 0;
      return `<span class="dist-seg dist-seg--${l}" style="--pct:${pct.toFixed(2)}%" title="${l}: ${count} facilities"></span>`;
    })
    .join("");
  const legend = RATED.map(
    (l) => `<li class="dist-key"><span class="dist-dot dist-dot--${l}" aria-hidden="true"></span><span class="dist-key-label">Grade ${l}</span><span class="dist-key-count">${dist[l] ?? 0}</span></li>`,
  ).join("");
  const note =
    notRated > 0
      ? `<p class="dist-note"><strong>${notRated}</strong> ${notRated === 1 ? "facility is" : "facilities are"} not rated because current inspection evidence is insufficient. A–F percentages above use rated facilities only.</p>`
      : "";
  return `<div class="dist dist--${size}"><div class="dist-bar" role="img" aria-label="${escHtml(label)}">${segments}</div><ul class="dist-legend">${legend}</ul>${note}</div>`;
}

// ── Operator score bar ───────────────────────────────────────────────────

/** Score numeral over a thin bar, coloured by the grade band the score falls in. */
export function scoreBar(score: number, opts: { size?: "sm" | "md" | "lg" } = {}): string {
  const { size = "md" } = opts;
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const band = bandForScore(score);
  return `<div class="scorebar scorebar--${band} scorebar--${size}" role="img" aria-label="Score ${score} out of 100"><span class="scorebar-num grade-${band}">${score}</span><span class="scorebar-track"><span class="scorebar-fill" style="--pct:${pct}%"></span></span></div>`;
}

/** Bar only (no numeral), for places that already print the number. */
export function scoreTrack(score: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  return `<span class="scorebar scorebar--${bandForScore(score)}" aria-hidden="true"><span class="scorebar-track"><span class="scorebar-fill" style="--pct:${pct}%"></span></span></span>`;
}

// ── Facility card ────────────────────────────────────────────────────────

/** Fields a list surface may know about a facility. A key that is `undefined` is not shown; `null` renders "Not reported". */
export interface CardFacility extends ChipFacility {
  cms_id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  address?: string;
  zip?: string;
  rn_hours_per_resident_day?: number | null;
  total_deficiencies?: number | null;
  quality_rating?: number | null;
  staffing_rating?: number | null;
  grade_missing_inputs?: string | null;
}

export interface CardOptions {
  layout?: "row" | "tile";
  /** e.g. "Top match" or "#3" */
  rank?: string;
  distance?: number;
  compare?: boolean;
  summary?: boolean;
  headingLevel?: 2 | 3 | 4;
  /** Extra class names (hooks for page scripts). */
  className?: string;
  /** Pre-escaped attribute string, e.g. data-score="88". */
  attrs?: string;
}

/** Facility link target used by every list surface. */
export function facilityHref(f: { cms_id: string; slug: string }): string {
  return `/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}`;
}

/**
 * The compare button. Its id, aria-pressed and .compare-toggle-label are a
 * contract with the layout script (toggleSave / saved-state restore).
 */
export function compareToggle(f: { cms_id: string; name: string; grade_letter: string; grade_score: number }): string {
  return `<button type="button" onclick="toggleSave('${escHtml(f.cms_id)}', '${escHtml(f.name.replace(/'/g, "\\'"))}', '${escHtml(f.grade_letter)}', ${Number(f.grade_score)})" id="save-${escHtml(f.cms_id)}" class="compare-toggle" aria-pressed="false" title="Add to compare">
    <span class="compare-toggle-box" aria-hidden="true"></span>
    <span class="compare-toggle-label">Compare</span>
  </button>`;
}

function rnStat(hours: number | null): string {
  if (hours === null) return `<span class="muted">Not reported</span>`;
  const meets = hours >= RN_BENCHMARK;
  const mark = meets
    ? `<span class="bench bench--ok" title="${benchmarkLabel(true)}" aria-hidden="true">✓</span>`
    : `<span class="bench bench--low" title="${benchmarkLabel(false)}" aria-hidden="true">✗</span>`;
  return `${hours.toFixed(2)} hrs ${mark}<span class="visually-hidden">${benchmarkLabel(meets)}</span>`;
}

function cardSummary(f: CardFacility): string {
  return scoreToSummary(
    f.grade_score < 0 ? null : f.grade_score,
    f.grade_letter === "NR" ? null : f.grade_letter,
    f.rn_hours_per_resident_day ?? null,
    f.grade_completeness ?? (f.grade_letter === "NR" ? "insufficient" : "complete"),
    (f.grade_missing_inputs ?? "").split(",").filter(Boolean) as ScoreInputKey[],
  );
}

/** One card for every list surface: search, city, state, operator, nearby, top rated. */
export function facilityCard(f: CardFacility, opts: CardOptions = {}): string {
  const { layout = "row", rank, distance, compare = false, summary = false, headingLevel = 3, className = "", attrs = "" } = opts;
  const key = gradeKey(f.grade_letter, f.grade_score);
  const where: string[] = [];
  if (f.address) where.push(f.address);
  if (f.city && f.state) where.push(`${f.city}, ${f.state}${f.zip ? ` ${f.zip}` : ""}`);
  const stats: string[] = [];
  const stat = (label: string, value: string) => stats.push(`<div class="fcard-stat"><dt>${label}</dt><dd>${value}</dd></div>`);
  if (f.rn_hours_per_resident_day !== undefined) stat("RN staffing", rnStat(f.rn_hours_per_resident_day));
  if (f.total_deficiencies !== undefined) stat("Deficiencies", f.total_deficiencies === null ? `<span class="muted">Not reported</span>` : String(f.total_deficiencies));
  if (f.quality_rating !== undefined) stat("CMS quality", starRating(f.quality_rating));
  if (f.staffing_rating !== undefined) stat("CMS staffing", starRating(f.staffing_rating));
  if (distance !== undefined) stat("Distance", `<span class="fcard-distance">${distance.toFixed(1)} mi</span>`);
  const h = `h${headingLevel}`;
  return `<article class="fcard fcard--${layout} fcard--${key}${className ? ` ${escHtml(className)}` : ""}"${attrs ? ` ${attrs}` : ""}>
    <div class="fcard-main">
      <div class="fcard-head">
        <div class="fcard-title">
          ${rank ? `<span class="fcard-rank">${escHtml(rank)}</span>` : ""}
          <${h} class="fcard-name"><a href="${facilityHref(f)}">${escHtml(f.name)}</a></${h}>
          <p class="fcard-meta">${where.map(escHtml).join(", ")}</p>
        </div>
        ${compare ? compareToggle(f) : ""}
      </div>
      ${stats.length ? `<dl class="fcard-stats">${stats.join("")}</dl>` : ""}
      ${summary ? `<p class="fcard-summary">${escHtml(cardSummary(f))}</p>` : ""}
    </div>
    <div class="fcard-chip">${scoreChip(f, { size: "md" })}</div>
  </article>`;
}

/** Operator ranking card: same shell as facilityCard, led by the operator's composite score. */
export function operatorCard(
  op: { slug: string; normalized_name: string; facility_count: number; avg_grade: number | null; operator_score?: number | null },
  opts: { rank: string; tone?: "best" | "worst" },
): string {
  const avg = op.avg_grade ?? 0;
  const score = op.operator_score ?? avg;
  return `<article class="fcard fcard--row ${opts.tone ? `fcard--${opts.tone}` : ""}">
    <div class="fcard-main">
      <div class="fcard-title">
        <span class="fcard-rank">${escHtml(opts.rank)}</span>
        <h3 class="fcard-name"><a href="/operator/${escHtml(op.slug)}">${escHtml(op.normalized_name)}</a></h3>
        <p class="fcard-meta">${op.facility_count} facilities · ${avg} avg grade</p>
      </div>
    </div>
    <div class="fcard-chip">${scoreBar(score, { size: "lg" })}</div>
  </article>`;
}
