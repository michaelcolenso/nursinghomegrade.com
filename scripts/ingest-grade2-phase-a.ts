import { readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  buildDataReleaseUpsert,
  fetchCmsDatasetMetadata,
  type DataReleaseRecord,
} from "../src/cms-dataset-metadata";

const API_BASE = "https://data.cms.gov/provider-data/api/1/datastore/query";
const PAGE_SIZE = 1500;

const SOURCES = {
  provider: { id: "4pq5-n9py", key: "provider_info", label: "Provider Information" },
  survey: { id: "tbry-pc2d", key: "survey_summary", label: "Survey Summary" },
  mds: { id: "djen-97ju", key: "mds_quality_measures", label: "MDS Quality Measures" },
  claims: { id: "ijh5-nb2v", key: "claims_quality_measures", label: "Medicare Claims Quality Measures" },
} as const;

type CmsRow = Record<string, unknown>;
type NormalizedRow = Map<string, unknown>;

function token(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * PDC's machine keys are normalized versions of the human column headers. We
 * normalize both sides at runtime so the ingest is resilient to underscore and
 * punctuation differences without guessing fragile field slugs.
 */
export function normalizeCmsRow(row: CmsRow): NormalizedRow {
  return new Map(Object.entries(row).map(([key, value]) => [token(key), value]));
}

export function cmsField(row: NormalizedRow, ...headers: string[]): string | null {
  for (const header of headers) {
    const value = row.get(token(header));
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text !== "") return text;
  }
  return null;
}

