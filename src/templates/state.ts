import type { StateFacilityCard } from "../types";
import { citySlug } from "../states";
import { layout, escHtml } from "./layout";
import { repealDisclosureHtml } from "../staffing-standard";

export interface StatePageData {
  stateName: string;
  stateSlug: string;
  facilityCount: number;
  totalFacilityCount: number;
  pctFailing: number;
  nationalPctFailing: number;
  gradeDistribution: Record<string, number>;
  cities: Array<{ city: string; count: number }>;
  facilities: StateFacilityCard[];
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

  const baseUrl = "https://nursinghomegrade.com";
  const stateUrl = `${baseUrl}/state/${stateSlug}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Top Rated Nursing Homes in ${stateName}`,
    "itemListElement": facilities.slice(0, 10).map((f, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": f.name,
      "url": `${baseUrl}/facility/${f.cms_id}-${f.slug}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
      { "@type": "ListItem", "position": 2, "name": "States", "item": `${baseUrl}/states` },
      { "@type": "ListItem", "position": 3, "name": stateName, "item": stateUrl },
    ],
  };

  const jsonLd = [itemListSchema, breadcrumbSchema];

  const body = `
    <div style="margin-bottom: 4rem;">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="breadcrumb-sep">›</span>
        <a href="/states">States</a>
        <span class="breadcrumb-sep">›</span>
        <span style="color:var(--ink);">${escHtml(stateName)}</span>
      </nav>
      <h1 style="margin-bottom: 1rem;">Nursing homes in ${escHtml(stateName)}</h1>
      <p class="lede">
        Analysis of <strong>${(totalFacilityCount ?? facilityCount).toLocaleString()} facilities</strong> analyzed. Among those reporting RN staffing, ${pctFailing}% fall below the repealed 0.55 hr RN benchmark, compared to a national average of ${nationalPctFailing}%.
      </p>
      ${repealDisclosureHtml()}
    </div>


    <div class="state-layout" style="display: grid; grid-template-columns: 2fr 1fr; gap: 4rem; align-items: start; margin-bottom: 6rem;">
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
      
      <div class="card" style="background: var(--ink); color: #fff; border: none; position: sticky; top: 120px; padding: var(--space-l);">
        <h3 style="color: #fff; font-size: 1.25rem; margin-bottom: 1rem; font-family: 'Playfair Display', Georgia, serif;">Quick Search</h3>
        <p style="font-size: 0.9rem; opacity: 0.7; margin-bottom: 1.25rem;">Find a specific facility in ${escHtml(stateName)} by ZIP code.</p>
        <form action="/search" method="GET" style="display: flex; flex-direction: column; gap: var(--space-xs);">
          <input type="text" name="zip" placeholder="ZIP code" pattern="[0-9]{5}" title="Enter a 5-digit ZIP code" maxlength="5" required autocomplete="postal-code" inputmode="numeric" style="padding: var(--space-s); border-radius: 0; border: none; background: #fff; color: var(--ink); font-family: 'Source Sans 3', system-ui, sans-serif; font-size: 1rem;">
          <button type="submit" class="btn-on-dark">Search</button>
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
    `${facilityCount} nursing homes in ${stateName}. Among those reporting RN staffing, ${pctFailing}% fall below the repealed 0.55 hr federal RN benchmark. Independent grades based on CMS data.`,
    body,
    { canonicalPath: `/state/${stateSlug}`, jsonLd, extraHead: `<style>@media(max-width:768px){.state-layout{grid-template-columns:1fr!important;gap:2rem!important}.state-layout .card[style*="sticky"]{position:static!important;order:2}}</style>` }
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

function renderFacilityItem(f: StateFacilityCard): string {
  return `
    <div class="card" style="padding: 1.5rem;">
      <div style="display: grid; grid-template-columns: 60px 1fr auto; gap: 2rem; align-items: center;">
        <div class="grade-badge grade-${f.grade_letter}" style="width: 60px; height: 60px; border-radius: 0;">
          <div class="grade-badge-letter" style="font-size: 1.75rem;">${f.grade_letter === "NR" ? "NR" : f.grade_letter}</div>
          <div class="grade-badge-score" style="font-size: 0.6rem;">${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : f.grade_score}</div>
        </div>
        <div>
          <a href="/facility/${f.cms_id}-${f.slug}" style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.25rem; font-weight: 800; color: var(--ink); text-decoration: none;">${escHtml(f.name)}</a>
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
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="breadcrumb-sep">›</span>
        <span style="color:var(--ink);">States</span>
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

  const baseUrl = "https://nursinghomegrade.com";
  const hubJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
        { "@type": "ListItem", "position": 2, "name": "All States", "item": `${baseUrl}/states` }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Nursing Home Grades by State",
      "itemListElement": states.map((s, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": s.state,
        "url": `${baseUrl}/state/${s.slug}`,
      })),
    }
  ];
  return layout(
    "Nursing Home Grades by State — NursingHomeGrade",
    "Browse independent nursing home ratings for every U.S. state. Grades based on federal CMS data.",
    body,
    { canonicalPath: "/states", jsonLd: hubJsonLd }
  );
}
