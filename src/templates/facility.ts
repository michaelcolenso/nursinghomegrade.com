import type { FacilityPageData, Deficiency, Facility, Trajectory, Operator, FacilityPenalty, FacilityCmsNotes } from "../types";
import {
  ABUSE_ICON_DEFINITION,
  SPECIAL_FOCUS_CLAUSE,
  countAbuseCitations,
  isAbuseFlagged,
  specialFocusKind,
  staffingNotes,
  type StaffingNote,
} from "../cms-warnings";
import { citySlug, getStateInfo } from "../states";
import { layout, escHtml } from "./layout";
import { renderTrustModule } from "./trust";
import { leafletTileLayerJs } from "./map-tiles";
import { RN_BENCHMARK, BENCHMARK_ROW_NOTE, benchmarkLabel, repealDisclosureHtml } from "../staffing-standard";
import { buildInspectionSummary } from "../inspection-summary";
import { scoreToSummary, type ScoreInputKey } from "../scoring";
import {
  buildContactFacts,
  buildFacilityTitle,
  buildVerdict,
  formatDollars,
  formatIsoDate,
  formatPhone,
  isGovernmentOwned,
  summarizePenalties,
  telHref,
  type PenaltySummary,
} from "../facility-profile";
import { breadcrumb, compareToggle, facilityCard, gradeKey, scoreChip, starRating, statTile } from "./components";
import { icon } from "./icons";

// Number of same-city facilities shown as rich cards. The related-links block
// skips these so the same facility isn't linked twice on one page.
const NEARBY_CARD_COUNT = 5;

function severityLabel(code: string | null): string {
  if (!code) return "Unknown";
  const map: Record<string, string> = {
    A: "No harm — isolated",
    B: "No harm — pattern",
    C: "No harm — widespread",
    D: "Potential harm — isolated",
    E: "Potential harm — pattern",
    F: "Potential harm — widespread",
    G: "Actual harm — isolated",
    H: "Actual harm — pattern",
    I: "Actual harm — widespread",
    J: "Immediate jeopardy — isolated",
    K: "Immediate jeopardy — pattern",
    L: "Immediate jeopardy — widespread",
  };
  return map[code] ?? `Severity ${code}`;
}

/** Scope/severity letters grouped the way CMS describes them: A–C no harm, D–F potential, G–I actual harm, J–L immediate jeopardy. */
type SeverityTier = "low" | "potential" | "harm" | "jeopardy" | "unknown";

function severityTier(code: string | null): SeverityTier {
  if (!code || code.length !== 1) return "unknown";
  if (code >= "A" && code <= "C") return "low";
  if (code >= "D" && code <= "F") return "potential";
  if (code >= "G" && code <= "I") return "harm";
  if (code >= "J" && code <= "L") return "jeopardy";
  return "unknown";
}

