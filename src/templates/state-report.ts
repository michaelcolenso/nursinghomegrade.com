import { layout, escHtml } from "./layout";

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
    <div style="background:var(--bg);border:1px solid var(--rule);padding:var(--space-l);margin-top:var(--space-2xl);">
      <h3 style="margin-top:0;">Methodology</h3>
      <p style="font-size:0.95rem;color:var(--muted);margin-bottom:var(--space-s);">
        Data sourced from the CMS Provider Data Catalog. Grades are computed using a weighted composite of
        RN staffing compliance (35%), health inspection deficiencies (30%), CMS quality ratings (20%),
        and staffing consistency (15%).
      </p>
      <p style="font-size:0.95rem;color:var(--muted);margin-bottom:var(--space-s);">
        <strong>Dataset date:</strong> ${escHtml(datasetDate)}<br>
        <strong>Source:</strong> CMS Provider Info (4pq5-n9py), CMS Deficiencies (r5ix-sfxw)
      </p>
      <p style="font-size:0.95rem;color:var(--muted);">
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
    <div style="display:flex;gap:var(--space-xs);margin-bottom:var(--space-l);">
      ${grades.map((g) => {
        const count = gradeDistribution[g] ?? 0;
        const pct = count > 0 ? ((count / totalGraded) * 100).toFixed(0) : "0";
        return `<div style="flex:${count || 1};min-width:2rem;">
          <div style="height:2rem;background:var(--grade-${g});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:0.85rem;">${count}</div>
          <div style="text-align:center;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-top:var(--space-3xs);">${g} (${pct}%)</div>
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
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/state/${stateSlug}">${escHtml(stateName)}</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">State Report Card</span>
    </nav>

    <h1>${escHtml(stateName)} Nursing Home Report Card</h1>
    <p class="lede" style="font-size:1.25rem;margin-bottom:var(--space-s);">
      <strong>Rank: #${stateRank} of ${totalStates} states</strong>
      by average NursingHomeGrade Score. Independent analysis based on CMS data.
    </p>

    <div class="snapshot-grid" style="margin-bottom:var(--space-xl);">
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
      <span class="metric-label">% failing RN staffing benchmark (0.55 hrs)</span>
      <span class="metric-value" style="color:${pctFailing > nationalPctFailing ? "var(--grade-F)" : "var(--grade-A)"}">
        ${pctFailing}% ${pctFailing > nationalPctFailing ? "▴" : "▾"} (national: ${nationalPctFailing}%)
      </span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Average RN hours per resident day</span>
      <span class="metric-value">${avgRnHours !== null ? avgRnHours.toFixed(2) : "N/A"} ${staffingComparison ? `(${escHtml(staffingComparison)})` : ""}</span>
    </div>
    <p style="font-size:0.9rem;color:var(--muted);margin-top:var(--space-xs);">
      CMS repealed the federal staffing minimum in December 2025. NursingHomeGrade continues to use 0.55 RN hours per resident day as an evidence-based quality benchmark.
    </p>

    <h2>Deficiencies</h2>
    <div class="metric-row">
      <span class="metric-label">Average deficiencies per facility</span>
      <span class="metric-value">${avgDeficiencies !== null ? avgDeficiencies.toFixed(1) : "N/A"} ${defComparison ? `(${escHtml(defComparison)})` : ""}</span>
    </div>
    <p style="font-size:0.95rem;color:var(--muted);margin-bottom:var(--space-s);">
      National average: ${nationalAvg.avgDeficiencies} deficiencies per facility.
    </p>

    ${deficiencyCats.length > 0 ? `
      <h3 style="margin-top:var(--space-l);">Most Common Deficiency Categories</h3>
      <div class="table-container">
        <table style="min-width:400px;">
          <thead>
            <tr style="border-bottom:2px solid var(--ink);">
              <th style="text-align:left;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Category</th>
              <th style="text-align:right;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Citations</th>
            </tr>
          </thead>
          <tbody>
            ${deficiencyCats.map((d) => `
              <tr style="border-bottom:1px solid var(--rule);">
                <td style="padding:var(--space-s) 0;font-weight:600;">${escHtml(d.deficiency_category)}</td>
                <td style="padding:var(--space-s) 0;text-align:right;font-weight:700;font-family:'Playfair Display',Georgia,serif;font-size:1.25rem;">${d.count.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : ""}

    <h2>Grade Distribution</h2>
    ${gradeBar}

    <div style="display:flex;gap:var(--space-m);margin-top:var(--space-xl);flex-wrap:wrap;">
      <a class="btn" href="/best/${stateSlug}">Best facilities in ${escHtml(stateName)} →</a>
      <a class="btn" href="/worst/${stateSlug}">Lowest-rated in ${escHtml(stateName)} →</a>
    </div>

    ${reportMethodologyBlock(datasetDate)}

    <div class="cta-box" style="margin-top:var(--space-2xl);">
      <h3>Cite this report</h3>
      <p style="font-size:0.95rem;color:#c8d6e0;margin-bottom:var(--space-s);">
        "According to NursingHomeGrade's analysis of CMS data, ${stateName} nursing homes rank #${stateRank} of ${totalStates} states with an average score of ${avgGrade}/100."
      </p>
      <p style="font-size:0.8rem;color:#c8d6e0;margin-bottom:0;">
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
