import { describe, expect, it } from "vitest";
import { facilityPage } from "../src/templates/facility";
import { homePage } from "../src/templates/home";
import { statePage } from "../src/templates/state";
import { staffingStandardRepealPage } from "../src/templates/staffing-repeal";
import { REPEAL_REPORT_PATH, REPEAL_DISCLOSURE_TEXT, RN_BENCHMARK, benchmarkLabel } from "../src/staffing-standard";
import { scoreToSummary } from "../src/scoring";
import type { FacilityPageData } from "../src/types";

// The 0.55 hr RN standard was repealed effective 2026-02-02. Anywhere the site
// cites it, the repeal qualifier must travel with it — these assertions exist so
// the qualifier cannot be dropped by a later edit.

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
  grade_summary: "Staffing is below the benchmark but quality is mixed.",
  slug: "sunrise-care-center",
  updated_at: "2026-01-01T00:00:00.000Z",
  complaint_deficiencies_cycle_1: 2,
};

const stateData = {
  stateName: "Alabama",
  stateSlug: "alabama",
  facilityCount: 10,
  totalFacilityCount: 10,
  pctFailing: 42,
  nationalPctFailing: 38,
  gradeDistribution: { A: 1, B: 2, C: 3, D: 2, F: 2 },
  cities: [{ city: "Birmingham", count: 4 }],
  facilities: [],
};

const shortfall = {
  belowNational: 4321,
  reportedNational: 9876,
  byState: [
    { state: "AL", below: 40, reported: 100 },
    { state: "WA", below: 90, reported: 194 },
  ],
};

const pages: Array<[string, string]> = [
  ["facility", facilityPage(facility)],
  ["home", homePage(41)],
  ["state", statePage(stateData)],
];

describe("repealed staffing standard disclosure", () => {
  for (const [name, html] of pages) {
    it(`${name} page carries the repeal disclosure and links to the report`, () => {
      expect(html).toContain(REPEAL_DISCLOSURE_TEXT);
      expect(html).toContain(REPEAL_REPORT_PATH);
    });

    it(`${name} page never calls 0.55 a current federal minimum`, () => {
      expect(html).not.toContain("Meets federal minimum");
      expect(html).not.toContain("Below federal minimum");
      expect(html).not.toContain("fail the federal staffing minimum");
      expect(html).not.toContain("fall below safe RN staffing levels");
    });
  }
});

describe("staffing standard repeal report", () => {
  const html = staffingStandardRepealPage(shortfall);

  it("states the repeal, the effective date, and the reinstated requirement", () => {
    expect(html).toContain("February 2, 2026");
    expect(html).toContain("Public Law 119-21");
    expect(html).toContain("8 consecutive hours");
    expect(html).toContain("Federal Register");
  });

  it("renders the live shortfall counts rather than hardcoded figures", () => {
    expect(html).toContain("4,321");
    expect(html).toContain("9,876");
    expect(html).toContain("Alabama");
    expect(html).toContain("Washington");
  });

  it("omits the live figures block entirely when no data is available", () => {
    const empty = staffingStandardRepealPage({ belowNational: 0, reportedNational: 0, byState: [] });
    expect(empty).not.toContain("How many facilities fall below");
    expect(empty).not.toContain("undefined");
    expect(empty).not.toContain("NaN");
  });
});

describe("benchmark boundary", () => {
  // The comparison is `>=`, so exactly 0.55 satisfies the benchmark. Claiming a
  // facility is "above" a value it merely equals is a false statement about a
  // real facility, so the label must say "at or above".
  it("does not claim a facility at exactly the benchmark is above it", () => {
    expect(benchmarkLabel(true)).toBe(`At or above the repealed ${RN_BENCHMARK} hr benchmark`);
    expect(benchmarkLabel(true)).not.toMatch(/^Above/);
  });

  it("renders the exact threshold as at-or-above in the grade summary", () => {
    const summary = scoreToSummary(70, "B", RN_BENCHMARK);
    expect(summary).toContain("At or above the 2024 benchmark");
  });

  it("still reports values below the benchmark as below", () => {
    expect(benchmarkLabel(false)).toBe(`Below the repealed ${RN_BENCHMARK} hr benchmark`);
    expect(scoreToSummary(30, "F", 0.2)).toContain("Below the repealed");
  });
});

describe("grade summaries are derived, not read from the stored column", () => {
  // `facilities.grade_summary` was written by an earlier formula and still holds
  // repealed-rule wording for ~14,000 production rows. Rendering must not trust
  // it, or Phase 1's copy fix would be invisible on live pages.
  const stale = {
    ...facility,
    grade_summary: "Exceeds federal staffing minimum — top tier inspection record.",
  };

  it("ignores a stale stored summary on the facility page", () => {
    const html = facilityPage(stale);
    expect(html).not.toContain("Exceeds federal staffing minimum");
    expect(html).not.toContain("federal staffing minimum");
  });

  it("renders the derived summary instead", () => {
    const html = facilityPage(stale);
    expect(html).toContain("Below the repealed");
  });
});

describe("deficiency counts: empty vs unavailable", () => {
  // A facility with zero citations and a facility whose lookup failed are
  // different things. Showing "Not reported" for a spotless record misleads.
  it("renders zeros for a facility with a genuinely clean record", () => {
    const html = facilityPage(facility, []);
    expect(html).toContain("No deficiencies reported for this facility");
    expect(html).not.toContain("Not reported</span>");
  });

  it("renders Not reported only when the lookup failed", () => {
    const html = facilityPage(facility, null);
    expect(html).toContain("Not reported");
  });

  it("publishes the three-cycle total in JSON-LD, not the cycle-1 scalar", () => {
    const defs = [1, 1, 2, 3].map((cycle, i) => ({
      id: i,
      cms_id: "015001",
      survey_date: "2025-01-01",
      deficiency_category: "Quality of Care",
      deficiency_tag_number: "F684",
      deficiency_description: "d",
      scope_severity_code: "D",
      deficiency_corrected: "Deficient, Provider has date of correction",
      correction_date: "2025-02-01",
      inspection_cycle: cycle,
      standard_deficiency: "Y",
      complaint_deficiency: "N",
    }));
    // f.total_deficiencies is 7 in the fixture; the detail rows total 4.
    const html = facilityPage({ ...facility, total_deficiencies: 7 }, defs as never);
    expect(html).toContain('"name":"Total Health Deficiencies","value":4');
    expect(html).not.toContain('"name":"Total Health Deficiencies","value":7');
  });

  it("omits deficiency structured data entirely when the lookup failed", () => {
    const html = facilityPage(facility, null);
    expect(html).not.toContain("Total Health Deficiencies");
  });
});
