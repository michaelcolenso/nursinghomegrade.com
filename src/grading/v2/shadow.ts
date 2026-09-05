export type FavorableDirection = "higher" | "lower";

export interface SafetyDeficiencyEvidence {
  severity: string | null;
  inspectionCycle: number | null;
  correctionStatus: "resolved" | "plan_unverified" | "no_plan";
}

export interface SafetyShadowInput {
  currentSurveyDate: string | null;
  currentSurveyDeficiencies: number | null;
  deficiencies: SafetyDeficiencyEvidence[];
  recurringTagCount: number;
}

export interface StaffingShadowInput {
  adjustedRnHprd: number | null;
  adjustedTotalNurseHprd: number | null;
  adjustedWeekendTotalNurseHprd: number | null;
  rnTurnoverPct: number | null;
  totalNursingTurnoverPct: number | null;
  administratorsLeft: number | null;
}

export interface StaffingReferenceDistributions {
  adjustedRnHprd: number[];
  adjustedTotalNurseHprd: number[];
  adjustedWeekendTotalNurseHprd: number[];
  rnTurnoverPct: number[];
  totalNursingTurnoverPct: number[];
  administratorsLeft: number[];
}

export interface OutcomeMeasureValue {
  key: string;
  value: number | null;
  direction: FavorableDirection;
  distribution: number[];
}

export interface PillarScore {
  score: number | null;
  coverage: number;
  missing: string[];
}

const STAFFING_WEIGHTS = {
  adjustedRnHprd: 0.30,
  adjustedTotalNurseHprd: 0.30,
  adjustedWeekendTotalNurseHprd: 0.15,
  rnTurnoverPct: 0.10,
  totalNursingTurnoverPct: 0.10,
  administratorsLeft: 0.05,
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function severityWeight(code: string | null): number {
  const c = (code ?? "").trim().toUpperCase();
  if (["J", "K", "L"].includes(c)) return 25;
  if (["G", "H", "I"].includes(c)) return 10;
  if (["D", "E", "F"].includes(c)) return 2.5;
  if (["A", "B", "C"].includes(c)) return 0.5;
  return 0;
}

function cycleWeight(cycle: number | null): number {
  if (cycle === 1) return 1;
  if (cycle === 2) return 0.6;
  if (cycle === 3) return 0.35;
  return 0.25;
}

function correctionMultiplier(status: SafetyDeficiencyEvidence["correctionStatus"]): number {
  if (status === "no_plan") return 1.5;
  if (status === "plan_unverified") return 1.2;
  return 1;
}

export function safetyWeightedBurden(input: SafetyShadowInput): { citationBurden: number; recurrencePenalty: number; totalBurden: number } {
  const citationBurden = input.deficiencies.reduce((sum, d) => {
    return sum + severityWeight(d.severity) * cycleWeight(d.inspectionCycle) * correctionMultiplier(d.correctionStatus);
  }, 0);
  const recurrencePenalty = Math.max(0, input.recurringTagCount) * 3;
  return { citationBurden, recurrencePenalty, totalBurden: citationBurden + recurrencePenalty };
}

export function outcomeFeatureKey(sourceKey: string, measureCode: string, residentType: string | null | undefined): string {
  return sourceKey + ":" + measureCode + ":" + (residentType ?? "").trim().toLowerCase();
}

/**
 * Transparent Phase-B research baseline. This is deliberately not the public
 * Grade 2.0 formula: weights and bands remain subject to temporal validation.
 * A current survey row is a hard prerequisite so an empty citation set can only
 * mean "clean" when CMS affirmatively published the inspection.
 */
export function safetyShadowScore(input: SafetyShadowInput): PillarScore {
  if (!input.currentSurveyDate || input.currentSurveyDeficiencies === null) {
    return { score: null, coverage: 0, missing: ["current_survey_evidence"] };
  }

  // The Survey Summary count and cycle-1 citation detail are independently
  // ingested CMS evidence. A mismatch means the detail set cannot support a
  // severity-weighted Safety score. Fail closed rather than interpreting absent
  // detail as a clean survey.
  const currentDetailCount = input.deficiencies.filter((d) => d.inspectionCycle === 1).length;
  if (currentDetailCount !== input.currentSurveyDeficiencies) {
    return { score: null, coverage: 0.5, missing: ["current_deficiency_detail_mismatch"] };
  }

  const burden = safetyWeightedBurden(input);
  return {
    score: Number(clamp(100 - burden.totalBurden).toFixed(1)),
    coverage: 1,
    missing: [],
  };
}

/** Empirical national percentile mapped so 100 is always favorable. */
export function percentileScore(
  value: number | null,
  distribution: number[],
  direction: FavorableDirection,
): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const clean = distribution.filter(Number.isFinite).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  if (clean.length === 1) return 50;

  let less = 0;
  let equal = 0;
  for (const x of clean) {
    if (x < value) less++;
    else if (x === value) equal++;
  }
  const rank = (less + Math.max(0, equal - 1) / 2) / (clean.length - 1);
  const pct = direction === "higher" ? rank : 1 - rank;
  return Number(clamp(pct * 100).toFixed(1));
}

