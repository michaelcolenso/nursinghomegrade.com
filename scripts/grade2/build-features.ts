import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { correctionStatus, type PenaltyDeficiency } from "../../src/scoring";
import {
  inferOutcomeDirection,
  outcomeFeatureKey,
  outcomesShadowScore,
  overallShadowScore,
  percentileScore,
  safetyShadowScore,
  safetyWeightedBurden,
  staffingShadowScore,
  type FavorableDirection,
  type OutcomeMeasureValue,
  type StaffingReferenceDistributions,
} from "../../src/grading/v2/shadow";

const DB_NAME = "nursinghomegrade";
const FEATURE_VERSION = "g2b-features-0.1";
const MODEL_VERSION = "g2-shadow-0.1";
const REGISTRY_VERSION = "g2-outcomes-registry-0.1";
const args = new Set(process.argv.slice(2));
const target = args.has("--remote") ? "--remote" : args.has("--local") ? "--local" : null;
const apply = args.has("--apply");

if (!target) {
  console.error("Specify --local or --remote. Add --apply to load the generated snapshots.");
  process.exit(1);
}

function query<T>(sql: string): T[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, target, "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 768 * 1024 * 1024 },
  );
  const parsed = JSON.parse(out) as Array<{ results?: T[] }>;
  return parsed[0]?.results ?? [];
}

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

function text(value: string | null | undefined): string {
  return value === null || value === undefined ? "NULL" : `'${esc(value)}'`;
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "NULL" : String(value);
}

function jsonText(value: unknown): string {
  return `'${esc(JSON.stringify(value))}'`;
}

function batchInsert(table: string, columns: string[], rows: string[], size = 200, verb = "INSERT"): string[] {
  const sql: string[] = [];
  for (let i = 0; i < rows.length; i += size) {
    sql.push(verb + " INTO " + table + " (" + columns.join(",") + ") VALUES\n" + rows.slice(i, i + size).join(",\n") + ";");
  }
  return sql;
}

interface ReleaseRow {
  source_key: string;
  cms_release_date: string | null;
  cms_modified_date: string | null;
  ingested_at: string | null;
}

interface FacilityRow { cms_id: string }
interface SurveyRow {
  cms_id: string;
  health_survey_date: string | null;
  total_health_deficiencies: number | null;
  processing_date: string | null;
}
interface DeficiencyRow extends PenaltyDeficiency {
  cms_id: string;
  deficiency_tag_number: string | null;
}
interface StaffingRow {
  cms_id: string;
  adjusted_rn_hprd: number | null;
  adjusted_total_nurse_hprd: number | null;
  adjusted_weekend_total_nurse_hprd: number | null;
  rn_turnover_pct: number | null;
  total_nursing_turnover_pct: number | null;
  administrators_left: number | null;
  processing_date: string | null;
}
interface OutcomeRow {
  cms_id: string;
  measure_code: string;
  measure_description: string | null;
  resident_type: string | null;
  score: number | null;
  footnote: string | null;
  measure_period: string | null;
  processing_date: string | null;
  source_key: "mds_quality_measures" | "claims_quality_measures";
}

function values(values: Array<number | null>): number[] {
  return values.filter((v): v is number => v !== null && Number.isFinite(v));
}

function featureRow(input: {
  runId: string;
  cmsId: string;
  pillar: "safety" | "staffing" | "outcomes";
  key: string;
  raw: number | null;
  normalized: number | null;
  weight: number | null;
  missing: string | null;
  sourceKey: string;
  sourceField: string | null;
  sourcePeriod: string | null;
  processingDate: string | null;
}): string {
  return `(${[
    text(input.runId), text(input.cmsId), text(input.pillar), text(input.key),
    num(input.raw), num(input.normalized), num(input.weight), text(input.missing),
    text(input.sourceKey), text(input.sourceField), text(input.sourcePeriod), text(input.processingDate),
  ].join(",")})`;
}

