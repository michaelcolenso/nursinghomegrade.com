import { RN_BENCHMARK, REPEAL_EFFECTIVE_DATE } from "./staffing-standard";
import type { Facility, Operator, Trajectory } from "./types";

export interface NationalAverages {
  avgGrade: number;
  avgRnHours: number;
  avgDeficiencies: number;
  totalFacilities: number;
}

export interface OperatorInsights {
  pctFailingStaffing: number;
  /** Facilities that actually report RN hours — the denominator for the above. */
  reportingFacilityCount: number;
  gradeVsNational: number;
  staffingVsNational: number;
  deficiencyVsNational: number;
  penaltyRatio: number | null;
}

/** Counts from the facility's deficiency detail rows — the same source the
 *  Quality Breakdown table and the prose summary use. */
export interface AssessmentDeficiencyCounts {
  total: number;
  outstanding: number;
  harm: number;
}

export function generateFacilityAssessment(
  facility: Facility,
  trajectory: Trajectory | null,
  operator: Operator | null,
  nationalAvg: NationalAverages,
  deficiencyCounts?: AssessmentDeficiencyCounts,
): string {
  const sentences: string[] = [];

  // Lead with the facts a family would weigh most heavily. An open violation or
  // a harm citation outranks any trend or operator comparison.
  if (deficiencyCounts) {
    if (deficiencyCounts.outstanding > 0) {
      const word = deficiencyCounts.outstanding === 1 ? "violation" : "violations";
      sentences.push(
        `${deficiencyCounts.outstanding} federal ${word} at this facility ${deficiencyCounts.outstanding === 1 ? "remains" : "remain"} unresolved.`,
      );
    }
    if (deficiencyCounts.harm > 0) {
      const word = deficiencyCounts.harm === 1 ? "citation" : "citations";
      sentences.push(
        `Inspectors recorded ${deficiencyCounts.harm} ${word} at the actual-harm level or worse in the last three survey cycles.`,
      );
    }
  }

  if (trajectory) {
    if (trajectory.status === "improving") {
      const parts: string[] = [];
      if (trajectory.staffing_change_pct !== null && trajectory.staffing_change_pct > 10) {
        parts.push(`RN staffing has increased ${trajectory.staffing_change_pct}% over the tracking period`);
      }
      if (trajectory.deficiency_change_pct !== null && trajectory.deficiency_change_pct < -20) {
        parts.push(`deficiencies have fallen by ${Math.abs(trajectory.deficiency_change_pct)}%`);
      }
      if (trajectory.grade_change !== null && trajectory.grade_change > 5) {
        parts.push(`the overall grade improved by ${trajectory.grade_change} points`);
      }
      if (parts.length > 0) {
        sentences.push(`This facility is on an upward trend: ${parts.join(", ")}.`);
      } else {
        sentences.push("This facility shows signs of improvement across tracked metrics.");
      }
    } else if (trajectory.status === "declining") {
      const parts: string[] = [];
      if (trajectory.staffing_change_pct !== null && trajectory.staffing_change_pct < -10) {
        parts.push(`RN staffing has declined ${Math.abs(trajectory.staffing_change_pct)}%`);
      }
      if (trajectory.deficiency_change_pct !== null && trajectory.deficiency_change_pct > 20) {
        parts.push(`deficiencies have risen by ${trajectory.deficiency_change_pct}%`);
      }
      if (parts.length > 0) {
        sentences.push(`Warning signs: ${parts.join(", ")}.`);
      } else {
        sentences.push("This facility shows declining performance across tracked metrics.");
      }
    } else if (trajectory.status === "volatile") {
      sentences.push("This facility's metrics have been inconsistent, with mixed signals across staffing and deficiencies.");
    } else if (trajectory.status === "insufficient_history") {
      sentences.push("Insufficient historical data is available to determine a clear trend for this facility.");
    }
  }

  if (operator && operator.avg_grade !== null) {
    const diff = Math.round(operator.avg_grade - nationalAvg.avgGrade);
    if (diff < -10) {
      sentences.push(`This facility is operated by ${operator.normalized_name}, which scores ${Math.abs(diff)} points below the national average.`);
    } else if (diff > 10) {
      sentences.push(`This facility is operated by ${operator.normalized_name}, which scores ${diff} points above the national average.`);
    }
  }

  if (facility.rn_hours_per_resident_day !== null && facility.rn_hours_per_resident_day < RN_BENCHMARK) {
    sentences.push(`This facility staffs below ${RN_BENCHMARK} RN hours per resident day — the level the 2024 federal rule, repealed in ${REPEAL_EFFECTIVE_DATE.replace(/ \d+,/, "")}, would have required.`);
  }

  // No generic fallback. If nothing distinguishing is true of this facility, we
  // render nothing rather than a sentence that says nothing — a filler string
  // repeated across ~15,000 pages is both useless to the reader and a direct
  // contributor to Google treating the pages as interchangeable.
  if (sentences.length === 0) {
    return "";
  }

  return sentences.join(" ");
}

