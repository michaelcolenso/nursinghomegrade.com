import { RN_BENCHMARK } from "./staffing-standard";

export interface ScoreInputs {
  rnHoursPerResidentDay: number;
  totalDeficiencies: number;
  qualityRating: number; // 1–5
  staffingRating: number; // 1–5
}

// The 2024 CMS RN staffing benchmark. Repealed effective 2026-02-02; retained
// here as an evidence-based grading benchmark. See src/staffing-standard.ts.
const FEDERAL_RN_MINIMUM = RN_BENCHMARK;

export function computeGradeScore(inputs: ScoreInputs): number {
  const { rnHoursPerResidentDay, totalDeficiencies, qualityRating, staffingRating } = inputs;

  // Staffing compliance (35%): ratio of actual to minimum, capped at 150%
  const ratio = Math.min(rnHoursPerResidentDay / FEDERAL_RN_MINIMUM, 1.5);
  const staffingCompliance = ratio / 1.5;

  // Inspection clean rate (30%): 0 deficiencies = 1.0, 20+ = 0.0
  const inspectionScore = Math.max(0, 1 - totalDeficiencies / 20);

  // Quality measures (20%): normalize 1–5 star rating
  const qualityScore = (qualityRating - 1) / 4;

  // Staffing consistency (15%): normalize 1–5 star rating
  const consistencyScore = (staffingRating - 1) / 4;

  const composite = staffingCompliance * 0.35 + inspectionScore * 0.3 + qualityScore * 0.2 + consistencyScore * 0.15;

  return Math.round(Math.max(0, Math.min(100, composite * 100)));
}

// ── Penalty terms ────────────────────────────────────────────────────────────
//
// The base composite above scores a facility on averages: staffing ratio,
// deficiency count, and two CMS star ratings. It is blind to two facts a family
// choosing a facility would consider decisive — whether residents were actually
// harmed, and whether anything found is still unfixed. A facility could hold an
// open citation with no plan of correction and still score in the A band.
//
// These terms fix that. Both read from the CMS Health Deficiencies file:
//   scope_severity_code   → severity letter A–L
//   deficiency_corrected  → correction status
//   inspection_cycle      → 1 = most recent survey, 3 = oldest of the 3 cycles

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

/**
 * An open finding from the most recent survey is worse evidence than one from
 * three years ago, so penalties decay by survey cycle.
 */
function recencyWeight(cycle: number | null): number {
  if (cycle === null || cycle <= 1) return 1;
  if (cycle === 2) return 0.6;
  return 0.35;
}

/** Severity multiplier for uncorrected findings. A J is not three Ds. */
function severityWeight(code: string | null): number {
  if (isJeopardySeverity(code)) return 4;
  if (isHarmSeverity(code)) return 3;
  if (code && code >= "D") return 1.5; // D–F: potential for more than minimal harm
  return 1; // A–C: minimal
}

const UNCORRECTED_CAP = 25;
const HARM_CAP = 25;

/**
 * Points deducted for findings the facility has not resolved. A missing plan of
 * correction is weighted above a submitted-but-unverified plan: the first is a
 * refusal to act, the second is action awaiting confirmation.
 */
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

/**
 * Points deducted for actual harm, scored on its own axis so that harm is not
 * diluted by a facility's raw deficiency count.
 */
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
  score: number;
  letter: string;
  baseScore: number;
  uncorrectedPenalty: number;
  harmPenalty: number;
  /** True when the letter was capped by the no-plan rule rather than the score. */
  cappedByNoPlan: boolean;
}

/**
 * Full grade: base composite, minus penalties, with one hard rule applied on top
 * of the numeric score.
 *
 * Hard rule: a facility holding any deficiency in "no plan of correction" status
 * cannot be graded A, whatever it scores. An open violation the operator has not
 * committed to fixing is the single most decision-relevant fact on the page, and
 * no amount of good staffing should paper over it.
 */
export function computeGrade(inputs: ScoreInputs, deficiencies: PenaltyDeficiency[] = []): GradeResult {
  const baseScore = computeGradeScore(inputs);
  const uncorrected = uncorrectedPenalty(deficiencies);
  const harm = harmPenalty(deficiencies);
  const score = Math.round(Math.max(0, Math.min(100, baseScore - uncorrected - harm)));

  let letter = scoreToGrade(score);
  const hasNoPlan = deficiencies.some((d) => correctionStatus(d.deficiency_corrected) === "no_plan");
  const cappedByNoPlan = hasNoPlan && letter === "A";
  if (cappedByNoPlan) letter = "B";

  return { score, letter, baseScore, uncorrectedPenalty: uncorrected, harmPenalty: harm, cappedByNoPlan };
}

export function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

/**
 * Short facility-page summary. Deliberately describes only the evidence passed
 * to this function. The old implementation inferred inspection quality from the
 * final composite letter (for example, A => "top tier inspection record"), which
 * could directly contradict the citations shown lower on the same page.
 *
 * Inspection findings are rendered from the CMS deficiency rows elsewhere on the
 * facility page, so this line keeps the staffing fact and sends the reader to the
 * actual inspection/enforcement evidence instead of inventing an adjective from
 * the overall grade.
 */
export function scoreToSummary(_score: number, _grade: string, rnHours: number | null): string {
  if (rnHours === null) {
    return "RN staffing data not reported — review the inspection and enforcement records below.";
  }
  const meetsBenchmark = rnHours >= FEDERAL_RN_MINIMUM;
  // "benchmark" not "minimum": the 0.55 hr standard was repealed effective
  // 2026-02-02 and is no longer a federal requirement.
  const staffing = meetsBenchmark
    ? "RN staffing is at or above the 2024 benchmark"
    : `RN staffing is below the repealed ${FEDERAL_RN_MINIMUM} hr benchmark`;
  return `${staffing} — review the inspection and enforcement records below for the safety history behind the grade.`;
}

export function toSlug(name: string): string {
  return (name ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
