import type { Facility } from "../types";
import { layout, escHtml } from "./layout";

export interface StatePageData {
  stateName: string;
  stateSlug: string;
  facilityCount: number;
  pctFailing: number;
  nationalPctFailing: number;
  gradeDistribution: Record<string, number>;
  cities: Array<{ city: string; count: number }>;
  facilities: Facility[];
}

function gradeBar(distribution: Record<string, number>, total: number): string {
  const letters = ["A", "B", "C", "D", "F"];
  const colors: Record<string, string> = {
    A: "#2d5a3d",
    B: "#3d5a80",
    C: "#b48a3e",
    D: "#a65e3e",
    F: "#9e3a3a",
  };

  const bars = letters
    .map((letter) => {
      const count = distribution[letter] ?? 0;
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
      const width = total > 0 ? (count / total) * 100 : 0;
      return `<div style="flex:${count};min-width:${width > 2 ? '2px' : '0'};background:${colors[letter]};height:100%;" title="Grade ${letter}: ${count} (${pct}%)"></div>`;
    })
    .join("");

  const labels = letters
    .map((letter) => {
      const count = distribution[letter] ?? 0;
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
      return `<span style="display:flex;align-items:center;gap:0.35rem;font-size:0.875rem;"><span style="display:inline-block;width:10px;height:10px;background:${colors[letter]};"></span> ${letter}: ${count} <span style="color:var(--muted);">(${pct}%)</span></span>`;
    })
    .join("");

  return `
    <div style="display:flex;height:24px;margin-bottom:0.75rem;border-radius:0;overflow:hidden;background:var(--rule);">
      ${bars}
    </div>
    <div style="display:flex;gap:1.25rem 1.5rem;flex-wrap:wrap;margin-bottom:2rem;">
      ${labels}
    </div>
  `;
}

function cityList(cities: Array<{ city: string; count: number }>, stateSlug: string): string {
  if (cities.length === 0) return "";
  const items = cities
    .slice(0, 24)
    .map((c) => `<a href="#${escHtml(c.city.toLowerCase().replace(/\s+/g, "-"))}" style="font-size:0.875rem;color:var(--muted);">${escHtml(c.city)} <span style="color:var(--rule);">(${c.count})</span></a>`)
    .join('<span style="color:var(--rule);"> · </span>');

  return `
    <div style="margin-bottom:2rem;">
      <h2 style="font-size:1rem;margin-bottom:0.75rem;color:var(--muted);font-weight:600;">Cities in this state</h2>
      <div style="display:flex;flex-wrap:wrap;gap:0.35rem 0.75rem;">
        ${items}
      </div>
    </div>
  `;
}

