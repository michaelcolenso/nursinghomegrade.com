import type { FacilitySnapshot, Trajectory, TrajectoryStatus } from "./types";

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i] ?? 0;
    sumX += i;
    sumY += v;
    sumXY += i * v;
    sumXX += i * i;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function percentChange(first: number, last: number): number | null {
  if (first === 0) return null;
  return Math.round(((last - first) / first) * 100);
}

function classifyTrend(slope: number, threshold: number): "up" | "down" | "flat" {
  if (slope > threshold) return "up";
  if (slope < -threshold) return "down";
  return "flat";
}

export function computeTrajectory(snapshots: FacilitySnapshot[]): Trajectory {
  if (snapshots.length < 3) {
    return {
      cms_id: snapshots[0]?.cms_id ?? "",
      status: "insufficient_history",
      staffing_change_pct: null,
      deficiency_change_pct: null,
      grade_change: null,
      rn_hours_trend: null,
    };
  }

  const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);
  const recent = sorted.filter((s) => new Date(s.snapshot_date) >= cutoff);
  const use = recent.length >= 3 ? recent : sorted;

  const rnHours = use
    .map((s) => s.rn_hours_per_resident_day)
    .filter((v): v is number => v !== null);
  const deficiencies = use
    .map((s) => s.total_deficiencies)
    .filter((v): v is number => v !== null);
  // Grade -1 is the persisted NR sentinel. It is absence of a grade, not a
  // catastrophic grade change, so omit it from historical grade deltas.
  const grades = use
    .map((s) => s.grade_score)
    .filter((v) => Number.isFinite(v) && v >= 0);

  const rnSlope = rnHours.length >= 3 ? linearRegression(rnHours).slope : 0;
  const defSlope = deficiencies.length >= 3 ? linearRegression(deficiencies).slope : 0;

  const rnThreshold = 0.005;
  const defThreshold = 0.3;

  const rnTrend = rnHours.length >= 3 ? classifyTrend(rnSlope, rnThreshold) : null;
  const defTrend = deficiencies.length >= 3 ? classifyTrend(defSlope, defThreshold) : null;

  const staffingImproving = rnTrend === "up";
  const staffingDeclining = rnTrend === "down";
  const defImproving = defTrend === "down";
  const defDeclining = defTrend === "up";

  let status: TrajectoryStatus = "stable";
  if (staffingImproving && defImproving) status = "improving";
  else if (staffingDeclining && defDeclining) status = "declining";
  else if ((staffingImproving && defDeclining) || (staffingDeclining && defImproving)) status = "volatile";
  else if (staffingImproving || defImproving) status = "improving";
  else if (staffingDeclining || defDeclining) status = "declining";

  const firstRn = rnHours[0];
  const lastRn = rnHours[rnHours.length - 1];
  const staffingChange = rnHours.length >= 2 && firstRn !== undefined && lastRn !== undefined
    ? percentChange(firstRn, lastRn)
    : null;

  const firstDef = deficiencies[0];
  const lastDef = deficiencies[deficiencies.length - 1];
  const deficiencyChange = deficiencies.length >= 2 && firstDef !== undefined && lastDef !== undefined
    ? percentChange(firstDef, lastDef)
    : null;

  const firstGrade = grades[0];
  const lastGrade = grades[grades.length - 1];
  const gradeChange = grades.length >= 2 && firstGrade !== undefined && lastGrade !== undefined
    ? lastGrade - firstGrade
    : null;

  const firstSnapshot = sorted[0];
  return {
    cms_id: firstSnapshot?.cms_id ?? "",
    status,
    staffing_change_pct: staffingChange,
    deficiency_change_pct: deficiencyChange,
    grade_change: gradeChange,
    rn_hours_trend: rnTrend,
  };
}
