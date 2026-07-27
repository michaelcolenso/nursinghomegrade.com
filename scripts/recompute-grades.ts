/**
 * Recomputes every facility grade with the Phase 2.3 penalty terms.
 *
 * Order matters and is not negotiable:
 *   1. Snapshot every current grade into `grade_history` (append-only).
 *   2. Recompute from `facilities` joined to `facility_deficiencies`.
 *   3. Write back only the rows whose score or letter actually changed.
 *
 * The snapshot exists so a facility disputing its new grade can be shown what it
 * held before and why it moved, and so Phase 5 can render grade trends. Never
 * run step 2 without step 1 having succeeded.
 *
 * Usage:
 *   npx tsx scripts/recompute-grades.ts --local          # dry run against local D1
 *   npx tsx scripts/recompute-grades.ts --local --apply
 *   npx tsx scripts/recompute-grades.ts --remote --apply
 */
import { execFileSync } from "node:child_process";
import { computeGrade, type PenaltyDeficiency, type ScoreInputs } from "../src/scoring";

const DB_NAME = "nursinghomegrade";
const REASON = "pre-penalty-baseline";
const BATCH_SIZE = 500;

const args = new Set(process.argv.slice(2));
const remote = args.has("--remote");
const apply = args.has("--apply");

if (!remote && !args.has("--local")) {
  console.error("Specify --local or --remote.");
  process.exit(1);
}

function query<T>(sql: string): T[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, remote ? "--remote" : "--local", "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
  );
  const parsed = JSON.parse(out) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}

function esc(v: string): string {
  return v.replace(/'/g, "''");
}

interface FacilityRow {
  cms_id: string;
  rn_hours_per_resident_day: number | null;
  total_deficiencies: number | null;
  quality_rating: number | null;
  staffing_rating: number | null;
  grade_score: number;
  grade_letter: string;
}

interface DeficiencyRow extends PenaltyDeficiency {
  cms_id: string;
}

async function main() {
  console.log(`Recomputing grades (${remote ? "remote" : "local"}, ${apply ? "APPLY" : "dry run"})`);

  const facilities = query<FacilityRow>(
    `SELECT cms_id, rn_hours_per_resident_day, total_deficiencies, quality_rating,
            staffing_rating, grade_score, grade_letter
       FROM facilities`,
  );
  console.log(`Loaded ${facilities.length} facilities.`);

  const deficiencies = query<DeficiencyRow>(
    `SELECT cms_id, scope_severity_code, deficiency_corrected, inspection_cycle
       FROM facility_deficiencies`,
  );
  console.log(`Loaded ${deficiencies.length} deficiency rows.`);

  const byFacility = new Map<string, PenaltyDeficiency[]>();
  for (const d of deficiencies) {
    const list = byFacility.get(d.cms_id) ?? [];
    list.push(d);
    byFacility.set(d.cms_id, list);
  }

  // Step 1 — snapshot before touching anything.
  if (apply) {
    console.log("Snapshotting current grades into grade_history...");
    for (let i = 0; i < facilities.length; i += BATCH_SIZE) {
      const values = facilities
        .slice(i, i + BATCH_SIZE)
        .map((f) => `('${esc(f.cms_id)}',${f.grade_score},'${esc(f.grade_letter)}','${REASON}')`)
        .join(",\n");
      query(`INSERT INTO grade_history (cms_id,grade_score,grade_letter,reason) VALUES\n${values};`);
    }
    console.log(`Snapshotted ${facilities.length} rows.`);
  }

  // Step 2 — recompute.
  const changes: Array<{ cms_id: string; score: number; letter: string; from: string; fromScore: number }> = [];
  let cappedCount = 0;
  const letterMoves = new Map<string, number>();

  for (const f of facilities) {
    const inputs: ScoreInputs = {
      rnHoursPerResidentDay: f.rn_hours_per_resident_day ?? 0,
      totalDeficiencies: f.total_deficiencies ?? 0,
      qualityRating: f.quality_rating ?? 1,
      staffingRating: f.staffing_rating ?? 1,
    };
    const result = computeGrade(inputs, byFacility.get(f.cms_id) ?? []);
    if (result.cappedByNoPlan) cappedCount += 1;
    if (result.score !== f.grade_score || result.letter !== f.grade_letter) {
      changes.push({
        cms_id: f.cms_id,
        score: result.score,
        letter: result.letter,
        from: f.grade_letter,
        fromScore: f.grade_score,
      });
      if (result.letter !== f.grade_letter) {
        const key = `${f.grade_letter}→${result.letter}`;
        letterMoves.set(key, (letterMoves.get(key) ?? 0) + 1);
      }
    }
  }

  console.log(`\n${changes.length} facilities change score or letter.`);
  console.log(`${cappedCount} capped at B by the no-plan rule.`);
  console.log("\nLetter transitions:");
  for (const [move, n] of [...letterMoves.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${move}: ${n}`);
  }

  const avgDrop =
    changes.length > 0
      ? changes.reduce((sum, c) => sum + (c.fromScore - c.score), 0) / changes.length
      : 0;
  console.log(`\nMean score change: ${avgDrop >= 0 ? "-" : "+"}${Math.abs(avgDrop).toFixed(1)} points.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  // Step 3 — write back only what changed.
  console.log("\nWriting new grades...");
  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = changes.slice(i, i + BATCH_SIZE);
    const sql = batch
      .map(
        (c) =>
          `UPDATE facilities SET grade_score=${c.score}, grade_letter='${esc(c.letter)}' WHERE cms_id='${esc(c.cms_id)}';`,
      )
      .join("\n");
    query(sql);
    console.log(`  ${Math.min(i + BATCH_SIZE, changes.length)}/${changes.length}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
