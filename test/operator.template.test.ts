import { describe, expect, it } from "vitest";
import { operatorPage, operatorsHubPage, operatorsBestPage, operatorsWorstPage } from "../src/templates/operator";
import type { Operator, Facility } from "../src/types";

const sampleOperator: Operator = {
  id: 1,
  normalized_name: "GENESIS HEALTHCARE",
  slug: "genesis-healthcare",
  facility_count: 12,
  avg_grade: 58,
  avg_staffing_score: 0.52,
  avg_deficiency_score: 6.2,
  avg_penalty_score: null,
  operator_score: 60,
  operator_tier: "Mid",
};

const sampleFacilities: Facility[] = [
  {
    cms_id: "015001",
    name: "Facility A",
    address: "123 Main St",
    city: "Birmingham",
    state: "AL",
    zip: "35201",
    latitude: 33.5,
    longitude: -86.8,
    overall_rating: 4,
    quality_rating: 4,
    staffing_rating: 3,
    inspection_rating: 3,
    rn_hours_per_resident_day: 0.72,
    total_deficiencies: 3,
    grade_score: 82,
    grade_letter: "B",
    grade_summary: "Good",
    slug: "facility-a",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    cms_id: "015002",
    name: "Facility B",
    address: "456 Oak Ave",
    city: "Montgomery",
    state: "AL",
    zip: "36101",
    latitude: 32.3,
    longitude: -86.3,
    overall_rating: 2,
    quality_rating: 2,
    staffing_rating: 2,
    inspection_rating: 2,
    rn_hours_per_resident_day: 0.45,
    total_deficiencies: 12,
    grade_score: 38,
    grade_letter: "D",
    grade_summary: "Poor",
    slug: "facility-b",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("operatorPage", () => {
  it("renders operator name and facility count", () => {
    const html = operatorPage({
      operator: sampleOperator,
      facilities: sampleFacilities,
      gradeDistribution: { A: 1, B: 5, C: 4, D: 2, F: 0 },
      statesServed: 2,
      nationalAvg: { avgGrade: 65, avgRnHours: 0.62, avgDeficiencies: 5.2, totalFacilities: 1000 },
      insightLines: ["Performs below average.", "42% fail staffing minimums."],
    });
    expect(html).toContain("GENESIS HEALTHCARE");
    expect(html).toContain("12 facilities");
    expect(html).toContain("2 states");
    expect(html).toContain("Performs below average.");
  });

  it("renders facility cards for best and worst", () => {
    const html = operatorPage({
      operator: sampleOperator,
      facilities: sampleFacilities,
      gradeDistribution: { A: 0, B: 1, C: 0, D: 1, F: 0 },
      statesServed: 1,
      nationalAvg: { avgGrade: 65, avgRnHours: 0.62, avgDeficiencies: 5.2, totalFacilities: 1000 },
      insightLines: [],
    });
    expect(html).toContain("Facility A");
    expect(html).toContain("Facility B");
    expect(html).toContain('href="/facility/015001-facility-a"');
  });

  it("renders grade distribution bar", () => {
    const html = operatorPage({
      operator: sampleOperator,
      facilities: sampleFacilities,
      gradeDistribution: { A: 2, B: 4, C: 3, D: 2, F: 1 },
      statesServed: 3,
      nationalAvg: { avgGrade: 65, avgRnHours: 0.62, avgDeficiencies: 5.2, totalFacilities: 1000 },
      insightLines: [],
    });
    expect(html).toContain("Grade Distribution");
  });
});

describe("operatorsHubPage", () => {
  it("renders tiered ranking sections", () => {
    const html = operatorsHubPage({
      mega: [sampleOperator],
      large: [],
      mid: [],
      small: [],
      tierCounts: { Mega: 18, Large: 520, Mid: 2163, Small: 4675 },
    });
    expect(html).toContain("Nursing Home Operator Rankings");
    expect(html).toContain("Mega Operators");
    expect(html).toContain("Large Operators");
    expect(html).toContain("Mid-Size Operators");
    expect(html).toContain("Small Operators");
    expect(html).toContain('href="/operator/genesis-healthcare"');
    expect(html).toContain('href="/operators/best"');
    expect(html).toContain('href="/operators/worst"');
    expect(html).toContain("70%");
  });

  it("renders operator score column", () => {
    const html = operatorsHubPage({
      mega: [{ ...sampleOperator, operator_score: 62, operator_tier: "Mega" }],
      large: [],
      mid: [],
      small: [],
      tierCounts: { Mega: 1, Large: 0, Mid: 0, Small: 0 },
    });
    expect(html).toContain("62");
    expect(html).toContain("Score");
  });

  it("renders score bars with correct band color and width", () => {
    const html = operatorsHubPage({
      mega: [{ ...sampleOperator, operator_score: 62, operator_tier: "Mega" }],
      large: [],
      mid: [],
      small: [],
      tierCounts: { Mega: 1, Large: 0, Mid: 0, Small: 0 },
    });
    expect(html).toContain('aria-label="Score 62 out of 100"');
    expect(html).toContain("width:62%");
    expect(html).toContain("var(--grade-C)");
  });

  it("colors low scores in the F band", () => {
    const html = operatorsWorstPage({
      mega: [],
      large: [],
      mid: [],
      small: [{ ...sampleOperator, facility_count: 3, operator_tier: "Small", operator_score: 12 }],
      tierCounts: { Mega: 18, Large: 520, Mid: 2163, Small: 4675 },
    });
    expect(html).toContain('aria-label="Score 12 out of 100"');
    expect(html).toContain("width:12%");
    expect(html).toContain("var(--grade-F)");
  });
});

describe("operatorsBestPage", () => {
  it("renders ranked best operators per tier", () => {
    const html = operatorsBestPage({
      mega: [{ ...sampleOperator, facility_count: 120, operator_tier: "Mega", operator_score: 72 }],
      large: [],
      mid: [],
      small: [],
      tierCounts: { Mega: 18, Large: 520, Mid: 2163, Small: 4675 },
    });
    expect(html).toContain("Best Nursing Home Operators");
    expect(html).toContain("Best Mega Operators");
    expect(html).toContain("#1");
    expect(html).toContain('href="/operator/genesis-healthcare"');
  });
});

describe("operatorsWorstPage", () => {
  it("renders ranked worst operators per tier", () => {
    const html = operatorsWorstPage({
      mega: [],
      large: [],
      mid: [],
      small: [{ ...sampleOperator, facility_count: 3, operator_tier: "Small", operator_score: 12 }],
      tierCounts: { Mega: 18, Large: 520, Mid: 2163, Small: 4675 },
    });
    expect(html).toContain("Worst Nursing Home Operators");
    expect(html).toContain("Worst Small Operators");
    expect(html).toContain("#1");
  });
});
