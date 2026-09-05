import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchResultsPage } from "../src/templates/home";
import { cityPage } from "../src/templates/city";
import { statePage } from "../src/templates/state";
import { comparePage } from "../src/templates/compare";
import { explorePage } from "../src/templates/explore";
import { computeTrajectory } from "../src/trajectory";
import type { Facility, FacilitySnapshot, StateFacilityCard } from "../src/types";

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

  it("renders city cards and the distribution disclosure as Not rated", () => {
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
    expect(html).toContain("1</strong> facility is not rated because current inspection evidence is insufficient");
    expect(html).toContain("A–F percentages above use rated facilities only");
    expect(html).not.toContain("-1/100");
  });

  it("renders state cards and the distribution disclosure as Not rated", () => {
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
    expect(html).toContain("1</strong> facility is not rated because current inspection evidence is insufficient");
    expect(html).toContain("A–F percentages above use rated facilities only");
    expect(html).not.toContain(">-1<");
  });

  it("makes compare and map UIs explicitly recognize NR", () => {
    expect(comparePage(true)).toContain('f.grade_letter === "NR"');
    expect(comparePage(true)).toContain("Not rated");
    expect(explorePage()).toContain('f.g === "NR"');
    expect(explorePage()).toContain("Not rated");
  });
});

describe("ranked and aggregate surfaces", () => {
  it("excludes NR rows from best/worst rankings", () => {
    const source = readFileSync("src/handlers/best.ts", "utf8");
    expect(source).toContain("grade_letter != 'NR' AND grade_score >= 0");
    expect(source).toContain("ORDER BY grade_score ASC");
    expect(source).toContain("ORDER BY grade_score DESC");
  });

  it("excludes NR from state Top Rated queries", () => {
    const source = readFileSync("src/db.ts", "utf8");
    expect(source).toContain("FROM facilities WHERE state = ? AND grade_letter != 'NR' AND grade_score >= 0 ORDER BY grade_score DESC LIMIT ?");
  });

  it("excludes NR sentinels from operator grade averages", () => {
    const source = readFileSync("scripts/rebuild-operators.ts", "utf8");
    expect(source).toContain("Number.isFinite(g) && g >= 0");
  });

  it("does not turn loss of gradeability into a negative grade trajectory", () => {
    const snapshots: FacilitySnapshot[] = [
      {
        cms_id: "999999",
        snapshot_date: "2026-07-01",
        overall_rating: 3,
        quality_rating: 3,
        staffing_rating: 3,
        inspection_rating: 3,
        rn_hours_per_resident_day: 0.6,
        total_deficiencies: 5,
        grade_score: 70,
        grade_letter: "B",
      },
      {
        cms_id: "999999",
        snapshot_date: "2026-08-01",
        overall_rating: 4,
        quality_rating: 4,
        staffing_rating: 4,
        inspection_rating: 4,
        rn_hours_per_resident_day: 0.65,
        total_deficiencies: 4,
        grade_score: 80,
        grade_letter: "A",
      },
      {
        cms_id: "999999",
        snapshot_date: "2026-09-01",
        overall_rating: null,
        quality_rating: null,
        staffing_rating: null,
        inspection_rating: null,
        rn_hours_per_resident_day: null,
        total_deficiencies: null,
        grade_score: -1,
        grade_letter: "NR",
      },
    ];

    expect(computeTrajectory(snapshots).grade_change).toBe(10);
  });
});
