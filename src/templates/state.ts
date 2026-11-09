import type { StateFacilityCard } from "../types";
import { citySlug } from "../states";
import { layout, escHtml } from "./layout";
import { breadcrumb, facilityCard, gradeDistribution as renderGradeDistribution } from "./components";
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
    <div class="page-header">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: "States", href: "/states" }, { label: stateName }])}
      <h1>Nursing homes in ${escHtml(stateName)}</h1>
      <p class="lede">
        Analysis of <strong>${(totalFacilityCount ?? facilityCount).toLocaleString()} facilities</strong> analyzed. Among those reporting RN staffing, ${pctFailing}% fall below the repealed 0.55 hr RN benchmark, compared to a national average of ${nationalPctFailing}%.
      </p>
      ${repealDisclosureHtml()}
    </div>

    <div class="state-layout section-gap">
      <div>
        <h2>Grade Distribution</h2>
        ${renderGradeDistribution(gradeDistribution)}

        <h2>Cities</h2>
        <div class="link-grid">
          ${cities.slice(0, 30).map(c => `
            <a href="/state/${stateSlug}/${citySlug(c.city)}" class="link-card">
              <span>${escHtml(c.city)}</span><span class="link-card-count">(${c.count})</span>
            </a>
          `).join('')}
        </div>
      </div>

      <aside class="panel panel--dark state-search" aria-label="Quick search">
        <h2>Quick Search</h2>
        <p>Find a specific facility in ${escHtml(stateName)} by ZIP code.</p>
        <form action="/search" method="GET" class="stack-form">
          <label for="state-zip" class="visually-hidden">ZIP code</label>
          <input type="text" id="state-zip" class="input" name="zip" placeholder="ZIP code" pattern="[0-9]{5}" title="Enter a 5-digit ZIP code" maxlength="5" required autocomplete="postal-code" inputmode="numeric">
          <button type="submit" class="btn-on-dark">Search</button>
        </form>
      </aside>
    </div>

    <h2>Top Rated Facilities in ${escHtml(stateName)}</h2>
    <div class="card-list">
      ${facilities.length > 0
        ? facilities.slice(0, 10).map((f, i) => facilityCard(f, { rank: `#${i + 1}` })).join('')
        : `<p class="muted">No facilities found in this state.</p>`
      }
    </div>
    <div class="center btn-row btn-row--center">
       <a href="/search?state=${stateSlug}" class="btn btn--secondary">View all ranked facilities</a>
    </div>
  `;

  return layout(
    `Nursing Homes in ${stateName} — Grades & Ratings`,
    `${facilityCount} nursing homes in ${stateName}. Among those reporting RN staffing, ${pctFailing}% fall below the repealed 0.55 hr federal RN benchmark. Independent grades based on CMS data.`,
    body,
    { canonicalPath: `/state/${stateSlug}`, jsonLd }
  );
}

export function statesHubPage(states: Array<{ state: string; count: number; slug: string }>): string {
  const body = `
    <div class="page-header">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: "States" }])}
      <h1>Nursing home grades by state</h1>
      <p class="lede">
        Independent ratings for every U.S. state. Derived from federal CMS data.
      </p>
    </div>

    <div class="link-grid link-grid--wide">
      ${states.map(s => `
        <a href="/state/${s.slug}" class="link-card">
          <span class="link-card-name">${escHtml(s.state)}</span>
          <span class="link-card-count">${s.count.toLocaleString()} facilities</span>
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
