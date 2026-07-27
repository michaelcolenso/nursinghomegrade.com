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

export function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function scoreToSummary(score: number, grade: string, rnHours: number | null): string {
  if (rnHours === null) {
    return `Staffing data not reported — check the facility's inspection history.`;
  }
  const meetsBenchmark = rnHours >= FEDERAL_RN_MINIMUM;
  // "benchmark" not "minimum": the 0.55 hr standard was repealed effective
  // 2026-02-02 and is no longer a federal requirement.
  const staffing = meetsBenchmark
    ? "At or above the 2024 benchmark"
    : `Below the repealed ${FEDERAL_RN_MINIMUM} hr RN benchmark`;
  if (grade === "A") return `${staffing} — top tier inspection record.`;
  if (grade === "B") return `${staffing} — above average inspection record.`;
  if (grade === "C") return `${staffing} — average inspection record.`;
  if (grade === "D") return `${staffing} — elevated deficiency count.`;
  return `${staffing} — review inspection history before visiting.`;
}

export function toSlug(name: string): string {
  return (name ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
