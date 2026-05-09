import { describe, it, expect } from "vitest";
import { computeGradeScore, scoreToGrade, scoreToSummary, toSlug } from "../src/scoring";

describe("computeGradeScore", () => {
  it("returns 100 for a facility with 0 deficiencies, max RN hours, 5-star quality and staffing", () => {
    const score = computeGradeScore({
      rnHoursPerResidentDay: 2.0,
      totalDeficiencies: 0,
      qualityRating: 5,
      staffingRating: 5,
    });
    expect(score).toBe(100);
  });

  it("returns 0 for a facility with 0 RN hours, 20+ deficiencies, 1-star ratings", () => {
    const score = computeGradeScore({
      rnHoursPerResidentDay: 0,
      totalDeficiencies: 20,
      qualityRating: 1,
      staffingRating: 1,
    });
    expect(score).toBe(0);
  });

  it("caps staffing compliance at 150% of federal minimum", () => {
    const capped = computeGradeScore({
      rnHoursPerResidentDay: 10.0, // way above minimum
      totalDeficiencies: 0,
      qualityRating: 5,
      staffingRating: 5,
    });
    const uncapped = computeGradeScore({
      rnHoursPerResidentDay: 2.0,
      totalDeficiencies: 0,
      qualityRating: 5,
      staffingRating: 5,
    });
    expect(capped).toBe(uncapped);
  });

  it("returns a score between 0 and 100 for a typical facility", () => {
    const score = computeGradeScore({
      rnHoursPerResidentDay: 0.55,
      totalDeficiencies: 5,
      qualityRating: 3,
      staffingRating: 3,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("scoreToGrade", () => {
  it("returns A for score >= 80", () => expect(scoreToGrade(80)).toBe("A"));
  it("returns B for score >= 65", () => expect(scoreToGrade(65)).toBe("B"));
  it("returns C for score >= 50", () => expect(scoreToGrade(50)).toBe("C"));
  it("returns D for score >= 35", () => expect(scoreToGrade(35)).toBe("D"));
  it("returns F for score < 35", () => expect(scoreToGrade(34)).toBe("F"));
});

describe("scoreToSummary", () => {
  it("returns a string mentioning federal staffing minimum for failing facilities", () => {
    const summary = scoreToSummary(20, "F", 0.2);
    expect(summary).toContain("federal staffing minimum");
  });

  it("returns a positive string for A-grade facilities", () => {
    const summary = scoreToSummary(90, "A", 1.2);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(10);
  });

  it("handles null rnHours gracefully", () => {
    const summary = scoreToSummary(50, "C", null);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(10);
  });
});

describe("toSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(toSlug("Sunrise Senior Living")).toBe("sunrise-senior-living");
  });

  it("strips special characters", () => {
    expect(toSlug("Beverly Hills Care & Rehab, LLC")).toBe("beverly-hills-care-rehab-llc");
  });

  it("collapses multiple hyphens", () => {
    expect(toSlug("A  B   C")).toBe("a-b-c");
  });
});
