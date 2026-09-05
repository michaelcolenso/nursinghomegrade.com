import { RN_BENCHMARK } from "./staffing-standard";

export type GradeCompleteness = "complete" | "partial" | "insufficient";
export type ScoreInputKey = "rn_staffing" | "inspection_deficiencies" | "quality_rating" | "staffing_rating";

export interface ScoreInputs {
  rnHoursPerResidentDay: number | null;
  totalDeficiencies: number | null;
  qualityRating: number | null; // 1–5
  staffingRating: number | null; // 1–5
  /**
   * True only when we have affirmative evidence that the current survey cycle
   * exists. A zero deficiency count is meaningful only when paired with survey
   * evidence; otherwise zero can mean "we could not observe the inspection".
   */
  inspectionEvidenceAvailable?: boolean;
}

// The 2024 CMS RN staffing benchmark. Repealed effective 2026-02-02; retained
// here as an evidence-based grading benchmark. See src/staffing-standard.ts.
const FEDERAL_RN_MINIMUM = RN_BENCHMARK;

function missingScoreInputs(inputs: ScoreInputs): ScoreInputKey[] {
  const missing: ScoreInputKey[] = [];
  if (inputs.rnHoursPerResidentDay === null) missing.push("rn_staffing");
  if (inputs.totalDeficiencies === null || inputs.inspectionEvidenceAvailable !== true) {
    missing.push("inspection_deficiencies");
  }
  if (inputs.qualityRating === null) missing.push("quality_rating");
  if (inputs.staffingRating === null) missing.push("staffing_rating");
  return missing;
}

export function gradeCompleteness(inputs: ScoreInputs): {
  completeness: GradeCompleteness;
  missingInputs: ScoreInputKey[];
} {
  const missingInputs = missingScoreInputs(inputs);
  if (missingInputs.includes("inspection_deficiencies")) {
    return { completeness: "insufficient", missingInputs };
  }
  return {
    completeness: missingInputs.length === 0 ? "complete" : "partial",
    missingInputs,
  };
}

/**
 * Base Grade 1.x score.
 *
 * Missing inspection evidence is a hard stop: we withhold a score instead of
 * awarding the 30 inspection points that a real zero-deficiency survey earns.
 * For non-critical missing inputs we calculate a conservative lower-bound score:
 * the missing component contributes zero points and the remaining weights are
 * NOT renormalized upward. Absence of evidence can therefore never improve a
 * facility's grade.
 */
export function computeGradeScore(inputs: ScoreInputs): number | null {
  const { completeness } = gradeCompleteness(inputs);
  if (completeness === "insufficient" || inputs.totalDeficiencies === null) return null;

  let composite = 0;

  if (inputs.rnHoursPerResidentDay !== null) {
    // Staffing compliance (35%): ratio of actual to benchmark, capped at 150%.
    const ratio = Math.min(Math.max(0, inputs.rnHoursPerResidentDay) / FEDERAL_RN_MINIMUM, 1.5);
    composite += (ratio / 1.5) * 0.35;
  }

  // Inspection clean rate (30%): 0 deficiencies = 1.0, 20+ = 0.0.
  // Reaching this line means the zero, if present, is backed by survey evidence.
  const inspectionScore = Math.max(0, 1 - Math.max(0, inputs.totalDeficiencies) / 20);
  composite += inspectionScore * 0.3;

  if (inputs.qualityRating !== null) {
    const qualityScore = (Math.min(5, Math.max(1, inputs.qualityRating)) - 1) / 4;
    composite += qualityScore * 0.2;
  }

  if (inputs.staffingRating !== null) {
    const consistencyScore = (Math.min(5, Math.max(1, inputs.staffingRating)) - 1) / 4;
    composite += consistencyScore * 0.15;
  }

  return Math.round(Math.max(0, Math.min(100, composite * 100)));
}

// ── Penalty terms ────────────────────────────────────────────────────────────

/** CMS scope/severity letters G–L mean residents were actually harmed. */
export function isHarmSeverity(code: string | null | undefined): boolean {
  return !!code && code >= "G" && code <= "L";
}

/** J–L are immediate jeopardy: harm is ongoing or death/serious injury is likely. */
export function isJeopardySeverity(code: string | null | undefined): boolean {
  return !!code && code >= "J" && code <= "L";
}

export type CorrectionStatus = "no_plan" | "plan_unverified" | "resolved";

export function correctionStatus(deficiencyCorrected: string | null | undefined): CorrectionStatus {
  if (deficiencyCorrected === "Deficient, Provider has no plan of correction") return "no_plan";
  if (deficiencyCorrected === "Deficient, Provider has plan of correction") return "plan_unverified";
  return "resolved";
}

export interface PenaltyDeficiency {
  scope_severity_code: string | null;
  deficiency_corrected: string | null;
  inspection_cycle: number | null;
}