function num(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function int(value: string | null): number | null {
  const parsed = num(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

function sqlText(value: string | null): string {
  return value === null ? "NULL" : `'${esc(value)}'`;
}

function sqlNum(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "NULL" : String(value);
}

async function fetchPage(datasetId: string, offset: number, label: string): Promise<CmsRow[]> {
  const url = `${API_BASE}/${datasetId}/0?limit=${PAGE_SIZE}&offset=${offset}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${label} HTTP ${response.status} at offset ${offset}`);
      const body = (await response.json()) as { results?: CmsRow[] };
      return body.results ?? [];
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, 750 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} fetch failed at offset ${offset}`);
}

async function fetchAll(datasetId: string, label: string): Promise<CmsRow[]> {
  const first = await fetchPage(datasetId, 0, label);
  if (first.length === 0) throw new Error(`${label} returned an empty first page; refusing destructive refresh`);

  const rows = [...first];
  let page = first;
  let offset = PAGE_SIZE;
  while (page.length === PAGE_SIZE) {
    page = await fetchPage(datasetId, offset, label);
    if (page.length === 0) break;
    rows.push(...page);
    if (rows.length % 15000 < PAGE_SIZE) console.log(`${label}: ${rows.length.toLocaleString()} rows`);
    offset += PAGE_SIZE;
  }
  console.log(`${label}: fetched ${rows.length.toLocaleString()} rows`);
  return rows;
}

function removeOldShards(prefix: string): void {
  for (const name of readdirSync("scripts")) {
    if (name.startsWith(prefix) && name.endsWith(".sql")) unlinkSync(`scripts/${name}`);
  }
}

// Wrangler's remote --file import is atomic. Explicit transaction-control SQL
// is rejected by D1. Keep the replacement and staging cleanup in one file.
// https://developers.cloudflare.com/d1/best-practices/import-export-data/
export function buildShadowTableFinalizer(table: string, columns: string[]): string {
  const staging = `${table}__next`;
  return [
    `DELETE FROM ${table};`,
    `INSERT INTO ${table} (${columns.join(",")} ) SELECT ${columns.join(",")} FROM ${staging};`,
    `DROP TABLE IF EXISTS ${staging};`,
    "",
  ].join("\n");
}

function writeShards(
  prefix: string,
  table: string,
  columns: string[],
  values: string[],
  rowsPerInsert = 200,
  insertsPerFile = 40,
): string[] {
  removeOldShards(prefix);
  if (values.length === 0) {
    throw new Error(`${table} transform produced zero rows; refusing to replace existing shadow evidence`);
  }

  const files: string[] = [];
  const rowsPerFile = rowsPerInsert * insertsPerFile;
  const staging = `${table}__next`;

  for (let start = 0, fileIndex = 1; start < values.length; start += rowsPerFile, fileIndex++) {
    const slice = values.slice(start, start + rowsPerFile);
    const sql: string[] = [];
    if (start === 0) {
      // Populate an unconstrained staging copy first. The live table remains
      // untouched if any network/SQL shard fails before the finalizer runs.
      sql.push(`DROP TABLE IF EXISTS ${staging};`);
      sql.push(`CREATE TABLE ${staging} AS SELECT * FROM ${table} WHERE 0;`);
    }

    for (let i = 0; i < slice.length; i += rowsPerInsert) {
      sql.push(
        `INSERT INTO ${staging} (${columns.join(",")} ) VALUES\n${slice.slice(i, i + rowsPerInsert).join(",\n")};`,
      );
    }

    const file = `scripts/${prefix}_${String(fileIndex).padStart(3, "0")} .sql`.replace(" .sql", ".sql");
    writeFileSync(file, `${sql.join("\n\n")}\n`);
    files.push(file);
  }

  const finalizer = `scripts/${prefix}_finalize.sql`;
  writeFileSync(finalizer, buildShadowTableFinalizer(table, columns));
  files.push(finalizer);

  console.log(`${table}: wrote ${values.length.toLocaleString()} staged rows across ${files.length - 1} shard(s) + finalizer`);
  return files;
}

function staffingRows(rows: CmsRow[]): string[] {
  return rows.flatMap((raw) => {
    const r = normalizeCmsRow(raw);
    const ccn = cmsField(r, "CMS Certification Number (CCN)");
    if (!ccn) return [];
    return [`(${[
      sqlText(ccn),
      sqlNum(num(cmsField(r, "Reported Total Nurse Staffing Hours per Resident per Day"))),
      sqlNum(num(cmsField(r, "Total number of nurse staff hours per resident per day on the weekend"))),
      sqlNum(num(cmsField(r, "Registered Nurse hours per resident per day on the weekend"))),
      sqlNum(num(cmsField(r, "Registered Nurse turnover"))),
      sqlNum(num(cmsField(r, "Total nursing staff turnover"))),
      sqlNum(int(cmsField(r, "Number of administrators who have left the nursing home"))),
      sqlNum(num(cmsField(r, "Nursing Case-Mix Index"))),
      sqlNum(num(cmsField(r, "Nursing Case-Mix Index Ratio"))),
      sqlNum(num(cmsField(r, "Case-Mix RN Staffing Hours per Resident per Day"))),
      sqlNum(num(cmsField(r, "Case-Mix Total Nurse Staffing Hours per Resident per Day"))),
      sqlNum(num(cmsField(r, "Case-Mix Weekend Total Nurse Staffing Hours per Resident per Day"))),
      sqlNum(num(cmsField(r, "Adjusted RN Staffing Hours per Resident per Day"))),
      sqlNum(num(cmsField(r, "Adjusted Total Nurse Staffing Hours per Resident per Day"))),
      sqlNum(num(cmsField(r, "Adjusted Weekend Total Nurse Staffing Hours per Resident per Day"))),
      sqlText(cmsField(r, "Processing Date")),
    ].join(",")})`];
  });
}

function surveyRows(rows: CmsRow[]): string[] {
  return rows.flatMap((raw) => {
    const r = normalizeCmsRow(raw);
    const ccn = cmsField(r, "CMS Certification Number (CCN)");
    const cycle = int(cmsField(r, "Inspection Cycle"));
    if (!ccn || cycle === null) return [];
    return [`(${[
      sqlText(ccn),
      String(cycle),
      sqlText(cmsField(r, "Health Survey Date")),
      sqlText(cmsField(r, "Fire Safety Survey Date")),
      sqlNum(int(cmsField(r, "Total Number of Health Deficiencies"))),
      sqlNum(int(cmsField(r, "Total Number of Fire Safety Deficiencies"))),
      sqlNum(int(cmsField(r, "Count of Infection Control Deficiencies"))),
      sqlText(cmsField(r, "Processing Date")),
    ].join(",")})`];
  });
}

function mdsRows(rows: CmsRow[]): string[] {
  return rows.flatMap((raw) => {
    const r = normalizeCmsRow(raw);
    const ccn = cmsField(r, "CMS Certification Number (CCN)");
    const code = cmsField(r, "Measure Code");
    if (!ccn || !code) return [];
    return [`(${[
      sqlText(ccn),
      sqlText(code),
      sqlText(cmsField(r, "Measure Description")),
      sqlText(cmsField(r, "Resident type")),
      sqlNum(num(cmsField(r, "Q1 Measure Score"))),
      sqlText(cmsField(r, "Footnote for Q1 Measure Score")),
      sqlNum(num(cmsField(r, "Q2 Measure Score"))),
      sqlText(cmsField(r, "Footnote for Q2 Measure Score")),
      sqlNum(num(cmsField(r, "Q3 Measure Score"))),
      sqlText(cmsField(r, "Footnote for Q3 Measure Score")),
      sqlNum(num(cmsField(r, "Q4 Measure Score"))),
      sqlText(cmsField(r, "Footnote for Q4 Measure Score")),
      sqlNum(num(cmsField(r, "Four Quarter Average Score"))),
      sqlText(cmsField(r, "Footnote for Four Quarter Average Score")),
      sqlText(cmsField(r, "Used in Quality Measure Five Star Rating")),
      sqlText(cmsField(r, "Measure Period") ?? ""),
      sqlText(cmsField(r, "Processing Date")),
    ].join(",")})`];
  });
}

function claimsRows(rows: CmsRow[]): string[] {
  return rows.flatMap((raw) => {
    const r = normalizeCmsRow(raw);
    const ccn = cmsField(r, "CMS Certification Number (CCN)");
    const code = cmsField(r, "Measure Code");
    if (!ccn || !code) return [];
    return [`(${[
      sqlText(ccn),
      sqlText(code),
      sqlText(cmsField(r, "Measure Description")),
      sqlText(cmsField(r, "Resident type")),
      sqlNum(num(cmsField(r, "Adjusted Score"))),
      sqlNum(num(cmsField(r, "Observed Score"))),
      sqlNum(num(cmsField(r, "Expected Score"))),
      sqlText(cmsField(r, "Footnote for the Measure Score", "Footnote for score")),
      sqlText(cmsField(r, "Used in Quality Measure Five Star Rating")),
      sqlText(cmsField(r, "Measure Period") ?? ""),
      sqlText(cmsField(r, "Processing Date")),
    ].join(",")})`];
  });
}

function loader(files: string[], flag: "--local" | "--remote"): string {
  return [
    "#!/bin/bash",
    "set -euo pipefail",
    ...files.map((file) => `echo "Loading ${file}..." && npx wrangler d1 execute nursinghomegrade ${flag} --file=${file}`),
    "echo \"Grade 2.0 Phase A evidence load complete.\"",
    "",
  ].join("\n");
}

export async function main(): Promise<void> {
  console.log("Starting Grade 2.0 Phase A evidence ingest (shadow data only)...");
  const allFiles: string[] = [];

  const provider = await fetchAll(SOURCES.provider.id, SOURCES.provider.label);
  allFiles.push(...writeShards(
    "seed_grade2_staffing",
    "facility_staffing_features",
    ["cms_id","reported_total_nurse_hprd","weekend_total_nurse_hprd","weekend_rn_hprd","rn_turnover_pct","total_nursing_turnover_pct","administrators_left","nursing_case_mix_index","nursing_case_mix_index_ratio","case_mix_rn_hprd","case_mix_total_nurse_hprd","case_mix_weekend_total_nurse_hprd","adjusted_rn_hprd","adjusted_total_nurse_hprd","adjusted_weekend_total_nurse_hprd","processing_date"],
    staffingRows(provider),
  ));

  const survey = await fetchAll(SOURCES.survey.id, SOURCES.survey.label);
  allFiles.push(...writeShards(
    "seed_grade2_survey",
    "facility_survey_summaries",
    ["cms_id","inspection_cycle","health_survey_date","fire_safety_survey_date","total_health_deficiencies","total_fire_safety_deficiencies","infection_control_deficiencies","processing_date"],
    surveyRows(survey),
  ));

  const mds = await fetchAll(SOURCES.mds.id, SOURCES.mds.label);
  allFiles.push(...writeShards(
    "seed_grade2_mds",
    "facility_mds_quality_measures",
    ["cms_id","measure_code","measure_description","resident_type","q1_score","q1_footnote","q2_score","q2_footnote","q3_score","q3_footnote","q4_score","q4_footnote","four_quarter_average_score","four_quarter_footnote","used_in_five_star","measure_period","processing_date"],
    mdsRows(mds),
  ));

  const claims = await fetchAll(SOURCES.claims.id, SOURCES.claims.label);
  allFiles.push(...writeShards(
    "seed_grade2_claims",
    "facility_claims_quality_measures",
    ["cms_id","measure_code","measure_description","resident_type","adjusted_score","observed_score","expected_score","footnote","used_in_five_star","measure_period","processing_date"],
    claimsRows(claims),
  ));

  const metadataRecords: DataReleaseRecord[] = await Promise.all(
    [SOURCES.survey, SOURCES.mds, SOURCES.claims].map(async (source) => ({
      sourceKey: source.key,
      label: source.label,
      metadata: await fetchCmsDatasetMetadata(source.id),
    })),
  );
  const metadataFile = "scripts/seed_grade2_metadata_001.sql";
  writeFileSync(metadataFile, `${buildDataReleaseUpsert(metadataRecords, new Date().toISOString())}\n`);
  allFiles.push(metadataFile);

  writeFileSync("scripts/load-grade2-phase-a-local.sh", loader(allFiles, "--local"));
  writeFileSync("scripts/load-grade2-phase-a-remote.sh", loader(allFiles, "--remote"));

  console.log(`Generated ${allFiles.length} SQL shard(s).`);
  console.log("Apply migrations/012_grade2_phase_a.sql, then run the generated loader.");
  console.log("These tables are shadow evidence only; this script does not change the public Grade 1.x formula.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
