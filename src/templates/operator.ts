import type { Operator, Facility } from "../types";
import { layout, escHtml } from "./layout";

interface OperatorPageProps {
  operator: Operator;
  facilities: Facility[];
  gradeDistribution: Record<string, number>;
  statesServed: number;
  nationalAvg: { avgGrade: number; avgRnHours: number; avgDeficiencies: number; totalFacilities: number };
  insightLines: string[];
}

function renderFacilityCard(f: Facility): string {
  const rnText = f.rn_hours_per_resident_day !== null ? `${f.rn_hours_per_resident_day.toFixed(2)} hrs` : "Not reported";
  const deficiencyText = f.total_deficiencies !== null ? `${f.total_deficiencies}` : "Not reported";
  return `
    <article class="result-item result-item-${f.grade_letter}">
      <div class="result-main">
        <div class="result-grade">
          <span class="result-grade-letter grade-${f.grade_letter}">${escHtml(f.grade_letter)}</span>
          <span class="result-grade-score">${f.grade_score}/100</span>
        </div>
        <div>
          <a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" class="result-name">${escHtml(f.name)}</a>
          <p class="result-meta">${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)} ${escHtml(f.zip)}</p>
          <div class="result-stats">
            <div class="result-stat"><span class="result-stat-label">RN Staffing</span><span class="result-stat-value">${escHtml(rnText)}</span></div>
            <div class="result-stat"><span class="result-stat-label">Deficiencies</span><span class="result-stat-value">${escHtml(deficiencyText)}</span></div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderGradeBar(distribution: Record<string, number>): string {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return "";
  const grades = ["A", "B", "C", "D", "F"] as const;
  return `
    <div style="display:flex;gap:var(--space-xs);margin-bottom:var(--space-l);">
      ${grades.map((g) => {
        const count = distribution[g] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return `<div style="flex:${count || 1};min-width:2rem;">
          <div style="height:2rem;background:var(--grade-${g});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:0.85rem;">${count}</div>
          <div style="text-align:center;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-top:var(--space-3xs);">${g}</div>
        </div>`;
      }).join("")}
    </div>
  `;
}

export function operatorPage(props: OperatorPageProps): string {
  const { operator, facilities, gradeDistribution, statesServed, nationalAvg, insightLines } = props;
  const totalFacilities = operator.facility_count;
  const best = facilities.slice(0, 5);
  const worst = [...facilities].sort((a, b) => a.grade_score - b.grade_score).slice(0, 5);

  const avgGrade = operator.avg_grade ?? 0;
  const gradeDiff = Math.round(avgGrade - nationalAvg.avgGrade);
  const gradeComparison = gradeDiff > 0 ? `${gradeDiff} pts above national` : gradeDiff < 0 ? `${Math.abs(gradeDiff)} pts below national` : "At national average";

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/operators">Operators</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">${escHtml(operator.normalized_name)}</span>
    </nav>

    <div class="facility-header">
      <div>
        <h1>${escHtml(operator.normalized_name)}</h1>
        <p style="color:var(--muted);margin-bottom:var(--space-s);font-size:1.1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
          ${totalFacilities} facilities · ${statesServed} state${statesServed !== 1 ? "s" : ""}
        </p>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(4rem,12vw,8rem);font-weight:800;line-height:0.8;color:var(--ink);">${avgGrade}</div>
        <div style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);">Avg Grade</div>
      </div>
    </div>

    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      ${escHtml(gradeComparison)} average across ${totalFacilities} nursing facilities.
    </p>

    <h2>Key Insights</h2>
    <div style="background:#fff;border:2px solid var(--ink);padding:var(--space-l);margin-bottom:var(--space-xl);">
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:var(--space-s);">
        ${insightLines.map((line) => `<li style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.1rem,2vw,1.35rem);line-height:1.4;">• ${escHtml(line)}</li>`).join("")}
      </ul>
    </div>

    <h2>Grade Distribution</h2>
    ${renderGradeBar(gradeDistribution)}

    <h2>Performance</h2>
    <div class="snapshot-grid" style="margin-bottom:var(--space-xl);">
      <div class="snapshot-card">
        <div class="snapshot-label">Average Grade</div>
        <div class="snapshot-value">${avgGrade}/100</div>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">National Average</div>
        <div class="snapshot-value">${nationalAvg.avgGrade}/100</div>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">Facilities</div>
        <div class="snapshot-value">${totalFacilities}</div>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">States Served</div>
        <div class="snapshot-value">${statesServed}</div>
      </div>
    </div>

    <h2>Best Facilities</h2>
    <div class="results-list" style="margin-bottom:var(--space-xl);">
      ${best.map(renderFacilityCard).join("")}
    </div>

    <h2>Worst Facilities</h2>
    <div class="results-list" style="margin-bottom:var(--space-xl);">
      ${worst.map(renderFacilityCard).join("")}
    </div>
  `;

  return layout(
    `${operator.normalized_name} — Nursing Home Operator | ${totalFacilities} Facilities`,
    `${operator.normalized_name} operates ${totalFacilities} nursing facilities across ${statesServed} states with an average grade of ${avgGrade}/100.`,
    body,
    { canonicalPath: `/operator/${operator.slug}`, ogType: "article" },
  );
}

export function operatorsHubPage(operators: Operator[]): string {
  const rows = operators.map((op) => {
    const avg = op.avg_grade ?? 0;
    return `
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:var(--space-s) 0;font-weight:700;">
          <a href="/operator/${escHtml(op.slug)}">${escHtml(op.normalized_name)}</a>
        </td>
        <td style="padding:var(--space-s) 0;text-align:center;font-weight:800;">${op.facility_count}</td>
        <td style="padding:var(--space-s) 0;text-align:center;font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.25rem;">${avg}</td>
      </tr>
    `;
  }).join("");

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Operators</span>
    </nav>

    <h1>Nursing Home Operators</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      Explore nursing home operators by facility count and average grade. Operators with 2+ facilities are listed.
    </p>

    <div class="table-container">
      <table style="min-width:600px;">
        <thead>
          <tr style="border-bottom:2px solid var(--ink);">
            <th style="text-align:left;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Operator</th>
            <th style="text-align:center;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Facilities</th>
            <th style="text-align:center;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Avg Grade</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div style="display:flex;gap:var(--space-m);margin-top:var(--space-xl);flex-wrap:wrap;">
      <a class="btn" href="/operators/best">Best operators →</a>
      <a class="btn" href="/operators/worst">Worst operators →</a>
    </div>
  `;

  return layout(
    "Nursing Home Operators — NursingHomeGrade",
    "Browse nursing home operators by facility count and average grade.",
    body,
    { canonicalPath: "/operators" },
  );
}

