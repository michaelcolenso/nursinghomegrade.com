/**
 * Recomputes every facility grade with the current Grade 1.x penalty terms.
 *
 * Order matters and is not negotiable:
 *   1. Snapshot every current grade into `grade_history` (append-only).
 *   2. Recompute from `facilities` joined to `facility_deficiencies`.
 *   3. Write back only the rows whose grade state actually changed.
 *
 * Missing inspection evidence is never defaulted to zero. A grade is computed
 * only when the persisted provider record affirmatively carries both the current
 * deficiency count and the latest standard-survey date.
 *
 * Usage:
 *   npx tsx scripts/recompute-grades.ts --local          # dry run against local D1
 *   npx tsx scripts/recompute-grades.ts --local --apply
 *   npx tsx scripts/recompute-grades.ts --remote --apply
 */
import { execFileSync } from "node:child_process";
import {
  computeGrade,
  scoreToSummary,
  type GradeCompleteness,
  type PenaltyDeficiency,
  type ScoreInputs,
} from "../src/scoring";

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
  latest_standard_survey_date: string | null;
  grade_score: number;
  grade_letter: string;
}

interface DeficiencyRow extends PenaltyDeficiency {
  cms_id: string;
}

interface GradeChange {
  cms_id: string;
  score: number;
  letter: string;
  summary: string;
  completeness: GradeCompleteness;
  missingInputs: string | null;
  from: string;
  fromScore: number;
}

