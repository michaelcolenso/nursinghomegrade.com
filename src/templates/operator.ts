import type { Operator, Facility } from "../types";
import { layout, escHtml } from "./layout";
import { breadcrumb, facilityCard, gradeDistribution, operatorCard, scoreBar, scoreTrack } from "./components";

interface OperatorPageProps {
  operator: Operator;
  facilities: Facility[];
  gradeDistribution: Record<string, number>;
  statesServed: number;
  nationalAvg: { avgGrade: number; avgRnHours: number; avgDeficiencies: number; totalFacilities: number };
  insightLines: string[];
}

function operatorStatTile(label: string, value: string, track = ""): string {
  return `<div class="snapshot-card">
        <div class="snapshot-label">${label}</div>
        <div class="snapshot-value">${value}</div>
        ${track}
      </div>`;
}

export function operatorPage(props: OperatorPageProps): string {
  const { operator, facilities, gradeDistribution: distribution, statesServed, nationalAvg, insightLines } = props;
  const totalFacilities = operator.facility_count;
  const best = facilities.slice(0, 5);
  const worst = [...facilities].sort((a, b) => a.grade_score - b.grade_score).slice(0, 5);

  const avgGrade = operator.avg_grade ?? 0;
  const score = operator.operator_score ?? avgGrade;
  const tier = operator.operator_tier ?? "";
  const gradeDiff = Math.round(avgGrade - nationalAvg.avgGrade);
  const gradeComparison = gradeDiff > 0 ? `${gradeDiff} pts above national` : gradeDiff < 0 ? `${Math.abs(gradeDiff)} pts below national` : "At national average";
  const distTotal = Object.values(distribution).reduce((a, b) => a + b, 0);

  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Operators", href: "/operators" }, { label: operator.normalized_name }])}

    <div class="facility-header">
      <div>
        <h1>${escHtml(operator.normalized_name)}</h1>
        <p class="meta-line">
          ${totalFacilities} facilities · ${statesServed} state${statesServed !== 1 ? "s" : ""} · ${escHtml(tier)} operator
        </p>
      </div>
      <div class="operator-score">
        ${scoreBar(score, { size: "lg" })}
        <div class="eyebrow">Operator Score</div>
      </div>
    </div>

    <p class="lede">
      ${escHtml(gradeComparison)} average across ${totalFacilities} nursing facilities.
    </p>

    <h2>Key Insights</h2>
    <div class="panel section-gap">
      <ul class="list-plain insights">
        ${insightLines.map((line) => `<li>• ${escHtml(line)}</li>`).join("")}
      </ul>
    </div>

    <h2>Grade Distribution</h2>
    ${distTotal > 0 ? gradeDistribution(distribution, { size: "sm" }) : ""}

    <h2>Performance</h2>
    <div class="snapshot-grid">
      ${operatorStatTile("Operator Score", `${score}/100`, scoreTrack(score))}
      ${operatorStatTile("Average Grade", `${avgGrade}/100`, scoreTrack(avgGrade))}
      ${operatorStatTile("National Average", `${nationalAvg.avgGrade}/100`, scoreTrack(nationalAvg.avgGrade))}
      ${operatorStatTile("Facilities", String(totalFacilities))}
      ${operatorStatTile("States Served", String(statesServed))}
    </div>

    <h2>Best Facilities</h2>
    <div class="card-list section-gap">
      ${best.map((f) => facilityCard(f)).join("")}
    </div>

    <h2>Worst Facilities</h2>
    <div class="card-list section-gap">
      ${worst.map((f) => facilityCard(f)).join("")}
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
    return `<p class="muted">No operators in this tier.</p>`;
  const rows = operators
    .map((op, i) => {
      const avg = op.avg_grade ?? 0;
      const score = op.operator_score ?? avg;
      return `
      <tr>
        <td class="rank-n center">${startRank + i}</td>
        <td class="name">
          <a href="/operator/${escHtml(op.slug)}">${escHtml(op.normalized_name)}</a>
        </td>
        <td class="center name">${op.facility_count}</td>
        <td class="center">${scoreBar(score, { size: "sm" })}</td>
        <td class="center muted">${avg}/100</td>
      </tr>
    `;
    })
    .join("");
  return `
    <div class="table-container">
      <table class="rank-table rank-table--ops">
        <thead>
          <tr>
            <th scope="col" class="center">#</th>
            <th scope="col">Operator</th>
            <th scope="col" class="center">Facilities</th>
            <th scope="col" class="center">Score</th>
            <th scope="col" class="center">Avg Grade</th>
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
      <section class="section-gap">
        <h2>${tier.label} <span class="eyebrow eyebrow--inline">${total} total</span></h2>
        <p class="lede">${tier.desc}. Ranked by composite score.</p>
        ${renderOperatorRankTable(list)}
      </section>
    `;
  }).join("");

  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Operators" }])}

    <h1>Nursing Home Operator Rankings</h1>
    <p class="lede">
      How do the largest nursing home operators actually perform? We rank operators
      that genuinely run facilities — not the banks, real estate trusts, and
      investment funds that merely hold an interest in them — using a transparent
      composite score. Operators are grouped by size so small providers aren't
      unfairly compared against national chains.
    </p>

    <h2>How the score works</h2>
    <div class="panel section-gap">
      <ul class="list-plain insights">
        <li><strong>70%</strong> — average facility grade (staffing, inspections, quality)</li>
        <li><strong>15%</strong> — average RN staffing hours per resident day</li>
        <li><strong>15%</strong> — inverse of average deficiencies per facility</li>
      </ul>
      <p class="muted">
        Scores are 0–100. Data sourced from CMS ownership and provider files.
        Financial entities (banks, REITs, investment funds, audit firms, trusts)
        are excluded — <a href="/how-we-grade">see our methodology</a>.
      </p>
    </div>

    ${sections}

    <div class="btn-row">
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
  const cards = operators.map((op, i) => operatorCard(op, { rank: `#${i + 1}`, tone: rankPrefix })).join("");

  return `
    <section class="section-gap">
      <h2>${label}</h2>
      <p class="lede">${desc}</p>
      <div class="card-list">
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
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Operators", href: "/operators" }, { label: "Best Operators" }])}

    <h1>Best Nursing Home Operators</h1>
    <p class="lede">
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
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Operators", href: "/operators" }, { label: "Worst Operators" }])}

    <h1>Worst Nursing Home Operators</h1>
    <p class="lede">
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
