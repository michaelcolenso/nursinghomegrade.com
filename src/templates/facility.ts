import type { FacilityPageData, Deficiency, Facility, Trajectory, Operator, FacilityPenalty } from "../types";
import { citySlug, getStateInfo } from "../states";
import { layout, escHtml } from "./layout";
import { renderTrustModule } from "./trust";
import { RN_BENCHMARK, BENCHMARK_ROW_NOTE, benchmarkLabel, repealDisclosureHtml } from "../staffing-standard";
import { scoreToSummary } from "../scoring";
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

function severityColor(code: string | null): string {
  if (!code) return "#607D8B";
  if (code >= "A" && code <= "F") return "#607D8B";
  if (code >= "G" && code <= "I") return "#b48a3e";
  if (code >= "J" && code <= "L") return "#9e3a3a";
  return "#607D8B";
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

function renderTrajectory(trajectory: Trajectory | null): string {
  if (!trajectory) return "";

  const statusStyles: Record<string, { bg: string; color: string; icon: string }> = {
    improving: { bg: "#e6f4f1", color: "#12805D", icon: "▲" },
    declining: { bg: "#fdecea", color: "#B91C1C", icon: "▼" },
    stable: { bg: "#f0f4f8", color: "#4A6272", icon: "●" },
    volatile: { bg: "#fff8e6", color: "#b48a3e", icon: "◆" },
    insufficient_history: { bg: "#f0f4f8", color: "#4A6272", icon: "○" },
  };

  const style = statusStyles[trajectory.status] ?? { bg: "#f0f4f8", color: "#4A6272", icon: "●" };
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
    <div style="background:${style.bg};border:2px solid ${style.color};padding:var(--space-l);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-m);flex-wrap:wrap;">
      <span style="font-size:1.5rem;font-weight:800;color:${style.color};">${style.icon}</span>
      <div>
        <span style="font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:${style.color};font-size:0.9rem;">${trajectory.status.replace("_", " ")}</span>
        <p style="margin:0;color:var(--muted);font-size:0.95rem;">${escHtml(detail)} over tracking period</p>
      </div>
    </div>
  `;
}

function renderAssessment(assessment: string): string {
  if (!assessment) return "";
  return `
    <div class="pull-quote" style="margin:var(--space-xl) 0;">
      <strong>Facility Assessment</strong>
      ${escHtml(assessment)}
    </div>
  `;
}

function renderOperatorLink(operator: Operator | null): string {
  if (!operator) return "";
  return `
    <div style="margin-bottom:var(--space-l);">
      <span style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);">Operator</span>
      <p style="margin:0;"><a href="/operator/${escHtml(operator.slug)}">${escHtml(operator.normalized_name)}</a> · ${operator.facility_count} facilities</p>
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
    return `<span style="font-weight:700;font-size:1.5rem;">Not reported</span>`;
  }
  const row = (label: string, value: number, color: string) => `
    <div style="display:flex;justify-content:flex-end;align-items:baseline;gap:var(--space-2xs);">
      <span style="font-size:0.85rem;font-weight:400;color:var(--muted);">${label}</span>
      <span style="font-weight:700;font-size:1.5rem;color:${color};min-width:2.5ch;text-align:right;">${value}</span>
    </div>`;
  return `
    ${row("Total", counts.total, "var(--ink)")}
    ${row("Outstanding", counts.outstanding, counts.outstanding > 0 ? "var(--grade-F)" : "var(--ink)")}
    ${row("Actual harm or worse (G–L)", counts.harm, counts.harm > 0 ? "var(--grade-D)" : "var(--ink)")}
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
  if (jeopardyCount > 0) alerts.push(`<span style="color:var(--grade-F);font-weight:800;">${jeopardyCount} immediate jeopardy</span>`);
  if (harmCount > 0) alerts.push(`<span style="color:var(--grade-D);font-weight:800;">${harmCount} actual harm</span>`);
  const uncorrectedAlert = uncorrectedCount > 0
    ? ` <span style="color:var(--grade-F);font-weight:800;">— ${uncorrectedCount} still outstanding</span>`
    : "";
  const deficiencyWord = counts.total === 1 ? "deficiency" : "deficiencies";
  const summaryText = alerts.length > 0
    ? `${alerts.join(", ")} issue${(harmCount + jeopardyCount) !== 1 ? "s" : ""} found among ${counts.total} total ${deficiencyWord}. ${correctedCount} corrected.${uncorrectedAlert}`
    : `${counts.total} ${deficiencyWord} found. ${correctedCount} corrected. None involved actual harm.${uncorrectedAlert}`;
  return `<div style="background:var(--bg);border:2px solid var(--ink);padding:var(--space-l);margin-bottom:var(--space-xl);">
    <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.1rem,2vw,1.35rem);line-height:1.4;">${summaryText}</p>
  </div>`;
}

function renderDeficiencies(deficiencies: Deficiency[] | null): string {
  // null is a failed lookup, not a clean record. Saying "no deficiencies" here
  // would assert a spotless inspection history we were unable to read.
  if (deficiencies === null) {
    return `<p style="color:var(--muted);margin-bottom:var(--space-l);">Inspection records could not be loaded for this facility. This is not a statement that none exist.</p>`;
  }
  if (deficiencies.length === 0) {
    return `<p style="color:var(--muted);margin-bottom:var(--space-l);">No deficiencies reported for this facility.</p>`;
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
          const sevColor = severityColor(d.scope_severity_code);
          const sevLabel = severityLabel(d.scope_severity_code);
          const tag = d.deficiency_tag_number ? `F${d.deficiency_tag_number}` : "";
          const corrected = d.deficiency_corrected ? ` — ${d.deficiency_corrected}` : "";
          const correctionDate = d.correction_date ? `, corrected ${formatDate(d.correction_date)}` : "";
          const statusLabel = isUncorrectedDeficiency(d)
            ? (d.deficiency_corrected === "Deficient, Provider has no plan of correction"
                ? "Status: Outstanding — No Plan"
                : "Status: Outstanding — Plan Filed")
            : "Status: Corrected";

          return `
            <div class="deficiency-item" style="border-left: 8px solid ${sevColor}">
              <div style="display:flex;gap:var(--space-xs);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-2xs);">
                <span style="display:inline-block;padding:0.15rem 0.5rem;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;background:${sevColor};color:#fff;border-radius:0;">${escHtml(d.scope_severity_code ?? "?")}</span>
                <span style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);">${escHtml(sevLabel)}</span>
                ${tag ? `<span style="font-size:0.8rem;color:var(--ink);font-weight:800;">${escHtml(tag)}</span>` : ""}
                <span style="font-size:0.8rem;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:0.05em;margin-left:auto;">${escHtml(statusLabel)}</span>
              </div>
              <p style="font-weight:800;font-family:'Playfair Display',Georgia,serif;font-size:1.4rem;line-height:1.2;margin-bottom:var(--space-2xs);">${escHtml(d.deficiency_description ?? "Unknown deficiency")}</p>
              <p style="font-size:0.95rem;color:var(--muted);margin-bottom:0;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${escHtml(d.deficiency_category ?? "")}${corrected ? escHtml(corrected + correctionDate) : ""}</p>
            </div>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom:var(--space-xl);">
          <h3 style="margin-bottom:var(--space-s);">${escHtml(cycleLabel)}${escHtml(dateLabel)}</h3>
          <div class="results-list">${items}</div>
        </div>
      `;
    })
    .join("");
}

function renderNearbyFacilities(current: FacilityPageData, nearby: Facility[]): string {
  if (nearby.length === 0) return "";

  const compareIds = [current.cms_id, ...nearby.map((f) => f.cms_id)].slice(0, 5).join(",");
  const cards = nearby
    .map((f) => {
      const rnText =
        f.rn_hours_per_resident_day !== null
          ? `${f.rn_hours_per_resident_day.toFixed(2)} hrs`
          : "Not reported";
      const deficiencyText = f.total_deficiencies !== null ? `${f.total_deficiencies}` : "Not reported";

      return `
        <article class="nearby-card">
          <div class="nearby-grade grade-${f.grade_letter}" aria-label="Grade ${f.grade_letter}">${escHtml(f.grade_letter)}</div>
          <div class="nearby-body">
            <h3 class="nearby-name"><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">${escHtml(f.name)}</a></h3>
            <p class="nearby-meta">${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)} ${escHtml(f.zip)}</p>
            <div class="nearby-stats" aria-label="Nearby facility quality metrics">
              <span><strong>${f.grade_score}/100</strong> score</span>
              <span><strong>${escHtml(rnText)}</strong> RN staffing</span>
              <span><strong>${escHtml(deficiencyText)}</strong> deficiencies</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="nearby-section" aria-labelledby="nearby-heading">
      <div class="nearby-header">
        <div>
          <h2 id="nearby-heading">Nearby facilities in ${escHtml(current.city)}</h2>
          <p>Compare local nursing homes using the same CMS-backed grading method.</p>
        </div>
        <a class="btn-secondary" rel="nofollow" href="/compare?ids=${encodeURIComponent(compareIds)}">Compare nearby →</a>
      </div>
      <div class="nearby-grid">
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
    `<li><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" style="color:var(--ink);text-decoration:none;font-weight:600;font-size:0.95rem;">${escHtml(f.name)}${withCity ? ` — ${escHtml(f.city)}` : ""} (Grade ${escHtml(f.grade_letter)})</a></li>`;

  const peerLinks = extraPeers.map((f) => link(f, f.city !== current.city)).join("");

  // Better-graded alternatives nearby. Genuinely useful to a family reading a
  // poorly graded facility's page, and it spreads internal links across the long
  // tail instead of pointing every page at the same statewide winners.
  const betterBlock =
    betterFiltered.length > 0
      ? `
        <div>
          <h3 style="font-size:1.1rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">Better graded nearby</h3>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:var(--space-xs);">
            ${betterFiltered.map((f) => link(f, true)).join("")}
          </ul>
        </div>`
      : "";

  const peerBlock =
    peerLinks || extraPeers.length > 0
      ? `
        <div>
          <h3 style="font-size:1.1rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">Near ${escHtml(current.city)}</h3>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:var(--space-xs);">
            ${peerLinks}
            <li><a href="/state/${stateSlug}/${cSlug}" style="color:var(--accent);font-weight:700;">View all ${escHtml(current.city)} facilities →</a></li>
            <li><a href="/best/${stateSlug}" style="color:var(--accent);font-weight:700;">Highest-rated nursing homes in ${escHtml(stateName)} →</a></li>
          </ul>
        </div>`
      : `
        <div>
          <h3 style="font-size:1.1rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">Near ${escHtml(current.city)}</h3>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:var(--space-xs);">
            <li><a href="/state/${stateSlug}/${cSlug}" style="color:var(--accent);font-weight:700;">View all ${escHtml(current.city)} facilities →</a></li>
            <li><a href="/state/${stateSlug}" style="color:var(--accent);font-weight:700;">View all ${escHtml(stateName)} facilities →</a></li>
            <li><a href="/best/${stateSlug}" style="color:var(--accent);font-weight:700;">Highest-rated nursing homes in ${escHtml(stateName)} →</a></li>
          </ul>
        </div>`;

  return `
    <div style="margin-top:var(--space-2xl);padding-top:var(--space-xl);border-top:2px solid var(--ink);">
      <h2>More Facilities</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-l);margin-top:var(--space-m);">
        ${peerBlock}
        ${betterBlock}
      </div>
      <p style="margin-top:var(--space-m);"><a href="/state/${stateSlug}" style="color:var(--accent);font-weight:700;">All ${escHtml(stateName)} facilities →</a></p>
    </div>
  `;
}

