import { layout, escHtml } from "./layout";
import { breadcrumb } from "./components";
import { repealDisclosureHtml } from "../staffing-standard";

export interface StateReportData {
  stateName: string;
  stateAbbr: string;
  stateSlug: string;
  facilityCount: number;
  avgGrade: number;
  avgRnHours: number | null;
  avgDeficiencies: number | null;
  pctFailing: number;
  nationalPctFailing: number;
  nationalAvg: { avgGrade: number; avgRnHours: number; avgDeficiencies: number; totalFacilities: number };
  gradeDistribution: Record<string, number>;
  deficiencyCats: Array<{ deficiency_category: string; count: number }>;
  stateRank: number;
  totalStates: number;
  datasetDate: string;
}

function reportMethodologyBlock(datasetDate: string): string {
  return `
    <div class="panel panel--tint panel-methodology">
      <h3>Methodology</h3>
      <p>
        Data sourced from the CMS Provider Data Catalog. Grades are computed using a weighted composite of
        RN staffing compliance (35%), health inspection deficiencies (30%), CMS quality ratings (20%),
        and staffing consistency (15%).
      </p>
      <p>
        <strong>Dataset date:</strong> ${escHtml(datasetDate)}<br>
        <strong>Source:</strong> CMS Provider Info (4pq5-n9py), CMS Deficiencies (r5ix-sfxw)
      </p>
      <p>
        <a href="/about">Full methodology →</a>
      </p>
    </div>
  `;
}