function facilityList(facilities: Facility[], stateSlug: string): string {
  if (facilities.length === 0) {
    return `<p style="color:var(--muted);">No facilities found in this state.</p>`;
  }

  const items = facilities
    .map((f) => {
      const gradeClass = `result-item-${f.grade_letter}`;
      const rnText =
        f.rn_hours_per_resident_day !== null
          ? `${f.rn_hours_per_resident_day.toFixed(2)} ${f.rn_hours_per_resident_day >= 0.55 ? '<span style="color:#166534;">✓</span>' : '<span style="color:#b91c1c;">✗</span>'}`
          : "N/A";
      const stars =
        f.overall_rating !== null
          ? `${"★".repeat(f.overall_rating)}${"☆".repeat(5 - f.overall_rating)}`
          : "N/A";

      return `
        <div class="result-item ${gradeClass}" id="${escHtml(f.city.toLowerCase().replace(/\s+/g, "-"))}">
          <div class="result-main">
            <div class="result-grade">
              <span class="grade-${f.grade_letter} result-grade-letter">${escHtml(f.grade_letter)}</span>
              <span class="result-grade-score">${f.grade_score}/100</span>
            </div>
            <div class="result-info">
              <a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" class="result-name">${escHtml(f.name)}</a>
              <div class="result-meta">
                ${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)}
              </div>
              <div class="result-stats">
                <span class="result-stat">RN hours: ${rnText}</span>
                <span class="result-stat">Deficiencies: ${f.total_deficiencies ?? "N/A"}</span>
                <span class="result-stat">CMS: ${stars}</span>
              </div>
              <p class="result-summary">${escHtml(f.grade_summary)}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return items;
}

export function statePage(data: StatePageData): string {
  const {
    stateName,
    stateSlug,
    facilityCount,
    pctFailing,
    nationalPctFailing,
    gradeDistribution,
    cities,
    facilities,
  } = data;

  const diff = pctFailing - nationalPctFailing;
  const diffText = diff > 0
    ? `${diff.toFixed(1)} points higher than the national average`
    : diff < 0
      ? `${Math.abs(diff).toFixed(1)} points lower than the national average`
      : "equal to the national average";

  const body = `
    <nav class="breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/states">States</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">${escHtml(stateName)}</span>
    </nav>

    <h1 class="display">Nursing homes in ${escHtml(stateName)}</h1>
    <p class="lede">
      <strong>${facilityCount.toLocaleString()} nursing homes</strong> in ${escHtml(stateName)}.
      <strong>${pctFailing}%</strong> fail the federal staffing minimum — ${diffText}.
    </p>

    <h2 style="font-size:1.1rem;margin-bottom:0.75rem;">Grade distribution</h2>
    ${gradeBar(gradeDistribution, facilityCount)}

    ${cityList(cities, stateSlug)}

    <h2 style="font-size:1.1rem;margin-bottom:0.75rem;">All facilities, ranked by grade</h2>
    ${facilityList(facilities, stateSlug)}

    <div class="cta-box" style="margin-top:2.5rem;">
      <h3 style="margin-bottom:0.5rem;">Looking for a specific city?</h3>
      <p style="margin-bottom:1rem;color:var(--muted);">Search by ZIP code to find nursing homes near you.</p>
      <form action="/search" method="GET" class="search-bar" style="margin-bottom:0;">
        <input type="text" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}">
        <button type="submit" data-loading-text="Searching…">Search</button>
      </form>
    </div>
  `;

  return layout(
    `Nursing Homes in ${stateName} — Grades & Ratings`,
    `${facilityCount} nursing homes in ${stateName}. ${pctFailing}% fail the federal staffing minimum. Independent grades based on CMS data — no commissions.`,
    body,
  );
}

export function statesHubPage(
  states: Array<{ state: string; count: number; slug: string }>,
): string {
  const columns = 4;
  const perColumn = Math.ceil(states.length / columns);
  const colGroups: Array<Array<{ state: string; count: number; slug: string }>> = [];
  for (let i = 0; i < columns; i++) {
    colGroups.push(states.slice(i * perColumn, (i + 1) * perColumn));
  }

  const colsHtml = colGroups
    .map((group) => {
      const items = group
        .map(
          (s) =>
            `<li style="margin-bottom:0.4rem;"><a href="/state/${escHtml(s.slug)}" style="font-size:0.95rem;">${escHtml(s.state)} <span style="color:var(--muted);font-size:0.85rem;">(${s.count.toLocaleString()})</span></a></li>`,
        )
        .join("");
      return `<ul style="list-style:none;padding:0;margin:0;min-width:160px;">${items}</ul>`;
    })
    .join("");

  const body = `
    <nav class="breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">States</span>
    </nav>

    <h1 class="display">Nursing home grades by state</h1>
    <p class="lede">
      Browse independent nursing home ratings for every U.S. state. All grades are derived from CMS data — no commissions, no conflicts.
    </p>

    <div style="display:flex;gap:2rem;flex-wrap:wrap;margin-top:2rem;">
      ${colsHtml}
    </div>
  `;

  return layout(
    "Nursing Home Grades by State — NursingHomeGrade",
    "Browse independent nursing home ratings for every U.S. state. Grades based on federal CMS data.",
    body,
  );
}