function recencyWeight(cycle: number | null): number {
  if (cycle === null || cycle <= 1) return 1;
  if (cycle === 2) return 0.6;
  return 0.35;
}

function severityWeight(code: string | null): number {
  if (isJeopardySeverity(code)) return 4;
  if (isHarmSeverity(code)) return 3;
  if (code && code >= "D") return 1.5;
  return 1;
}

const UNCORRECTED_CAP = 25;
const HARM_CAP = 25;

export function uncorrectedPenalty(deficiencies: PenaltyDeficiency[]): number {
  let total = 0;
  for (const d of deficiencies) {
    const status = correctionStatus(d.deficiency_corrected);
    if (status === "resolved") continue;
    const planWeight = status === "no_plan" ? 2 : 1;
    total += 1.5 * severityWeight(d.scope_severity_code) * planWeight * recencyWeight(d.inspection_cycle);
  }
  return Math.min(UNCORRECTED_CAP, Math.round(total * 10) / 10);
}

export function harmPenalty(deficiencies: PenaltyDeficiency[]): number {
  let total = 0;
  for (const d of deficiencies) {
    const code = d.scope_severity_code;
    if (!isHarmSeverity(code)) continue;
    const base = isJeopardySeverity(code) ? 8 : 4;
    total += base * recencyWeight(d.inspection_cycle);
  }
  return Math.min(HARM_CAP, Math.round(total * 10) / 10);
}

export interface GradeResult {
  score: number | null;
  letter: string | null;
  baseScore: number | null;
  uncorrectedPenalty: number;
  harmPenalty: number;
  cappedByNoPlan: boolean;
  completeness: GradeCompleteness;
  missingInputs: ScoreInputKey[];
}

/**
 * Full Grade 1.x result. Critical inspection missingness withholds the public
 * grade. Partial non-critical data produce a conservative lower-bound grade and
 * are explicitly labelled partial by callers.
 */
export function computeGrade(inputs: ScoreInputs, deficiencies: PenaltyDeficiency[] = []): GradeResult {
  const { completeness, missingInputs } = gradeCompleteness(inputs);
  const baseScore = computeGradeScore(inputs);

  if (baseScore === null) {
    return {
      score: null,
      letter: null,
      baseScore: null,
      uncorrectedPenalty: 0,
      harmPenalty: 0,
      cappedByNoPlan: false,
      completeness,
      missingInputs,
    };
  }

  const uncorrected = uncorrectedPenalty(deficiencies);
  const harm = harmPenalty(deficiencies);
  const score = Math.round(Math.max(0, Math.min(100, baseScore - uncorrected - harm)));

  let letter = scoreToGrade(score);
  const hasNoPlan = deficiencies.some((d) => correctionStatus(d.deficiency_corrected) === "no_plan");
  const cappedByNoPlan = hasNoPlan && letter === "A";
  if (cappedByNoPlan) letter = "B";

  return {
    score,
    letter,
    baseScore,
    uncorrectedPenalty: uncorrected,
    harmPenalty: harm,
    cappedByNoPlan,
    completeness,
    missingInputs,
  };
}

export function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function scoreInputLabel(key: ScoreInputKey): string {
  switch (key) {
    case "rn_staffing": return "RN staffing";
    case "inspection_deficiencies": return "current inspection evidence";
    case "quality_rating": return "CMS quality-measure rating";
    case "staffing_rating": return "CMS staffing rating";
  }
}

/** Short facility-page summary that never turns missing evidence into a claim. */
export function scoreToSummary(
  _score: number | null,
  grade: string | null,
  rnHours: number | null,
  completeness: GradeCompleteness = "complete",
  missingInputs: ScoreInputKey[] = [],
): string {
  if (grade === null || grade === "NR" || completeness === "insufficient") {
    const missing = missingInputs.map(scoreInputLabel).join(", ");
    return missing
      ? `Grade withheld because required CMS evidence is unavailable: ${missing}.`
      : "Grade withheld because required CMS inspection evidence is unavailable.";
  }

  const prefix = completeness === "partial"
    ? `Partial-data grade: missing ${missingInputs.map(scoreInputLabel).join(", ")}. Missing components add no positive points. `
    : "";

  if (rnHours === null) {
    return `${prefix}RN staffing data not reported — review the inspection and enforcement records below.`;
  }
  const meetsBenchmark = rnHours >= FEDERAL_RN_MINIMUM;
  const staffing = meetsBenchmark
    ? "At or above the 2024 benchmark"
    : `Below the repealed ${FEDERAL_RN_MINIMUM} hr benchmark`;
  return `${prefix}${staffing} — review the inspection and enforcement records below for the safety history behind the grade.`;
}

export function toSlug(name: string): string {
  return (name ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
