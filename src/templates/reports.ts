import type { Operator } from "../types";
import type { UncorrectedRow } from "../db";
import { layout, escHtml } from "./layout";
import { breadcrumb, gradePill } from "./components";
import { repealDisclosureHtml } from "../staffing-standard";
import { ABUSE_ICON_DEFINITION, SPECIAL_FOCUS_DEFINITION } from "../cms-warnings";

interface FacilityRow {
  cms_id: string;
  name: string;
  city: string;
  state: string;
  rn_hours_per_resident_day?: number | null;
  total_deficiencies?: number | null;
  grade_score: number;
  grade_letter: string;
  slug: string;
}

export interface StaffingFailureStateRow {
  stateName: string;
  slug: string;
  count: number;
}

function renderReportTable(rows: FacilityRow[], columns: { key: keyof FacilityRow; label: string }[]): string {
  const header = columns.map((c) => `<th>${escHtml(c.label)}</th>`).join("");
  const body = rows.map((row) => {
    const cells = columns.map((c) => {
      const val = row[c.key];
      if (c.key === "name") {
        return `<td class="strong"><a href="/facility/${escHtml(row.cms_id)}-${escHtml(row.slug)}">${escHtml(String(val))}</a></td>`;
      }
      if (c.key === "grade_letter") {
        return `<td>${gradePill(String(val))}</td>`;
      }
      return `<td>${escHtml(String(val ?? "N/A"))}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `
    <div class="table-container">
      <table class="report-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function reportMethodology(datasetDate: string): string {
  return `
    <div class="panel panel--tint panel-methodology">
      <h3>Methodology</h3>
      <p>
        Data sourced from the CMS Provider Data Catalog. Facilities are ranked using the most recent available data.
        Grades are computed from RN staffing hours, health deficiencies, and CMS quality ratings.
      </p>
      <p>
        <strong>Dataset date:</strong> ${escHtml(datasetDate)}<br>
        <strong>Source files:</strong> CMS Provider Info (4pq5-n9py), CMS Deficiencies (r5ix-sfxw), CMS Ownership (y2hd-n93e)
      </p>
    </div>
  `;
}

function renderStaffingPagination(basePath: string, page: number, totalPages: number): string {
  const prevHref = page > 1 ? (page - 1 > 1 ? `${basePath}?page=${page - 1}` : basePath) : "";
  const nextHref = page < totalPages ? `${basePath}?page=${page + 1}` : "";
  const link = (href: string, rel: string, label: string) =>
    href ? `<a class="btn-secondary" rel="${rel}" href="${escHtml(href)}">${label}</a>` : "";
  return `
    <nav class="pagination" aria-label="Pagination">
      ${link(prevHref, "prev", "← Previous")}
      <span class="page-of">Page ${page} of ${totalPages}</span>
      ${link(nextHref, "next", "Next →")}
    </nav>
  `;
}

export function staffingFailuresPage(states: StaffingFailureStateRow[], total: number): string {
  const rows = states
    .map(
      (state) => `
        <tr>
          <td class="strong">
            <a href="/reports/staffing-failures/${escHtml(state.slug)}">${escHtml(state.stateName)}</a>
          </td>
          <td>${state.count.toLocaleString("en-US")} facilities</td>
        </tr>
      `,
    )
    .join("");

  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Staffing Failures Report" }])}

    <h1>Facilities Below the 2024 RN Staffing Benchmark</h1>
    <p class="lede">
      <strong>${total.toLocaleString("en-US")} facilities</strong> across ${states.length} states report RN staffing below
      0.55 hours per resident per day — the level the 2024 federal rule would have required.
    </p>
    ${repealDisclosureHtml()}

    <h2>Facilities Below the 0.55 Hour Benchmark, by State</h2>
    <p>Select a state to see its facilities, staffing hours, and grades.</p>
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>State</th>
            <th>Facilities Below Benchmark</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box">
      <h3>Related Reports</h3>
      <p>Explore other facility quality reports built from official CMS inspection data.</p>
      <a class="btn" href="/reports/uncorrected-deficiencies">Uncorrected Deficiencies →</a>
      <a href="/reports/high-deficiency-facilities" class="btn-secondary">High Deficiencies →</a>
      <a href="/reports/staffing-standard-repeal" class="btn-secondary">Why the staffing rule was repealed →</a>
    </div>
  `;

  return layout(
    "Federal Staffing Failures — NursingHomeGrade Report",
    "Nursing facilities staffing below 0.55 RN hours per resident day — the repealed 2024 federal benchmark.",
    body,
    { canonicalPath: "/reports/staffing-failures" },
  );
}

export function highDeficiencyPage(facilities: FacilityRow[]): string {
  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "High Deficiency Report" }])}

    <h1>High Deficiency Facilities</h1>
    <p class="lede">
      Facilities with the highest number of health inspection deficiencies in the most recent cycle.
    </p>

    <h2>Highest Deficiency Counts</h2>
    ${renderReportTable(facilities, [
      { key: "name", label: "Facility" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "total_deficiencies", label: "Deficiencies" },
      { key: "grade_letter", label: "Grade" },
    ])}

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box">
      <h3>Related Reports</h3>
      <p>Explore other facility quality reports built from official CMS inspection data.</p>
      <a class="btn" href="/reports/uncorrected-deficiencies">Uncorrected Deficiencies →</a>
      <a href="/reports/staffing-failures" class="btn-secondary">Staffing Failures →</a>
    </div>
  `;

  return layout(
    "High Deficiency Facilities — NursingHomeGrade Report",
    "Nursing facilities with the most health inspection deficiencies.",
    body,
    { canonicalPath: "/reports/high-deficiency-facilities" },
  );
}

export function staffingFailuresStatePage(
  stateName: string,
  facilities: FacilityRow[],
  opts: { total: number; page: number; totalPages: number },
): string {
  const { total, page, totalPages } = opts;
  const scope = `Staffing Failures in ${stateName}`;
  const basePath = `/reports/staffing-failures/${stateName.toLowerCase().replace(/\s+/g, "-")}`;
  const canonicalPath = page > 1 ? `${basePath}?page=${page}` : basePath;
  const pagination = totalPages > 1 ? renderStaffingPagination(basePath, page, totalPages) : "";
  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Staffing Failures", href: "/reports/staffing-failures" }, { label: stateName }])}

    <h1>${escHtml(scope)}</h1>
    <p class="lede">
      <strong>${total.toLocaleString("en-US")} facilities</strong> in ${escHtml(stateName)} fall below 0.55 RN hours per resident per day, the repealed 2024 federal benchmark.
    </p>

    <h2>Facilities Below the 0.55 Hour Benchmark</h2>
    ${renderReportTable(facilities, [
      { key: "name", label: "Facility" },
      { key: "city", label: "City" },
      { key: "rn_hours_per_resident_day", label: "RN Hours" },
      { key: "grade_letter", label: "Grade" },
    ])}
    ${pagination}

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box">
      <h3>Related Reports</h3>
      <p>Explore other facility quality reports built from official CMS inspection data.</p>
      <a class="btn" href="/reports/uncorrected-deficiencies">Uncorrected Deficiencies →</a>
      <a href="/reports/staffing-failures" class="btn-secondary">Staffing Failures →</a>
    </div>
  `;

  return layout(
    page > 1 ? `${scope} (Page ${page}) — NursingHomeGrade Report` : `${scope} — NursingHomeGrade Report`,
    `${total.toLocaleString("en-US")} nursing facilities in ${stateName} fall below the repealed 0.55 hr federal RN benchmark.`,
    body,
    { canonicalPath, noindex: page > 1 },
  );
}

export function chainsReportPage(
  bestChains: Operator[],
  worstChains: Operator[],
  nationalAvg: { avgGrade: number; avgRnHours: number; avgDeficiencies: number },
): string {
  const renderChainList = (operators: Operator[], kind: "best" | "worst"): string => {
    return operators.map((op, i) => {
      const avg = op.avg_grade ?? 0;
      const diff = kind === "best" ? avg - nationalAvg.avgGrade : nationalAvg.avgGrade - avg;
      const diffStr = diff >= 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0);
      const diffLabel = kind === "best"
        ? `${diffStr} vs national`
        : `${diffStr} vs national`;

      return `
        <tr>
          <td class="dim">${i + 1}</td>
          <td class="strong">
            <a href="/operator/${escHtml(op.slug)}">${escHtml(op.normalized_name)}</a>
          </td>
          <td>${op.facility_count}</td>
          <td class="strong">${avg}</td>
          <td class="strong ${kind === "best" ? "text-ok" : "text-alarm"}">${escHtml(diffLabel)}</td>
        </tr>
      `;
    }).join("");
  };

  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Chain Comparison Report" }])}

    <h1>Nursing Home Chain Comparison</h1>
    <p class="lede">
      How the largest nursing home operators compare. Rankings based on average NursingHomeGrade Score across all facilities in each chain (3+ facilities required).
      National average: ${nationalAvg.avgGrade}/100.
    </p>

    <h2>Best Operators</h2>
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Operator</th>
            <th>Facilities</th>
            <th>Avg Grade</th>
            <th>Vs National</th>
          </tr>
        </thead>
        <tbody>${renderChainList(bestChains, "best")}</tbody>
      </table>
    </div>

    <h2>Worst Operators</h2>
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Operator</th>
            <th>Facilities</th>
            <th>Avg Grade</th>
            <th>Vs National</th>
          </tr>
        </thead>
        <tbody>${renderChainList(worstChains, "worst")}</tbody>
      </table>
    </div>

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box">
      <h3>Explore operators further</h3>
      <p>Browse all nursing home operators with detailed facility lists, grade distributions, and performance comparisons.</p>
      <a class="btn" href="/operators">All Operators →</a>
      <a href="/operators/best" class="btn-secondary">Best →</a>
      <a href="/operators/worst" class="btn-secondary">Worst →</a>
    </div>
  `;

  return layout(
    "Nursing Home Chain Comparison — Best & Worst Operators | NursingHomeGrade",
    "Compare nursing home operators by average facility grade. Rankings of the best and worst chains based on independent CMS data analysis.",
    body,
    { canonicalPath: "/reports/chains" },
  );
}

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

export function uncorrectedDeficienciesPage(facilities: UncorrectedRow[]): string {
  const rows = facilities.map((row) => {
    const sevClass = row.worst_severity && row.worst_severity >= "J" ? "sev-text--jeopardy"
      : row.worst_severity && row.worst_severity >= "G" ? "sev-text--harm"
      : "sev-text--low";

    return `
      <tr>
        <td class="strong">
          <a href="/facility/${escHtml(row.cms_id)}-${escHtml(row.slug)}">${escHtml(row.name)}</a>
        </td>
        <td>${escHtml(row.city)}, ${escHtml(row.state)}</td>
        <td class="strong ${sevClass}">${row.uncorrected_count}</td>
        <td class="strong ${sevClass}">
          ${escHtml(row.worst_severity ?? "?")} — ${escHtml(severityLabel(row.worst_severity))}
        </td>
        <td>${gradePill(row.grade_letter)}</td>
      </tr>
    `;
  }).join("");

  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Uncorrected Deficiencies" }])}

    <h1>Uncorrected Deficiency Report</h1>
    <p class="lede">
      Facilities with health inspection deficiencies that have <strong class="text-alarm">not yet been corrected</strong>.
      Sorted by severity: immediate jeopardy first, then actual harm, then all others.
    </p>

    <h2>Facilities With Outstanding Deficiencies</h2>
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>Facility</th>
            <th>Location</th>
            <th>Uncorrected</th>
            <th>Worst Severity</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box">
      <h3>Explore more reports</h3>
      <p>Browse other facility quality reports built from official CMS inspection data.</p>
      <a class="btn" href="/reports/staffing-failures">Staffing Failures →</a>
      <a href="/reports/high-deficiency-facilities" class="btn-secondary">High Deficiencies →</a>
    </div>
  `;

  return layout(
    "Uncorrected Deficiencies — NursingHomeGrade Report",
    "Nursing facilities with outstanding health inspection deficiencies that have not yet been corrected. Sorted by severity.",
    body,
    { canonicalPath: "/reports/uncorrected-deficiencies" },
  );
}

// ── CMS warning-flag reports (docs/data-stories/UNTOLD-STORIES.md §1) ────────

export interface AbuseStateRow {
  stateName: string;
  slug: string;
  count: number;
  /** Flagged homes that still hold an A or B from us. */
  goodGrades: number;
}

const ABUSE_BASE = "/reports/abuse-citations";
const SFF_PATH = "/reports/special-focus-facilities";

function flagSourceNote(): string {
  return `
    <div class="panel panel--tint panel-methodology">
      <h3>About this list</h3>
      <p>
        The flag comes from the CMS Provider Information file (dataset 4pq5-n9py), column "Abuse Icon" or "Special Focus Status",
        exactly as CMS publishes it. ${escHtml(ABUSE_ICON_DEFINITION)} ${escHtml(SPECIAL_FOCUS_DEFINITION)}
      </p>
      <p>
        Our A–F grade counts a home's citations by severity but does not use these flags, so a flagged home can still carry
        a good grade. We show both. <a href="/how-we-grade">How we grade</a> · <a href="/data-sources">Release dates</a>
      </p>
    </div>`;
}

function flagRelatedReports(): string {
  return `
    <div class="cta-box">
      <h3>Related Reports</h3>
      <p>Other lists built from official CMS records.</p>
      <a class="btn" href="${ABUSE_BASE}">Abuse and Neglect Citations →</a>
      <a href="${SFF_PATH}" class="btn-secondary">Special Focus Facilities →</a>
      <a href="/reports/uncorrected-deficiencies" class="btn-secondary">Uncorrected Deficiencies →</a>
    </div>`;
}

export function abuseCitationsPage(states: AbuseStateRow[], total: number): string {
  const goodGrades = states.reduce((sum, s) => sum + s.goodGrades, 0);
  const rows = states
    .map(
      (st) => `
        <tr>
          <td class="strong"><a href="${ABUSE_BASE}/${escHtml(st.slug)}">${escHtml(st.stateName)}</a></td>
          <td>${st.count.toLocaleString("en-US")}</td>
          <td>${st.goodGrades.toLocaleString("en-US")}</td>
        </tr>`,
    )
    .join("");
  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Abuse and Neglect Citations" }])}

    <h1>Nursing Homes CMS Flags for Abuse or Neglect</h1>
    <p class="lede">
      CMS flags <strong>${total.toLocaleString("en-US")} nursing homes</strong> in ${states.length} states for abuse or neglect citations.
      ${goodGrades > 0 ? `${goodGrades.toLocaleString("en-US")} of them still hold an A or B grade from us, which is why we show the flag on every page.` : ""}
    </p>
    <p>${escHtml(ABUSE_ICON_DEFINITION)}</p>

    <h2>Flagged Homes by State</h2>
    <div class="table-container">
      <table class="report-table">
        <thead><tr><th scope="col">State</th><th scope="col">Flagged homes</th><th scope="col">Graded A or B by us</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${flagSourceNote()}
    ${flagRelatedReports()}
  `;
  return layout(
    "Nursing Homes Cited for Abuse or Neglect — NursingHomeGrade Report",
    `${total.toLocaleString("en-US")} U.S. nursing homes carry CMS's abuse or neglect warning. See them by state, with each home's grade.`,
    body,
    { canonicalPath: ABUSE_BASE },
  );
}

export function abuseCitationsStatePage(
  stateName: string,
  stateSlug: string,
  facilities: FacilityRow[],
  opts: { total: number; goodGrades: number; page: number; totalPages: number },
): string {
  const { total, goodGrades, page, totalPages } = opts;
  const basePath = `${ABUSE_BASE}/${stateSlug}`;
  const canonicalPath = page > 1 ? `${basePath}?page=${page}` : basePath;
  const pagination = totalPages > 1 ? renderStaffingPagination(basePath, page, totalPages) : "";
  const scope = `Nursing Homes Cited for Abuse or Neglect in ${stateName}`;
  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Abuse and Neglect Citations", href: ABUSE_BASE }, { label: stateName }])}

    <h1>${escHtml(scope)}</h1>
    <p class="lede">
      CMS flags <strong>${total.toLocaleString("en-US")} ${total === 1 ? "nursing home" : "nursing homes"}</strong> in ${escHtml(stateName)} for abuse or neglect citations.
      ${goodGrades > 0 ? `${goodGrades.toLocaleString("en-US")} of them hold an A or B grade from us.` : ""}
    </p>
    <p>${escHtml(ABUSE_ICON_DEFINITION)}</p>

    <h2>Flagged Homes, Lowest Grade First</h2>
    ${renderReportTable(facilities, [
      { key: "name", label: "Facility" },
      { key: "city", label: "City" },
      { key: "grade_letter", label: "Our grade" },
    ])}
    ${pagination}

    ${flagSourceNote()}
    ${flagRelatedReports()}
  `;
  return layout(
    page > 1 ? `${scope} (Page ${page}) — NursingHomeGrade Report` : `${scope} — NursingHomeGrade Report`,
    `${total.toLocaleString("en-US")} nursing homes in ${stateName} carry CMS's abuse or neglect warning. See each home's record and grade.`,
    body,
    { canonicalPath, noindex: page > 1 },
  );
}

export function specialFocusPage(sff: FacilityRow[], candidates: FacilityRow[]): string {
  const columns: { key: keyof FacilityRow; label: string }[] = [
    { key: "name", label: "Facility" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "grade_letter", label: "Our grade" },
  ];
  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Special Focus Facilities" }])}

    <h1>CMS Special Focus Facilities and Candidates</h1>
    <p class="lede">
      ${escHtml(SPECIAL_FOCUS_DEFINITION)} CMS currently lists <strong>${sff.length.toLocaleString("en-US")} Special Focus ${sff.length === 1 ? "Facility" : "Facilities"}</strong>
      and <strong>${candidates.length.toLocaleString("en-US")} ${candidates.length === 1 ? "candidate" : "candidates"}</strong> for the program.
    </p>

    <h2 id="sff">Special Focus Facilities</h2>
    ${sff.length > 0 ? renderReportTable(sff, columns) : `<p class="muted">CMS lists no Special Focus Facilities in the current release.</p>`}

    <h2 id="candidates">Special Focus Candidates</h2>
    ${candidates.length > 0 ? renderReportTable(candidates, columns) : `<p class="muted">CMS lists no candidates in the current release.</p>`}

    ${flagSourceNote()}
    ${flagRelatedReports()}
  `;
  return layout(
    "CMS Special Focus Nursing Homes — NursingHomeGrade Report",
    `${sff.length} nursing homes are in CMS's Special Focus Facility program and ${candidates.length} are candidates. See each home's record and grade.`,
    body,
    { canonicalPath: SFF_PATH },
  );
}
