import { describe, expect, it } from "vitest";
import { statePage, statesHubPage } from "../src/templates/state";
import type { StatePageData } from "../src/templates/state";

const baseStateData: StatePageData = {
  stateName: "California",
  stateSlug: "california",
  facilityCount: 2,
  totalFacilityCount: 1162,
  pctFailing: 62.5,
  nationalPctFailing: 58.0,
  gradeDistribution: { A: 120, B: 340, C: 400, D: 200, F: 102 },
  cities: [
    { city: "Los Angeles", count: 45 },
    { city: "San Diego", count: 32 },
  ],
  facilities: [
    {
      cms_id: "055001",
      name: "Golden State Care Center",
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip: "90210",
      latitude: 34.0522,
      longitude: -118.2437,
      overall_rating: 4,
      quality_rating: 4,
      staffing_rating: 3,
      inspection_rating: 4,
      rn_hours_per_resident_day: 0.72,
      total_deficiencies: 2,
      grade_score: 88,
      grade_letter: "A",
      grade_summary: "Strong staffing and clean inspection record.",
      slug: "golden-state-care-center",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      cms_id: "055002",
      name: "Pacific Pines Nursing Home",
      address: "456 Ocean Ave",
      city: "San Diego",
      state: "CA",
      zip: "92101",
      latitude: 32.7157,
      longitude: -117.1611,
      overall_rating: 2,
      quality_rating: 2,
      staffing_rating: 1,
      inspection_rating: 2,
      rn_hours_per_resident_day: 0.38,
      total_deficiencies: 12,
      grade_score: 34,
      grade_letter: "F",
      grade_summary: "Severely understaffed with repeated deficiencies.",
      slug: "pacific-pines-nursing-home",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("statePage", () => {
  it("renders state name and facility count", () => {
    const html = statePage(baseStateData);
    expect(html).toContain("Nursing homes in California");
    expect(html).toContain("1,162 facilities");
  });

  it("renders grade distribution", () => {
    const html = statePage(baseStateData);
    expect(html).toContain("Grade Distribution");
    expect(html).toContain("Grade A");
    expect(html).toContain("120");
    expect(html).toContain("Grade F");
    expect(html).toContain("102");
  });

  it("renders facility list with grades", () => {
    const html = statePage(baseStateData);
    expect(html).toContain("Golden State Care Center");
    expect(html).toContain("Pacific Pines Nursing Home");
    expect(html).toContain("grade-A");
    expect(html).toContain("grade-F");
  });

  it("renders city list", () => {
    const html = statePage(baseStateData);
    expect(html).toContain("Los Angeles");
    expect(html).toContain("San Diego");
  });

  it("shows pct failing comparison", () => {
    const html = statePage(baseStateData);
    expect(html).toContain("62.5%");
    expect(html).toContain("58%");
  });

  it("renders empty facility list gracefully", () => {
    const html = statePage({ ...baseStateData, facilities: [] });
    expect(html).toContain("No facilities found in this state");
  });

  it("renders JSON-LD ItemList and BreadcrumbList schema", () => {
    const html = statePage(baseStateData);
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"name":"Top Rated Nursing Homes in California"');
    expect(html).toContain('"name":"California"');
    expect(html).toContain('"item":"https://nursinghomegrade.com/states"');
    expect(html).toContain('"item":"https://nursinghomegrade.com/state/california"');
  });

  it("renders JSON-LD ItemList schema on states hub", () => {
    const html = statesHubPage([
      { state: "California", count: 1162, slug: "california" },
      { state: "Texas", count: 1177, slug: "texas" },
    ]);
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain('"name":"Nursing Home Grades by State"');
    expect(html).toContain('"name":"California"');
    expect(html).toContain('"name":"Texas"');
    expect(html).toContain('"url":"https://nursinghomegrade.com/state/california"');
  });
});

describe("statesHubPage", () => {
  it("renders state hub with links", () => {
    const html = statesHubPage([
      { state: "California", count: 1162, slug: "california" },
      { state: "Texas", count: 1177, slug: "texas" },
    ]);
    expect(html).toContain("Nursing home grades by state");
    expect(html).toContain('href="/state/california"');
    expect(html).toContain('href="/state/texas"');
    expect(html).toContain("California");
    expect(html).toContain("Texas");
  });
});