function isUncorrectedDeficiency(d: Deficiency): boolean {
  return d.deficiency_corrected === "Deficient, Provider has no plan of correction"
      || d.deficiency_corrected === "Deficient, Provider has plan of correction";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const TREND_GLYPH: Record<string, string> = {
  improving: "▲",
  declining: "▼",
  stable: "●",
  volatile: "◆",
  insufficient_history: "○",
};

function renderTrajectory(trajectory: Trajectory | null): string {
  if (!trajectory) return "";

  const known = trajectory.status in TREND_GLYPH;
  const glyph = (known ? TREND_GLYPH[trajectory.status] : undefined) ?? "●";
  const tone = known ? trajectory.status : "stable";
  const parts: string[] = [];
  if (trajectory.staffing_change_pct !== null) {
    const sign = trajectory.staffing_change_pct > 0 ? "+" : "";
    parts.push(`Staffing ${sign}${trajectory.staffing_change_pct}%`);
  }
  if (trajectory.deficiency_change_pct !== null) {
    const sign = trajectory.deficiency_change_pct > 0 ? "+" : "";
    parts.push(`Deficiencies ${sign}${trajectory.deficiency_change_pct}%`);
  }

  const detail = parts.length > 0 ? parts.join(" · ") : "Trend data available";

  return `
    <div class="trend trend--${tone}">
      <span class="trend-icon" aria-hidden="true">${glyph}</span>
      <div>
        <span class="trend-status">${escHtml(trajectory.status.replace("_", " "))}</span>
        <p>${escHtml(detail)} over tracking period</p>
      </div>
    </div>
  `;
}

function renderAssessment(assessment: string): string {
  if (!assessment) return "";
  return `
    <div class="pull-quote">
      <strong>Facility Assessment</strong>
      ${escHtml(assessment)}
    </div>
  `;
}

function renderOperatorLink(operator: Operator | null): string {
  if (!operator) return "";
  return `
    <div class="fac-operator">
      <span class="eyebrow">Operator</span>
      <p><a href="/operator/${escHtml(operator.slug)}">${escHtml(operator.normalized_name)}</a> · ${operator.facility_count} facilities</p>
    </div>
  `;
}

/**
 * The single source of truth for deficiency counts on a facility page.
 *
 * The Quality Breakdown table previously rendered `facilities.total_deficiencies`,
 * which ingest populates from the CMS Provider Information column
 * `rating_cycle_1_total_number_of_health_deficiencies` — the most recent survey
 * cycle only — under a label promising three years. The body of the same page
 * counted rows in `facility_deficiencies`, which covers all three cycles. The two
 * disagreed on 14,492 of 14,609 facilities, always undercounting, by 4x to 6x.
 *
 * Both the table and the body now derive from this function, over the same rows.
 */
export interface DeficiencyCounts {
  total: number;
  outstanding: number;
  harm: number;
}

export function summarizeDeficiencies(deficiencies: Deficiency[]): DeficiencyCounts {
  return {
    total: deficiencies.length,
    outstanding: deficiencies.filter(isUncorrectedDeficiency).length,
    // Scope/severity G through L: actual harm or immediate jeopardy.
    harm: deficiencies.filter((d) => !!d.scope_severity_code && d.scope_severity_code >= "G" && d.scope_severity_code <= "L").length,
  };
}

function renderDeficiencyCluster(counts: DeficiencyCounts, dataAvailable: boolean): string {
  // Only when the lookup failed. A facility with zero citations renders zeros,
  // matching "No deficiencies reported for this facility." in the section below.
  if (!dataAvailable) {
    return `<span class="def-cluster-na">Not reported</span>`;
  }
  const row = (label: string, value: number, tone: "" | "is-alarm" | "is-harm") => `
    <div class="def-cluster-row">
      <span class="def-cluster-label">${label}</span>
      <span class="def-cluster-value ${tone}">${value}</span>
    </div>`;
  return `
    ${row("Total", counts.total, "")}
    ${row("Outstanding", counts.outstanding, counts.outstanding > 0 ? "is-alarm" : "")}
    ${row("Actual harm or worse (G–L)", counts.harm, counts.harm > 0 ? "is-harm" : "")}
  `;
}

function renderDeficiencySummary(deficiencies: Deficiency[] | null): string {
  if (deficiencies === null || deficiencies.length === 0) return "";
  const counts = summarizeDeficiencies(deficiencies);
  const harmCount = deficiencies.filter(d => d.scope_severity_code && d.scope_severity_code >= "G" && d.scope_severity_code < "J").length;
  const jeopardyCount = deficiencies.filter(d => d.scope_severity_code && d.scope_severity_code >= "J").length;
  const uncorrectedCount = counts.outstanding;
  const correctedCount = counts.total - uncorrectedCount;
  const alerts: string[] = [];
  if (jeopardyCount > 0) alerts.push(`<span class="is-jeopardy">${jeopardyCount} immediate jeopardy</span>`);
  if (harmCount > 0) alerts.push(`<span class="is-harm">${harmCount} actual harm</span>`);
  const uncorrectedAlert = uncorrectedCount > 0
    ? ` <span class="is-open">— ${uncorrectedCount} still outstanding</span>`
    : "";
  const deficiencyWord = counts.total === 1 ? "deficiency" : "deficiencies";
  const summaryText = alerts.length > 0
    ? `${alerts.join(", ")} issue${(harmCount + jeopardyCount) !== 1 ? "s" : ""} found among ${counts.total} total ${deficiencyWord}. ${correctedCount} corrected.${uncorrectedAlert}`
    : `${counts.total} ${deficiencyWord} found. ${correctedCount} corrected. None involved actual harm.${uncorrectedAlert}`;
  return `<div class="panel def-summary">
    <p>${summaryText}</p>
  </div>`;
}

function renderDeficiencies(deficiencies: Deficiency[] | null): string {
  // null is a failed lookup, not a clean record. Saying "no deficiencies" here
  // would assert a spotless inspection history we were unable to read.
  if (deficiencies === null) {
    return `<p class="muted">Inspection records could not be loaded for this facility. This is not a statement that none exist.</p>`;
  }
  if (deficiencies.length === 0) {
    return `<p class="muted">No deficiencies reported for this facility.</p>`;
  }

  const byCycle = new Map<number, Deficiency[]>();
  for (const d of deficiencies) {
    const cycle = d.inspection_cycle ?? 0;
    const list = byCycle.get(cycle) ?? [];
    list.push(d);
    byCycle.set(cycle, list);
  }

  const cycles = Array.from(byCycle.keys()).sort((a, b) => a - b);

  return cycles
    .map((cycle) => {
      const defs = byCycle.get(cycle) ?? [];
      const cycleLabel = cycle === 1 ? "Most recent inspection" : `Inspection cycle ${cycle}`;
      const surveyDate = defs[0]?.survey_date ? formatDate(defs[0].survey_date) : "";
      const dateLabel = surveyDate ? ` (${surveyDate})` : "";

      // Sort: uncorrected first, then corrected — surface outstanding issues
      const sorted = [...defs].sort((a, b) => {
        const aUncorrected = isUncorrectedDeficiency(a) ? 0 : 1;
        const bUncorrected = isUncorrectedDeficiency(b) ? 0 : 1;
        return aUncorrected - bUncorrected;
      });

      const items = sorted
        .map((d) => {
          const tier = severityTier(d.scope_severity_code);
          const sevLabel = severityLabel(d.scope_severity_code);
          const tag = d.deficiency_tag_number ? `F${d.deficiency_tag_number}` : "";
          const corrected = d.deficiency_corrected ? ` — ${d.deficiency_corrected}` : "";
          const correctionDate = d.correction_date ? `, corrected ${formatDate(d.correction_date)}` : "";
          const open = isUncorrectedDeficiency(d);
          const statusLabel = open
            ? (d.deficiency_corrected === "Deficient, Provider has no plan of correction"
                ? "Status: Outstanding — No Plan"
                : "Status: Outstanding — Plan Filed")
            : "Status: Corrected";

          return `
            <article class="def def--${tier}${open ? " def--open" : ""}">
              <div class="def-head">
                <span class="sev-pill sev-pill--${tier}">${escHtml(d.scope_severity_code ?? "?")}</span>
                <span class="def-sev">${escHtml(sevLabel)}</span>
                ${tag ? `<span class="def-tag">${escHtml(tag)}</span>` : ""}
                <span class="def-status${open ? " is-open" : ""}">${escHtml(statusLabel)}</span>
              </div>
              <p class="def-desc">${escHtml(d.deficiency_description ?? "Unknown deficiency")}</p>
              <p class="def-meta">${escHtml(d.deficiency_category ?? "")}${corrected ? escHtml(corrected + correctionDate) : ""}</p>
            </article>
          `;
        })
        .join("");

      return `
        <div class="def-cycle">
          <h3>${escHtml(cycleLabel)}${escHtml(dateLabel)}</h3>
          <div class="def-list">${items}</div>
        </div>
      `;
    })
    .join("");
}

function renderNearbyFacilities(current: FacilityPageData, nearby: Facility[]): string {
  if (nearby.length === 0) return "";

  const compareIds = [current.cms_id, ...nearby.map((f) => f.cms_id)].slice(0, 5).join(",");
  const cards = nearby.map((f) => facilityCard(f, { layout: "tile", headingLevel: 3 })).join("");

  return `
    <section class="nearby-section" aria-labelledby="nearby-heading">
      <div class="nearby-header">
        <div>
          <h2 id="nearby-heading">Nearby facilities in ${escHtml(current.city)}</h2>
          <p>Compare local nursing homes using the same CMS-backed grading method.</p>
        </div>
        <a class="btn-secondary" rel="nofollow" href="/compare?ids=${encodeURIComponent(compareIds)}">Compare nearby →</a>
      </div>
      <div class="tile-grid">
        ${cards}
      </div>
    </section>
  `;
}

function renderRelatedLinks(
  current: FacilityPageData,
  peers: Facility[],
  betterNearby: Facility[],
  cardCount = 0,
): string {
  const stateInfo = getStateInfo(current.state);
  const stateSlug = stateInfo?.slug ?? current.state.toLowerCase();
  const stateName = stateInfo?.name ?? current.state;
  const cSlug = citySlug(current.city);

  // Skip peers already rendered as cards above so the same URL is not linked
  // twice on one page.
  const extraPeers = peers.slice(cardCount);

  // The two peer queries run independently in the handler, so a facility can
  // legitimately appear in both. Dedupe here, where we know exactly what has
  // already been rendered, rather than relying on the caller to pre-exclude.
  const alreadyLinked = new Set<string>([current.cms_id, ...peers.map((f) => f.cms_id)]);
  const betterFiltered = betterNearby.filter((f) => !alreadyLinked.has(f.cms_id));

  const link = (f: Facility, withCity: boolean) =>
    `<li><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">${escHtml(f.name)}${withCity ? ` — ${escHtml(f.city)}` : ""} (Grade ${escHtml(f.grade_letter)})</a></li>`;

  const peerLinks = extraPeers.map((f) => link(f, f.city !== current.city)).join("");

  // Better-graded alternatives nearby. Genuinely useful to a family reading a
  // poorly graded facility's page, and it spreads internal links across the long
  // tail instead of pointing every page at the same statewide winners.
  const betterBlock =
    betterFiltered.length > 0
      ? `
        <div>
          <h3>Better graded nearby</h3>
          <ul class="list-plain">
            ${betterFiltered.map((f) => link(f, true)).join("")}
          </ul>
        </div>`
      : "";

  const peerBlock =
    peerLinks || extraPeers.length > 0
      ? `
        <div>
          <h3>Near ${escHtml(current.city)}</h3>
          <ul class="list-plain">
            ${peerLinks}
            <li><a class="more" href="/state/${stateSlug}/${cSlug}">View all ${escHtml(current.city)} facilities →</a></li>
            <li><a class="more" href="/best/${stateSlug}">Highest-rated nursing homes in ${escHtml(stateName)} →</a></li>
          </ul>
        </div>`
      : `
        <div>
          <h3>Near ${escHtml(current.city)}</h3>
          <ul class="list-plain">
            <li><a class="more" href="/state/${stateSlug}/${cSlug}">View all ${escHtml(current.city)} facilities →</a></li>
            <li><a class="more" href="/state/${stateSlug}">View all ${escHtml(stateName)} facilities →</a></li>
            <li><a class="more" href="/best/${stateSlug}">Highest-rated nursing homes in ${escHtml(stateName)} →</a></li>
          </ul>
        </div>`;

  return `
    <section class="related" aria-labelledby="more-facilities-heading">
      <h2 id="more-facilities-heading">More Facilities</h2>
      <div class="related-grid">
        ${peerBlock}
        ${betterBlock}
      </div>
      <p><a class="more" href="/state/${stateSlug}">All ${escHtml(stateName)} facilities →</a></p>
    </section>
  `;
}

// ── Identity, verdict, contact, enforcement, sources ─────────────────────────
//
// Each renderer below returns "" when the facts behind it are unavailable. A
// heading is never printed over an empty section, and no renderer emits a
// placeholder, a dash, or "N/A" in place of data we do not hold.

function factRow(label: string, value: string): string {
  return `
    <div class="fact">
      <dt>${escHtml(label)}</dt>
      <dd>${value}</dd>
    </div>`;
}

function renderIdentityFacts(f: FacilityPageData): string {
  const contact = buildContactFacts(f);
  const rows: string[] = [];

  rows.push(factRow("Provider number (CCN)", escHtml(f.cms_id)));
  if (f.provider_type) rows.push(factRow("Certification", escHtml(f.provider_type)));
  if (contact.ownership) rows.push(factRow("Ownership", escHtml(contact.ownership)));
  if (f.certified_beds !== null && f.certified_beds !== undefined) {
    rows.push(factRow("Certified beds", `${f.certified_beds}`));
  }
  if (contact.phone && contact.telHref) {
    rows.push(factRow("Phone", `<a href="${escHtml(contact.telHref)}">${escHtml(contact.phone)}</a>`));
  }
  if (contact.verifiedOn) {
    rows.push(factRow("CMS data as of", escHtml(contact.verifiedOn)));
  }

  return `
    <dl class="fact-grid facility-facts">
      ${rows.join("")}
    </dl>`;
}

function renderVerdict(verdict: string): string {
  if (!verdict) return "";
  return `
    <section aria-labelledby="verdict-heading" class="fac-verdict">
      <h2 id="verdict-heading" class="h2-eyebrow">What the records show</h2>
      <p class="lede">${escHtml(verdict)}</p>
    </section>`;
}

/**
 * The heading families searching "[facility] reviews" land on. It says plainly
 * what this page is and — just as importantly — what it is not: we publish
 * analysis of government records, not resident or family testimonials, and we
 * do not collect, host, or aggregate consumer reviews.
 */
function renderReviewsContext(f: FacilityPageData): string {
  return `
    <h2 id="reviews">Reviews, Ratings and Official Records</h2>
    <p class="lede lede--sm">
      This page reviews ${escHtml(f.name)} using federal government records — CMS star ratings, health-inspection
      findings, staffing data and enforcement actions. NursingHomeGrade does not collect, host or publish resident
      or family testimonials, and no star rating below is a consumer review score.
    </p>`;
}

function renderStaffingComparison(
  f: FacilityPageData,
  stateRnMedian: number | null,
  nationalAvgRn: number | null,
  notes: StaffingNote[] = [],
): string {
  const rn = f.rn_hours_per_resident_day;
  const rows: string[] = [];

  if (rn !== null) {
    // Bars share one scale (the largest of the values shown) so lengths compare.
    const values = [rn];
    if (stateRnMedian !== null && stateRnMedian > 0) values.push(stateRnMedian);
    if (nationalAvgRn !== null && nationalAvgRn > 0) values.push(nationalAvgRn);
    const scale = Math.max(...values, 0.01);
    const bar = (v: number, tone: "self" | "ref") =>
      `<span class="hbar hbar--${tone}" aria-hidden="true"><span class="hbar-fill" style="--pct:${Math.round((v / scale) * 100)}%"></span></span>`;
    rows.push(`<tr><th scope="row">This facility</th><td class="hbar-cell">${bar(rn, "self")}</td><td class="num is-strong">${rn.toFixed(2)} hrs</td></tr>`);
    if (stateRnMedian !== null && stateRnMedian > 0) {
      rows.push(`<tr><th scope="row" class="is-ref">${escHtml(f.state)} median</th><td class="hbar-cell">${bar(stateRnMedian, "ref")}</td><td class="num">${stateRnMedian.toFixed(2)} hrs</td></tr>`);
    }
    if (nationalAvgRn !== null && nationalAvgRn > 0) {
      rows.push(`<tr><th scope="row" class="is-ref">National average</th><td class="hbar-cell">${bar(nationalAvgRn, "ref")}</td><td class="num">${nationalAvgRn.toFixed(2)} hrs</td></tr>`);
    }
  }

  const turnover: string[] = [];
  if (f.rn_turnover_pct !== null && f.rn_turnover_pct !== undefined) {
    turnover.push(`Registered nurse turnover: <strong>${f.rn_turnover_pct.toFixed(1)}%</strong>`);
  }
  if (f.total_nursing_turnover_pct !== null && f.total_nursing_turnover_pct !== undefined) {
    turnover.push(`Total nursing staff turnover: <strong>${f.total_nursing_turnover_pct.toFixed(1)}%</strong>`);
  }

  if (rows.length === 0 && turnover.length === 0 && notes.length === 0) return "";

  const notesHtml = notes.length > 0
    ? `<div class="staffing-notes">
      <p class="staffing-notes-title">CMS notes on this facility's staffing data</p>
      <ul>${notes.map((n) => `<li${n.urgent ? ` class="is-urgent"` : ""}>${escHtml(n.text)} <span class="muted">(CMS footnote ${escHtml(n.code)})</span></li>`).join("")}</ul>
    </div>`
    : "";

  const period = formatIsoDate(f.cms_processing_date);
  const periodNote = period
    ? `<p class="note">Staffing figures are the values CMS published in its file processed ${escHtml(period)}, drawn from payroll-based journal reporting.</p>`
    : `<p class="note">Staffing figures come from CMS payroll-based journal reporting — <a href="/data-sources">see release dates</a>.</p>`;

  return `
    <h2 id="staffing">Staffing Compared With State and National Levels</h2>
    ${rows.length > 0 ? `
    <div class="table-container">
      <table class="hbar-table">
        <caption class="visually-hidden">Registered nurse hours per resident per day compared with state and national levels</caption>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>` : ""}
    ${turnover.length > 0 ? `<p>${turnover.join(" · ")}</p>` : ""}
    ${notesHtml}
    ${periodNote}`;
}

/**
 * CMS's own warning flags, shown above everything else on the page. The A–F grade
 * counts the underlying citations by severity but does not use these flags, so a
 * home can carry a good grade and a CMS warning at once; the reader sees both.
 */
export function renderCmsWarnings(
  f: Pick<FacilityPageData, "abuse_icon" | "special_focus_status" | "state">,
  deficiencies: ReadonlyArray<Pick<Deficiency, "deficiency_category">> | null,
  notes: StaffingNote[],
): string {
  const items: string[] = [];
  const sff = specialFocusKind(f.special_focus_status);
  if (sff) {
    const title = sff === "sff" ? "CMS Special Focus Facility" : "Candidate for CMS Special Focus program";
    const lead = sff === "sff"
      ? "CMS has placed this home in its Special Focus Facility program"
      : "CMS lists this home as a candidate for its Special Focus Facility program";
    items.push(`<li class="cms-warning">
      <p class="cms-warning-title">${escHtml(title)}</p>
      <p>${escHtml(lead)}, ${escHtml(SPECIAL_FOCUS_CLAUSE)}. <a href="/reports/special-focus-facilities">All Special Focus homes</a></p>
    </li>`);
  }
  if (isAbuseFlagged(f.abuse_icon)) {
    const n = deficiencies ? countAbuseCitations(deficiencies) : 0;
    const record = n > 0
      ? ` The inspection record below lists ${n} ${n === 1 ? "citation" : "citations"} in CMS's abuse, neglect and exploitation category. <a href="#inspections">See the citations</a>`
      : "";
    const state = getStateInfo(f.state);
    const stateLink = state
      ? ` · <a href="/reports/abuse-citations/${escHtml(state.slug)}">Other flagged homes in ${escHtml(state.name)}</a>`
      : "";
    items.push(`<li class="cms-warning">
      <p class="cms-warning-title">Cited for abuse or neglect</p>
      <p>${escHtml(ABUSE_ICON_DEFINITION)}${record}${stateLink}</p>
    </li>`);
  }
  for (const note of notes.filter((n) => n.urgent)) {
    items.push(`<li class="cms-warning">
      <p class="cms-warning-title">Days without a registered nurse</p>
      <p>${escHtml(note.text)} CMS lowered this home's staffing rating for this reason. <a href="#staffing">Staffing details</a></p>
    </li>`);
  }
  if (items.length === 0) return "";
  return `
    <section class="cms-warnings" aria-labelledby="cms-warnings-heading">
      <h2 id="cms-warnings-heading" class="cms-warnings-heading">CMS warnings for this home</h2>
      <ul class="cms-warning-list">${items.join("")}</ul>
      <p class="cms-warnings-note">These flags come from CMS. Our A–F grade counts the underlying citations by severity but does not use the flags themselves. <a href="/how-we-grade">How we grade</a></p>
    </section>`;
}

function renderPenalties(f: FacilityPageData, summary: PenaltySummary): string {
  const heading = `<h2 id="enforcement">Fines and Enforcement Actions</h2>`;

  if (summary.unknown) {
    return `${heading}
      <p class="muted">
        We do not hold federal enforcement records for this facility. That is a gap in our data, not a statement that
        no fine or payment denial exists.
      </p>`;
  }

  if (summary.actions.length === 0) {
    // Aggregates are present and zero — an affirmative fact, scoped to the
    // window the CMS file covers rather than to all of history.
    if (summary.affirmativelyNone) {
      const asOf = formatIsoDate(f.cms_processing_date);
      return `${heading}
        <p>
          CMS lists no fines and no payment denials for ${escHtml(f.name)} in the enforcement records covering the
          last three years${asOf ? `, as published in the file processed ${escHtml(asOf)}` : ""}.
        </p>`;
    }
    // Counts without per-action detail: report the counts, say what is missing.
    const parts: string[] = [];
    if (summary.fineCount > 0) {
      const total = formatDollars(summary.fineTotal);
      parts.push(`${summary.fineCount} ${summary.fineCount === 1 ? "fine" : "fines"}${total ? ` totalling ${total}` : ""}`);
    }
    if (summary.paymentDenialCount > 0) {
      parts.push(`${summary.paymentDenialCount} ${summary.paymentDenialCount === 1 ? "payment denial" : "payment denials"}`);
    }
    if (parts.length === 0) return "";
    return `${heading}
      <p>
        CMS reports ${escHtml(parts.join(" and "))} for this facility. Dates for the individual actions are not
        present in the records we hold.
      </p>`;
  }

  const rows = summary.actions
    .map((p) => {
      // A payment denial carries its own start date; CMS often leaves
      // penalty_date empty on those rows. Preferring it for denials keeps a
      // date the row already holds from being reported as unpublished.
      const isDenial = (p.penalty_type ?? "").toLowerCase().includes("denial");
      const date =
        (isDenial
          ? (formatIsoDate(p.payment_denial_start_date) ?? formatIsoDate(p.penalty_date))
          : (formatIsoDate(p.penalty_date) ?? formatIsoDate(p.payment_denial_start_date))) ??
        "Date not published";
      const type = p.penalty_type ?? "Enforcement action";
      const amount =
        (p.penalty_type ?? "").toLowerCase() === "fine"
          ? (formatDollars(p.fine_amount) ?? "Amount not published")
          : p.payment_denial_length_days !== null
            ? `${p.payment_denial_length_days} days`
            : "Length not published";
      return `<tr>
        <td>${escHtml(date)}</td>
        <td>${escHtml(type)}</td>
        <td class="num is-strong">${escHtml(amount)}</td>
      </tr>`;
    })
    .join("");

  const total = formatDollars(summary.fineTotal);
  const totalLine =
    summary.fineCount > 0 && total
      ? `<p>${summary.fineCount} ${summary.fineCount === 1 ? "fine" : "fines"} totalling <strong>${escHtml(total)}</strong>.</p>`
      : "";

  return `${heading}
    <p>
      Penalties CMS has imposed on this facility. A fine is a civil money penalty; a payment denial suspends Medicare
      or Medicaid payment for new admissions.
    </p>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Action</th>
            <th scope="col" class="num">Amount or length</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${totalLine}
    <p class="note">Source: CMS Penalties file (dataset g6vv-u9sr).</p>`;
}

/**
 * States exactly which official records this page covers.
 *
 * For government-owned facilities the query behind the page is often for an
 * audit report — a document produced by a county or state auditor, not by CMS.
 * We hold federal survey records and nothing else, so the section says so
 * explicitly rather than implying an audit was reviewed.
 */
function renderInspectionRecords(f: FacilityPageData, deficiencies: Deficiency[] | null): string {
  const government = isGovernmentOwned(f);
  const heading = government ? "Audit and Inspection Reports" : "Inspection Records Covered";
  const latest = formatIsoDate(f.latest_standard_survey_date);

  const cycles = deficiencies === null ? [] : [...new Set(deficiencies.map((d) => d.inspection_cycle ?? 0))].sort();
  const surveyDates = deficiencies === null
    ? []
    : [...new Set(deficiencies.map((d) => d.survey_date).filter((d): d is string => !!d))].sort().reverse();

  const coverage: string[] = [];
  if (latest) coverage.push(`Most recent standard health survey: <strong>${escHtml(latest)}</strong>.`);
  if (cycles.length > 0) {
    coverage.push(`Citations shown below span ${cycles.length} recorded inspection ${cycles.length === 1 ? "cycle" : "cycles"}.`);
  }
  if (surveyDates.length > 0) {
    const oldest = formatIsoDate(surveyDates[surveyDates.length - 1]);
    const newest = formatIsoDate(surveyDates[0]);
    if (oldest && newest && oldest !== newest) {
      coverage.push(`Survey dates on file range from ${escHtml(oldest)} to ${escHtml(newest)}.`);
    }
  }

  if (coverage.length === 0 && !government) return "";

  const auditNote = government
    ? `<p>
         ${escHtml(f.name)} is a ${escHtml(f.ownership_type ?? "government-owned")} facility. The records on this page are the
         federal health-inspection and enforcement records CMS publishes. We do not hold, and have not reviewed, any
         separate financial or performance audit issued by a county, state or independent auditor — if one exists for this
         facility, it is not part of the data described below.
       </p>`
    : "";

  return `
    <h2 id="records">${escHtml(heading)}</h2>
    ${auditNote}
    ${coverage.length > 0 ? `<ul class="bullets">${coverage.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}
    <p>
      Source records:
      <a href="https://www.medicare.gov/care-compare/details/nursing-home/${escHtml(f.cms_id)}" rel="nofollow noopener" target="_blank">CMS Care Compare profile for provider ${escHtml(f.cms_id)} ↗</a>
      · <a href="/data-sources">the federal files we load and when</a>.
    </p>`;
}

function renderOwnershipAndContact(f: FacilityPageData, operator: Operator | null): string {
  const c = buildContactFacts(f);
  const rows: string[] = [];

  rows.push(factRow("Facility name", escHtml(f.name)));
  if (c.legalName && c.legalName.toUpperCase() !== f.name.toUpperCase()) {
    rows.push(factRow("Legal business name", escHtml(c.legalName)));
  }
  rows.push(factRow("Address", escHtml(c.addressLine)));
  if (c.phone && c.telHref) {
    rows.push(factRow("Phone", `<a href="${escHtml(c.telHref)}">${escHtml(c.phone)}</a>`));
  }
  rows.push(factRow("Provider number (CCN)", escHtml(c.providerNumber)));
  if (c.ownership) rows.push(factRow("Ownership type", escHtml(c.ownership)));
  if (operator) {
    rows.push(
      factRow(
        "Operator",
        `<a href="/operator/${escHtml(operator.slug)}">${escHtml(operator.normalized_name)}</a> · ${operator.facility_count} facilities`,
      ),
    );
  }
  if (f.certification_date) {
    const certified = formatIsoDate(f.certification_date);
    if (certified) rows.push(factRow("Medicare/Medicaid certified since", escHtml(certified)));
  }
  rows.push(
    factRow(
      "Official record",
      `<a href="${escHtml(c.cmsProfileUrl)}" rel="nofollow noopener" target="_blank">CMS Care Compare profile ↗</a>`,
    ),
  );
  if (c.verifiedOn) rows.push(factRow("Details verified against CMS data dated", escHtml(c.verifiedOn)));

  return `
    <h2 id="contact">Ownership and Contact Information</h2>
    <dl class="fact-grid fact-grid--wide">
      ${rows.join("")}
    </dl>
    <p class="note">
      The federal nursing-home files publish no email address for certified facilities, so none is listed here. We do not
      guess or construct contact addresses. Contact details above are reproduced from CMS Provider Information; call the
      facility to confirm before relying on them.
    </p>`;
}

function renderSources(f: FacilityPageData, hasPenaltyDetail: boolean): string {
  const vintage = formatIsoDate(f.cms_processing_date);
  const asOf = vintage ? ` (file processed ${escHtml(vintage)})` : "";
  const items = [
    `<li><strong>CMS Provider Information</strong>${asOf} — ratings, staffing, ownership, certification and contact details. <a href="https://data.cms.gov/provider-data/dataset/4pq5-n9py" rel="nofollow noopener" target="_blank">Dataset 4pq5-n9py ↗</a></li>`,
    `<li><strong>CMS Health Deficiencies</strong> — inspection citations, scope and severity, correction status. <a href="https://data.cms.gov/provider-data/dataset/r5ix-sfxw" rel="nofollow noopener" target="_blank">Dataset r5ix-sfxw ↗</a></li>`,
  ];
  if (hasPenaltyDetail) {
    items.push(
      `<li><strong>CMS Penalties</strong> — fines and payment denials with the dates CMS recorded them. <a href="https://data.cms.gov/provider-data/dataset/g6vv-u9sr" rel="nofollow noopener" target="_blank">Dataset g6vv-u9sr ↗</a></li>`,
    );
  }
  items.push(
    `<li><strong>CMS Ownership</strong> — owning and managing organisations. <a href="https://data.cms.gov/provider-data/dataset/y2hd-n93e" rel="nofollow noopener" target="_blank">Dataset y2hd-n93e ↗</a></li>`,
  );

  return `
    <h2 id="sources">Sources and Methodology</h2>
    <ul class="bullets">${items.join("")}</ul>
    <p>
      The NursingHomeGrade score is our own calculation from these federal files — it is not a CMS rating and not a
      consumer review score. <a href="/how-we-grade">See exactly how the score is calculated</a> ·
      <a href="/methodology">full methodology</a> · <a href="/data-sources">source files and load dates</a>.
    </p>`;
}

/** Sticky in-page navigation. Only links to sections this page actually rendered. */
function renderSectionNav(sectionsHtml: string): string {
  const items: Array<[string, string]> = [
    ["summary", "Summary"],
    ["quality", "Ratings"],
    ["staffing", "Staffing"],
    ["inspections", "Inspections"],
    ["enforcement", "Enforcement"],
    ["contact", "Ownership"],
    ["sources", "Sources"],
  ];
  const links = items
    .filter(([id]) => sectionsHtml.includes(`id="${id}"`))
    .map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`)
    .join("");
  return `<nav class="fac-nav" aria-label="On this page"><ul class="list-plain">${links}</ul></nav>`;
}

