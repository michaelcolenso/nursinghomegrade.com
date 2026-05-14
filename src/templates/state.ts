import type { Facility } from "../types";
import { citySlug } from "../states";
import { layout, escHtml } from "./layout";

export interface StatePageData {
  stateName: string;
  stateSlug: string;
  facilityCount: number;
  totalFacilityCount: number;
  pctFailing: number;
  nationalPctFailing: number;
  gradeDistribution: Record<string, number>;
  cities: Array<{ city: string; count: number }>;
  facilities: Facility[];
}

export function statePage(data: StatePageData): string {
  const {
    stateName,
    stateSlug,
    facilityCount,
    totalFacilityCount,
    pctFailing,
    nationalPctFailing,
    gradeDistribution,
    cities,
    facilities,
  } = data;

  const body = `
    <div style="margin-bottom: 4rem;">
      <nav style="margin-bottom: 1.5rem; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted);">
        <a href="/" style="color: var(--muted);">Home</a>
        <span style="margin: 0 0.5rem; opacity: 0.5;">/</span>
        <a href="/states" style="color: var(--muted);">States</a>
      </nav>
      <h1 style="margin-bottom: 1rem;">Nursing homes in ${escHtml(stateName)}</h1>
      <p class="lede">
        Analysis of <strong>${(totalFacilityCount ?? facilityCount).toLocaleString()} facilities</strong> analyzed. ${pctFailing}% fail the federal staffing minimum, compared to a national average of ${nationalPctFailing}%.
      </p>
    </div>


    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 4rem; align-items: start; margin-bottom: 6rem;">
      <div>
        <h2 style="margin-bottom: 2rem;">Grade Distribution</h2>
        ${renderGradeDistribution(gradeDistribution, totalFacilityCount)}
        
        <h2 style="margin-bottom: 2rem; margin-top: 4rem;">Cities</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;">
          ${cities.slice(0, 30).map(c => `
            <a href="/state/${stateSlug}/${citySlug(c.city)}" class="card" style="padding: 1rem; text-align: center; text-decoration: none; color: var(--ink); font-weight: 600; font-size: 0.9rem;">
              ${escHtml(c.city)} (${c.count})
            </a>
          `).join('')}
        </div>
      </div>
      
      <div class="card" style="background: var(--ink); color: #fff; border: none; position: sticky; top: 120px;">
        <h3 style="color: #fff; font-size: 1.25rem; margin-bottom: 1.5rem; font-family: 'Newsreader', Georgia, serif;">Quick Search</h3>
        <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 1.5rem;">Find a specific facility in ${escHtml(stateName)} by ZIP code.</p>
        <form action="/search" method="GET" style="display: flex; flex-direction: column; gap: 0.75rem;">
          <input type="text" name="zip" placeholder="ZIP Code" pattern="[0-9]{5}" title="Enter a 5-digit ZIP code" maxlength="5" required style="padding: 0.75rem 1rem; border-radius: 0; border: none; font-family: 'Source Sans 3', sans-serif;">
          <button type="submit" class="btn" style="background: #fff; color: var(--ink); border: none;">Search</button>
        </form>
      </div>
    </div>

    <h2 style="margin-bottom: 2rem;">Top Rated Facilities in ${escHtml(stateName)}</h2>
    <div style="display: grid; gap: 1.5rem;">
      ${facilities.length > 0 
        ? facilities.slice(0, 10).map(f => renderFacilityItem(f)).join('')
        : `<p style="color: var(--muted);">No facilities found in this state.</p>`
      }
    </div>
    <div style="margin-top: 3rem; text-align: center;">
       <a href="/search?state=${stateSlug}" class="btn btn-secondary">View all ranked facilities</a>
    </div>
  `;

  return layout(
    `Nursing Homes in ${stateName} — Grades & Ratings`,
    `${facilityCount} nursing homes in ${stateName}. ${pctFailing}% fail the federal staffing minimum. Independent grades based on CMS data.`,
    body,
    { canonicalPath: `/state/${stateSlug}` }
  );
}

function renderGradeDistribution(dist: Record<string, number>, total: number): string {
  const letters = ["A", "B", "C", "D", "F"];
  return `
    <div style="display: flex; gap: 2px; height: 40px; border-radius: 0; overflow: hidden; margin-bottom: 2rem;">
      ${letters.map(l => {
        const count = dist[l] ?? 0;
        const pct = (count / total) * 100;
        return `<div class="grade-${l}" style="width: ${pct}%;" title="${l}: ${count} facilities"></div>`;
      }).join('')}
    </div>
    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem;">
      ${letters.map(l => `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="grade-${l}" style="width: 12px; height: 12px; border-radius: 0;"></div>
          <span style="font-weight: 700; font-size: 0.9rem;">Grade ${l}</span>
          <span style="color: var(--muted); font-size: 0.9rem;">${dist[l] ?? 0}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFacilityItem(f: Facility): string {
  return `
    <div class="card" style="padding: 1.5rem;">
      <div style="display: grid; grid-template-columns: 60px 1fr auto; gap: 2rem; align-items: center;">
        <div class="grade-badge grade-${f.grade_letter}" style="width: 60px; height: 60px; border-radius: 0;">
          <div class="grade-badge-letter" style="font-size: 1.75rem;">${f.grade_letter}</div>
          <div class="grade-badge-score" style="font-size: 0.6rem;">${f.grade_score}</div>
        </div>
        <div>
          <a href="/facility/${f.cms_id}-${f.slug}" style="font-family: 'Newsreader', Georgia, serif; font-size: 1.25rem; font-weight: 800; color: var(--ink); text-decoration: none;">${escHtml(f.name)}</a>
          <div style="font-size: 0.85rem; color: var(--muted); margin-top: 0.25rem;">${escHtml(f.city)}, ${escHtml(f.state)}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-bottom: 0.25rem;">Staffing</div>
          <div style="font-weight: 700;">${f.rn_hours_per_resident_day?.toFixed(2) ?? 'N/A'} hrs</div>
        </div>
      </div>
    </div>
  `;
}

    export function statesHubPage(states: Array<{ state: string; count: number; slug: string }>): string {
  const body = `
    <div style="margin-bottom: 4rem;">
      <nav style="margin-bottom: 1.5rem; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted);">
        <a href="/" style="color: var(--muted);">Home</a>
      </nav>
      <h1 style="margin-bottom: 1rem;">Nursing home grades by state</h1>
      <p class="lede">
        Independent ratings for every U.S. state. Derived from federal CMS data.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem;">
      ${states.map(s => `
        <a href="/state/${s.slug}" class="card" style="padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: var(--ink); transition: transform 0.2s;">
          <span style="font-weight: 700; font-size: 1.1rem;">${escHtml(s.state)}</span>
          <span style="font-size: 0.85rem; color: var(--muted); font-weight: 600;">${s.count.toLocaleString()} facilities</span>
        </a>
      `).join('')}
    </div>
  `;

  return layout(
    "Nursing Home Grades by State — NursingHomeGrade",
    "Browse independent nursing home ratings for every U.S. state. Grades based on federal CMS data.",
    body,
    { canonicalPath: "/states" }
  );
}