export function computeOperatorInsights(
  operator: Operator,
  facilities: Facility[],
  nationalAvg: NationalAverages,
): OperatorInsights {
  // Denominator is reporting facilities only, matching getBenchmarkShortfall.
  // Counting non-reporting facilities as passing would understate the shortfall.
  const reporting = facilities.filter((f) => f.rn_hours_per_resident_day !== null);
  const failingCount = reporting.filter(
    (f) => f.rn_hours_per_resident_day !== null && f.rn_hours_per_resident_day < RN_BENCHMARK
  ).length;
  const pctFailingStaffing = reporting.length > 0
    ? Math.round((failingCount / reporting.length) * 100)
    : 0;
  const reportingFacilityCount = reporting.length;

  const avgGrade = operator.avg_grade ?? 0;
  const avgRn = facilities.length > 0
    ? facilities.reduce((sum, f) => sum + (f.rn_hours_per_resident_day ?? 0), 0) / facilities.length
    : 0;
  const avgDef = facilities.length > 0
    ? facilities.reduce((sum, f) => sum + (f.total_deficiencies ?? 0), 0) / facilities.length
    : 0;

  return {
    pctFailingStaffing,
    reportingFacilityCount,
    gradeVsNational: Math.round(avgGrade - nationalAvg.avgGrade),
    staffingVsNational: Math.round((avgRn - nationalAvg.avgRnHours) * 100) / 100,
    deficiencyVsNational: Math.round((avgDef - nationalAvg.avgDeficiencies) * 100) / 100,
    penaltyRatio: null,
  };
}

export function generateOperatorInsightsText(insights: OperatorInsights, operatorName: string): string[] {
  const lines: string[] = [];

  if (insights.gradeVsNational < 0) {
    lines.push(`This operator performs ${Math.abs(insights.gradeVsNational)} points below the national average for overall grade.`);
  } else if (insights.gradeVsNational > 0) {
    lines.push(`This operator performs ${insights.gradeVsNational} points above the national average for overall grade.`);
  }

  // Say nothing when no facility reports RN hours: a 0% shortfall computed over
  // an empty reporting population is not evidence of good staffing.
  if (insights.reportingFacilityCount > 0) {
    if (insights.pctFailingStaffing > 30) {
      lines.push(`${insights.pctFailingStaffing}% of this operator's facilities that report RN hours fall below the repealed ${RN_BENCHMARK} hr RN benchmark.`);
    } else if (insights.pctFailingStaffing === 0) {
      // "At or above", not "above": the comparison is `>=`, so a facility at
      // exactly the benchmark belongs in this group.
      lines.push(`All of this operator's facilities that report RN hours staff at or above the repealed ${RN_BENCHMARK} hr RN benchmark.`);
    }
  }

  if (insights.staffingVsNational < -0.1) {
    lines.push(`Average RN staffing is ${Math.abs(insights.staffingVsNational).toFixed(2)} hours below the national average.`);
  } else if (insights.staffingVsNational > 0.1) {
    lines.push(`Average RN staffing is ${insights.staffingVsNational.toFixed(2)} hours above the national average.`);
  }

  if (insights.deficiencyVsNational > 2) {
    lines.push(`Facilities average ${insights.deficiencyVsNational.toFixed(1)} more deficiencies than the national norm.`);
  } else if (insights.deficiencyVsNational < -2) {
    lines.push(`Facilities average ${Math.abs(insights.deficiencyVsNational).toFixed(1)} fewer deficiencies than the national norm.`);
  }

  if (lines.length === 0) {
    lines.push("This operator's performance is in line with national averages.");
  }

  return lines;
}

export function generateOperatorSummary(operator: Operator, insights: OperatorInsights): string {
  const gradeDesc = insights.gradeVsNational < -5 ? "below-average" : insights.gradeVsNational > 5 ? "above-average" : "average";
  return `${operator.normalized_name} operates ${operator.facility_count} facilities with a ${gradeDesc} overall grade.`;
}

export function generateStateSummary(stateName: string, facilities: Facility[], gradeDistribution: Record<string, number>): string {
  const total = facilities.length;
  const topGrades = (gradeDistribution.A ?? 0) + (gradeDistribution.B ?? 0);
  const pctTop = total > 0 ? Math.round((topGrades / total) * 100) : 0;
  return `${stateName} has ${total} nursing facilities, with ${pctTop}% earning a grade of A or B.`;
}

export function generateCitySummary(cityName: string, state: string, facilities: Facility[], gradeDistribution: Record<string, number>): string {
  const total = facilities.length;
  const topGrades = (gradeDistribution.A ?? 0) + (gradeDistribution.B ?? 0);
  const pctTop = total > 0 ? Math.round((topGrades / total) * 100) : 0;
  return `${cityName}, ${state} has ${total} nursing facilities, with ${pctTop}% earning a grade of A or B.`;
}