async function main(): Promise<void> {
  const releases = query<ReleaseRow>(
    "SELECT source_key,cms_release_date,cms_modified_date,ingested_at FROM data_releases ORDER BY source_key",
  );
  const facilities = query<FacilityRow>("SELECT cms_id FROM facilities ORDER BY cms_id");
  if (facilities.length === 0) throw new Error("No facilities found; refusing to create an empty Grade 2 run.");

  const asOf = new Date().toISOString();
  const runId = `${FEATURE_VERSION}-${asOf.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const sourceReleaseJson = Object.fromEntries(releases.map((r) => [r.source_key, r]));

  const survey = query<SurveyRow>(
    "SELECT cms_id,health_survey_date,total_health_deficiencies,processing_date FROM facility_survey_summaries WHERE inspection_cycle=1",
  );
  const surveyById = new Map(survey.map((r) => [r.cms_id, r]));

  const deficiencyRows = query<DeficiencyRow>(
    "SELECT cms_id,scope_severity_code,deficiency_corrected,inspection_cycle,deficiency_tag_number FROM facility_deficiencies",
  );
  const defsById = new Map<string, DeficiencyRow[]>();
  for (const d of deficiencyRows) {
    const list = defsById.get(d.cms_id) ?? [];
    list.push(d);
    defsById.set(d.cms_id, list);
  }

  const staffing = query<StaffingRow>(
    `SELECT cms_id,adjusted_rn_hprd,adjusted_total_nurse_hprd,adjusted_weekend_total_nurse_hprd,
            rn_turnover_pct,total_nursing_turnover_pct,administrators_left,processing_date
       FROM facility_staffing_features`,
  );
  const staffingById = new Map(staffing.map((r) => [r.cms_id, r]));
  const staffingRef: StaffingReferenceDistributions = {
    adjustedRnHprd: values(staffing.map((r) => r.adjusted_rn_hprd)),
    adjustedTotalNurseHprd: values(staffing.map((r) => r.adjusted_total_nurse_hprd)),
    adjustedWeekendTotalNurseHprd: values(staffing.map((r) => r.adjusted_weekend_total_nurse_hprd)),
    rnTurnoverPct: values(staffing.map((r) => r.rn_turnover_pct)),
    totalNursingTurnoverPct: values(staffing.map((r) => r.total_nursing_turnover_pct)),
    administratorsLeft: values(staffing.map((r) => r.administrators_left)),
  };

  const outcomes = query<OutcomeRow>(
    `SELECT cms_id,measure_code,measure_description,resident_type,four_quarter_average_score AS score,
            four_quarter_footnote AS footnote,measure_period,processing_date,'mds_quality_measures' AS source_key
       FROM facility_mds_quality_measures WHERE used_in_five_star='Y'
     UNION ALL
     SELECT cms_id,measure_code,measure_description,resident_type,adjusted_score AS score,
            footnote,measure_period,processing_date,'claims_quality_measures' AS source_key
       FROM facility_claims_quality_measures WHERE used_in_five_star='Y'`,
  );

  const registry = new Map<string, { sourceKey: OutcomeRow["source_key"]; code: string; residentType: string; label: string; direction: FavorableDirection }>();
  for (const row of outcomes) {
    if (!row.measure_description) continue;
    const direction = inferOutcomeDirection(row.measure_description);
    if (!direction) continue;
    const residentType = (row.resident_type ?? "").trim();
    const key = outcomeFeatureKey(row.source_key, row.measure_code, residentType);
    registry.set(key, { sourceKey: row.source_key, code: row.measure_code, residentType, label: row.measure_description, direction });
  }
  const expectedOutcomeKeys = [...registry.keys()].sort();
  console.log(`Outcome registry: ${expectedOutcomeKeys.length} conservatively classified measure(s).`);

  const outcomeDistributions = new Map<string, number[]>();
  const outcomesById = new Map<string, OutcomeRow[]>();
  for (const row of outcomes) {
    const key = outcomeFeatureKey(row.source_key, row.measure_code, row.resident_type);
    if (!registry.has(key)) continue;
    if (row.score !== null && Number.isFinite(row.score)) {
      const dist = outcomeDistributions.get(key) ?? [];
      dist.push(row.score);
      outcomeDistributions.set(key, dist);
    }
    const list = outcomesById.get(row.cms_id) ?? [];
    list.push(row);
    outcomesById.set(row.cms_id, list);
  }

  const featureRows: string[] = [];
  const shadowRows: string[] = [];

  for (const facility of facilities) {
    const surveyRow = surveyById.get(facility.cms_id);
    const defs = defsById.get(facility.cms_id) ?? [];
    const tagCycles = new Map<string, Set<number>>();
    for (const d of defs) {
      if (!d.deficiency_tag_number || d.inspection_cycle === null) continue;
      const cycles = tagCycles.get(d.deficiency_tag_number) ?? new Set<number>();
      cycles.add(d.inspection_cycle);
      tagCycles.set(d.deficiency_tag_number, cycles);
    }
    const recurringTagCount = [...tagCycles.values()].filter((cycles) => cycles.size > 1).length;
    const safetyInput = {
      currentSurveyDate: surveyRow?.health_survey_date ?? null,
      currentSurveyDeficiencies: surveyRow?.total_health_deficiencies ?? null,
      recurringTagCount,
      deficiencies: defs.map((d) => ({
        severity: d.scope_severity_code ?? null,
        inspectionCycle: d.inspection_cycle ?? null,
        correctionStatus: correctionStatus(d.deficiency_corrected),
      })),
    };
    const safety = safetyShadowScore(safetyInput);
    const safetyBurden = safetyWeightedBurden(safetyInput);
    featureRows.push(featureRow({
      runId, cmsId: facility.cms_id, pillar: "safety", key: "safety.current_survey_deficiencies",
      raw: surveyRow?.total_health_deficiencies ?? null, normalized: safety.score, weight: 0.4,
      missing: safety.score === null ? safety.missing.join(",") : null,
      sourceKey: "survey_summary", sourceField: "Total Number of Health Deficiencies",
      sourcePeriod: surveyRow?.health_survey_date ?? null, processingDate: surveyRow?.processing_date ?? null,
    }));
    featureRows.push(featureRow({
      runId, cmsId: facility.cms_id, pillar: "safety", key: "safety.recurring_tags",
      raw: recurringTagCount, normalized: null, weight: null, missing: null,
      sourceKey: "health_deficiencies", sourceField: "Deficiency Tag Number + Inspection Cycle",
      sourcePeriod: null, processingDate: null,
    }));
    featureRows.push(featureRow({
      runId, cmsId: facility.cms_id, pillar: "safety", key: "safety.weighted_citation_burden",
      raw: safetyBurden.citationBurden, normalized: null, weight: null, missing: null,
      sourceKey: "health_deficiencies", sourceField: "Severity + inspection cycle + correction status",
      sourcePeriod: null, processingDate: null,
    }));
    featureRows.push(featureRow({
      runId, cmsId: facility.cms_id, pillar: "safety", key: "safety.recurrence_penalty",
      raw: safetyBurden.recurrencePenalty, normalized: null, weight: null, missing: null,
      sourceKey: "health_deficiencies", sourceField: "Repeated tag across inspection cycles",
      sourcePeriod: null, processingDate: null,
    }));

    const s = staffingById.get(facility.cms_id);
    const staffingInput = {
      adjustedRnHprd: s?.adjusted_rn_hprd ?? null,
      adjustedTotalNurseHprd: s?.adjusted_total_nurse_hprd ?? null,
      adjustedWeekendTotalNurseHprd: s?.adjusted_weekend_total_nurse_hprd ?? null,
      rnTurnoverPct: s?.rn_turnover_pct ?? null,
      totalNursingTurnoverPct: s?.total_nursing_turnover_pct ?? null,
      administratorsLeft: s?.administrators_left ?? null,
    };
    const staffingScore = staffingShadowScore(staffingInput, staffingRef);
    const staffingFeatures: Array<[string, number | null, number[], FavorableDirection, number, string]> = [
      ["staffing.adjusted_rn_hprd", staffingInput.adjustedRnHprd, staffingRef.adjustedRnHprd, "higher", 0.30, "Adjusted RN Staffing Hours per Resident per Day"],
      ["staffing.adjusted_total_nurse_hprd", staffingInput.adjustedTotalNurseHprd, staffingRef.adjustedTotalNurseHprd, "higher", 0.30, "Adjusted Total Nurse Staffing Hours per Resident per Day"],
      ["staffing.adjusted_weekend_total_nurse_hprd", staffingInput.adjustedWeekendTotalNurseHprd, staffingRef.adjustedWeekendTotalNurseHprd, "higher", 0.15, "Adjusted Weekend Total Nurse Staffing Hours per Resident per Day"],
      ["staffing.rn_turnover_pct", staffingInput.rnTurnoverPct, staffingRef.rnTurnoverPct, "lower", 0.10, "Registered Nurse turnover"],
      ["staffing.total_nursing_turnover_pct", staffingInput.totalNursingTurnoverPct, staffingRef.totalNursingTurnoverPct, "lower", 0.10, "Total nursing staff turnover"],
      ["staffing.administrators_left", staffingInput.administratorsLeft, staffingRef.administratorsLeft, "lower", 0.05, "Number of administrators who have left the nursing home"],
    ];
    for (const [key, raw, dist, direction, weight, sourceField] of staffingFeatures) {
      featureRows.push(featureRow({
        runId, cmsId: facility.cms_id, pillar: "staffing", key, raw,
        normalized: percentileScore(raw, dist, direction), weight,
        missing: raw === null ? "not_reported" : null,
        sourceKey: "provider_info", sourceField, sourcePeriod: null, processingDate: s?.processing_date ?? null,
      }));
    }

    const outcomeValues: OutcomeMeasureValue[] = [];
    for (const row of outcomesById.get(facility.cms_id) ?? []) {
      const key = outcomeFeatureKey(row.source_key, row.measure_code, row.resident_type);
      const registration = registry.get(key);
      if (!registration) continue;
      const distribution = outcomeDistributions.get(key) ?? [];
      outcomeValues.push({ key, value: row.score, direction: registration.direction, distribution });
      featureRows.push(featureRow({
        runId, cmsId: facility.cms_id, pillar: "outcomes", key: `outcomes.${key}`,
        raw: row.score, normalized: percentileScore(row.score, distribution, registration.direction), weight: null,
        missing: row.score === null ? (row.footnote ?? "suppressed_or_not_reported") : null,
        sourceKey: row.source_key, sourceField: row.measure_description,
        sourcePeriod: row.measure_period, processingDate: row.processing_date,
      }));
    }
    const outcomesScore = outcomesShadowScore(outcomeValues, expectedOutcomeKeys);
    const overall = overallShadowScore(safety, staffingScore, outcomesScore);
    const missingPillars = [
      safety.score === null ? "safety" : null,
      staffingScore.score === null ? "staffing" : null,
      outcomesScore.score === null ? "outcomes" : null,
    ].filter((x): x is string => x !== null);
    shadowRows.push(`(${[
      text(runId), text(facility.cms_id), num(safety.score), num(staffingScore.score), num(outcomesScore.score),
      num(overall.score), text(overall.confidence), num(overall.coverage),
      missingPillars.length ? text(missingPillars.join(",")) : "NULL",
      jsonText({ safety, staffing: staffingScore, outcomes: outcomesScore }),
    ].join(",")})`);
  }

  const registryRows = [...registry.values()].map((r) => `(${[
    text(r.sourceKey), text(r.code), text(r.residentType), text(r.label), text(r.direction), text(REGISTRY_VERSION), "1",
    text("Conservative direction inferred from an explicit outcome-family description; shadow research only."),
  ].join(",")})`);

  const sql = [
    "BEGIN TRANSACTION;",
    `INSERT INTO grade2_feature_runs (run_id,feature_version,model_version,as_of_date,source_release_json,notes) VALUES (${text(runId)},${text(FEATURE_VERSION)},${text(MODEL_VERSION)},${text(asOf)},${jsonText(sourceReleaseJson)},${text("Phase B shadow research baseline; not public scoring.")});`,
    ...batchInsert("grade2_measure_registry", ["source_key","measure_code","resident_type","measure_label","favorable_direction","registry_version","enabled","rationale"], registryRows, 200, "INSERT OR REPLACE"),
    ...batchInsert("grade2_feature_snapshots", ["run_id","cms_id","pillar","feature_key","raw_value","normalized_value","weight","missing_reason","source_key","source_field","source_period","source_processing_date"], featureRows, 50),
    ...batchInsert("grade2_shadow_scores", ["run_id","cms_id","safety_score","staffing_score","outcomes_score","overall_score","confidence","evidence_coverage","missing_pillars","explanation_json"], shadowRows, 20),
    "COMMIT;",
    "",
  ].join("\n\n");

  mkdirSync("scripts/generated", { recursive: true });
  const seedPath = `scripts/generated/${runId}.sql`;
  writeFileSync(seedPath, sql);
  console.log(`Generated ${featureRows.length.toLocaleString()} feature rows and ${shadowRows.length.toLocaleString()} shadow-score rows.`);
  console.log(`Seed: ${seedPath}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to persist this versioned Grade 2 shadow run.");
    return;
  }

  execFileSync("npx", ["wrangler", "d1", "execute", DB_NAME, target, `--file=${seedPath}`], {
    stdio: "inherit",
    maxBuffer: 768 * 1024 * 1024,
  });
  console.log(`Persisted Grade 2 shadow run ${runId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
