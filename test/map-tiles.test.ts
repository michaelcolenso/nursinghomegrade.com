import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { facilityPage } from "../src/templates/facility";
import { explorePage } from "../src/templates/explore";
import { searchResultsPage } from "../src/templates/home";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, leafletTileLayerJs } from "../src/templates/map-tiles";
import type { Facility, FacilityPageData } from "../src/types";

const facility: FacilityPageData = {
  cms_id: "015001",
  name: "Sunrise Care Center",
  address: "123 Main St",
  city: "Birmingham",
  state: "AL",
  zip: "35201",
  latitude: 33.5186,
  longitude: -86.8104,
  overall_rating: 3,
  quality_rating: 4,
  staffing_rating: 2,
  inspection_rating: 3,
  rn_hours_per_resident_day: 0.48,
  total_deficiencies: 7,
  grade_score: 62,
  grade_letter: "C",
  grade_summary: "Mixed.",
  slug: "sunrise-care-center",
  complaint_deficiencies_cycle_1: 0,
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("map tiles (OSM, keyless)", () => {
  it("uses the OSM HTTPS tile URL with visible attribution", () => {
    expect(TILE_URL).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(TILE_ATTRIBUTION).toContain("OpenStreetMap");
    expect(TILE_MAX_ZOOM).toBe(19);
    const js = leafletTileLayerJs();
    expect(js).toContain("tile.openstreetmap.org");
    expect(js).toContain("attribution");
    expect(js).not.toContain("subdomains");
  });

  it("no source file references the retired Carto basemap", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      );
    const offenders = walk("src").filter((p) => /cartocdn/.test(readFileSync(p, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("facility, explore and search-results maps all use the shared tile layer", () => {
    const f = facilityPage(facility, []);
    expect(f).toContain("tile.openstreetmap.org");
    expect(f).toContain("OpenStreetMap");
    expect(f).not.toContain("cartocdn");

    const e = explorePage();
    expect(e).toContain("tile.openstreetmap.org");
    expect(e).not.toContain("cartocdn");

    const s = searchResultsPage("35201", [facility as unknown as Facility]);
    expect(s).toContain("tile.openstreetmap.org");
    expect(s).not.toContain("cartocdn");
  });
});
