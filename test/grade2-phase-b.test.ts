import { describe, expect, it } from "vitest";
import {
  inferOutcomeDirection,
  outcomeFeatureKey,
  outcomesShadowScore,
  overallShadowScore,
  percentileScore,
  safetyShadowScore,
  safetyWeightedBurden,
  staffingShadowScore,
} from "../src/grading/v2/shadow";

const distribution = [1, 2, 3, 4, 5];

describe("Grade 2 Phase B normalization", () => {
  it("always maps favorable direction to higher normalized scores", () => {
    expect(percentileScore(5, distribution, "higher")).toBe(100);
    expect(percentileScore(1, distribution, "lower")).toBe(100);
  });

  it("does not invent a value for missing evidence", () => {
    expect(percentileScore(null, distribution, "higher")).toBeNull();
  });
});

describe("Safety shadow score", () => {
  it("withholds the pillar without affirmative current survey evidence", () => {
    expect(safetyShadowScore({
      currentSurveyDate: null,
      currentSurveyDeficiencies: null,
      deficiencies: [],
      recurringTagCount: 0,
    }).score).toBeNull();
  });

  it("recognizes a true clean survey only when the survey row exists", () => {
    expect(safetyShadowScore({
      currentSurveyDate: "2026-07-01",
      currentSurveyDeficiencies: 0,
      deficiencies: [],
      recurringTagCount: 0,
    }).score).toBe(100);
  });

  it("withholds Safety when the current survey count is not supported by citation detail", () => {
    const result = safetyShadowScore({
      currentSurveyDate: "2026-07-01",
      currentSurveyDeficiencies: 3,
      deficiencies: [{ severity: "D", inspectionCycle: 1, correctionStatus: "resolved" }],
      recurringTagCount: 0,
    });
    expect(result.score).toBeNull();
    expect(result.missing).toContain("current_deficiency_detail_mismatch");
  });

  it("makes immediate jeopardy matter more than a low-severity citation", () => {
    const base = { currentSurveyDate: "2026-07-01", currentSurveyDeficiencies: 1, recurringTagCount: 0 };
    const d = safetyShadowScore({ ...base, deficiencies: [{ severity: "D", inspectionCycle: 1, correctionStatus: "resolved" }] });
    const j = safetyShadowScore({ ...base, deficiencies: [{ severity: "J", inspectionCycle: 1, correctionStatus: "resolved" }] });
    expect(j.score!).toBeLessThan(d.score!);
  });

  it("exposes the exact burden components needed to reconstruct a shadow Safety score", () => {
    const input = {
      currentSurveyDate: "2026-07-01",
      currentSurveyDeficiencies: 1,
      deficiencies: [{ severity: "G", inspectionCycle: 1, correctionStatus: "no_plan" as const }],
      recurringTagCount: 2,
    };
    const burden = safetyWeightedBurden(input);
    expect(burden.citationBurden).toBe(15);
    expect(burden.recurrencePenalty).toBe(6);
    expect(safetyShadowScore(input).score).toBe(79);
  });
});

describe("Staffing shadow score", () => {
  const refs = {
    adjustedRnHprd: distribution,
    adjustedTotalNurseHprd: distribution,
    adjustedWeekendTotalNurseHprd: distribution,
    rnTurnoverPct: distribution,
    totalNursingTurnoverPct: distribution,
    administratorsLeft: distribution,
  };

  it("uses the research-prior weights without renormalizing missing optional evidence", () => {
    const full = staffingShadowScore({
      adjustedRnHprd: 5,
      adjustedTotalNurseHprd: 5,
      adjustedWeekendTotalNurseHprd: 5,
      rnTurnoverPct: 1,
      totalNursingTurnoverPct: 1,
      administratorsLeft: 1,
    }, refs);
    const partial = staffingShadowScore({
      adjustedRnHprd: 5,
      adjustedTotalNurseHprd: 5,
      adjustedWeekendTotalNurseHprd: null,
      rnTurnoverPct: 1,
      totalNursingTurnoverPct: 1,
      administratorsLeft: 1,
    }, refs);
    expect(full.score).toBe(100);
    expect(partial.score!).toBeLessThan(full.score!);
    expect(partial.coverage).toBe(0.85);
  });

  it("withholds staffing when a critical adjusted staffing input is missing", () => {
    expect(staffingShadowScore({
      adjustedRnHprd: null,
      adjustedTotalNurseHprd: 5,
      adjustedWeekendTotalNurseHprd: 5,
      rnTurnoverPct: 1,
      totalNursingTurnoverPct: 1,
      administratorsLeft: 1,
    }, refs).score).toBeNull();
  });
});

describe("Resident outcomes shadow score", () => {
  it("keeps long-stay and short-stay forms of a measure distinct", () => {
    expect(outcomeFeatureKey("mds_quality_measures", "401", "Long Stay")).not.toBe(
      outcomeFeatureKey("mds_quality_measures", "401", "Short Stay"),
    );
  });

  it("only infers direction for conservative, explicit outcome families", () => {
    expect(inferOutcomeDirection("Rate of successful return to home or community from a SNF")).toBe("higher");
    expect(inferOutcomeDirection("Percentage of long-stay residents who lose too much weight")).toBe("lower");
    expect(inferOutcomeDirection("A novel measure with ambiguous meaning")).toBeNull();
  });

  it("withholds the pillar rather than imputing a suppressed measure", () => {
    const result = outcomesShadowScore([
      { key: "401", value: 2, direction: "lower", distribution },
      { key: "402", value: null, direction: "lower", distribution },
    ], ["401", "402"]);
    expect(result.score).toBeNull();
    expect(result.coverage).toBe(0.5);
  });
});

describe("Overall Grade 2 shadow score", () => {
  it("does not manufacture an overall score when a pillar is withheld", () => {
    const result = overallShadowScore(
      { score: 80, coverage: 1, missing: [] },
      { score: 70, coverage: 1, missing: [] },
      { score: null, coverage: 0.5, missing: ["measure"] },
    );
    expect(result.score).toBeNull();
    expect(result.confidence).not.toBe("high");
  });

  it("uses the 40/30/30 research prior only when all pillars are scoreable", () => {
    const result = overallShadowScore(
      { score: 80, coverage: 1, missing: [] },
      { score: 70, coverage: 1, missing: [] },
      { score: 60, coverage: 1, missing: [] },
    );
    expect(result.score).toBe(71);
    expect(result.confidence).toBe("high");
  });
});