async function main() {
  console.log(`Recomputing grades (${remote ? "remote" : "local"}, ${apply ? "APPLY" : "dry run"})`);

  const facilities = query<FacilityRow>(
    `SELECT cms_id, rn_hours_per_resident_day, total_deficiencies, quality_rating,
            staffing_rating, latest_standard_survey_date, grade_score, grade_letter
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

  const alreadySnapshotted = new Set(
    query<{ cms_id: string }>(
      `SELECT DISTINCT cms_id FROM grade_history WHERE reason = '${REASON}'`,
    ).map((r) => r.cms_id),
  );
  const needsSnapshot = facilities.filter((f) => !alreadySnapshotted.has(f.cms_id));

  if (alreadySnapshotted.size > 0) {
    console.log(
      `${alreadySnapshotted.size} facilities already have a '${REASON}' baseline; ${needsSnapshot.length} still need one.`,
    );
  }

  if (apply && needsSnapshot.length > 0) {
    console.log("Snapshotting current grades into grade_history...");
    for (let i = 0; i < needsSnapshot.length; i += BATCH_SIZE) {
      const values = needsSnapshot
        .slice(i, i + BATCH_SIZE)
        .map((f) => `('${esc(f.cms_id)}',${f.grade_score},'${esc(f.grade_letter)}','${REASON}')`)
        .join(",\n");
      query(`INSERT INTO grade_history (cms_id,grade_score,grade_letter,reason) VALUES\n${values};`);
    }
    console.log(`Snapshotted ${needsSnapshot.length} rows.`);
  }

  const changes: GradeChange[] = [];
  let cappedCount = 0;
  let withheldCount = 0;
  const letterMoves = new Map<string, number>();

  for (const f of facilities) {
    const inputs: ScoreInputs = {
      rnHoursPerResidentDay: f.rn_hours_per_resident_day,
      totalDeficiencies: f.total_deficiencies,
      qualityRating: f.quality_rating,
      staffingRating: f.staffing_rating,
      inspectionEvidenceAvailable:
        f.total_deficiencies !== null && f.latest_standard_survey_date !== null,
    };
    const result = computeGrade(inputs, byFacility.get(f.cms_id) ?? []);
    if (result.cappedByNoPlan) cappedCount += 1;
    if (result.letter === null) withheldCount += 1;

    const nextScore = result.score ?? -1;
    const nextLetter = result.letter ?? "NR";
    const summary = scoreToSummary(
      result.score,
      result.letter,
      f.rn_hours_per_resident_day,
      result.completeness,
      result.missingInputs,
    );
    const missingInputs = result.missingInputs.length > 0 ? result.missingInputs.join(",") : null;

    if (nextScore !== f.grade_score || nextLetter !== f.grade_letter) {
      changes.push({
        cms_id: f.cms_id,
        score: nextScore,
        letter: nextLetter,
        summary,
        completeness: result.completeness,
        missingInputs,
        from: f.grade_letter,
        fromScore: f.grade_score,
      });
      if (nextLetter !== f.grade_letter) {
        const key = `${f.grade_letter}→${nextLetter}`;
        letterMoves.set(key, (letterMoves.get(key) ?? 0) + 1);
      }
    }
  }

  console.log(`\n${changes.length} facilities change grade state, score, or letter.`);
  console.log(`${withheldCount} facilities are not gradeable because current inspection evidence is insufficient.`);
  console.log(`${cappedCount} capped at B by the no-plan rule.`);
  console.log("\nLetter transitions:");
  for (const [move, n] of [...letterMoves.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${move}: ${n}`);
  }

  const numericChanges = changes.filter((c) => c.fromScore >= 0 && c.score >= 0);
  const avgDrop =
    numericChanges.length > 0
      ? numericChanges.reduce((sum, c) => sum + (c.fromScore - c.score), 0) / numericChanges.length
      : 0;
  console.log(
    `\nMean numeric score change among facilities rated before and after: ${avgDrop >= 0 ? "-" : "+"}${Math.abs(avgDrop).toFixed(1)} points.`,
  );

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  console.log("\nWriting new grades...");
  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = changes.slice(i, i + BATCH_SIZE);
    const sql = batch
      .map((c) => {
        const missing = c.missingInputs === null ? "NULL" : `'${esc(c.missingInputs)}'`;
        return `UPDATE facilities SET grade_score=${c.score}, grade_letter='${esc(c.letter)}', grade_summary='${esc(c.summary)}', grade_completeness='${esc(c.completeness)}', grade_missing_inputs=${missing} WHERE cms_id='${esc(c.cms_id)}';`;
      })
      .join("\n");
    query(sql);
    console.log(`  ${Math.min(i + BATCH_SIZE, changes.length)}/${changes.length}`);
  }

  console.log("\nAligning latest facility snapshot with the new grade...");
  query(
    `UPDATE facility_snapshots
        SET grade_score = (SELECT f.grade_score FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id),
            grade_letter = (SELECT f.grade_letter FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id),
            grade_completeness = (SELECT f.grade_completeness FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id),
            grade_missing_inputs = (SELECT f.grade_missing_inputs FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id)
      WHERE snapshot_date = (
              SELECT MAX(s2.snapshot_date) FROM facility_snapshots s2 WHERE s2.cms_id = facility_snapshots.cms_id
            )
        AND EXISTS (
              SELECT 1 FROM facilities f
               WHERE f.cms_id = facility_snapshots.cms_id
                 AND (f.grade_score <> facility_snapshots.grade_score
                      OR f.grade_letter <> facility_snapshots.grade_letter
                      OR f.grade_completeness <> facility_snapshots.grade_completeness
                      OR COALESCE(f.grade_missing_inputs, '') <> COALESCE(facility_snapshots.grade_missing_inputs, ''))
            );`,
  );

  console.log("\nRefreshing operator grade aggregates...");
  query(
    `UPDATE operators SET avg_grade = (
       SELECT ROUND(AVG(t.grade_score)) FROM (
         SELECT DISTINCT o.cms_id, f.grade_score
           FROM facility_owners o
           JOIN facilities f ON f.cms_id = o.cms_id
          WHERE o.normalized_name = operators.normalized_name
            AND f.grade_letter != 'NR'
            AND f.grade_score >= 0
       ) t
     ) WHERE EXISTS (
       SELECT 1 FROM facility_owners o WHERE o.normalized_name = operators.normalized_name
     );`,
  );

  console.log("\nRefreshing site_stats.avg_grade...");
  query(
    `UPDATE site_stats
        SET avg_grade = COALESCE((SELECT ROUND(AVG(grade_score), 1)
                                    FROM facilities
                                   WHERE grade_letter != 'NR' AND grade_score >= 0), 0),
            computed_at = datetime('now')
      WHERE id = 1;`,
  );

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
