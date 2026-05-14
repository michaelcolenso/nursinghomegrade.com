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
        font-family: 'Source Sans 3', sans-serif;
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
      }
      .cluster-icon {
        background: rgba(28, 25, 23, 0.1);
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
            fillColor: '#1c1917',
            color: '#1c1917',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.1
          }
        });
        map.addLayer(markers);

        let activeRequest = null;

        function fetchFacilities() {
          const bounds = map.getBounds();
          const params = new URLSearchParams({
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLng: bounds.getWest(),
            maxLng: bounds.getEast()
          });

          if (activeRequest) activeRequest.abort();
          const controller = new AbortController();
          activeRequest = controller;

          fetch('/api/map/facilities?' + params.toString(), { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
              markers.clearLayers();
              data.forEach(f => {
                const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-' + f.g).trim() || '#78716c';
                const marker = L.circleMarker([f.lt, f.lg], {
                  radius: 6,
                  fillColor: color,
                  color: '#1c1917',
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 1
                });
                
                marker.bindPopup(\`
                  <div class="map-tooltip">
                    <div style="font-weight:800;text-transform:uppercase;font-size:0.7rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:0.25rem;">Grade \${f.g} (\${f.s}/100)</div>
                    <a href="/facility/\${f.id}-\${f.sl}" style="font-family:'Newsreader', serif;font-weight:800;font-size:1.1rem;color:var(--ink);text-decoration:none;display:block;line-height:1.2;margin-bottom:0.5rem;">\${f.n}</a>
                    <a href="/facility/\${f.id}-\${f.sl}" class="btn" style="padding:0.4rem 0.8rem;font-size:0.75rem;display:inline-block;">View Report →</a>
                  </div>
                \`, { closeButton: false, minWidth: 200 });
                
                markers.addLayer(marker);
              });
            })
            .catch(err => {
              if (err.name !== 'AbortError') console.error('Map fetch failed:', err);
            });
        }

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
        <p class="results-intro">Browse 15,000+ nursing facilities by location. Pan and zoom to see regional quality trends and individual facility grades.</p>
      </div>
    </div>

    <div id="explore-map"></div>

    <div style="margin-top: var(--space-l); display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-s);">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-A)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade A</span>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-B)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade B</span>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-C)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade C</span>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-D)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade D</span>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span class="map-grade-dot" style="background:var(--grade-F)"></span>
        <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Grade F</span>
      </div>
    </div>
  `;

  return layout(
    "National Nursing Home Exploration Map",
    "Interact with our national map to find nursing home grades in your area and across the country.",
    body,
    { extraHead, extraScripts }
  );
}