// ── Identity, verdict, contact, enforcement, sources ─────────────────────────
//
// Each renderer below returns "" when the facts behind it are unavailable. A
// heading is never printed over an empty section, and no renderer emits a
// placeholder, a dash, or "N/A" in place of data we do not hold.

function factRow(label: string, value: string): string {
  return `
    <div>
      <dt style="font-weight:700;text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">${escHtml(label)}</dt>
      <dd style="margin:0;font-size:1rem;font-weight:600;">${value}</dd>
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
    <dl class="facility-facts" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-m);margin:0 0 var(--space-l);padding:var(--space-m);border:1px solid var(--rule);background:var(--bg);">
      ${rows.join("")}
    </dl>`;
}

function renderVerdict(verdict: string): string {
  if (!verdict) return "";
  return `
    <section aria-labelledby="verdict-heading" style="margin-bottom:var(--space-xl);">
      <h2 id="verdict-heading" style="font-size:1.1rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-xs);">What the records show</h2>
      <p class="lede" style="max-width:800px;margin:0;">${escHtml(verdict)}</p>
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
    <p class="lede" style="font-size:1.125rem;max-width:800px;margin-bottom:var(--space-l);">
      This page reviews ${escHtml(f.name)} using federal government records — CMS star ratings, health-inspection
      findings, staffing data and enforcement actions. NursingHomeGrade does not collect, host or publish resident
      or family testimonials, and no star rating below is a consumer review score.
    </p>`;
}

