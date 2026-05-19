import type { Facility } from "../types";
import { layout, escHtml } from "./layout";

export interface CityPageData {
  cityName: string;
  citySlug: string;
  stateName: string;
  stateSlug: string;
  facilityCount: number;
  pctFailing: number;
  nationalPctFailing: number;
  gradeDistribution: Record<string, number>;
  facilities: Facility[];
}

export function cityPage(data: CityPageData): string {
  const {
    cityName,
    citySlug,
    stateName,
    stateSlug,
    facilityCount,
    pctFailing,
    nationalPctFailing,
    gradeDistribution,
    facilities,
  } = data;

  const baseUrl = "https://nursinghomegrade.com";
  const cityUrl = `${baseUrl}/state/${stateSlug}/${citySlug}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Nursing Homes in ${cityName}, ${stateName}`,
    "itemListElement": facilities.map((f, i) => ({
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
      { "@type": "ListItem", "position": 2, "name": stateName, "item": `${baseUrl}/state/${stateSlug}` },
      { "@type": "ListItem", "position": 3, "name": cityName, "item": cityUrl },
    ],
  };

  const jsonLd = [itemListSchema, breadcrumbSchema];

  const body = `
    <div style="margin-bottom: 4rem;">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="breadcrumb-sep">›</span>
        <a href="/state/${stateSlug}">${escHtml(stateName)}</a>
        <span class="breadcrumb-sep">›</span>
        <span style="color:var(--ink);">${escHtml(cityName)}</span>
      </nav>
      <h1 style="margin-bottom: 1rem;">Nursing homes in ${escHtml(cityName)}, ${escHtml(stateName)}</h1>
      <p class="lede">
        Analysis of <strong>${facilityCount} nursing homes</strong> in ${escHtml(cityName)}. Independent grades based on official federal CMS data.
      </p>
    </div>

    <div style="display: grid; gap: 1.5rem; margin-bottom: 6rem;">
      ${facilities.map(f => `
        <div class="card city-result-card" style="padding: 1.5rem;">
          <div class="city-result-grid" style="display: grid; grid-template-columns: 80px 1fr auto; gap: 2rem; align-items: start;">
            <div class="grade-badge grade-${f.grade_letter}" style="width:80px;height:80px;border-radius:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div class="grade-badge-letter" style="font-size:2.5rem;font-weight:900;line-height:1;">${f.grade_letter}</div>
              <div class="grade-badge-score" style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${f.grade_score}/100</div>
            </div>
            <div>
              <a href="/facility/${f.cms_id}-${f.slug}" style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.5rem; font-weight: 800; color: var(--ink); text-decoration: none; display: block; margin-bottom: 0.5rem;">${escHtml(f.name)}</a>
              <div style="font-size: 0.95rem; color: var(--muted); font-weight: 500; margin-bottom: 1rem;">${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)}</div>
              
              <div class="city-result-metrics" style="display: flex; gap: 2rem;">
                <div>
                  <div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-bottom: 0.25rem;">Staffing</div>
                  <div style="font-weight: 700;">${f.rn_hours_per_resident_day?.toFixed(2) ?? 'N/A'} hrs</div>
                </div>
                <div>
                  <div style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-bottom: 0.25rem;">CMS Rating</div>
                  <div style="font-weight: 700;">${f.overall_rating ? '★'.repeat(f.overall_rating) : 'N/A'}</div>
                </div>
              </div>
            </div>
            <a href="/facility/${f.cms_id}-${f.slug}" class="btn btn-secondary" style="align-self: center;">View Report</a>
          </div>
        </div>
      `).join('')}
      ${facilities.length === 0 ? `<p style="color: var(--muted);">No facilities found in this city.</p>` : ''}
    </div>

    <div class="city-zip-cta" style="background: var(--ink); color: #fff; padding: var(--space-2xl); text-align: center; border: none;">
      <h2 style="color: #fff; margin-bottom: var(--space-m);">Don't see a facility?</h2>
      <p style="font-size: 1.1rem; opacity: 0.7; max-width: 600px; margin: 0 auto var(--space-xl);">Search by ZIP code to find all facilities within 25 miles of ${escHtml(cityName)}.</p>
      <form action="/search" method="GET" class="city-zip-form" style="display: flex; gap: var(--space-xs); max-width: 500px; margin: 0 auto;">
        <input type="text" name="zip" placeholder="ZIP code" pattern="[0-9]{5}" title="Enter a 5-digit ZIP code" maxlength="5" required style="flex: 1; padding: var(--space-s); border-radius: 0; border: none; background: #fff; color: var(--ink); font-family: 'Inter', system-ui, sans-serif; font-size: 1rem;">
        <button type="submit" class="btn-on-dark">Find Near Me</button>
      </form>
    </div>
  `;

  return layout(
    `Nursing Homes in ${cityName}, ${stateName} — Grades & Ratings`,
    `Find independent grades for ${facilityCount} nursing homes in ${cityName}, ${stateName}. Based on official CMS staffing and inspection data.`,
    body,
    { canonicalPath: `/state/${stateSlug}/${citySlug}`, jsonLd },
  );
}
