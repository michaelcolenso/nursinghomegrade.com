import type { Facility } from "../types";
import { citySlug as toCitySlug } from "../states";
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
  siblingCities: Array<{ city: string; count: number }>;
  /**
   * Facilities just outside this city, nearest first. Small cities are often
   * nobody's nearest neighbour from a dense metro, so without a link from a
   * neighbouring city page they end up with only their own city listing pointing
   * at them. See src/link-graph.ts.
   */
  nearbyOutsideCity?: Facility[];
}

function renderCityGradeDistribution(dist: Record<string, number>, total: number): string {
  const letters = ["A", "B", "C", "D", "F"];
  return `
    <div style="display: flex; gap: 2px; height: 32px; border-radius: 0; overflow: hidden; margin-bottom: var(--space-s);">
      ${letters.map(l => {
        const count = dist[l] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return `<div class="grade-${l}" style="width: ${pct}%; min-width: 4px;" title="${l}: ${count} facilities"></div>`;
      }).join('')}
    </div>
    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-s); margin-bottom: var(--space-xl);">
      ${letters.map(l => `
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <div class="grade-${l}" style="width: 10px; height: 10px; border-radius: 0;"></div>
          <span style="font-weight: 700; font-size: 0.8rem;">${l}</span>
          <span style="color: var(--muted); font-size: 0.8rem;">${dist[l] ?? 0}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCityRelatedLinks(
  stateSlug: string,
  stateName: string,
  currentCitySlug: string,
  siblingCities: Array<{ city: string; count: number }>,
  nearbyOutsideCity: Facility[] = [],
): string {
  const otherCities = siblingCities
    .filter(c => toCitySlug(c.city) !== currentCitySlug)
    .slice(0, 8);

  // Direct links to individual facilities in neighbouring towns. A sole-facility
  // town is often nobody's nearest neighbour from a dense metro, so without this
  // it has only its own city listing pointing at it and falls below the
  // three-inbound-link threshold.
  const nearbyLinks = nearbyOutsideCity
    .slice(0, 6)
    .map(
      (f) =>
        `<li><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" style="color:var(--ink);text-decoration:none;font-weight:600;font-size:0.95rem;">${escHtml(f.name)} — ${escHtml(f.city)} (${f.grade_letter === "NR" ? "Not rated" : `Grade ${escHtml(f.grade_letter)}`})</a></li>`,
    )
    .join("");

  const nearbyBlock = nearbyLinks
    ? `
        <div>
          <h3 style="font-size:0.8rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">Nearby Facilities</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:var(--space-2xs);">
            ${nearbyLinks}
          </ul>
        </div>`
    : "";

  if (otherCities.length === 0 && !nearbyLinks) return "";

  const cityLinks = otherCities.map(c =>
    `<li><a href="/state/${escHtml(stateSlug)}/${escHtml(toCitySlug(c.city))}" style="color:var(--ink);text-decoration:none;font-weight:600;font-size:0.95rem;">Nursing homes in ${escHtml(c.city)} (${c.count})</a></li>`
  ).join("");

  return `
    <nav aria-label="Related pages" style="margin-top:var(--space-2xl);padding-top:var(--space-xl);border-top:1px solid var(--rule);">
      <h2 style="margin-bottom:var(--space-l);">Related Pages</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-xl);">
        <div>
          <h3 style="font-size:0.8rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">More Cities in ${escHtml(stateName)}</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:var(--space-2xs);">
            ${cityLinks}
          </ul>
        </div>
        ${nearbyBlock}
        <div>
          <h3 style="font-size:0.8rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">Browse by State</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:var(--space-2xs);">
            <li><a href="/state/${escHtml(stateSlug)}" style="color:var(--ink);text-decoration:none;font-weight:600;font-size:0.95rem;">All nursing homes in ${escHtml(stateName)}</a></li>
            <li><a href="/states" style="color:var(--ink);text-decoration:none;font-weight:600;font-size:0.95rem;">Browse all states</a></li>
          </ul>
        </div>
      </div>
    </nav>
  `;
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
    siblingCities,
    nearbyOutsideCity = [],
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
      ${renderCityGradeDistribution(gradeDistribution, facilityCount)}
    </div>

    <div style="display: flex; gap: var(--space-l); flex-wrap: wrap; align-items: flex-end; margin-bottom: var(--space-l); padding: var(--space-m); background: var(--bg); border: 2px solid var(--ink);">
      <label style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: grid; gap: var(--space-3xs);">
        Sort by
        <select id="city-sort" style="padding: var(--space-2xs) var(--space-xs); border: 2px solid var(--ink); border-radius: 0; font-size: 1rem; background: #fff; font-family: 'Source Sans 3', system-ui, sans-serif; font-weight: 700; min-height: 44px;">
          <option value="grade">Best grade first</option>
          <option value="name">Name A–Z</option>
        </select>
      </label>
      <p style="margin: 0; font-size: 0.9rem; color: var(--muted); margin-left: auto;">Showing <strong id="city-showing-count">${Math.min(15, facilities.length)}</strong> of ${facilityCount}</p>
    </div>

    <div id="city-results" style="display: grid; gap: 1.5rem; margin-bottom: 2rem;">
      ${facilities.map((f, i) => `
        <div class="card city-result-card" data-grade="${f.grade_letter}" data-name="${escHtml(f.name)}" data-score="${f.grade_score}" style="padding: 1.5rem; ${i >= 15 ? 'display:none;' : ''}">
          <div class="city-result-grid" style="display: grid; grid-template-columns: 80px 1fr auto; gap: 2rem; align-items: start;">
            <div class="grade-badge grade-${f.grade_letter}" style="width:80px;height:80px;border-radius:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div class="grade-badge-letter" style="font-size:2.5rem;font-weight:900;line-height:1;">${f.grade_letter === "NR" ? "NR" : f.grade_letter}</div>
              <div class="grade-badge-score" style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : `${f.grade_score}/100`}</div>
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
            <div style="display: flex; flex-direction: column; gap: var(--space-xs); align-self: center;">
              <a href="/facility/${f.cms_id}-${f.slug}" class="btn btn-secondary">View Report</a>
              <button onclick="toggleSave('${escHtml(f.cms_id)}', '${escHtml(f.name.replace(/'/g, "\\'"))}', '${f.grade_letter}', ${f.grade_score})" id="save-${escHtml(f.cms_id)}" class="compare-toggle" aria-pressed="false" title="Add to compare">
                <span class="compare-toggle-box" aria-hidden="true"></span>
                <span class="compare-toggle-label">Compare</span>
              </button>
            </div>
          </div>
        </div>
      `).join('')}
      ${facilities.length === 0 ? `<p style="color: var(--muted);">No facilities found in this city.</p>` : ''}
    </div>

    ${facilities.length > 15 ? `<div style="text-align: center; margin-bottom: var(--space-2xl);"><button id="city-load-more" class="btn">Show more facilities</button></div>` : ''}

    <div class="city-zip-cta" style="background: var(--ink); color: #fff; padding: var(--space-2xl); text-align: center; border: none;">
      <h2 style="color: #fff; margin-bottom: var(--space-m);">Don't see a facility?</h2>
      <p style="font-size: 1.1rem; opacity: 0.7; max-width: 600px; margin: 0 auto var(--space-xl);">Search by ZIP code to find all facilities within 25 miles of ${escHtml(cityName)}.</p>
      <form action="/search" method="GET" class="city-zip-form" style="display: flex; gap: var(--space-xs); max-width: 500px; margin: 0 auto;">
        <input type="text" name="zip" placeholder="ZIP code" pattern="[0-9]{5}" title="Enter a 5-digit ZIP code" maxlength="5" required autocomplete="postal-code" inputmode="numeric" style="flex: 1; padding: var(--space-s); border-radius: 0; border: none; background: #fff; color: var(--ink); font-family: 'Source Sans 3', system-ui, sans-serif; font-size: 1rem;">
        <button type="submit" class="btn-on-dark">Find Near Me</button>
      </form>
    </div>

    ${renderCityRelatedLinks(stateSlug, stateName, citySlug, siblingCities, nearbyOutsideCity)}
  `;

  const extraScripts = `
    <script>
      (function() {
        var sortSelect = document.getElementById('city-sort');
        var resultsContainer = document.getElementById('city-results');
        var loadMoreBtn = document.getElementById('city-load-more');
        var showingCount = document.getElementById('city-showing-count');
        var visibleLimit = 15;

        function getCards() {
          return Array.from(resultsContainer.querySelectorAll('.city-result-card'));
        }

        function sortCards() {
          var cards = getCards();
          var sortValue = sortSelect ? sortSelect.value : 'grade';
          cards.sort(function(a, b) {
            if (sortValue === 'name') {
              return a.dataset.name.localeCompare(b.dataset.name);
            }
            return parseInt(b.dataset.score) - parseInt(a.dataset.score);
          });
          cards.forEach(function(card) { resultsContainer.appendChild(card); });
          applyPagination();
        }

        function applyPagination() {
          var cards = getCards();
          cards.forEach(function(card, i) { card.style.display = i < visibleLimit ? '' : 'none'; });
          if (showingCount) showingCount.textContent = Math.min(visibleLimit, cards.length);
          if (loadMoreBtn) loadMoreBtn.style.display = visibleLimit >= cards.length ? 'none' : '';
        }

        if (sortSelect) {
          sortSelect.addEventListener('change', sortCards);
        }
        if (loadMoreBtn) {
          loadMoreBtn.addEventListener('click', function() {
            visibleLimit += 15;
            applyPagination();
          });
        }
      })();
    </script>
  `;

  return layout(
    `Nursing Homes in ${cityName}, ${stateName} — Grades & Ratings`,
    `Find independent grades for ${facilityCount} nursing homes in ${cityName}, ${stateName}. Based on official CMS staffing and inspection data.`,
    body,
    { canonicalPath: `/state/${stateSlug}/${citySlug}`, jsonLd, extraScripts: extraScripts },
  );
}
