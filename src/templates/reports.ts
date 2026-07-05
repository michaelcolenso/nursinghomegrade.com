import type { Operator } from "../types";
import type { UncorrectedRow } from "../db";
import { layout, escHtml } from "./layout";

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

function renderReportTable(rows: FacilityRow[], columns: { key: keyof FacilityRow; label: string }[]): string {
  const header = columns.map((c) => `<th style="text-align:left;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">${escHtml(c.label)}</th>`).join("");
  const body = rows.map((row) => {
    const cells = columns.map((c) => {
      const val = row[c.key];
      if (c.key === "name") {
        return `<td style="padding:var(--space-s) 0;font-weight:700;"><a href="/facility/${escHtml(row.cms_id)}-${escHtml(row.slug)}">${escHtml(String(val))}</a></td>`;
      }
      if (c.key === "grade_letter") {
        return `<td style="padding:var(--space-s) 0;font-weight:800;color:var(--grade-${String(val)});">${escHtml(String(val))}</td>`;
      }
      return `<td style="padding:var(--space-s) 0;">${escHtml(String(val ?? "N/A"))}</td>`;
    }).join("");
    return `<tr style="border-bottom:1px solid var(--rule);">${cells}</tr>`;
  }).join("");

  return `
    <div class="table-container">
      <table style="min-width:600px;">
        <thead><tr style="border-bottom:2px solid var(--ink);">${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function reportMethodology(datasetDate: string): string {
  return `
    <div style="background:var(--bg);border:1px solid var(--rule);padding:var(--space-l);margin-top:var(--space-2xl);">
      <h3 style="margin-top:0;">Methodology</h3>
      <p style="font-size:0.95rem;color:var(--muted);margin-bottom:var(--space-s);">
        Data sourced from the CMS Provider Data Catalog. Facilities are ranked using the most recent available data.
        Grades are computed from RN staffing hours, health deficiencies, and CMS quality ratings.
      </p>
      <p style="font-size:0.95rem;color:var(--muted);margin-bottom:var(--space-s);">
        <strong>Dataset date:</strong> ${escHtml(datasetDate)}<br>
        <strong>Source files:</strong> CMS Provider Info (4pq5-n9py), CMS Deficiencies (r5ix-sfxw), CMS Ownership (y2hd-n93e)
      </p>
    </div>
  `;
}

export function staffingFailuresPage(facilities: FacilityRow[]): string {
  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Staffing Failures Report</span>
    </nav>

    <h1>Federal Staffing Failures</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      Facilities with RN staffing below the federal minimum of 0.55 hours per resident per day.
    </p>

    <h2>Facilities Below the Staffing Minimum</h2>
    ${renderReportTable(facilities, [
      { key: "name", label: "Facility" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "rn_hours_per_resident_day", label: "RN Hours" },
      { key: "grade_letter", label: "Grade" },
    ])}

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box" style="margin-top:var(--space-2xl);">
      <h3>Related Reports</h3>
      <p>Explore other facility quality reports built from official CMS inspection data.</p>
      <a class="btn" href="/reports/uncorrected-deficiencies">Uncorrected Deficiencies →</a>
      <a href="/reports/high-deficiency-facilities" class="btn-secondary">High Deficiencies →</a>
    </div>
  `;

  return layout(
    "Federal Staffing Failures — NursingHomeGrade Report",
    "Nursing facilities failing to meet federal RN staffing minimums of 0.55 hours per resident day.",
    body,
    { canonicalPath: "/reports/staffing-failures" },
  );
}

