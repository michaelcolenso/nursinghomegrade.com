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

    ${renderReportTable(facilities, [
      { key: "name", label: "Facility" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "rn_hours_per_resident_day", label: "RN Hours" },
      { key: "grade_letter", label: "Grade" },
    ])}

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}
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

    ${renderReportTable(facilities, [
      { key: "name", label: "Facility" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "total_deficiencies", label: "Deficiencies" },
      { key: "grade_letter", label: "Grade" },
    ])}

    ${reportMethodology(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}
  `;

  return layout(
    "High Deficiency Facilities — NursingHomeGrade Report",
    "Nursing facilities with the most health inspection deficiencies.",
    body,
    { canonicalPath: "/reports/high-deficiency-facilities" },
  );
}
