import { describe, expect, it } from "vitest";
import {
  computeGrade,
  computeGradeScore,
  gradeCompleteness,
  scoreToSummary,
  type ScoreInputs,
} from "../src/scoring";
import { buildGradeCompletenessSql } from "../scripts/ingest-current";

const complete: ScoreInputs = {
  rnHoursPerResidentDay: 0.8,
  totalDeficiencies: 0,
  qualityRating: 4,
  staffingRating: 4,
  inspectionEvidenceAvailable: true,
};

describe("Grade 1.x missing-data policy", () => {
  it("withholds the grade when the current deficiency count is missing", () => {
    const result = computeGrade({ ...complete, totalDeficiencies: null });
    expect(result.completeness).toBe("insufficient");
    expect(result.score).toBeNull();
    expect(result.letter).toBeNull();
    expect(result.missingInputs).toContain("inspection_deficiencies");
  });

  it("does not confuse a numeric zero with a verified clean survey", () => {
    const result = computeGrade({ ...complete, totalDeficiencies: 0, inspectionEvidenceAvailable: false });
    expect(result.completeness).toBe("insufficient");
    expect(result.score).toBeNull();
  });

  it("accepts zero deficiencies when survey evidence is affirmative", () => {
    const zero = computeGrade({ ...complete, totalDeficiencies: 0, inspectionEvidenceAvailable: true });
    const one = computeGrade({ ...complete, totalDeficiencies: 1, inspectionEvidenceAvailable: true });
    expect(zero.completeness).toBe("complete");
    expect(zero.score).not.toBeNull();
    expect(zero.score!).toBeGreaterThan(one.score!);
  });

  it("marks missing RN staffing partial and never renormalizes it upward", () => {
    const fullScore = computeGradeScore(complete)!;
    const partial = computeGrade({ ...complete, rnHoursPerResidentDay: null });
    expect(partial.completeness).toBe("partial");
    expect(partial.missingInputs).toEqual(["rn_staffing"]);
    expect(partial.score).not.toBeNull();
    expect(partial.score!).toBeLessThan(fullScore);
  });

  it("treats missing quality and staffing ratings as partial lower-bound evidence", () => {
    const partialInputs: ScoreInputs = {
      ...complete,
      qualityRating: null,
      staffingRating: null,
    };
    expect(gradeCompleteness(partialInputs)).toEqual({
      completeness: "partial",
      missingInputs: ["quality_rating", "staffing_rating"],
    });
    expect(computeGradeScore(partialInputs)!).toBeLessThan(computeGradeScore(complete)!);
  });

  it("handles multiple missing non-critical components without converting them to good evidence", () => {
    const partial = computeGrade({
      ...complete,
      rnHoursPerResidentDay: null,
      qualityRating: null,
      staffingRating: null,
    });
    // Only the verified zero-deficiency inspection component contributes: 30%.
    expect(partial.score).toBe(30);
    expect(partial.completeness).toBe("partial");
  });

  it("explains withheld and partial grades in user-facing language", () => {
    expect(scoreToSummary(null, "NR", null, "insufficient", ["inspection_deficiencies"]))
      .toContain("Grade withheld");
    expect(scoreToSummary(55, "C", null, "partial", ["rn_staffing"]))
      .toContain("Partial-data grade");
  });
});

describe("ingest persistence policy", () => {
  it("withholds rows that lack a deficiency count or current survey date", () => {
    const sql = buildGradeCompletenessSql();
    expect(sql).toContain("total_deficiencies IS NULL OR latest_standard_survey_date IS NULL");
    expect(sql).toContain("THEN 'NR'");
    expect(sql).toContain("THEN -1");
  });

  it("persists complete/partial/insufficient instead of hidden defaults", () => {
    const sql = buildGradeCompletenessSql();
    expect(sql).toContain("'insufficient'");
    expect(sql).toContain("'partial'");
    expect(sql).toContain("'complete'");
    expect(sql).toContain("grade_missing_inputs");
  });
});