export function highDeficiencyPage(facilities: FacilityRow[]): string {
  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">High Deficiency Report</span>
    </nav>

    <h1>High Deficiency Facilities</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
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

    <div class="cta-box" style="margin-top:var(--space-2xl);">
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

export function staffingFailuresStatePage(stateName: string, facilities: FacilityRow[]): string {
  const scope = `Staffing Failures in ${stateName}`;
  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/reports/staffing-failures">Staffing Failures</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">${escHtml(stateName)}</span>
    </nav>

    <h1>${escHtml(scope)}</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      <strong>${facilities.length} facilities</strong> in ${escHtml(stateName)} fall below the RN staffing benchmark of 0.55 hours per resident per day.
    </p>

    <h2>Facilities Below the Staffing Minimum</h2>
    ${renderReportTable(facilities, [
      { key: "name", label: "Facility" },
      { key: "city", label: "City" },
      { key: "rn_hours_per_resident_day", label: "RN Hours" },
      { key: "grade_letter", label: "Grade" },
    ])}

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box" style="margin-top:var(--space-2xl);">
      <h3>Related Reports</h3>
      <p>Explore other facility quality reports built from official CMS inspection data.</p>
      <a class="btn" href="/reports/uncorrected-deficiencies">Uncorrected Deficiencies →</a>
      <a href="/reports/staffing-failures" class="btn-secondary">Staffing Failures →</a>
    </div>
  `;

  return layout(
    `${scope} — NursingHomeGrade Report`,
    `${facilities.length} nursing facilities in ${stateName} fall below the RN staffing benchmark of 0.55 hours per resident day.`,
    body,
    { canonicalPath: `/reports/staffing-failures/${stateName.toLowerCase().replace(/\s+/g, "-")}` },
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
        <tr style="border-bottom:1px solid var(--rule);">
          <td style="padding:var(--space-s) var(--space-xs);font-weight:800;color:var(--muted);font-size:0.85rem;">${i + 1}</td>
          <td style="padding:var(--space-s) var(--space-xs);font-weight:700;">
            <a href="/operator/${escHtml(op.slug)}">${escHtml(op.normalized_name)}</a>
          </td>
          <td style="padding:var(--space-s) var(--space-xs);">${op.facility_count}</td>
          <td style="padding:var(--space-s) var(--space-xs);font-weight:700;font-family:'Playfair Display',Georgia,serif;font-size:1.15rem;">${avg}</td>
          <td style="padding:var(--space-s) var(--space-xs);color:${kind === "best" ? "var(--grade-A)" : "var(--grade-F)"};font-weight:700;">${escHtml(diffLabel)}</td>
        </tr>
      `;
    }).join("");
  };

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Chain Comparison Report</span>
    </nav>

    <h1>Nursing Home Chain Comparison</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      How the largest nursing home operators compare. Rankings based on average NursingHomeGrade Score across all facilities in each chain (3+ facilities required).
      National average: ${nationalAvg.avgGrade}/100.
    </p>

    <h2>Best Operators</h2>
    <div class="table-container">
      <table style="min-width:600px;">
        <thead>
          <tr style="border-bottom:2px solid var(--ink);">
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">#</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Operator</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Facilities</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Avg Grade</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Vs National</th>
          </tr>
        </thead>
        <tbody>${renderChainList(bestChains, "best")}</tbody>
      </table>
    </div>

    <h2>Worst Operators</h2>
    <div class="table-container">
      <table style="min-width:600px;">
        <thead>
          <tr style="border-bottom:2px solid var(--ink);">
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">#</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Operator</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Facilities</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Avg Grade</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Vs National</th>
          </tr>
        </thead>
        <tbody>${renderChainList(worstChains, "worst")}</tbody>
      </table>
    </div>

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box" style="margin-top:var(--space-2xl);">
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
    const sevClass = row.worst_severity && row.worst_severity >= "J" ? "var(--grade-F)"
      : row.worst_severity && row.worst_severity >= "G" ? "var(--grade-D)"
      : "var(--muted)";

    return `
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:var(--space-s) var(--space-xs);font-weight:700;">
          <a href="/facility/${escHtml(row.cms_id)}-${escHtml(row.slug)}">${escHtml(row.name)}</a>
        </td>
        <td style="padding:var(--space-s) var(--space-xs);">${escHtml(row.city)}, ${escHtml(row.state)}</td>
        <td style="padding:var(--space-s) var(--space-xs);font-weight:800;color:${sevClass};font-size:1.1rem;">${row.uncorrected_count}</td>
        <td style="padding:var(--space-s) var(--space-xs);font-weight:700;color:${sevClass};">
          ${escHtml(row.worst_severity ?? "?")} — ${escHtml(severityLabel(row.worst_severity))}
        </td>
        <td style="padding:var(--space-s) var(--space-xs);font-weight:800;color:var(--grade-${row.grade_letter});">${escHtml(row.grade_letter)}</td>
      </tr>
    `;
  }).join("");

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Uncorrected Deficiencies</span>
    </nav>

    <h1>Uncorrected Deficiency Report</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      Facilities with health inspection deficiencies that have <strong style="color:var(--grade-F);">not yet been corrected</strong>.
      Sorted by severity: immediate jeopardy first, then actual harm, then all others.
    </p>

    <h2>Facilities With Outstanding Deficiencies</h2>
    <div class="table-container">
      <table style="min-width:600px;">
        <thead>
          <tr style="border-bottom:2px solid var(--ink);">
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Facility</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Location</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Uncorrected</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Worst Severity</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Grade</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}

    <div class="cta-box" style="margin-top:var(--space-2xl);">
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
