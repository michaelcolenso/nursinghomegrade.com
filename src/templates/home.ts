import type { Facility } from "../types";
import { layout, escHtml } from "./layout";

export function homePage(pctFailing: number): string {
  const body = `
    <h1 class="display">Find honest nursing home grades</h1>
    <p class="lede">
      <strong>${pctFailing}% of U.S. nursing homes</strong> fail the federal staffing minimum.
      We show you which ones — independent grades based on CMS data.
    </p>
    <p style="color:var(--muted);font-size:0.9rem;margin-bottom:var(--space-m);">
      Data from CMS Nursing Home Compare. Updated monthly.
    </p>

    <form action="/search" method="GET" class="search-bar">
      <label for="zip-search" class="visually-hidden">ZIP code</label>
      <input type="text" id="zip-search" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}">
      <button type="submit">Search</button>
      <button type="button" id="geo-btn" class="geo-btn">Use my location</button>
    </form>

    <blockquote class="pull-quote">
      <strong>Why this site exists</strong> A Place for Mom earns up to $3,500 per family they refer to a facility —
      paid by the facility. Their incentive is placement, not quality. We do not take payments from nursing facilities, and outside referral relationships never change our grades.
      <a href="/about" style="font-weight:800;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;display:inline-block;margin-top:var(--space-s);border:none;">Read more →</a>
    </blockquote>
  `;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "NursingHomeGrade",
      "url": "https://nursinghomegrade.com/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://nursinghomegrade.com/search?zip={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "NursingHomeGrade",
      "url": "https://nursinghomegrade.com/",
      "description": "Independent ratings for U.S. nursing homes based on federal CMS data."
    }
  ];

  return layout(
    "NursingHomeGrade — Honest Nursing Home Ratings",
    `${pctFailing}% of U.S. nursing homes fail the federal staffing minimum. Find unbiased nursing home grades based on CMS data — no commissions.`,
    body,
    { jsonLd, canonicalPath: "/" }
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
  } = {},
): string {
  const { sort = "grade", minGrade = "", states } = options;

  if (facilities.length === 0) {
    const stateList = states
      ?.slice(0, 12)
      .map((s) => `${escHtml(s.state)} (${s.count.toLocaleString()})`)
      .join(", ");

    const body = `
      <div class="results-header">
        <h1 style="margin-bottom:0.5rem;">No facilities found near ${escHtml(zip)}</h1>
        <p style="color:var(--muted);margin-bottom:1.5rem;">We search within 25 miles of the ZIP code. Try another ZIP or check that you entered it correctly.</p>

        <form action="/search" method="GET" class="search-bar" style="max-width:400px;">
          <input type="text" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}">
          <button type="submit" class="btn" data-loading-text="Searching…">Search</button>
        </form>

        ${stateList ? `<p style="color:var(--muted);font-size:0.875rem;">We have facilities in ${stateList}.</p>` : ""}
      </div>
      <p style="margin-top:1.5rem;"><a href="/">← Back to home</a></p>
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
    <form action="/search" method="GET" class="results-controls">
      <input type="hidden" name="zip" value="${escHtml(zip)}">
      <label>
        Sort by
        <select name="sort" onchange="this.form.submit()">
          ${sortOptions.map((o) => `<option value="${o.value}" ${sort === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
      <label>
        Minimum grade
        <select name="min_grade" onchange="this.form.submit()">
          ${gradeOptions.map((o) => `<option value="${o.value}" ${minGrade === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
    </form>
  `;

  const items = facilities
    .map((f, index) => {
      const gradeClass = `result-item-${f.grade_letter}`;
      const rnText =
        f.rn_hours_per_resident_day !== null
          ? `${f.rn_hours_per_resident_day.toFixed(2)} ${f.rn_hours_per_resident_day >= 0.55 ? '<span style="color:var(--grade-A);">✓</span>' : '<span style="color:var(--grade-F);">✗</span>'}`
          : "N/A";
      const stars =
        f.overall_rating !== null
          ? `${"★".repeat(f.overall_rating)}${"☆".repeat(5 - f.overall_rating)}`
          : "N/A";

      const resultRank = index === 0 && sort === "grade" ? "Top match" : `#${index + 1}`;

      return `
        <div class="result-item ${gradeClass}">
          <div class="result-main">
            <div class="result-grade">
              <span class="result-rank">${resultRank}</span>
              <span class="grade-${f.grade_letter} result-grade-letter">${escHtml(f.grade_letter)}</span>
              <span class="result-grade-score">${f.grade_score}/100</span>
            </div>
            <div class="result-info">
              <div style="display:flex; justify-content:space-between; align-items:start;">
                <a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" class="result-name">${escHtml(f.name)}</a>
                <button onclick="toggleSave('${escHtml(f.cms_id)}', '${escHtml(f.name.replace(/'/g, "\\'"))}', '${f.grade_letter}', ${f.grade_score})" 
                        id="save-${escHtml(f.cms_id)}"
                        style="background:none; border:1px solid var(--rule); padding:0.25rem 0.5rem; font-size:0.7rem; font-weight:700; text-transform:uppercase; cursor:pointer;">
                  Save
                </button>
              </div>
              <div class="result-meta">${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)}</div>
              
              <div class="result-stats">
                <span class="result-stat">
                  <span class="result-stat-label">RN staffing</span>
                  <span class="result-stat-value">${rnText}</span>
                </span>
                <span class="result-stat">
                  <span class="result-stat-label">Deficiencies</span>
                  <span class="result-stat-value">${f.total_deficiencies ?? "N/A"}</span>
                </span>
                <span class="result-stat">
                  <span class="result-stat-label">CMS rating</span>
                  <span class="result-stat-value">${stars}</span>
                </span>
                ${f.distance !== undefined ? `<span class="result-stat"><span class="result-stat-label">Distance</span><span class="result-stat-value" style="color:var(--accent)">${f.distance.toFixed(1)} mi</span></span>` : ""}
              </div>
              
              <p class="result-summary">${escHtml(f.grade_summary)}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
const mapData = facilities
  .filter(f => f.latitude && f.longitude)
  .map(f => ({ id: f.cms_id, n: f.name, lt: f.latitude, lg: f.longitude, g: f.grade_letter, s: f.grade_score, sl: f.slug }));

const extraHead = `
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <style>
    #results-map { height: 400px; width: 100%; border: 2px solid var(--ink); margin-bottom: var(--space-l); display: none; }
    .map-active #results-map { display: block; }
    .map-active .results-list { display: none; }
  </style>
`;

const extraScripts = `
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    (function() {
      const facilities = ${JSON.stringify(mapData)};
      let map = null;

      window.toggleSave = function(id, name, grade, score) {
        let data = JSON.parse(localStorage.getItem('nhg_saved_facilities') || '[]');
        const idx = data.findIndex(f => f.cms_id === id);
        const btn = document.getElementById('save-' + id);
        
        if (idx > -1) {
          data.splice(idx, 1);
          btn.textContent = 'Save';
        } else {
          data.push({ cms_id: id, name, grade_letter: grade, grade_score: score });
          btn.textContent = 'Saved';
        }
        localStorage.setItem('nhg_saved_facilities', JSON.stringify(data));
        window.dispatchEvent(new Event('storage'));
      };

      // Set initial state
      const saved = JSON.parse(localStorage.getItem('nhg_saved_facilities') || '[]');
      saved.forEach(f => {
        const btn = document.getElementById('save-' + f.cms_id);
        if (btn) btn.textContent = 'Saved';
      });

      window.toggleMap = function() {
        const body = document.body;
        const btn = document.getElementById('map-toggle-btn');
        body.classList.toggle('map-active');

        if (body.classList.contains('map-active')) {
          btn.textContent = 'Show List View';
          if (!map) {
            map = L.map('results-map');
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              subdomains: 'abcd',
              maxZoom: 20
            }).addTo(map);

            const group = L.featureGroup();
            facilities.forEach(f => {
              const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-' + f.g).trim() || '#78716c';
              const m = L.circleMarker([f.lt, f.lg], {
                radius: 7,
                fillColor: color,
                color: '#1c1917',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
              });
              m.bindPopup(\`<strong>\${f.n}</strong><br>Grade \${f.g} (\${f.s}/100)<br><a href="/facility/\${f.id}-\${f.sl}">View Details →</a>\`);
              m.addTo(group);
            });
            group.addTo(map);
            map.fitBounds(group.getBounds().pad(0.1));
          } else {
            map.invalidateSize();
          }
        } else {
          btn.textContent = 'Show Map View';
        }
      };
    })();
  </script>
`;

const body = `
  <div class="results-header">
    <div class="results-overview">
      <div class="results-kicker">Search results</div>
      <div class="results-count">${facilities.length} facilit${facilities.length === 1 ? "y" : "ies"} near ${escHtml(zip)}</div>
      <p class="results-intro">Sorted to surface the strongest options first. Scan grade, staffing, and inspection issues before opening a full facility record.</p>
      <div style="margin-top:var(--space-s);">
        <button id="map-toggle-btn" onclick="toggleMap()" class="btn" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Show Map View</button>
      </div>
    </div>
    ${controls}
  </div>

  <div id="results-map"></div>
  <div class="results-list">${items}</div>
  <p style="margin-top:var(--space-l);"><a href="/">← New search</a></p>
`;

return layout(
  `Nursing Homes Near ${zip} — NursingHomeGrade`,
  `Nursing home quality grades for facilities near ZIP code ${zip}.`,
  body,
  { noindex: true, extraHead, extraScripts },
);
}