function renderStaffingComparison(
  f: FacilityPageData,
  stateRnMedian: number | null,
  nationalAvgRn: number | null,
): string {
  const rn = f.rn_hours_per_resident_day;
  const rows: string[] = [];

  if (rn !== null) {
    rows.push(`<tr><th scope="row" style="text-align:left;padding:var(--space-xs) 0;">This facility</th><td style="text-align:right;font-weight:700;">${rn.toFixed(2)} hrs</td></tr>`);
    if (stateRnMedian !== null && stateRnMedian > 0) {
      rows.push(`<tr><th scope="row" style="text-align:left;padding:var(--space-xs) 0;font-weight:400;color:var(--muted);">${escHtml(f.state)} median</th><td style="text-align:right;">${stateRnMedian.toFixed(2)} hrs</td></tr>`);
    }
    if (nationalAvgRn !== null && nationalAvgRn > 0) {
      rows.push(`<tr><th scope="row" style="text-align:left;padding:var(--space-xs) 0;font-weight:400;color:var(--muted);">National average</th><td style="text-align:right;">${nationalAvgRn.toFixed(2)} hrs</td></tr>`);
    }
  }

  const turnover: string[] = [];
  if (f.rn_turnover_pct !== null && f.rn_turnover_pct !== undefined) {
    turnover.push(`Registered nurse turnover: <strong>${f.rn_turnover_pct.toFixed(1)}%</strong>`);
  }
  if (f.total_nursing_turnover_pct !== null && f.total_nursing_turnover_pct !== undefined) {
    turnover.push(`Total nursing staff turnover: <strong>${f.total_nursing_turnover_pct.toFixed(1)}%</strong>`);
  }

  if (rows.length === 0 && turnover.length === 0) return "";

  const period = formatIsoDate(f.cms_processing_date);
  const periodNote = period
    ? `<p style="font-size:0.85rem;color:var(--muted);margin-top:var(--space-xs);">Staffing figures are the values CMS published in its file processed ${escHtml(period)}, drawn from payroll-based journal reporting.</p>`
    : `<p style="font-size:0.85rem;color:var(--muted);margin-top:var(--space-xs);">Staffing figures come from CMS payroll-based journal reporting — <a href="/data-sources">see release dates</a>.</p>`;

  return `
    <h2 id="staffing">Staffing Compared With State and National Levels</h2>
    ${rows.length > 0 ? `
    <div class="table-container">
      <table style="width:100%;border-collapse:collapse;">
        <caption class="visually-hidden">Registered nurse hours per resident per day compared with state and national levels</caption>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>` : ""}
    ${turnover.length > 0 ? `<p style="margin-top:var(--space-s);">${turnover.join(" · ")}</p>` : ""}
    ${periodNote}`;
}

