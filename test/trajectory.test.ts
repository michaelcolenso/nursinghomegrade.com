import { describe, it, expect } from "vitest";
import { computeTrajectory } from "../src/trajectory";
import type { FacilitySnapshot } from "../src/types";

function makeSnapshots(rnHours: (number | null)[], deficiencies: (number | null)[]): FacilitySnapshot[] {
  const baseDate = new Date("2024-01-01");
  return rnHours.map((rn, i) => ({
    cms_id: "015001",
    snapshot_date: new Date(baseDate.getTime() + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    overall_rating: 3,
    quality_rating: 3,
    staffing_rating: 3,
    inspection_rating: 3,
    rn_hours_per_resident_day: rn,
    total_deficiencies: deficiencies[i] ?? 0,
    grade_score: 60,
    grade_letter: "C",
    nurse_hours_per_resident_day: null,
    deficiency_count: deficiencies[i] ?? 0,
  }));
}

describe("computeTrajectory", () => {
  it("returns insufficient_history with fewer than 3 snapshots", () => {
    const snapshots = makeSnapshots([0.5, 0.6], [5, 4]);
    const traj = computeTrajectory(snapshots);
    expect(traj.status).toBe("insufficient_history");
  });

  it("detects improving trajectory when staffing and deficiencies both improve", () => {
    const snapshots = makeSnapshots([0.5, 0.55, 0.62, 0.7], [10, 8, 6, 4]);
    const traj = computeTrajectory(snapshots);
    expect(traj.status).toBe("improving");
    expect(traj.rn_hours_trend).toBe("up");
  });

  it("detects declining trajectory when staffing and deficiencies both worsen", () => {
    const snapshots = makeSnapshots([0.7, 0.62, 0.55, 0.5], [4, 6, 8, 10]);
    const traj = computeTrajectory(snapshots);
    expect(traj.status).toBe("declining");
    expect(traj.rn_hours_trend).toBe("down");
  });

  it("detects volatile trajectory when metrics move in opposite directions", () => {
    const snapshots = makeSnapshots([0.5, 0.55, 0.6, 0.65], [4, 6, 8, 10]);
    const traj = computeTrajectory(snapshots);
    expect(traj.status).toBe("volatile");
  });

  it("detects stable trajectory when metrics barely change", () => {
    const snapshots = makeSnapshots([0.6, 0.61, 0.6, 0.61], [5, 5, 5, 5]);
    const traj = computeTrajectory(snapshots);
    expect(traj.status).toBe("stable");
  });

  it("computes percent changes correctly", () => {
    const snapshots = makeSnapshots([0.5, 0.6, 0.7], [10, 8, 6]);
    const traj = computeTrajectory(snapshots);
    expect(traj.staffing_change_pct).toBe(40);
    expect(traj.deficiency_change_pct).toBe(-40);
    expect(traj.grade_change).toBe(0);
  });
});
