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

/** Map a 0-100 score to the grade color band used across the site (matches src/scoring.ts thresholds). */
function scoreBandColor(score: number): string {
  if (score >= 80) return "var(--grade-A)";
  if (score >= 65) return "var(--grade-B)";
  if (score >= 50) return "var(--grade-C)";
  if (score >= 35) return "var(--grade-D)";
  return "var(--grade-F)";
}

/**
 * Pure-CSS horizontal score bar. SSR-rendered (no JS, stays cacheable).
 * The numeric value stays visible for precision; the bar conveys magnitude at a glance.
 */
function renderScoreBar(score: number, width = 72): string {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreBandColor(score);
  return `
    <div role="img" aria-label="Score ${score} out of 100" style="display:flex;flex-direction:column;gap:0.35rem;width:${width}px;margin:0 auto;">
      <span style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:1.1rem;line-height:1;color:${color};">${score}</span>
      <span style="display:block;height:6px;background:var(--rule);border:1px solid var(--rule);overflow:hidden;">
        <span style="display:block;height:100%;width:${pct}%;background:${color};"></span>
      </span>
    </div>
  `;
}

function renderFacilityCard(f: Facility): string {
  const rnText = f.rn_hours_per_resident_day !== null ? `${f.rn_hours_per_resident_day.toFixed(2)} hrs` : "Not reported";
  const deficiencyText = f.total_deficiencies !== null ? `${f.total_deficiencies}` : "Not reported";
  return `
    <article class="result-item result-item-${f.grade_letter}">
      <div class="result-main">
        <div class="result-grade">
          <span class="result-grade-letter grade-${f.grade_letter}">${escHtml(f.grade_letter)}</span>
          ${renderScoreBar(f.grade_score, 56)}
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
  const score = operator.operator_score ?? avgGrade;
  const tier = operator.operator_tier ?? "";
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
          ${totalFacilities} facilities · ${statesServed} state${statesServed !== 1 ? "s" : ""} · ${escHtml(tier)} operator
        </p>
      </div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-2xs);">
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(4rem,12vw,8rem);font-weight:800;line-height:0.8;color:${scoreBandColor(score)};">${score}</div>
        <div style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);">Operator Score</div>
        <span style="display:block;width:160px;height:8px;background:var(--rule);border:1px solid var(--rule);overflow:hidden;">
          <span style="display:block;height:100%;width:${Math.max(0, Math.min(100, Math.round(score)))}%;background:${scoreBandColor(score)};"></span>
        </span>
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
        <div class="snapshot-label">Operator Score</div>
        <div class="snapshot-value">${score}/100</div>
        <span style="display:block;height:6px;background:var(--rule);border:1px solid var(--rule);overflow:hidden;margin-top:var(--space-2xs);">
          <span style="display:block;height:100%;width:${Math.max(0, Math.min(100, Math.round(score)))}%;background:${scoreBandColor(score)};"></span>
        </span>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">Average Grade</div>
        <div class="snapshot-value">${avgGrade}/100</div>
        <span style="display:block;height:6px;background:var(--rule);border:1px solid var(--rule);overflow:hidden;margin-top:var(--space-2xs);">
          <span style="display:block;height:100%;width:${Math.max(0, Math.min(100, Math.round(avgGrade)))}%;background:${scoreBandColor(avgGrade)};"></span>
        </span>
      </div>
      <div class="snapshot-card">
        <div class="snapshot-label">National Average</div>
        <div class="snapshot-value">${nationalAvg.avgGrade}/100</div>
        <span style="display:block;height:6px;background:var(--rule);border:1px solid var(--rule);overflow:hidden;margin-top:var(--space-2xs);">
          <span style="display:block;height:100%;width:${Math.max(0, Math.min(100, Math.round(nationalAvg.avgGrade)))}%;background:${scoreBandColor(nationalAvg.avgGrade)};"></span>
        </span>
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

export interface OperatorsHubData {
  mega: Operator[];
  large: Operator[];
  mid: Operator[];
  small: Operator[];
  tierCounts: Record<string, number>;
}

const TIER_META: Array<{ key: "mega" | "large" | "mid" | "small"; label: string; desc: string; countKey: string }> = [
  { key: "mega", label: "Mega Operators", desc: "100+ facilities", countKey: "Mega" },
  { key: "large", label: "Large Operators", desc: "20–99 facilities", countKey: "Large" },
  { key: "mid", label: "Mid-Size Operators", desc: "5–19 facilities", countKey: "Mid" },
  { key: "small", label: "Small Operators", desc: "2–4 facilities", countKey: "Small" },
];

function renderOperatorRankTable(operators: Operator[], startRank = 1): string {
  if (operators.length === 0)
    return `<p style="color:var(--muted);padding:var(--space-m) 0;">No operators in this tier.</p>`;
  const rows = operators
    .map((op, i) => {
      const avg = op.avg_grade ?? 0;
      const score = op.operator_score ?? avg;
      return `
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:var(--space-s) 0;text-align:center;font-family:'Playfair Display',Georgia,serif;font-weight:800;color:var(--muted);">${startRank + i}</td>
        <td style="padding:var(--space-s) 0;font-weight:700;">
          <a href="/operator/${escHtml(op.slug)}">${escHtml(op.normalized_name)}</a>
        </td>
        <td style="padding:var(--space-s) 0;text-align:center;font-weight:800;">${op.facility_count}</td>
        <td style="padding:var(--space-s) 0;text-align:center;">${renderScoreBar(score, 72)}</td>
        <td style="padding:var(--space-s) 0;text-align:center;color:var(--muted);">${avg}/100</td>
      </tr>
    `;
    })
    .join("");
  return `
    <div class="table-container">
      <table style="min-width:640px;">
        <thead>
          <tr style="border-bottom:2px solid var(--ink);">
            <th style="text-align:center;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">#</th>
            <th style="text-align:left;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Operator</th>
            <th style="text-align:center;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Facilities</th>
            <th style="text-align:center;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Score</th>
            <th style="text-align:center;padding:var(--space-s) 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Avg Grade</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function operatorsHubPage(data: OperatorsHubData): string {
  const sections = TIER_META.map((tier) => {
    const list = data[tier.key];
    const total = data.tierCounts[tier.countKey] ?? list.length;
    return `
      <section style="margin-bottom:var(--space-2xl);">
        <h2>${tier.label} <span style="font-size:0.9rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);">${total} total</span></h2>
        <p class="lede" style="max-width:800px;margin-bottom:var(--space-l);">${tier.desc}. Ranked by composite score.</p>
        ${renderOperatorRankTable(list)}
      </section>
    `;
  }).join("");

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Operators</span>
    </nav>

    <h1>Nursing Home Operator Rankings</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      How do the largest nursing home operators actually perform? We rank operators
      that genuinely run facilities — not the banks, real estate trusts, and
      investment funds that merely hold an interest in them — using a transparent
      composite score. Operators are grouped by size so small providers aren't
      unfairly compared against national chains.
    </p>

    <h2>How the score works</h2>
    <div style="background:#fff;border:2px solid var(--ink);padding:var(--space-l);margin-bottom:var(--space-xl);">
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:var(--space-s);">
        <li style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.05rem,2vw,1.25rem);line-height:1.4;"><strong>70%</strong> — average facility grade (staffing, inspections, quality)</li>
        <li style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.05rem,2vw,1.25rem);line-height:1.4;"><strong>15%</strong> — average RN staffing hours per resident day</li>
        <li style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.05rem,2vw,1.25rem);line-height:1.4;"><strong>15%</strong> — inverse of average deficiencies per facility</li>
      </ul>
      <p style="margin:var(--space-m) 0 0;color:var(--muted);font-size:0.9rem;">
        Scores are 0–100. Data sourced from CMS ownership and provider files.
        Financial entities (banks, REITs, investment funds, audit firms, trusts)
        are excluded — <a href="/how-we-grade">see our methodology</a>.
      </p>
    </div>

    ${sections}

    <div style="display:flex;gap:var(--space-m);margin-top:var(--space-xl);flex-wrap:wrap;">
      <a class="btn" href="/operators/best">Best operators →</a>
      <a class="btn" href="/operators/worst">Worst operators →</a>
    </div>
  `;

  return layout(
    "Nursing Home Operator Rankings — NursingHomeGrade",
    "Rankings of nursing home operators by composite score, grouped by size: mega, large, mid-size, and small operators.",
    body,
    { canonicalPath: "/operators" },
  );
}

function renderTierExtremeSection(
  label: string,
  desc: string,
  operators: Operator[],
  rankPrefix: "best" | "worst",
): string {
  if (operators.length === 0) return "";
  const borderColor = rankPrefix === "best" ? "var(--grade-A)" : "var(--grade-F)";
  const cards = operators
    .map((op, i) => {
      const avg = op.avg_grade ?? 0;
      const score = op.operator_score ?? avg;
      return `
      <article class="result-item" style="border-left:12px solid ${borderColor};">
        <div class="result-main">
          <div class="result-grade">
            <span class="result-rank">#${i + 1}</span>
            ${renderScoreBar(score, 64)}
          </div>
          <div>
            <a href="/operator/${escHtml(op.slug)}" class="result-name">${escHtml(op.normalized_name)}</a>
            <p class="result-meta">${op.facility_count} facilities · ${avg} avg grade</p>
          </div>
        </div>
      </article>
    `;
    })
    .join("");

  return `
    <section style="margin-bottom:var(--space-2xl);">
      <h2>${label}</h2>
      <p class="lede" style="max-width:800px;margin-bottom:var(--space-l);">${desc}</p>
      <div class="results-list">
        ${cards}
      </div>
    </section>
  `;
}

export function operatorsBestPage(data: OperatorsHubData): string {
  const sections = [
    renderTierExtremeSection("Best Mega Operators", "100+ facilities, highest composite score.", data.mega, "best"),
    renderTierExtremeSection("Best Large Operators", "20–99 facilities, highest composite score.", data.large, "best"),
    renderTierExtremeSection("Best Mid-Size Operators", "5–19 facilities, highest composite score.", data.mid, "best"),
    renderTierExtremeSection("Best Small Operators", "2–4 facilities, highest composite score.", data.small, "best"),
  ].join("");

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
      The top operators in each size tier, ranked by composite score — a blend of
      facility grade, RN staffing, and deficiency record. Data sourced from CMS.
      Financial entities (banks, REITs, investment funds, audit firms, trusts) are excluded.
    </p>

    ${sections}
  `;

  return layout(
    "Best Nursing Home Operators — NursingHomeGrade",
    "Top nursing home operators by size tier, ranked by composite score.",
    body,
    { canonicalPath: "/operators/best" },
  );
}

export function operatorsWorstPage(data: OperatorsHubData): string {
  const sections = [
    renderTierExtremeSection("Worst Mega Operators", "100+ facilities, lowest composite score.", data.mega, "worst"),
    renderTierExtremeSection("Worst Large Operators", "20–99 facilities, lowest composite score.", data.large, "worst"),
    renderTierExtremeSection("Worst Mid-Size Operators", "5–19 facilities, lowest composite score.", data.mid, "worst"),
    renderTierExtremeSection("Worst Small Operators", "2–4 facilities, lowest composite score.", data.small, "worst"),
  ].join("");

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
      The bottom operators in each size tier, ranked by composite score — a blend of
      facility grade, RN staffing, and deficiency record. Data sourced from CMS.
      Financial entities (banks, REITs, investment funds, audit firms, trusts) are excluded.
    </p>

    ${sections}
  `;

  return layout(
    "Worst Nursing Home Operators — NursingHomeGrade",
    "Bottom-ranked nursing home operators by size tier and composite score.",
    body,
    { canonicalPath: "/operators/worst" },
  );
}
