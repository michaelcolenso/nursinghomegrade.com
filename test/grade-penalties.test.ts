import { describe, expect, it } from "vitest";
import {
  computeGrade,
  computeGradeScore,
  harmPenalty,
  uncorrectedPenalty,
  correctionStatus,
  isHarmSeverity,
  isJeopardySeverity,
  type PenaltyDeficiency,
  type ScoreInputs,
} from "../src/scoring";

const strongFacility: ScoreInputs = {
  rnHoursPerResidentDay: 0.9,
  totalDeficiencies: 1,
  qualityRating: 5,
  staffingRating: 5,
};

function def(partial: Partial<PenaltyDeficiency>): PenaltyDeficiency {
  return {
    scope_severity_code: "D",
    deficiency_corrected: "Deficient, Provider has date of correction",
    inspection_cycle: 1,
    ...partial,
  };
}

describe("severity classification", () => {
  it("treats G through L as actual harm and J through L as jeopardy", () => {
    for (const c of ["G", "H", "I", "J", "K", "L"]) expect(isHarmSeverity(c)).toBe(true);
    for (const c of ["A", "B", "C", "D", "E", "F"]) expect(isHarmSeverity(c)).toBe(false);
    for (const c of ["J", "K", "L"]) expect(isJeopardySeverity(c)).toBe(true);
    for (const c of ["G", "H", "I"]) expect(isJeopardySeverity(c)).toBe(false);
  });

  it("handles null and unknown severity codes without throwing", () => {
    expect(isHarmSeverity(null)).toBe(false);
    expect(isHarmSeverity(undefined)).toBe(false);
    expect(isHarmSeverity("")).toBe(false);
  });

  it("maps the three CMS correction states", () => {
    expect(correctionStatus("Deficient, Provider has no plan of correction")).toBe("no_plan");
    expect(correctionStatus("Deficient, Provider has plan of correction")).toBe("plan_unverified");
    expect(correctionStatus("Deficient, Provider has date of correction")).toBe("resolved");
    expect(correctionStatus("Past Non-Compliance")).toBe("resolved");
    expect(correctionStatus(null)).toBe("resolved");
  });
});

describe("uncorrected penalty", () => {
  it("is zero when everything is resolved", () => {
    expect(uncorrectedPenalty([def({}), def({ scope_severity_code: "G" })])).toBe(0);
  });

  it("weights a missing plan of correction above an unverified plan", () => {
    const noPlan = uncorrectedPenalty([def({ deficiency_corrected: "Deficient, Provider has no plan of correction" })]);
    const plan = uncorrectedPenalty([def({ deficiency_corrected: "Deficient, Provider has plan of correction" })]);
    expect(noPlan).toBeGreaterThan(plan);
  });

  it("weights a recent open finding above an old one", () => {
    const open = { deficiency_corrected: "Deficient, Provider has no plan of correction" };
    const recent = uncorrectedPenalty([def({ ...open, inspection_cycle: 1 })]);
    const old = uncorrectedPenalty([def({ ...open, inspection_cycle: 3 })]);
    expect(recent).toBeGreaterThan(old);
  });

  it("is bounded so a long tail of old findings cannot zero a facility alone", () => {
    const many = Array.from({ length: 200 }, () =>
      def({ scope_severity_code: "L", deficiency_corrected: "Deficient, Provider has no plan of correction" }),
    );
    expect(uncorrectedPenalty(many)).toBeLessThanOrEqual(25);
  });
});

describe("harm penalty", () => {
  it("ignores non-harm severities regardless of volume", () => {
    expect(harmPenalty(Array.from({ length: 50 }, () => def({ scope_severity_code: "D" })))).toBe(0);
  });

  it("costs more for immediate jeopardy than for actual harm", () => {
    expect(harmPenalty([def({ scope_severity_code: "J" })])).toBeGreaterThan(
      harmPenalty([def({ scope_severity_code: "G" })]),
    );
  });

  it("treats a single J as worse than three Ds", () => {
    const oneJ = computeGrade(strongFacility, [def({ scope_severity_code: "J" })]);
    const threeD = computeGrade(strongFacility, [
      def({ scope_severity_code: "D" }),
      def({ scope_severity_code: "D" }),
      def({ scope_severity_code: "D" }),
    ]);
    expect(oneJ.score).toBeLessThan(threeD.score);
  });

  it("penalizes harm separately from the raw deficiency count", () => {
    // Same base inputs, same number of deficiencies — only severity differs.
    const harmless = computeGrade(strongFacility, [def({ scope_severity_code: "D" })]);
    const harmful = computeGrade(strongFacility, [def({ scope_severity_code: "G" })]);
    expect(harmful.score).toBeLessThan(harmless.score);
  });
});

describe("no-plan hard rule", () => {
  it("caps a facility with an open no-plan deficiency at B", () => {
    const clean = computeGrade(strongFacility, []);
    expect(clean.letter).toBe("A");

    const result = computeGrade(strongFacility, [
      def({ scope_severity_code: "A", deficiency_corrected: "Deficient, Provider has no plan of correction" }),
    ]);
    expect(result.letter).not.toBe("A");
    expect(result.letter).toBe("B");
    expect(result.cappedByNoPlan).toBe(true);
  });

  it("does not promote a lower-scoring facility up to B", () => {
    const weak: ScoreInputs = {
      rnHoursPerResidentDay: 0.1,
      totalDeficiencies: 30,
      qualityRating: 1,
      staffingRating: 1,
    };
    const result = computeGrade(weak, [
      def({ deficiency_corrected: "Deficient, Provider has no plan of correction" }),
    ]);
    expect(result.letter).toBe("F");
    expect(result.cappedByNoPlan).toBe(false);
  });

  it("leaves facilities with only submitted plans eligible for A", () => {
    const result = computeGrade(strongFacility, [
      def({ scope_severity_code: "A", deficiency_corrected: "Deficient, Provider has plan of correction" }),
    ]);
    expect(result.cappedByNoPlan).toBe(false);
  });
});

describe("grade result shape", () => {
  it("reports the base score and both penalties so the number is explainable", () => {
    const r = computeGrade(strongFacility, [
      def({ scope_severity_code: "G", deficiency_corrected: "Deficient, Provider has no plan of correction" }),
    ]);
    expect(r.baseScore).toBe(computeGradeScore(strongFacility));
    expect(r.uncorrectedPenalty).toBeGreaterThan(0);
    expect(r.harmPenalty).toBeGreaterThan(0);
    expect(r.score).toBe(Math.max(0, r.baseScore - r.uncorrectedPenalty - r.harmPenalty));
  });

  it("never produces a score outside 0–100", () => {
    const many = Array.from({ length: 500 }, () =>
      def({ scope_severity_code: "L", deficiency_corrected: "Deficient, Provider has no plan of correction" }),
    );
    const r = computeGrade({ rnHoursPerResidentDay: 0, totalDeficiencies: 99, qualityRating: 1, staffingRating: 1 }, many);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("matches the base score exactly when a facility has no deficiencies", () => {
    const r = computeGrade(strongFacility, []);
    expect(r.score).toBe(computeGradeScore(strongFacility));
    expect(r.uncorrectedPenalty).toBe(0);
    expect(r.harmPenalty).toBe(0);
  });
});
