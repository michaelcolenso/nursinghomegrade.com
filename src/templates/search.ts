import type { Facility } from "../types";
import { layout, escHtml } from "./layout";
import type { DataRelease } from "./data-sources";
import { dataFreshness } from "./data-freshness";
import { leafletTileLayerJs } from "./map-tiles";
import { facilityCard } from "./components";
import { icon } from "./icons";

export function searchFormPage(releases: DataRelease[] = []): string {
  const body = `
    <div class="results-header">
      <h1>Search nursing homes by ZIP code</h1>
      <p class="muted">Enter a 5-digit ZIP code to see graded nursing homes within 25 miles.</p>
      ${dataFreshness(releases)}
      <form action="/search" method="GET" class="search-bar search-bar--narrow">
        <label for="search-zip" class="visually-hidden">ZIP code</label>
        <input type="text" id="search-zip" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code" inputmode="numeric" required>
        <button type="submit" data-loading-text="Searching…">Search</button>
      </form>
    </div>
  `;
  return layout(
    "Search Nursing Homes by ZIP Code — NursingHomeGrade",
    "Search independent A–F nursing home grades by ZIP code. Compare staffing, inspection, and quality data for facilities near you.",
    body,
    { canonicalPath: "/search" },
  );
}

export function searchResultsPage(
  zip: string,
  facilities: Array<Facility & { distance?: number }>,
  options: {
    sort?: string;
    minGrade?: string;
    geoState?: string;
    states?: Array<{ state: string; count: number }>;
    releases?: DataRelease[];
  } = {},
): string {
  const { sort = "grade", minGrade = "", states, releases = [] } = options;

  if (facilities.length === 0) {
    const stateList = states
      ?.slice(0, 12)
      .map((s) => `${escHtml(s.state)} (${s.count.toLocaleString()})`)
      .join(", ");

    const body = `
      <div class="results-header">
        <h1>No facilities found near ${escHtml(zip)}</h1>
        <p class="muted">We search within 25 miles of the ZIP code. Try another ZIP or check that you entered it correctly.</p>
        ${dataFreshness(releases)}

        <form action="/search" method="GET" class="search-bar search-bar--narrow">
          <label for="search-zip" class="visually-hidden">ZIP code</label>
          <input type="text" id="search-zip" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code" inputmode="numeric">
          <button type="submit" data-loading-text="Searching…">Search</button>
        </form>

        ${stateList ? `<p class="muted">We have facilities in ${stateList}.</p>` : ""}
      </div>
      <p><a class="link-arrow" href="/">← Back to home</a></p>
    `;
    return layout(
      `No Results for ${zip} — NursingHomeGrade`,
      `No nursing homes found near ZIP code ${zip}.`,
      body,
      { noindex: true },
    );
  }

  const sortOptions = [
    { value: "grade", label: "Best grade" },
    { value: "distance", label: "Closest" },
    { value: "name", label: "Name A-Z" },
  ];

  const gradeOptions = [
    { value: "", label: "Any grade" },
    { value: "A", label: "A only" },
    { value: "B", label: "B or better" },
    { value: "C", label: "C or better" },
    { value: "D", label: "D or better" },
  ];

  const controls = `
    <form action="/search" method="GET" class="toolbar">
      <input type="hidden" name="zip" value="${escHtml(zip)}">
      <label>
        Sort by
        <select class="select" name="sort" onchange="this.form.submit()">
          ${sortOptions.map((o) => `<option value="${o.value}" ${sort === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
      <label>
        Minimum grade
        <select class="select" name="min_grade" onchange="this.form.submit()">
          ${gradeOptions.map((o) => `<option value="${o.value}" ${minGrade === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
    </form>
  `;

  const items = facilities
    .map((f, index) =>
      facilityCard(f, {
        rank: index === 0 && sort === "grade" ? "Top match" : `#${index + 1}`,
        distance: f.distance,
        compare: true,
        summary: true,
      }),
    )
    .join("");

  const mapData = facilities
    .filter((f) => f.latitude && f.longitude)
    .map((f) => ({ id: f.cms_id, n: f.name, lt: f.latitude, lg: f.longitude, g: f.grade_letter, s: f.grade_score, sl: f.slug }));

  const extraHead = `
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
`;

  const extraScripts = `
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    (function() {
      const facilities = ${JSON.stringify(mapData)};
      let map = null;

      window.toggleMap = function() {
        const body = document.body;
        const label = document.getElementById('map-toggle-label');
        body.classList.toggle('map-active');

        if (body.classList.contains('map-active')) {
          label.textContent = 'Show List View';
          if (!map) {
            map = L.map('results-map');
            ${leafletTileLayerJs()}.addTo(map);

            const group = L.featureGroup();
            facilities.forEach(f => {
              // Marker fill reads the grade fill token; keep in step with --grade-*-fill in src/styles/tokens.ts.
              const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-' + f.g + '-fill').trim() || '#607D8B';
              const m = L.circleMarker([f.lt, f.lg], {
                radius: 7,
                fillColor: color,
                color: '#0B1D33',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
              });
              m.bindPopup(\`<strong>\${f.n}</strong><br>\${f.g === "NR" || Number(f.s) < 0 ? "Not rated" : "Grade " + f.g + " (" + f.s + "/100)"}<br><a href="/facility/\${f.id}-\${f.sl}">View Details →</a>\`);
              m.addTo(group);
            });
            group.addTo(map);
            map.fitBounds(group.getBounds().pad(0.1));
          } else {
            map.invalidateSize();
          }
        } else {
          label.textContent = 'Show Map View';
        }
      };
    })();
  </script>
`;

  const body = `
  <div class="results-header">
    <div class="results-overview">
      <div class="results-kicker">Search results</div>
      <h1 class="results-count">${facilities.length} facilit${facilities.length === 1 ? "y" : "ies"} near ${escHtml(zip)}</h1>
      <p class="results-intro">Sorted to surface the strongest options first. Scan grade, staffing, and inspection issues before opening a full facility record.</p>
      ${dataFreshness(releases)}
      <button type="button" id="map-toggle-btn" onclick="toggleMap()" class="btn btn--secondary">${icon("map-pin", { size: 18 })}<span id="map-toggle-label">Show Map View</span></button>
    </div>
    ${controls}
  </div>

  <div id="results-map"></div>
  <h2 class="visually-hidden">Facility results</h2>
  <div class="results-list" aria-live="polite" aria-atomic="false">${items}</div>
  <p class="section-gap"><a class="link-arrow" href="/">← New search</a></p>
`;

  return layout(
    `Nursing Homes Near ${zip} — NursingHomeGrade`,
    `See nursing home quality grades, staffing levels, and inspection reports for facilities near ZIP code ${zip}. Compare A–F ratings to find the best care options in your area.`,
    body,
    { noindex: true, extraHead, extraScripts },
  );
}