export function facilityPage(
  f: FacilityPageData,
  deficiencies: Deficiency[] | null = [],
  nearby: Facility[] = [],
  betterNearby: Facility[] = [],
  trajectory: Trajectory | null = null,
  assessment: string = "",
  summary: string = "",
  operator: Operator | null = null,
  extras: {
    /** null = lookup failed, [] = CMS lists no penalty for this facility. */
    penalties?: FacilityPenalty[] | null;
    stateRnMedian?: number | null;
    nationalAvgRn?: number | null;
    /** null = no notable CMS footnote, or the lookup failed. */
    cmsNotes?: FacilityCmsNotes | null;
  } = {},
): string {
  const stateInfo = getStateInfo(f.state);
  const stateSlug = stateInfo?.slug ?? f.state.toLowerCase();
  const statePath = `/state/${stateSlug}`;
  const cityPath = `${statePath}/${citySlug(f.city)}`;
  const rnHours = f.rn_hours_per_resident_day;
  // One computation, used by both the Quality Breakdown table and the prose
  // summary below, so the two can no longer disagree.
  const deficiencyDetail = deficiencies ?? [];
  const deficiencyCounts = summarizeDeficiencies(deficiencyDetail);
  // null means the lookup failed; [] means a clean record. Only the first is
  // "Not reported".
  const deficiencyDataAvailable = deficiencies !== null;
  // Source: CMS Provider Information file, column
  // `reported_rn_staffing_hours_per_resident_per_day`, compared against the
  // repealed 2024 benchmark — see src/staffing-standard.ts.
  const meetsMinimum = rnHours !== null && rnHours >= RN_BENCHMARK;
  const rnDisplay =
    rnHours !== null
      ? `${rnHours.toFixed(2)} — ${benchmarkLabel(meetsMinimum)}`
      : "Not reported";

  const stars = (rating: number | null): string =>
    rating === null
      ? "Not rated"
      : `<span role="img" aria-label="${rating} out of 5 stars">${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}</span> (${rating}/5)`;
  const qualityStars = stars(f.quality_rating);
  const staffingStars = stars(f.staffing_rating);
  // Overall and health-inspection ratings render only when CMS publishes them,
  // so the row never shows "Not rated" four times over.
  const overallStars = f.overall_rating !== null ? stars(f.overall_rating) : "";
  const inspectionStars = f.inspection_rating !== null ? stars(f.inspection_rating) : "";

  const isPoorGrade = f.grade_letter === "D" || f.grade_letter === "F";
  const primaryCta = isPoorGrade
    ? `<a class="btn" href="https://www.caring.com/local/nursing-homes" rel="nofollow noopener" target="_blank">Get help finding alternatives ↗</a>`
    : `<a class="btn" href="https://www.senioradvisor.com/nursing-homes" rel="nofollow noopener" target="_blank">Compare nearby options ↗</a>`;
  const secondaryCta = isPoorGrade
    ? `<a href="https://www.senioradvisor.com/nursing-homes" rel="nofollow noopener" target="_blank" class="btn-secondary">Compare nearby ↗</a>`
    : `<a href="https://www.caring.com/local/nursing-homes" rel="nofollow noopener" target="_blank" class="btn-secondary">Get free help ↗</a>`;

  const penaltySummary = summarizePenalties(f, extras.penalties ?? null);
  const verdict = buildVerdict(f, {
    deficiencies: deficiencyDataAvailable ? deficiencyCounts : null,
    penalties: penaltySummary,
  });

  const deficiencySection = `
    <h2 id="inspections">Inspection Deficiencies</h2>
    <p class="lede lede--sm">
      Health inspections identify violations of federal standards. Severity ranges from no actual harm (A–F) to immediate jeopardy (J–L).
    </p>
    ${renderDeficiencySummary(deficiencies)}
    ${renderDeficiencies(deficiencies)}
  `;

  // Summary card tiles: the four score inputs, each with the context a reader needs.
  const rnTile = statTile(
    "RN staffing",
    rnHours !== null ? `${rnHours.toFixed(2)} <span class="stat-unit">hrs / resident / day</span>` : `<span class="muted">Not reported</span>`,
    rnHours !== null ? escHtml(benchmarkLabel(meetsMinimum)) : "",
  );
  const defTile = statTile(
    "Deficiencies (3 cycles)",
    deficiencyDataAvailable ? String(deficiencyCounts.total) : `<span class="muted">Not reported</span>`,
    deficiencyDataAvailable ? `${deficiencyCounts.outstanding} outstanding · ${deficiencyCounts.harm} actual harm or worse` : "",
  );
  const qualityTile = statTile("CMS quality rating", starRating(f.quality_rating));
  const staffingTile = statTile("CMS staffing rating", starRating(f.staffing_rating));

  const key = gradeKey(f.grade_letter, f.grade_score);
  const completeness = f.grade_completeness ?? (key === "NR" ? "insufficient" : "complete");
  // Computed fresh from the grade inputs (the same text the list cards use), never the
  // stored grade_summary: a withheld grade must not sit next to a stale positive sentence.
  const completenessText = scoreToSummary(
    f.grade_score < 0 ? null : f.grade_score,
    f.grade_letter === "NR" ? null : f.grade_letter,
    f.rn_hours_per_resident_day,
    completeness,
    (f.grade_missing_inputs ?? "").split(",").filter(Boolean) as ScoreInputKey[],
  );
  const completenessNotice =
    completeness !== "complete" && completenessText
      ? `<p class="notice notice--${completeness}"><strong>${completeness === "partial" ? "Partial data." : "Grade withheld."}</strong> ${escHtml(completenessText)} <a href="/how-we-grade#not-rated">How we handle missing data</a></p>`
      : "";

  const facilityUrl = `https://nursinghomegrade.com/facility/${f.cms_id}-${f.slug}`;

  const summaryBlock = `
    <section id="summary" class="fac-summary" aria-label="Summary">
      ${completenessNotice}
      ${renderVerdict(verdict)}
      <div class="stat-grid">${rnTile}${defTile}${qualityTile}${staffingTile}</div>
      ${renderTrajectory(trajectory)}
      ${renderAssessment(assessment)}
    </section>`;

  const notes = extras.cmsNotes
    ? staffingNotes(extras.cmsNotes.staffing_rating_footnote, extras.cmsNotes.reported_staffing_footnote)
    : [];
  const staffingSection = renderStaffingComparison(f, extras.stateRnMedian ?? null, extras.nationalAvgRn ?? null, notes);
  const recordsSection = renderInspectionRecords(f, deficiencies);
  const penaltiesSection = renderPenalties(f, penaltySummary);
  const contactSection = renderOwnershipAndContact(f, operator);

  const ratingsSection = `
    <h3 id="quality">Ratings and Grade Breakdown</h3>
    <div class="table-container quality-breakdown">
      <table class="quality-table">
        <tr class="quality-row">
          <td class="quality-label-cell">
            <div class="quality-label">RN Staffing</div>
            <div class="quality-desc">Registered nurse time each resident receives daily. ${escHtml(BENCHMARK_ROW_NOTE)}</div>
          </td>
          <td class="quality-value-cell ${meetsMinimum ? "is-ok" : "is-low"}">
            ${escHtml(rnDisplay)}
          </td>
        </tr>
        <tr class="quality-row">
          <td colspan="2" class="quality-note">${repealDisclosureHtml()}</td>
        </tr>
        <tr class="quality-row">
          <td class="quality-label-cell">
            <div class="quality-label">Health Deficiencies (last 3 survey cycles)</div>
            <div class="quality-desc">Violations found during federal inspections, with how many remain open and how many involved actual harm.</div>
          </td>
          <td class="quality-value-cell">
            ${renderDeficiencyCluster(deficiencyCounts, deficiencyDataAvailable)}
          </td>
        </tr>
        <tr class="quality-row">
          <td class="quality-label-cell">
            <div class="quality-label">CMS Ratings</div>
            <div class="quality-desc">Federal five-star ratings published by CMS. These are regulatory ratings, not consumer review scores.</div>
          </td>
          <td class="quality-value-cell">
            ${overallStars ? `<div class="quality-stars">Overall: ${overallStars}</div>` : ""}
            ${inspectionStars ? `<div class="quality-stars">Health inspection: ${inspectionStars}</div>` : ""}
            <div class="quality-stars">Quality: ${qualityStars}</div>
            <div>Staffing: ${staffingStars}</div>
          </td>
        </tr>
        <tr class="quality-row">
          <td class="quality-label-cell">
            <div class="quality-label">NursingHomeGrade Score</div>
          </td>
          <td class="quality-value-cell quality-score">${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : `${f.grade_score}/100`}</td>
        </tr>
      </table>
    </div>
    <p class="note">Loaded into NursingHomeGrade on ${new Date(f.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. This is the load date, not the date CMS published the underlying survey data — <a href="/data-sources">see release dates</a>.</p>

    <p>
      CMS scores each facility from one to five stars — one is in the bottom fifth of facilities in its state on health
      inspections, five is in the top tenth. Our own A–F grade is a separate 0–100 score built from staffing hours,
      inspection citations, and the severity and correction status of those citations, weighted as described in our
      <a href="/how-we-grade">grading methodology</a>.
    </p>`;

  const sourcesSection = renderSources(f, penaltySummary.actions.length > 0);

  const sectionNav = renderSectionNav(
    [summaryBlock, ratingsSection, staffingSection, deficiencySection, penaltiesSection, contactSection, sourcesSection].join("\n"),
  );

  const body = `
    ${breadcrumb([
      { label: "Home", href: "/" },
      { label: stateInfo?.name ?? f.state, href: statePath },
      { label: f.city, href: cityPath },
      { label: f.name },
    ])}

    <header class="fac-head">
      <div class="fac-title">
        <h1>${escHtml(f.name)}</h1>
        <p class="fac-address">
          ${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)} ${escHtml(f.zip)}
        </p>
        <p class="print-only print-url">${escHtml(facilityUrl)}</p>
        ${renderOperatorLink(operator)}
      </div>
      <div class="fac-head-chip">${scoreChip(f, { size: "lg" })}</div>
      <div class="fac-actions">
        ${compareToggle(f)}
        <button type="button" onclick="window.print()" class="btn btn--secondary btn--sm" title="Print this report">${icon("printer", { size: 18 })}<span>Print Report</span></button>
        <button type="button" class="btn btn--secondary btn--sm" data-share hidden title="Share or copy the link to this page">${icon("share-2", { size: 18 })}<span class="share-label">Share</span></button>
      </div>
    </header>

    ${renderCmsWarnings(f, deficiencies, notes)}

    <div class="fac-top">
      ${renderIdentityFacts(f)}
      ${f.latitude && f.longitude ? `<div id="facility-map" class="fac-map" role="region" aria-label="Map showing ${escHtml(f.name)}"></div>` : ""}
    </div>

    ${sectionNav}

    <div class="fac-body">
    ${summaryBlock}

    ${renderReviewsContext(f)}

    <p id="inspection-evidence-summary" class="lede lede--sm">
      ${escHtml(buildInspectionSummary(f, deficiencies))}
    </p>

    ${ratingsSection}

    ${staffingSection}

    ${recordsSection}

    ${deficiencySection}

    ${penaltiesSection}

    ${contactSection}

    ${renderTrustModule()}
    ${renderNearbyFacilities(f, nearby.slice(0, NEARBY_CARD_COUNT))}

    ${sourcesSection}

    <div class="cta-box">
      <h3>Need help choosing a facility?</h3>
      <p>Get free guidance from senior living advisors. We don't earn a fee for these links, and we never take payment from nursing facilities.</p>
      ${primaryCta}
      ${secondaryCta}
      <p class="cta-note">↗ Links open independent third-party sites in a new tab.</p>
    </div>

    <section class="fac-alerts" aria-labelledby="alerts-heading">
      <h3 id="alerts-heading">Get score alerts for this facility</h3>
      <p class="muted">We'll email you when ${escHtml(f.name)}'s staffing score changes.</p>
      <form action="/subscribe" method="POST" class="search-bar search-bar--flush">
        <input type="hidden" name="cms_id" value="${escHtml(f.cms_id)}">
        <input type="hidden" name="facility_name" value="${escHtml(f.name)}">
        <input type="hidden" name="return_path" value="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">
        <label for="sub-email" class="visually-hidden">Email address</label>
        <input type="email" id="sub-email" name="email" placeholder="your@email.com" required autocomplete="email">
        <button type="submit">Notify me</button>
      </form>
    </section>

    ${renderRelatedLinks(f, nearby, betterNearby, NEARBY_CARD_COUNT)}
    </div>
  `;
  const canonicalPath = `/facility/${f.cms_id}-${f.slug}`;
  const extraHead = f.latitude && f.longitude ? `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  ` : "";

  const mapScripts = f.latitude && f.longitude ? `
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      (function() {
        const map = L.map('facility-map', { zoomControl: false }).setView([${f.latitude}, ${f.longitude}], 14);
        ${leafletTileLayerJs()}.addTo(map);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-${f.grade_letter}-fill').trim() || '#607D8B';
        L.circleMarker([${f.latitude}, ${f.longitude}], {
          radius: 8,
          fillColor: color,
          color: '#0B1D33',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);
      })();
    </script>
  ` : "";

  // Share button: hidden until this script runs, so it never appears dead without JS.
  // Uses the Web Share API where present, otherwise copies the link. No "null"/
  // "undefined" literals: the sparse-data tests assert those never appear in the HTML.
  const shareScript = `
    <script>
      (function() {
        document.querySelectorAll('[data-share]').forEach(function(btn) {
          btn.hidden = false;
          btn.addEventListener('click', function() {
            var url = window.location.href.split('#')[0];
            var label = btn.querySelector('.share-label');
            if (navigator.share) {
              navigator.share({ title: document.title, url: url }).catch(function() {});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(url).then(function() {
                if (label) label.textContent = 'Link copied';
                setTimeout(function() { if (label) label.textContent = 'Share'; }, 2000);
              }).catch(function() { window.prompt('Copy this link', url); });
            } else {
              window.prompt('Copy this link', url);
            }
          });
        });
      })();
    </script>
  `;
  const extraScripts = mapScripts + shareScript;

  const nursingHomeSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NursingHome",
    "name": f.name,
    "url": `https://nursinghomegrade.com${canonicalPath}`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": f.address,
      "addressLocality": f.city,
      "addressRegion": f.state,
      "postalCode": f.zip,
      "addressCountry": "US"
    },
    // CMS Certification Number — the stable federal identifier for this
    // facility, and how a consumer can cross-reference us against CMS directly.
    "identifier": {
      "@type": "PropertyValue",
      "propertyID": "CMS Certification Number (CCN)",
      "value": f.cms_id
    },
    // No `review` and no `aggregateRating`. Our grade is a computed score over
    // federal records, not a review of the facility by a person and not an
    // aggregation of user ratings; publishing it under either type would assert
    // consumer sentiment this site does not have. The grade is published below
    // as additionalProperty instead, which describes it for what it is.
  };

  if (f.phone) {
    const tel = telHref(f.phone);
    const display = formatPhone(f.phone);
    if (tel && display) {
      // Only the number CMS publishes, and only when it parses as a real
      // 10-digit US number — never a reconstructed or partial one.
      nursingHomeSchema.telephone = display;
    }
  }
  if (f.legal_business_name && f.legal_business_name.trim() !== "") {
    nursingHomeSchema.legalName = f.legal_business_name;
  }

  if (f.latitude !== null && f.longitude !== null) {
    nursingHomeSchema.geo = {
      "@type": "GeoCoordinates",
      "latitude": f.latitude,
      "longitude": f.longitude
    };
  }

  if (f.latitude !== null && f.longitude !== null) {
    nursingHomeSchema.geo = {
      "@type": "GeoCoordinates",
      "latitude": f.latitude,
      "longitude": f.longitude
    };
  }

  // additionalProperty (schema.org PropertyValue) mirrors the metrics shown
  // in the on-page Quality Breakdown table. We deliberately don't emit
  // aggregateRating/review here: CMS's overall_rating is a regulatory score,
  // not a count of user reviews, and Google requires a ratingCount/
  // reviewCount for aggregateRating — using it without one risks a manual
  // action for misleading structured data.
  const additionalProperty: Array<Record<string, unknown>> = [];
  if (f.grade_letter !== "NR" && f.grade_score >= 0) {
    additionalProperty.push(
      { "@type": "PropertyValue", "name": "NursingHomeGrade Score", "value": f.grade_score, "unitText": "out of 100" },
      { "@type": "PropertyValue", "name": "NursingHomeGrade Letter Grade", "value": f.grade_letter },
    );
  }
  additionalProperty.push({
    "@type": "PropertyValue",
    "name": "NursingHomeGrade Data Completeness",
    "value": f.grade_completeness ?? (f.grade_letter === "NR" ? "insufficient" : "complete"),
  });
  if (rnHours !== null) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "RN Staffing Hours per Resident Day", "value": rnHours, "unitText": "hours" });
  }
  // Same three-cycle counts the page displays. Publishing
  // facilities.total_deficiencies here would hand search consumers the cycle-1
  // number under a "Total" label — the exact mismatch the table fix removed.
  if (deficiencyDataAvailable) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "Total Health Deficiencies", "value": deficiencyCounts.total });
    additionalProperty.push({ "@type": "PropertyValue", "name": "Outstanding Health Deficiencies", "value": deficiencyCounts.outstanding });
    additionalProperty.push({ "@type": "PropertyValue", "name": "Deficiencies at Actual Harm or Worse", "value": deficiencyCounts.harm });
  }
  if (f.quality_rating !== null) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "CMS Quality Rating", "value": f.quality_rating, "unitText": "out of 5 stars" });
  }
  if (f.staffing_rating !== null) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "CMS Staffing Rating", "value": f.staffing_rating, "unitText": "out of 5 stars" });
  }
  if (f.overall_rating !== null) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "CMS Overall Rating", "value": f.overall_rating, "unitText": "out of 5 stars" });
  }
  if (f.inspection_rating !== null) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "CMS Health Inspection Rating", "value": f.inspection_rating, "unitText": "out of 5 stars" });
  }
  if (f.ownership_type) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "Ownership Type", "value": f.ownership_type });
  }
  if (f.certified_beds !== null && f.certified_beds !== undefined) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "Certified Beds", "value": f.certified_beds });
  }
  // Enforcement totals, published only when the underlying counts are present —
  // an absent count must never surface as a zero implying a clean record.
  if (f.number_of_fines !== null && f.number_of_fines !== undefined) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "CMS Fines", "value": f.number_of_fines });
  }
  if (f.total_fines_dollars !== null && f.total_fines_dollars !== undefined) {
    additionalProperty.push({ "@type": "PropertyValue", "name": "Total CMS Fine Amount", "value": f.total_fines_dollars, "unitText": "USD" });
  }
  nursingHomeSchema.additionalProperty = additionalProperty;

  const jsonLd = [
    nursingHomeSchema,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://nursinghomegrade.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": stateInfo?.name ?? f.state,
          "item": `https://nursinghomegrade.com${statePath}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": f.city,
          "item": `https://nursinghomegrade.com${cityPath}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": f.name,
          "item": `https://nursinghomegrade.com${canonicalPath}`
        }
      ]
    }
  ];

  // Conditional pattern keyed to what this page actually renders — see
  // buildFacilityTitle. Government-owned facilities get the audit wording
  // because they carry an audit/inspection-records section; everything else
  // gets the reviews/ratings/inspections wording.
  const title = buildFacilityTitle(f);

  const metaIntro = summary || (f.grade_score >= 80
    ? `See the full quality report for ${f.name}: ${f.grade_score}/100 grade, staffing levels, deficiency history, and nearby alternatives.`
    : `See the full quality report for ${f.name}: staffing levels, inspection history, deficiency records, and nearby nursing home alternatives.`);

  const metaDesc = metaIntro.length > 160
    ? metaIntro.substring(0, 157) + '...'
    : metaIntro;

  return layout(
    title,
    metaDesc,
    body,
    {
      canonicalPath,
      ogType: "article",
      extraHead,
      extraScripts,
      jsonLd
    },
  );
}