export function operatorsBestPage(operators: Operator[]): string {
  const cards = operators.map((op, i) => {
    const avg = op.avg_grade ?? 0;
    return `
      <article class="result-item" style="border-left:12px solid var(--grade-A);">
        <div class="result-main">
          <div class="result-grade">
            <span class="result-rank">#${i + 1}</span>
            <span class="result-grade-score">${avg}/100</span>
          </div>
          <div>
            <a href="/operator/${escHtml(op.slug)}" class="result-name">${escHtml(op.normalized_name)}</a>
            <p class="result-meta">${op.facility_count} facilities</p>
          </div>
        </div>
      </article>
    `;
  }).join("");

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/operators">Operators</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Best Operators</span>
    </nav>

    <h1>Best Nursing Home Operators</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      Operators with 3+ facilities ranked by highest average grade. Data sourced from CMS.
    </p>

    <div class="results-list">
      ${cards}
    </div>
  `;

  return layout(
    "Best Nursing Home Operators — NursingHomeGrade",
    "Top nursing home operators ranked by average facility grade.",
    body,
    { canonicalPath: "/operators/best" },
  );
}

export function operatorsWorstPage(operators: Operator[]): string {
  const cards = operators.map((op, i) => {
    const avg = op.avg_grade ?? 0;
    return `
      <article class="result-item" style="border-left:12px solid var(--grade-F);">
        <div class="result-main">
          <div class="result-grade">
            <span class="result-rank">#${i + 1}</span>
            <span class="result-grade-score">${avg}/100</span>
          </div>
          <div>
            <a href="/operator/${escHtml(op.slug)}" class="result-name">${escHtml(op.normalized_name)}</a>
            <p class="result-meta">${op.facility_count} facilities</p>
          </div>
        </div>
      </article>
    `;
  }).join("");

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/operators">Operators</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Worst Operators</span>
    </nav>

    <h1>Worst Nursing Home Operators</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      Operators with 3+ facilities ranked by lowest average grade. Data sourced from CMS.
    </p>

    <div class="results-list">
      ${cards}
    </div>
  `;

  return layout(
    "Worst Nursing Home Operators — NursingHomeGrade",
    "Bottom-ranked nursing home operators by average facility grade.",
    body,
    { canonicalPath: "/operators/worst" },
  );
}