/**
 * Uses issue #55's initial staffing research weights. Missing measures are not
 * renormalized upward; they contribute no favorable points and reduce coverage.
 */
export function staffingShadowScore(
  input: StaffingShadowInput,
  ref: StaffingReferenceDistributions,
): PillarScore {
  const measures: Array<[keyof typeof STAFFING_WEIGHTS, number | null, number[], FavorableDirection]> = [
    ["adjustedRnHprd", input.adjustedRnHprd, ref.adjustedRnHprd, "higher"],
    ["adjustedTotalNurseHprd", input.adjustedTotalNurseHprd, ref.adjustedTotalNurseHprd, "higher"],
    ["adjustedWeekendTotalNurseHprd", input.adjustedWeekendTotalNurseHprd, ref.adjustedWeekendTotalNurseHprd, "higher"],
    ["rnTurnoverPct", input.rnTurnoverPct, ref.rnTurnoverPct, "lower"],
    ["totalNursingTurnoverPct", input.totalNursingTurnoverPct, ref.totalNursingTurnoverPct, "lower"],
    ["administratorsLeft", input.administratorsLeft, ref.administratorsLeft, "lower"],
  ];

  let weighted = 0;
  let observedWeight = 0;
  const missing: string[] = [];
  for (const [key, value, distribution, direction] of measures) {
    const normalized = percentileScore(value, distribution, direction);
    const weight = STAFFING_WEIGHTS[key];
    if (normalized === null) {
      missing.push(key);
      continue;
    }
    weighted += normalized * weight;
    observedWeight += weight;
  }

  // Adjusted RN and total staffing are the critical staffing prerequisites.
  if (input.adjustedRnHprd === null || input.adjustedTotalNurseHprd === null) {
    return { score: null, coverage: Number(observedWeight.toFixed(2)), missing };
  }

  return {
    score: Number(clamp(weighted).toFixed(1)),
    coverage: Number(observedWeight.toFixed(2)),
    missing,
  };
}

/**
 * Outcomes are stricter than staffing: suppressed/low-volume measures are never
 * replaced by zero or a median. The pillar is withheld unless every measure in
 * the run's explicitly registered comparison set is available for the facility.
 */
export function outcomesShadowScore(values: OutcomeMeasureValue[], expectedKeys: string[]): PillarScore {
  const byKey = new Map(values.map((v) => [v.key, v]));
  const missing = expectedKeys.filter((key) => {
    const v = byKey.get(key);
    return !v || v.value === null || percentileScore(v.value, v.distribution, v.direction) === null;
  });
  if (expectedKeys.length === 0) {
    return { score: null, coverage: 0, missing: ["no_registered_outcome_measures"] };
  }
  const coverage = (expectedKeys.length - missing.length) / expectedKeys.length;
  if (missing.length > 0) return { score: null, coverage: Number(coverage.toFixed(2)), missing };

  const normalized = expectedKeys.map((key) => {
    const v = byKey.get(key)!;
    return percentileScore(v.value, v.distribution, v.direction)!;
  });
  return {
    score: Number((normalized.reduce((a, b) => a + b, 0) / normalized.length).toFixed(1)),
    coverage: 1,
    missing: [],
  };
}

/** Conservative whitelist only. Unknown descriptions stay unregistered. */
export function inferOutcomeDirection(description: string): FavorableDirection | null {
  const d = description.toLowerCase();
  const higher = ["successful return", "vaccin", "improved", "improvement in function"];
  if (higher.some((term) => d.includes(term))) return "higher";

  const lower = [
    "hospital",
    "emergency department",
    "rehospital",
    "fall",
    "pressure ulcer",
    "antipsychotic",
    "urinary tract infection",
    "catheter",
    "lose too much weight",
    "need for help with daily activities has increased",
    "depressive",
    "physical restraint",
    "pain",
  ];
  if (lower.some((term) => d.includes(term))) return "lower";
  return null;
}

export function overallShadowScore(
  safety: PillarScore,
  staffing: PillarScore,
  outcomes: PillarScore,
): { score: number | null; confidence: "high" | "medium" | "low" | "insufficient"; coverage: number } {
  const coverage = Number(((safety.coverage + staffing.coverage + outcomes.coverage) / 3).toFixed(2));
  if (safety.score === null) return { score: null, confidence: "insufficient", coverage };
  if (staffing.score === null || outcomes.score === null) {
    return { score: null, confidence: coverage >= 0.67 ? "low" : "insufficient", coverage };
  }
  const score = Number((safety.score * 0.4 + staffing.score * 0.3 + outcomes.score * 0.3).toFixed(1));
  const confidence = coverage === 1 ? "high" : coverage >= 0.85 ? "medium" : "low";
  return { score, confidence, coverage };
}
