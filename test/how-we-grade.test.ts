import { describe, expect, it } from "vitest";
import { computeGrade, computeGradeScore, harmPenalty, uncorrectedPenalty } from "../src/scoring";
import type { PenaltyDeficiency, ScoreInputs } from "../src/scoring";
import { RN_BENCHMARK } from "../src/staffing-standard";
import { howWeGradePage } from "../src/templates/how-we-grade";

const inputs: ScoreInputs = {
  rnHoursPerResidentDay: RN_BENCHMARK * 1.5,
  totalDeficiencies: 0,
  inspectionEvidenceAvailable: true,
  qualityRating: 5,
  staffingRating: 5,
};
const finding = (code: string, cycle = 1, noPlan = false): PenaltyDeficiency => ({
  scope_severity_code: code,
  inspection_cycle: cycle,
  deficiency_corrected: noPlan
    ? "Deficient, Provider has no plan of correction"
    : "Deficient, Provider has plan of correction",
});
const text = (howWeGradePage().match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "")
  .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

describe("how-we-grade scoring contract", () => {
  it.each([
    ["RN Staffing", "rnHoursPerResidentDay", 35],
    ["Inspection Record", "totalDeficiencies", 30],
    ["Quality Measures", "qualityRating", 20],
    ["Staffing Rating", "staffingRating", 15],
  ] as const)("discloses the scorer's %s weight", (label, key, weight) => {
    const withoutComponent = { ...inputs, [key]: key === "totalDeficiencies" ? 20 : null };
    expect(computeGradeScore(inputs)! - computeGradeScore(withoutComponent)!).toBe(weight);
    expect(text).toContain(`${label} (${weight}%)`);
  });

  it("explains component scaling, including the inspection floor", () => {
    expect(text).toContain("150% of the benchmark earns all 35 points");
    expect(text).toContain("20 or more deficiencies earns zero inspection points");
    expect(text).toContain("one star earns zero points and five stars earns full points");
  });

  it("documents unresolved-finding severity, plan and recency multipliers", () => {
    for (const [code, points] of [["A", 1.5], ["D", 2.3], ["G", 4.5], ["J", 6]] as const) {
      expect(uncorrectedPenalty([finding(code)])).toBe(points);
    }
    expect(uncorrectedPenalty([finding("A", 1, true)])).toBe(3);
    expect(text).toContain("1.5 × severity weight × correction-plan weight × recency weight");
    expect(text).toContain("A–C (or missing severity): 1; D–F: 1.5; G–I: 3; J–L: 4");
    expect(text).toContain("2 with no plan of correction, or 1 with a plan awaiting verification");
    expect(text).toContain("Resolved findings receive no unresolved-finding penalty");
    for (const [cycle, weight] of [[1, 1], [2, 0.6], [3, 0.35]] as const) {
      expect(harmPenalty([finding("J", cycle)])).toBe(8 * weight);
    }
    expect(text).toContain("1 for the most recent cycle (or a missing cycle), 0.6 for cycle 2, and 0.35 for cycle 3 or older");
  });

  it("documents harm penalties even after correction and both 25-point caps", () => {
    expect(harmPenalty([finding("G")])).toBe(4);
    expect(harmPenalty([finding("J")])).toBe(8);
    expect(harmPenalty([{ ...finding("G"), deficiency_corrected: "Correction verified" }])).toBe(4);
    expect(uncorrectedPenalty(Array(10).fill(finding("J")))).toBe(25);
    expect(harmPenalty(Array(10).fill(finding("J")))).toBe(25);
    expect(text).toContain("4 points per G–I finding or 8 points per J–L finding");
    expect(text).toContain("even if the finding has since been corrected");
    expect(text).toContain("Each penalty is rounded to one decimal place and capped separately at 25 points");
    expect(text).toContain("round the base score to a whole number before subtracting both penalties");
    expect(text).toContain("rounded to a whole number and kept between 0 and 100");
  });

  it("discloses missing correction status and the overlap of both penalties", () => {
    expect(uncorrectedPenalty([{ ...finding("J"), deficiency_corrected: null }])).toBe(0);
    expect(text).toContain("including missing values, receive no unresolved-finding penalty");
    expect(text).toContain("that is not proof that a finding was corrected");
    expect(computeGrade(inputs, [finding("J")])).toMatchObject({
      score: 86, letter: "A", uncorrectedPenalty: 6, harmPenalty: 8,
    });
    expect(text).toContain("An unresolved harm finding can contribute to both penalties");
    for (const cycle of [null, 1, 2, 3, 4]) {
      const weight = cycle === null || cycle <= 1 ? 1 : cycle === 2 ? 0.6 : 0.35;
      expect(uncorrectedPenalty([{ ...finding("J"), inspection_cycle: cycle }]))
        .toBe(Math.round(6 * weight * 10) / 10);
    }
  });

  it("explains that a no-plan finding caps an otherwise-A letter at B without changing the numeric score", () => {
    const grade = computeGrade(inputs, [finding("A", 1, true)]);
    expect(grade).toMatchObject({ score: 97, letter: "B", cappedByNoPlan: true });
    expect(text).toContain("any deficiency with no plan of correction");
    expect(text).toContain("cannot receive an A even if its numeric score remains 80 or higher");
    expect(text).toContain("Its letter grade is capped at B");
    expect(text).toContain("This cap changes only the letter, not the numeric score");
  });
});
