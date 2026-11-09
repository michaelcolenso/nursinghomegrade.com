import type { Facility } from "../types";
import { citySlug as toCitySlug } from "../states";
import { layout, escHtml } from "./layout";
import { breadcrumb, facilityCard, gradeDistribution } from "./components";

export interface CityPageData {
  cityName: string;
  citySlug: string;
  stateName: string;
  stateSlug: string;
  facilityCount: number;
  noindex?: boolean;
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
        `<li><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">${escHtml(f.name)} — ${escHtml(f.city)} (${f.grade_letter === "NR" ? "Not rated" : `Grade ${escHtml(f.grade_letter)}`})</a></li>`,
    )
    .join("");

  const nearbyBlock = nearbyLinks
    ? `
        <div>
          <h3>Nearby Facilities</h3>
          <ul class="list-plain">
            ${nearbyLinks}
          </ul>
        </div>`
    : "";

  if (otherCities.length === 0 && !nearbyLinks) return "";

  const cityLinks = otherCities.map(c =>
    `<li><a href="/state/${escHtml(stateSlug)}/${escHtml(toCitySlug(c.city))}">Nursing homes in ${escHtml(c.city)} (${c.count})</a></li>`
  ).join("");

  return `
    <nav class="related" aria-label="Related pages">
      <h2>Related Pages</h2>
      <div class="related-grid">
        <div>
          <h3>More Cities in ${escHtml(stateName)}</h3>
          <ul class="list-plain">
            ${cityLinks}
          </ul>
        </div>
        ${nearbyBlock}
        <div>
          <h3>Browse by State</h3>
          <ul class="list-plain">
            <li><a href="/state/${escHtml(stateSlug)}">All nursing homes in ${escHtml(stateName)}</a></li>
            <li><a href="/states">Browse all states</a></li>
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
    noindex,
    pctFailing,
    nationalPctFailing,
    gradeDistribution: gradeDistribution_,
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
    <div class="page-header">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: stateName, href: `/state/${stateSlug}` }, { label: cityName }])}
      <h1>Nursing homes in ${escHtml(cityName)}, ${escHtml(stateName)}</h1>
      <p class="lede">
        Analysis of <strong>${facilityCount} nursing homes</strong> in ${escHtml(cityName)}. Independent grades based on official federal CMS data.
      </p>
      ${gradeDistribution(gradeDistribution_, { size: "sm" })}
    </div>

    <div class="toolbar">
      <label>
        Sort by
        <select id="city-sort" class="select">
          <option value="grade">Best grade first</option>
          <option value="name">Name A–Z</option>
        </select>
      </label>
      <p class="toolbar-note">Showing <strong id="city-showing-count">${Math.min(15, facilities.length)}</strong> of ${facilityCount}</p>
    </div>

    <div id="city-results" class="card-list section-gap">
      ${facilities.map((f, i) => facilityCard(f, {
        compare: true,
        className: "city-result-card",
        attrs: `data-grade="${escHtml(f.grade_letter)}" data-name="${escHtml(f.name)}" data-score="${Number(f.grade_score)}"${i >= 15 ? " hidden" : ""}`,
      })).join("")}
      ${facilities.length === 0 ? `<p class="muted">No facilities found in this city.</p>` : ""}
    </div>

    ${facilities.length > 15 ? `<div class="center section-gap"><button type="button" id="city-load-more" class="btn">Show more facilities</button></div>` : ""}

    <div class="panel panel--dark center section-gap">
      <h2>Don't see a facility?</h2>
      <p>Search by ZIP code to find all facilities within 25 miles of ${escHtml(cityName)}.</p>
      <form action="/search" method="GET" class="inline-form city-zip-form">
        <label for="city-zip" class="visually-hidden">ZIP code</label>
        <input type="text" id="city-zip" class="input" name="zip" placeholder="ZIP code" pattern="[0-9]{5}" title="Enter a 5-digit ZIP code" maxlength="5" required autocomplete="postal-code" inputmode="numeric">
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
          cards.forEach(function(card, i) { card.hidden = i >= visibleLimit; });
          if (showingCount) showingCount.textContent = Math.min(visibleLimit, cards.length);
          if (loadMoreBtn) loadMoreBtn.hidden = visibleLimit >= cards.length;
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
    { canonicalPath: `/state/${stateSlug}/${citySlug}`, noindex, jsonLd, extraScripts: extraScripts },
  );
}