export function stateReportPage(data: StateReportData): string {
  const {
    stateName, stateSlug, facilityCount, avgGrade, avgRnHours, avgDeficiencies,
    pctFailing, nationalPctFailing, nationalAvg, gradeDistribution, deficiencyCats,
    stateRank, totalStates, datasetDate,
  } = data;

  const gradeDiff = Math.round((avgGrade - nationalAvg.avgGrade) * 10) / 10;
  const gradeComparison = gradeDiff > 0
    ? `${gradeDiff.toFixed(1)} pts above national average`
    : gradeDiff < 0
      ? `${Math.abs(gradeDiff).toFixed(1)} pts below national average`
      : "equal to national average";

  const staffingDiff = avgRnHours !== null
    ? Math.round((avgRnHours - nationalAvg.avgRnHours) * 100) / 100
    : null;
  const staffingComparison = staffingDiff !== null
    ? staffingDiff > 0
      ? `${staffingDiff.toFixed(2)} hrs above national`
      : `${Math.abs(staffingDiff).toFixed(2)} hrs below national`
    : null;

  const defDiff = avgDeficiencies !== null
    ? Math.round((avgDeficiencies - nationalAvg.avgDeficiencies) * 10) / 10
    : null;
  const defComparison = defDiff !== null
    ? defDiff > 0
      ? `${defDiff.toFixed(1)} more than national`
      : `${Math.abs(defDiff).toFixed(1)} fewer than national`
    : null;

  // Grade distribution bar
  const grades = ["A", "B", "C", "D", "F"] as const;
  const totalGraded = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);
  const gradeBar = totalGraded > 0 ? `
    <div class="gbar">
      ${grades.map((g) => {
        const count = gradeDistribution[g] ?? 0;
        const pct = count > 0 ? ((count / totalGraded) * 100).toFixed(0) : "0";
        return `<div class="gbar-col" style="--w:${count || 1}">
          <div class="gbar-seg gbar-seg--${g}">${count}</div>
          <div class="gbar-label">${g} (${pct}%)</div>
        </div>`;
      }).join("")}
    </div>
  ` : "";

  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `${stateName} Nursing Home Report Card`,
    "description": `Independent analysis of ${facilityCount} nursing homes in ${stateName}. Rank: #${stateRank} of ${totalStates} states.`,
    "datePublished": datasetDate,
    "author": {
      "@type": "Organization",
      "name": "NursingHomeGrade"
    }
  }];

  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: stateName, href: `/state/${stateSlug}` }, { label: "State Report Card" }])}

    <h1>${escHtml(stateName)} Nursing Home Report Card</h1>
    <p class="lede">
      <strong>Rank: #${stateRank} of ${totalStates} states</strong>
      by average NursingHomeGrade Score. Independent analysis based on CMS data.
    </p>

    <div class="snapshot-grid">
      <div class="snapshot-card">
        <div class="snapshot-label">Facilities</div>
        <div class="snapshot-value">${facilityCount.toLocaleString()}</div>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">Average Grade</div>
        <div class="snapshot-value">${avgGrade}/100</div>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">National Average</div>
        <div class="snapshot-value">${nationalAvg.avgGrade}/100</div>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">State Rank</div>
        <div class="snapshot-value">#${stateRank} / ${totalStates}</div>
      </div>
    </div>

    <h2>Staffing</h2>
    <div class="metric-row">
      <span class="metric-label">% below the repealed 0.55 hr RN benchmark</span>
      <span class="metric-value ${pctFailing > nationalPctFailing ? "text-alarm" : "text-ok"}">
        ${pctFailing}% ${pctFailing > nationalPctFailing ? "▴" : "▾"} (national: ${nationalPctFailing}%)
      </span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Average RN hours per resident day</span>
      <span class="metric-value">${avgRnHours !== null ? avgRnHours.toFixed(2) : "N/A"} ${staffingComparison ? `(${escHtml(staffingComparison)})` : ""}</span>
    </div>
    <p class="note">
      CMS repealed the federal staffing minimum effective February 2, 2026. NursingHomeGrade continues to use 0.55 RN hours per resident day as an evidence-based quality benchmark.
    </p>
    ${repealDisclosureHtml()}

    <h2>Deficiencies</h2>
    <div class="metric-row">
      <span class="metric-label">Average deficiencies per facility</span>
      <span class="metric-value">${avgDeficiencies !== null ? avgDeficiencies.toFixed(1) : "N/A"} ${defComparison ? `(${escHtml(defComparison)})` : ""}</span>
    </div>
    <p class="section-note">
      National average: ${nationalAvg.avgDeficiencies} deficiencies per facility.
    </p>

    ${deficiencyCats.length > 0 ? `
      <h3>Most Common Deficiency Categories</h3>
      <div class="table-container">
        <table class="report-table report-table--narrow">
          <thead>
            <tr>
              <th>Category</th>
              <th class="num">Citations</th>
            </tr>
          </thead>
          <tbody>
            ${deficiencyCats.map((d) => `
              <tr>
                <td class="name">${escHtml(d.deficiency_category)}</td>
                <td class="num strong">${d.count.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : ""}

    <h2>Grade Distribution</h2>
    ${gradeBar}

    <div class="btn-row">
      <a class="btn" href="/best/${stateSlug}">Best facilities in ${escHtml(stateName)} →</a>
      <a class="btn" href="/worst/${stateSlug}">Lowest-rated in ${escHtml(stateName)} →</a>
    </div>

    ${reportMethodologyBlock(datasetDate)}

    <div class="cta-box">
      <h3>Cite this report</h3>
      <p>
        "According to NursingHomeGrade's analysis of CMS data, ${stateName} nursing homes rank #${stateRank} of ${totalStates} states with an average score of ${avgGrade}/100."
      </p>
      <p class="cta-fine">
        Data accessed ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
        All data sourced from the CMS Provider Data Catalog. Methodology details at nursinghomegrade.com/about.
      </p>
    </div>
  `;

  return layout(
    `${stateName} Nursing Home Report Card — Rank #${stateRank} of ${totalStates} | NursingHomeGrade`,
    `Independent analysis of ${facilityCount} nursing homes in ${stateName}. Average grade: ${avgGrade}/100. Rank: #${stateRank} of ${totalStates} states.`,
    body,
    { canonicalPath: `/state/${stateSlug}/report`, ogType: "article", jsonLd },
  );
}
