import { layout } from "./layout";

export function explorePage(): string {
  const extraHead = `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
    <style>
      #explore-map { 
        height: calc(100vh - 200px); 
        width: 100%; 
        border: 2px solid var(--ink);
        background: var(--bg);
      }
      .map-tooltip {
        font-family: 'Inter', system-ui, sans-serif;
        padding: 0.5rem;
        border: 2px solid var(--ink);
        border-radius: 0;
        box-shadow: 4px 4px 0 var(--ink);
      }
      .map-grade-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid var(--ink);
        display: inline-block;
        flex-shrink: 0;
      }
      .cluster-icon {
        background: rgba(11, 29, 51, 0.12);
        color: var(--ink);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.75rem;
        border: 1px solid var(--ink);
        backdrop-filter: blur(2px);
      }
      .grade-filter {
        cursor: pointer;
        user-select: none;
        padding: 0.35rem 0.6rem;
        border-radius: 0.25rem;
        transition: opacity 0.2s ease, background 0.2s ease;
      }
      .grade-filter:hover {
        background: rgba(11, 29, 51, 0.04);
      }
      .grade-filter.inactive {
        opacity: 0.35;
      }
      .grade-filter.inactive .map-grade-dot {
        background: #ccc !important;
        border-color: #999;
      }
      .grade-filter.inactive span:last-child {
        color: var(--muted);
      }
      .grade-filter-count {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--muted);
        margin-left: 0.25rem;
      }
    </style>
  `;

  const extraScripts = `
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
    <script>
      (function() {
        const map = L.map('explore-map').setView([39.8283, -98.5795], 4);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        const markers = L.markerClusterGroup({
          maxClusterRadius: 15,
          disableClusteringAtZoom: 11,
          iconCreateFunction: function(cluster) {
            return L.divIcon({ 
              html: cluster.getChildCount(), 
              className: 'cluster-icon', 
              iconSize: L.point(30, 30) 
            });
          },
          polygonOptions: {
            fillColor: '#0B1D33',
            color: '#0B1D33',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.1
          }
        });
        map.addLayer(markers);

        let activeRequest = null;
        const activeGrades = new Set(['A', 'B', 'C', 'D', 'F']);
        const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };

        function updateGradeFilterUI() {
          document.querySelectorAll('.grade-filter').forEach(el => {
            const grade = el.dataset.grade;
            const isActive = activeGrades.has(grade);
            el.classList.toggle('inactive', !isActive);
            const countEl = el.querySelector('.grade-filter-count');
            if (countEl) countEl.textContent = '(' + (gradeCounts[grade] || 0) + ')';
          });
        }

        function fetchFacilities() {
          const bounds = map.getBounds();
          const params = new URLSearchParams({
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLng: bounds.getWest(),
            maxLng: bounds.getEast()
          });
          if (activeGrades.size > 0 && activeGrades.size < 5) {
            params.set('grades', Array.from(activeGrades).join(','));
          }

          if (activeRequest) activeRequest.abort();
          const controller = new AbortController();
          activeRequest = controller;

          fetch('/api/map/facilities?' + params.toString(), { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
              // Reset counts
              gradeCounts.A = 0; gradeCounts.B = 0; gradeCounts.C = 0; gradeCounts.D = 0; gradeCounts.F = 0;

              markers.clearLayers();
              data.forEach(f => {
                gradeCounts[f.g] = (gradeCounts[f.g] || 0) + 1;
                const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-' + f.g).trim() || '#607D8B';
                const marker = L.circleMarker([f.lt, f.lg], {
                  radius: 6,
                  fillColor: color,
                  color: '#0B1D33',
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 1
                });
                
                marker.bindPopup(\`
                  <div class="map-tooltip">
                    <div style="font-weight:800;text-transform:uppercase;font-size:0.7rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:0.25rem;">Grade \${f.g} (\${f.s}/100)</div>
                    <a href="/facility/\${f.id}-\${f.sl}" style="font-family:'Playfair Display', Georgia, serif;font-weight:800;font-size:1.1rem;color:var(--ink);text-decoration:none;display:block;line-height:1.2;margin-bottom:0.5rem;">\${f.n}</a>
                    <a href="/facility/\${f.id}-\${f.sl}" class="btn" style="padding:0.4rem 0.8rem;font-size:0.75rem;display:inline-block;">View Report →</a>
                  </div>
                \`, { closeButton: false, minWidth: 200 });
                
                markers.addLayer(marker);
              });
              updateGradeFilterUI();
            })
            .catch(err => {
              if (err.name !== 'AbortError') console.error('Map fetch failed:', err);
            });
        }

        document.querySelectorAll('.grade-filter').forEach(el => {
          el.addEventListener('click', function() {
            const grade = this.dataset.grade;
            if (activeGrades.has(grade)) {
              if (activeGrades.size > 1) activeGrades.delete(grade);
            } else {
              activeGrades.add(grade);
            }
            updateGradeFilterUI();
            fetchFacilities();
          });
        });

        map.on('moveend', fetchFacilities);
        fetchFacilities();
      })();
    </script>
  `;

  const body = `
    <div class="results-header">
      <div class="results-overview">
        <div class="results-kicker">National Database</div>
        <h1 class="results-count">Explore all facilities</h1>
        <p class="results-intro">Browse 15,000+ nursing facilities by location. Pan and zoom to see regional quality trends and individual facility grades. Click grade indicators below to filter.</p>
      </div>
    </div>

    <div id="explore-map"></div>

    <div style="margin-top: var(--space-l); display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-s);">
      <div class="grade-filter" data-grade="A" style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-A)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade A</span>
        <span class="grade-filter-count"></span>
      </div>
      <div class="grade-filter" data-grade="B" style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-B)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade B</span>
        <span class="grade-filter-count"></span>
      </div>
      <div class="grade-filter" data-grade="C" style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-C)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade C</span>
        <span class="grade-filter-count"></span>
      </div>
      <div class="grade-filter" data-grade="D" style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-D)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade D</span>
        <span class="grade-filter-count"></span>
      </div>
      <div class="grade-filter" data-grade="F" style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-F)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade F</span>
        <span class="grade-filter-count"></span>
      </div>
    </div>
  `;

  return layout(
    "National Nursing Home Exploration Map",
    "Interact with our national map to find nursing home grades in your area and across the country.",
    body,
    { extraHead, extraScripts, canonicalPath: "/explore" }
  );
}
