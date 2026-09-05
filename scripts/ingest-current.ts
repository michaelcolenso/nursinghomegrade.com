import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  buildDataReleaseUpsert,
  fetchCmsDatasetMetadata,
  type DataReleaseRecord,
} from "../src/cms-dataset-metadata";

export const INGEST_SOURCES = [
  { sourceKey: "provider_info", label: "Provider Information", datasetId: "4pq5-n9py" },
  { sourceKey: "health_deficiencies", label: "Health Deficiencies", datasetId: "r5ix-sfxw" },
  { sourceKey: "ownership", label: "Ownership", datasetId: "y2hd-n93e" },
  { sourceKey: "penalties", label: "Penalties", datasetId: "g6vv-u9sr" },
] as const;

/**
 * Apply the Grade 1.x missing-data contract after the legacy seed generator has
 * written its rows. This keeps the large, well-tested CMS downloader intact
 * while eliminating its old hidden `?? 0` / `?? 1` semantics at the persisted
 * data boundary.
 *
 * Policy:
 * - missing current inspection evidence => grade withheld (NR / insufficient)
 * - missing RN, QM rating, or staffing rating => partial lower-bound grade
 * - partial weights are NOT renormalized; missing evidence earns no points
 */
export function buildGradeCompletenessSql(): string {
  const missingExpr = `trim(
    (CASE WHEN rn_hours_per_resident_day IS NULL THEN 'rn_staffing,' ELSE '' END) ||
    (CASE WHEN total_deficiencies IS NULL OR latest_standard_survey_date IS NULL THEN 'inspection_deficiencies,' ELSE '' END) ||
    (CASE WHEN quality_rating IS NULL THEN 'quality_rating,' ELSE '' END) ||
    (CASE WHEN staffing_rating IS NULL THEN 'staffing_rating,' ELSE '' END),
    ','
  )`;

  const completenessExpr = `CASE
    WHEN total_deficiencies IS NULL OR latest_standard_survey_date IS NULL THEN 'insufficient'
    WHEN rn_hours_per_resident_day IS NULL OR quality_rating IS NULL OR staffing_rating IS NULL THEN 'partial'
    ELSE 'complete'
  END`;

  return `-- Explicit Grade 1.x missing-data policy
UPDATE facilities
SET grade_missing_inputs = NULLIF(${missingExpr}, ''),
    grade_completeness = ${completenessExpr},
    grade_score = CASE
      WHEN total_deficiencies IS NULL OR latest_standard_survey_date IS NULL THEN -1
      ELSE grade_score
    END,
    grade_letter = CASE
      WHEN total_deficiencies IS NULL OR latest_standard_survey_date IS NULL THEN 'NR'
      ELSE grade_letter
    END,
    grade_summary = CASE
      WHEN total_deficiencies IS NULL OR latest_standard_survey_date IS NULL
        THEN 'Grade withheld because required current CMS inspection evidence is unavailable.'
      WHEN rn_hours_per_resident_day IS NULL OR quality_rating IS NULL OR staffing_rating IS NULL
        THEN 'Partial-data grade. One or more non-inspection CMS scoring inputs are unavailable; missing components contribute no positive points.'
      ELSE grade_summary
    END;

-- Keep the snapshot created by this ingest consistent with the current row.
UPDATE facility_snapshots
SET grade_score = COALESCE((SELECT f.grade_score FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id), grade_score),
    grade_letter = COALESCE((SELECT f.grade_letter FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id), grade_letter),
    grade_completeness = COALESCE((SELECT f.grade_completeness FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id), grade_completeness),
    grade_missing_inputs = (SELECT f.grade_missing_inputs FROM facilities f WHERE f.cms_id = facility_snapshots.cms_id)
WHERE snapshot_date = date('now');`;
}

export async function main(): Promise<void> {
  console.log("Reading authoritative CMS dataset metadata...");
  const records: DataReleaseRecord[] = await Promise.all(
    INGEST_SOURCES.map(async (source) => ({
      sourceKey: source.sourceKey,
      label: source.label,
      metadata: await fetchCmsDatasetMetadata(source.datasetId),
    })),
  );

  for (const record of records) {
    const next = record.metadata.nextUpdateDate ? `; next ${record.metadata.nextUpdateDate}` : "";
    console.log(
      `${record.label}: modified ${record.metadata.modified}; released ${record.metadata.released}${next}`,
    );
  }

  execFileSync("npx", ["tsx", "scripts/ingest.ts"], { stdio: "inherit" });

  const seedPath = "scripts/seed.sql";
  if (!existsSync(seedPath) || statSync(seedPath).size === 0) {
    throw new Error("scripts/ingest.ts completed without producing a non-empty scripts/seed.sql");
  }

  appendFileSync(seedPath, `\n\n${buildGradeCompletenessSql()}\n`);

  const ingestedAt = new Date().toISOString();
  const releaseSql = buildDataReleaseUpsert(records, ingestedAt);
  appendFileSync(seedPath, `\n\n-- Authoritative CMS release metadata\n${releaseSql}\n`);
  console.log(`Appended grade completeness policy and CMS release metadata to ${seedPath} at ${ingestedAt}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
