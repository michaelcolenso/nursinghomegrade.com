import { layout } from "./layout";
import { leafletTileLayerJs } from "./map-tiles";

export function explorePage(): string {
  const extraHead = `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
  `;

  const extraScripts = `
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
    <script>
      (function() {
        const map = L.map('explore-map').setView([39.8283, -98.5795], 4);
        
        ${leafletTileLayerJs()}.addTo(map);

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
                const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-' + f.g + '-fill').trim() || '#607D8B';
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
                    <div class="map-tooltip-grade">\${f.g === "NR" || Number(f.s) < 0 ? "Not rated" : "Grade " + f.g + " (" + f.s + "/100)"}</div>
                    <a href="/facility/\${f.id}-\${f.sl}" class="map-tooltip-name">\${f.n}</a>
                    <a href="/facility/\${f.id}-\${f.sl}" class="btn btn--sm">View Report →</a>
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
        <p class="results-intro">Browse 14,700+ nursing facilities by location. Pan and zoom to see regional quality trends and individual facility grades.</p>
      </div>
    </div>

    <h2>Browse Nursing Homes by State</h2>
    <p>Select a state to view nursing home ratings, staffing data, and inspection records for every CMS-certified facility.</p>
    <p><a class="link-arrow" href="/states">All States →</a></p>

    <h2>How We Grade Nursing Homes</h2>
    <p>Every facility receives an A–F grade based on staffing levels, health inspection results, and quality measure performance — all from official CMS data. <a href="/methodology">Learn about our methodology →</a></p>

    <h2>Top-Rated Facilities Near You</h2>
    <p>Use the map below to find highly-rated nursing homes in any area. Zoom in to see individual facility grades and click a marker for the full report.</p>

    <div id="explore-map"></div>

    <ul class="map-legend list-plain">
      ${(["A", "B", "C", "D", "F"] as const).map((g) => `<li><span class="map-grade-dot map-grade-dot--${g}" aria-hidden="true"></span><span class="map-legend-label">Grade ${g}</span></li>`).join("")}
    </ul>
  `;

  return layout(
    "Nursing Home Database — Explore 14,700+ Facilities by State & Rating",
    "Browse independent grades for 14,700+ nursing homes nationwide. Filter by state, city, and overall rating. All data sourced from official CMS reports — no commissions.",
    body,
    { extraHead, extraScripts, canonicalPath: "/explore" }
  );
}
