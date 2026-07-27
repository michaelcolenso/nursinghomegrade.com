import { describe, it, expect } from "vitest";
import {
  generateFacilityAssessment,
  computeOperatorInsights,
  generateOperatorInsightsText,
  generateOperatorSummary,
  generateStateSummary,
  generateCitySummary,
  generateFacilitySummary,
} from "../src/narrative";
import type { Facility, Operator, Trajectory } from "../src/types";

const baseFacility: Facility = {
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
  grade_summary: "Staffing is slightly below ideal but quality is mixed.",
  slug: "sunrise-care-center",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const nationalAvg = { avgGrade: 65, avgRnHours: 0.62, avgDeficiencies: 5.2, totalFacilities: 1000 };

describe("generateFacilityAssessment", () => {
  it("mentions improvement when trajectory is improving", () => {
    const trajectory: Trajectory = {
      cms_id: "015001",
      status: "improving",
      staffing_change_pct: 22,
      deficiency_change_pct: -25,
      grade_change: 8,
      rn_hours_trend: "up",
    };
    const text = generateFacilityAssessment(baseFacility, trajectory, null, nationalAvg);
    expect(text).toContain("upward trend");
    expect(text).toContain("RN staffing has increased 22%");
    expect(text).toContain("deficiencies have fallen by 25%");
  });

  it("warns when trajectory is declining", () => {
    const trajectory: Trajectory = {
      cms_id: "015001",
      status: "declining",
      staffing_change_pct: -15,
      deficiency_change_pct: 25,
      grade_change: -6,
      rn_hours_trend: "down",
    };
    const text = generateFacilityAssessment(baseFacility, trajectory, null, nationalAvg);
    expect(text).toContain("Warning signs");
  });

  it("flags staffing below the repealed benchmark without calling it current law", () => {
    const text = generateFacilityAssessment(baseFacility, null, null, nationalAvg);
    expect(text).toContain("0.55 RN hours per resident day");
    expect(text).toContain("repealed");
    expect(text).not.toContain("federal RN staffing minimum");
  });

  it("mentions operator when below national average", () => {
    const operator: Operator = {
      id: 1,
      normalized_name: "BAD OPERATOR",
      slug: "bad-operator",
      facility_count: 10,
      avg_grade: 45,
      avg_staffing_score: null,
      avg_deficiency_score: null,
      avg_penalty_score: null,
    };
    const text = generateFacilityAssessment(baseFacility, null, operator, nationalAvg);
    expect(text).toContain("BAD OPERATOR");
    expect(text).toContain("below the national average");
  });
});

describe("computeOperatorInsights", () => {
  it("calculates staffing failure percentage", () => {
    const facilities: Facility[] = [
      { ...baseFacility, rn_hours_per_resident_day: 0.5 },
      { ...baseFacility, cms_id: "015002", rn_hours_per_resident_day: 0.6 },
      { ...baseFacility, cms_id: "015003", rn_hours_per_resident_day: 0.4 },
    ];
    const operator: Operator = {
      id: 1,
      normalized_name: "TEST OPERATOR",
      slug: "test-operator",
      facility_count: 3,
      avg_grade: 60,
      avg_staffing_score: null,
      avg_deficiency_score: null,
      avg_penalty_score: null,
    };
    const insights = computeOperatorInsights(operator, facilities, nationalAvg);
    expect(insights.pctFailingStaffing).toBe(67); // 2 out of 3 below 0.55
  });

  it("calculates grade difference vs national", () => {
    const facilities: Facility[] = [baseFacility];
    const operator: Operator = {
      id: 1,
      normalized_name: "TEST",
      slug: "test",
      facility_count: 1,
      avg_grade: 55,
      avg_staffing_score: null,
      avg_deficiency_score: null,
      avg_penalty_score: null,
    };
    const insights = computeOperatorInsights(operator, facilities, nationalAvg);
    expect(insights.gradeVsNational).toBe(-10);
  });
});

describe("generateOperatorInsightsText", () => {
  it("returns contextual lines based on insights", () => {
    const insights = {
      pctFailingStaffing: 42,
      gradeVsNational: -12,
      staffingVsNational: -0.15,
      deficiencyVsNational: 3.5,
      penaltyRatio: null,
    };
    const lines = generateOperatorInsightsText(insights, "Test Operator");
    expect(lines.some((l) => l.includes("below the national average"))).toBe(true);
    expect(lines.some((l) => l.includes("42%"))).toBe(true);
    expect(lines.some((l) => l.includes("more deficiencies"))).toBe(true);
  });

  it("returns neutral line when at average", () => {
    const insights = {
      pctFailingStaffing: 10,
      gradeVsNational: 0,
      staffingVsNational: 0,
      deficiencyVsNational: 0,
      penaltyRatio: null,
    };
    const lines = generateOperatorInsightsText(insights, "Test");
    expect(lines.some((l) => l.includes("in line with national averages"))).toBe(true);
  });
});

describe("generateOperatorSummary", () => {
  it("describes operator with grade context", () => {
    const op: Operator = {
      id: 1,
      normalized_name: "Genesis Healthcare",
      slug: "genesis-healthcare",
      facility_count: 45,
      avg_grade: 58,
      avg_staffing_score: null,
      avg_deficiency_score: null,
      avg_penalty_score: null,
    };
    const text = generateOperatorSummary(op, { pctFailingStaffing: 30, gradeVsNational: -8, staffingVsNational: 0, deficiencyVsNational: 0, penaltyRatio: null });
    expect(text).toContain("Genesis Healthcare");
    expect(text).toContain("45 facilities");
    expect(text).toContain("below-average");
  });
});

describe("generateStateSummary", () => {
  it("summarizes state with grade distribution", () => {
    const text = generateStateSummary("Alabama", [baseFacility, baseFacility], { A: 1, B: 1, C: 0, D: 0, F: 0 });
    expect(text).toContain("Alabama");
    expect(text).toContain("2 nursing facilities");
    expect(text).toContain("100%");
  });
});

describe("generateCitySummary", () => {
  it("summarizes city with grade distribution", () => {
    const text = generateCitySummary("Birmingham", "AL", [baseFacility], { A: 0, B: 0, C: 1, D: 0, F: 0 });
    expect(text).toContain("Birmingham, AL");
    expect(text).toContain("1 nursing facilit");
    expect(text).toContain("0%");
  });
});

describe("generateFacilitySummary", () => {
  it("includes facility name and trend", () => {
    const traj: Trajectory = { cms_id: "015001", status: "improving", staffing_change_pct: 10, deficiency_change_pct: -5, grade_change: 5, rn_hours_trend: "up" };
    const text = generateFacilitySummary(baseFacility, traj);
    expect(text).toContain("Sunrise Care Center");
    expect(text).toContain("grade of C");
    expect(text).toContain("improving");
  });

  it("handles null trajectory", () => {
    const text = generateFacilitySummary(baseFacility, null);
    expect(text).toContain("unknown trend");
  });
});
