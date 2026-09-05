import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchResultsPage } from "../src/templates/home";
import { cityPage } from "../src/templates/city";
import { statePage } from "../src/templates/state";
import { comparePage } from "../src/templates/compare";
import { explorePage } from "../src/templates/explore";
import type { Facility, StateFacilityCard } from "../src/types";

const unrated: Facility = {
  cms_id: "999999",
  name: "Evidence Missing Center",
  address: "1 Test Ave",
  city: "Seattle",
  state: "WA",
  zip: "98101",
  latitude: 47.61,
  longitude: -122.33,
  overall_rating: null,
  quality_rating: null,
  staffing_rating: null,
  inspection_rating: null,
  rn_hours_per_resident_day: null,
  total_deficiencies: null,
  grade_score: -1,
  grade_letter: "NR",
  grade_summary: "Grade withheld because required current CMS inspection evidence is unavailable.",
  grade_completeness: "insufficient",
  grade_missing_inputs: "inspection_deficiencies,rn_staffing,quality_rating,staffing_rating",
  slug: "evidence-missing-center",
  updated_at: "2026-09-05T00:00:00Z",
};

describe("unrated facility display", () => {
  it("never leaks the -1 persistence sentinel in ZIP search results", () => {
    const html = searchResultsPage("98101", [unrated]);
    expect(html).toContain("Not rated");
    expect(html).toContain("Grade withheld");
    expect(html).not.toContain("-1/100");
  });

  it("renders city cards as Not rated instead of a numeric score", () => {
    const html = cityPage({
      cityName: "Seattle",
      citySlug: "seattle",
      stateName: "Washington",
      stateSlug: "washington",
      facilityCount: 1,
      pctFailing: 0,
      nationalPctFailing: 0,
      gradeDistribution: { NR: 1 },
      facilities: [unrated],
      siblingCities: [],
      nearbyOutsideCity: [],
    });
    expect(html).toContain("Not rated");
    expect(html).not.toContain("-1/100");
  });

  it("renders state cards as Not rated instead of the sentinel", () => {
    const card: StateFacilityCard = {
      cms_id: unrated.cms_id,
      name: unrated.name,
      slug: unrated.slug,
      city: unrated.city,
      state: unrated.state,
      grade_score: -1,
      grade_letter: "NR",
      rn_hours_per_resident_day: null,
    };
    const html = statePage({
      stateName: "Washington",
      stateSlug: "washington",
      facilityCount: 1,
      totalFacilityCount: 1,
      pctFailing: 0,
      nationalPctFailing: 0,
      gradeDistribution: { NR: 1 },
      cities: [{ city: "Seattle", count: 1 }],
      facilities: [card],
    });
    expect(html).toContain("Not rated");
    expect(html).not.toContain(">-1<");
  });

  it("makes compare and map UIs explicitly recognize NR", () => {
    expect(comparePage(true)).toContain('f.grade_letter === "NR"');
    expect(comparePage(true)).toContain("Not rated");
    expect(explorePage()).toContain('f.g === "NR"');
    expect(explorePage()).toContain("Not rated");
  });
});

describe("ranked pages", () => {
  it("exclude NR rows so missing evidence cannot become a worst ranking", () => {
    const source = readFileSync("src/handlers/best.ts", "utf8");
    expect(source).toContain("grade_letter != 'NR' AND grade_score >= 0");
    expect(source).toContain("ORDER BY grade_score ASC");
    expect(source).toContain("ORDER BY grade_score DESC");
  });
});
