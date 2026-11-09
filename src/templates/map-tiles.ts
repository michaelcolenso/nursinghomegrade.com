// Single source of truth for the Leaflet basemap (PLAN D-17).
// OpenStreetMap standard tiles: free and keyless. Usage policy:
// https://operations.osmfoundation.org/policies/tiles/ — attribution must stay
// visible, browsers must send a Referer (our Referrer-Policy does), and tiles
// are fetched only for the user's viewport. If map traffic grows, move to a
// keyed provider or self-hosted vector tiles by changing only this file.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 19;

/** Client-side `L.tileLayer(...)` expression for embedding in inline map scripts. */
export function leafletTileLayerJs(): string {
  return `L.tileLayer(${JSON.stringify(TILE_URL)}, {
          attribution: ${JSON.stringify(TILE_ATTRIBUTION)},
          maxZoom: ${TILE_MAX_ZOOM}
        })`;
}