function renderPenalties(f: FacilityPageData, summary: PenaltySummary): string {
  const heading = `<h2 id="enforcement">Fines and Enforcement Actions</h2>`;

  if (summary.unknown) {
    return `${heading}
      <p style="color:var(--muted);margin-bottom:var(--space-xl);">
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
        <p style="margin-bottom:var(--space-xl);">
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
      <p style="margin-bottom:var(--space-xl);">
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
        <td style="padding:var(--space-xs) 0;border-bottom:1px solid var(--rule);">${escHtml(date)}</td>
        <td style="padding:var(--space-xs) 0;border-bottom:1px solid var(--rule);">${escHtml(type)}</td>
        <td style="padding:var(--space-xs) 0;border-bottom:1px solid var(--rule);text-align:right;font-weight:700;">${escHtml(amount)}</td>
      </tr>`;
    })
    .join("");

  const total = formatDollars(summary.fineTotal);
  const totalLine =
    summary.fineCount > 0 && total
      ? `<p style="margin-top:var(--space-s);">${summary.fineCount} ${summary.fineCount === 1 ? "fine" : "fines"} totalling <strong>${escHtml(total)}</strong>.</p>`
      : "";

  return `${heading}
    <p style="margin-bottom:var(--space-m);">
      Penalties CMS has imposed on this facility. A fine is a civil money penalty; a payment denial suspends Medicare
      or Medicaid payment for new admissions.
    </p>
    <div class="table-container">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th scope="col" style="text-align:left;padding-bottom:var(--space-2xs);border-bottom:2px solid var(--ink);">Date</th>
            <th scope="col" style="text-align:left;padding-bottom:var(--space-2xs);border-bottom:2px solid var(--ink);">Action</th>
            <th scope="col" style="text-align:right;padding-bottom:var(--space-2xs);border-bottom:2px solid var(--ink);">Amount or length</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${totalLine}
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:var(--space-xl);">Source: CMS Penalties file (dataset g6vv-u9sr).</p>`;
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
    ? `<p style="margin-bottom:var(--space-m);">
         ${escHtml(f.name)} is a ${escHtml(f.ownership_type ?? "government-owned")} facility. The records on this page are the
         federal health-inspection and enforcement records CMS publishes. We do not hold, and have not reviewed, any
         separate financial or performance audit issued by a county, state or independent auditor — if one exists for this
         facility, it is not part of the data described below.
       </p>`
    : "";

  return `
    <h2 id="records">${escHtml(heading)}</h2>
    ${auditNote}
    ${coverage.length > 0 ? `<ul style="margin-bottom:var(--space-m);padding-left:1.2em;">${coverage.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}
    <p style="margin-bottom:var(--space-xl);">
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
    <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-m);margin:0 0 var(--space-s);padding:var(--space-m);border:2px solid var(--ink);">
      ${rows.join("")}
    </dl>
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:var(--space-xl);">
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
    <ul style="padding-left:1.2em;margin-bottom:var(--space-s);">${items.join("")}</ul>
    <p style="margin-bottom:var(--space-xl);">
      The NursingHomeGrade score is our own calculation from these federal files — it is not a CMS rating and not a
      consumer review score. <a href="/how-we-grade">See exactly how the score is calculated</a> ·
      <a href="/methodology">full methodology</a> · <a href="/data-sources">source files and load dates</a>.
    </p>`;
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
    <p class="lede" style="font-size:1.125rem;margin-bottom:var(--space-l);">
      Health inspections identify violations of federal standards. Severity ranges from no actual harm (A–F) to immediate jeopardy (J–L).
    </p>
    ${renderDeficiencySummary(deficiencies)}
    ${renderDeficiencies(deficiencies)}
  `;

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="${statePath}">${escHtml(stateInfo?.name ?? f.state)}</a>
      <span class="breadcrumb-sep">›</span>
      <a href="${cityPath}">${escHtml(f.city)}</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">${escHtml(f.name)}</span>
    </nav>

    <div class="facility-header">
      <div>
        <h1>${escHtml(f.name)}</h1>
        <p style="color:var(--muted);margin-bottom:var(--space-s);font-size:1.1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
          ${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)} ${escHtml(f.zip)}
        </p>
        ${renderOperatorLink(operator)}
        ${renderIdentityFacts(f)}
        <div style="display:flex;gap:var(--space-s);flex-wrap:wrap;margin-bottom:var(--space-m);">
          <button onclick="window.print()" class="btn-secondary" title="Print this report">Print Report</button>
          <button onclick="toggleSave('${escHtml(f.cms_id)}', '${escHtml(f.name.replace(/'/g, "\\'"))}', '${f.grade_letter}', ${f.grade_score})" id="save-${escHtml(f.cms_id)}" class="compare-toggle" aria-pressed="false" title="Add to compare">
            <span class="compare-toggle-box" aria-hidden="true"></span>
            <span class="compare-toggle-label">Compare</span>
          </button>
        </div>
        ${f.latitude && f.longitude ? `
          <div id="facility-map" style="height:200px; width:100%; max-width:400px; border:2px solid var(--ink); margin-bottom:var(--space-m);"></div>
        ` : ""}
      </div>
      <div class="grade-${f.grade_letter} facility-grade-hero" aria-label="Grade ${f.grade_letter}">
        ${escHtml(f.grade_letter)}
      </div>
    </div>

    ${renderTrajectory(trajectory)}
    ${renderVerdict(verdict)}
    ${renderAssessment(assessment)}

    ${renderReviewsContext(f)}

    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      ${escHtml(scoreToSummary(f.grade_score, f.grade_letter, f.rn_hours_per_resident_day))}
    </p>

    <h3 id="quality">Ratings and Grade Breakdown</h3>
    <div class="table-container quality-breakdown">
      <table class="quality-table">
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">RN Staffing</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Registered nurse time each resident receives daily. ${escHtml(BENCHMARK_ROW_NOTE)}</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Source Sans 3',system-ui,sans-serif;font-size:1.5rem;text-align:right;color:${meetsMinimum ? "var(--accent-positive)" : "var(--grade-F)"}">
            ${escHtml(rnDisplay)}
          </td>
        </tr>
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td colspan="2" style="padding:0 0 var(--space-s);">${repealDisclosureHtml()}</td>
        </tr>
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">Health Deficiencies (last 3 survey cycles)</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Violations found during federal inspections, with how many remain open and how many involved actual harm.</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-family:'Source Sans 3',system-ui,sans-serif;text-align:right;">
            ${renderDeficiencyCluster(deficiencyCounts, deficiencyDataAvailable)}
          </td>
        </tr>
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">CMS Ratings</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Federal five-star ratings published by CMS. These are regulatory ratings, not consumer review scores.</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Source Sans 3',system-ui,sans-serif;font-size:1.25rem;text-align:right;">
            ${overallStars ? `<div style="margin-bottom:var(--space-3xs);">Overall: ${overallStars}</div>` : ""}
            ${inspectionStars ? `<div style="margin-bottom:var(--space-3xs);">Health inspection: ${inspectionStars}</div>` : ""}
            <div style="margin-bottom:var(--space-3xs);">Quality: ${qualityStars}</div>
            <div>Staffing: ${staffingStars}</div>
          </td>
        </tr>
        <tr class="quality-row">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">NursingHomeGrade Score</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Source Sans 3',system-ui,sans-serif;font-size:2.5rem;text-align:right;">${f.grade_score}/100</td>
        </tr>
      </table>
    </div>
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:var(--space-xl);">Loaded into NursingHomeGrade on ${new Date(f.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. This is the load date, not the date CMS published the underlying survey data — <a href="/data-sources">see release dates</a>.</p>

    <p style="max-width:800px;margin-bottom:var(--space-xl);">
      CMS scores each facility from one to five stars — one is in the bottom fifth of facilities in its state on health
      inspections, five is in the top tenth. Our own A–F grade is a separate 0–100 score built from staffing hours,
      inspection citations, and the severity and correction status of those citations, weighted as described in our
      <a href="/how-we-grade">grading methodology</a>.
    </p>

    ${renderStaffingComparison(f, extras.stateRnMedian ?? null, extras.nationalAvgRn ?? null)}

    ${renderInspectionRecords(f, deficiencies)}

    ${deficiencySection}

    ${renderPenalties(f, penaltySummary)}

    ${renderOwnershipAndContact(f, operator)}

    ${renderTrustModule()}
    ${renderNearbyFacilities(f, nearby.slice(0, NEARBY_CARD_COUNT))}

    ${renderSources(f, penaltySummary.actions.length > 0)}

    <div class="cta-box">
      <h3>Need help choosing a facility?</h3>
      <p>Get free guidance from senior living advisors. We don't earn a fee for these links, and we never take payment from nursing facilities.</p>
      ${primaryCta}
      ${secondaryCta}
      <p style="font-size:0.75rem;color:#c8d6e0;margin-top:var(--space-s);opacity:0.8;">↗ Links open independent third-party sites in a new tab.</p>
    </div>

    <div style="margin-top:var(--space-2xl);">
      <h3 style="margin-bottom:var(--space-xs);">Get score alerts for this facility</h3>
      <p style="margin-bottom:var(--space-m);font-size:1rem;color:var(--muted);">We'll email you when ${escHtml(f.name)}'s staffing score changes.</p>
      <form action="/subscribe" method="POST" class="search-bar" style="margin-bottom:0;">
        <input type="hidden" name="cms_id" value="${escHtml(f.cms_id)}">
        <input type="hidden" name="facility_name" value="${escHtml(f.name)}">
        <input type="hidden" name="return_path" value="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">
        <label for="sub-email" class="visually-hidden">Email address</label>
        <input type="email" id="sub-email" name="email" placeholder="your@email.com" required autocomplete="email">
        <button type="submit">Notify me</button>
      </form>
    </div>

    ${renderRelatedLinks(f, nearby, betterNearby, NEARBY_CARD_COUNT)}
  `;
  const canonicalPath = `/facility/${f.cms_id}-${f.slug}`;
  const extraHead = f.latitude && f.longitude ? `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  ` : "";

  const extraScripts = f.latitude && f.longitude ? `
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      (function() {
        const map = L.map('facility-map', { zoomControl: false }).setView([${f.latitude}, ${f.longitude}], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-${f.grade_letter}').trim() || '#607D8B';
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
  const additionalProperty: Array<Record<string, unknown>> = [
    { "@type": "PropertyValue", "name": "NursingHomeGrade Score", "value": f.grade_score, "unitText": "out of 100" },
    { "@type": "PropertyValue", "name": "NursingHomeGrade Letter Grade", "value": f.grade_letter },
  ];
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
