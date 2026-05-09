import type { CMSFacility, Facility } from "../src/types";
import { computeGradeScore, scoreToGrade, scoreToSummary, toSlug } from "../src/scoring";

const PROVIDER_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0";
const DEFICIENCY_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0";
const PAGE_SIZE = 500;

function parseNum(val: string): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseIntOrNull(val: string): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

export function mapCMSFacility(raw: CMSFacility): Facility {
  const rnHours = parseNum(raw.reported_rn_staffing_hours_per_resident_per_day);
  const deficiencies = parseIntOrNull(raw.rating_cycle_1_total_number_of_health_deficiencies);
  const qualityRating = parseIntOrNull(raw.qm_rating);
  const staffingRating = parseIntOrNull(raw.staffing_rating);

  const grade_score = computeGradeScore({
    rnHoursPerResidentDay: rnHours ?? 0,
    totalDeficiencies: deficiencies ?? 0,
    qualityRating: qualityRating ?? 1,
    staffingRating: staffingRating ?? 1,
  });
  const safeScore = Number.isFinite(grade_score) ? grade_score : 0;
  const grade_letter = scoreToGrade(safeScore);
  const grade_summary = scoreToSummary(safeScore, grade_letter, rnHours);

  return {
    cms_id: raw.cms_certification_number_ccn,
    name: raw.provider_name,
    address: raw.provider_address,
    city: raw.citytown,
    state: raw.state,
    zip: raw.zip_code,
    latitude: parseNum(raw.latitude),
    longitude: parseNum(raw.longitude),
    overall_rating: parseIntOrNull(raw.overall_rating),
    quality_rating: qualityRating,
    staffing_rating: staffingRating,
    inspection_rating: parseIntOrNull(raw.health_inspection_rating),
    rn_hours_per_resident_day: rnHours,
    total_deficiencies: deficiencies,
    grade_score: safeScore,
    grade_letter,
    grade_summary,
    slug: toSlug(raw.provider_name ?? raw.cms_certification_number_ccn ?? "unknown"),
    updated_at: new Date().toISOString(),
  };
}

export function buildFacilitySlugId(cmsId: string, slug: string): string {
  return `${cmsId}-${slug}`;
}

async function fetchProviderPage(offset: number): Promise<CMSFacility[]> {
  const url = `${PROVIDER_API_URL}?limit=${PAGE_SIZE}&offset=${offset}&sort_order=ASC&sort_by=cms_certification_number_ccn`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CMS Provider API error: ${res.status} at offset ${offset}`);
  const json = (await res.json()) as { results: CMSFacility[] };
  return json.results ?? [];
}

interface CMSDeficiency {
  cms_certification_number_ccn: string;
  survey_date: string;
  deficiency_category: string;
  deficiency_tag_number: string;
  deficiency_description: string;
  scope_severity_code: string;
  deficiency_corrected: string;
  correction_date: string;
  inspection_cycle: string;
  standard_deficiency: string;
  complaint_deficiency: string;
}

async function fetchDeficiencyPage(offset: number): Promise<CMSDeficiency[]> {
  const url = `${DEFICIENCY_API_URL}?limit=${PAGE_SIZE}&offset=${offset}&sort_order=ASC&sort_by=cms_certification_number_ccn`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CMS Deficiency API error: ${res.status} at offset ${offset}`);
  const json = (await res.json()) as { results: CMSDeficiency[] };
  return json.results ?? [];
}

async function main() {
  console.log("Starting CMS ingest...");

  // Fetch all facilities
  const firstProviderPage = await fetchProviderPage(0);
  if (firstProviderPage.length === 0) throw new Error("CMS Provider API returned no results");

  const allFacilities: CMSFacility[] = [...firstProviderPage];
  let offset = PAGE_SIZE;
  while (true) {
    const page = await fetchProviderPage(offset);
    if (page.length === 0) break;
    allFacilities.push(...page);
    console.log(`Fetched ${allFacilities.length} facilities...`);
    offset += PAGE_SIZE;
    if (page.length < PAGE_SIZE) break;
  }
  console.log(`Total facilities: ${allFacilities.length}`);

  // Fetch all deficiencies
  console.log("Fetching health deficiencies...");
  const allDeficiencies: CMSDeficiency[] = [];
  let defOffset = 0;
  while (true) {
    const page = await fetchDeficiencyPage(defOffset);
    if (page.length === 0) break;
    allDeficiencies.push(...page);
    if (defOffset % 5000 === 0) {
      console.log(`Fetched ${allDeficiencies.length} deficiencies...`);
    }
    defOffset += PAGE_SIZE;
    if (page.length < PAGE_SIZE) break;
  }
  console.log(`Total deficiencies: ${allDeficiencies.length}`);

  // Group deficiencies by CMS ID
  const deficienciesByCmsId = new Map<string, CMSDeficiency[]>();
  for (const def of allDeficiencies) {
    const list = deficienciesByCmsId.get(def.cms_certification_number_ccn) ?? [];
    list.push(def);
    deficienciesByCmsId.set(def.cms_certification_number_ccn, list);
  }

  // Map + score facilities
  const mapped = allFacilities.map(mapCMSFacility);

  const { writeFileSync } = await import("fs");

  // Build facility INSERT statements
  const FACILITY_BATCH = 100;
  const facilitySqls: string[] = [];
  for (let i = 0; i < mapped.length; i += FACILITY_BATCH) {
    const batch = mapped.slice(i, i + FACILITY_BATCH);
    const values = batch
      .map(
        (f) =>
          `('${esc(f.cms_id)}','${esc(f.name)}','${esc(f.address)}','${esc(f.city)}','${esc(f.state)}','${esc(f.zip)}',${f.latitude ?? "NULL"},${f.longitude ?? "NULL"},${f.overall_rating ?? "NULL"},${f.quality_rating ?? "NULL"},${f.staffing_rating ?? "NULL"},${f.inspection_rating ?? "NULL"},${f.rn_hours_per_resident_day ?? "NULL"},${f.total_deficiencies ?? "NULL"},${f.grade_score},'${esc(f.grade_letter)}','${esc(f.grade_summary)}','${esc(f.slug)}','${esc(f.updated_at)}')`,
      )
      .join(",\n");
    facilitySqls.push(
      `INSERT OR REPLACE INTO facilities (cms_id,name,address,city,state,zip,latitude,longitude,overall_rating,quality_rating,staffing_rating,inspection_rating,rn_hours_per_resident_day,total_deficiencies,grade_score,grade_letter,grade_summary,slug,updated_at) VALUES\n${values};`,
    );
  }

  // Write facilities seed
  writeFileSync("scripts/seed.sql", facilitySqls.join("\n\n"));
  console.log(`Wrote scripts/seed.sql (${mapped.length} facilities)`);

  // Build deficiency INSERT statements in small batches and split into files
  // Cloudflare D1 has ~1MB file limit, so we target ~500KB per file
  const DEF_BATCH = 50; // rows per INSERT
  const INSERTS_PER_FILE = 20; // ~1,000 rows per file, ~200-300KB each

  const defValues: string[] = [];
  for (const [cmsId, defs] of deficienciesByCmsId) {
    for (const d of defs) {
      defValues.push(
        `('${esc(cmsId)}','${esc(d.survey_date)}','${esc(d.deficiency_category)}','${esc(d.deficiency_tag_number)}','${esc(d.deficiency_description)}','${esc(d.scope_severity_code)}','${esc(d.deficiency_corrected)}','${esc(d.correction_date)}',${parseIntOrNull(d.inspection_cycle) ?? "NULL"},'${esc(d.standard_deficiency)}','${esc(d.complaint_deficiency)}')`,
      );
    }
  }

  // First file: DELETE + first batch of INSERTs
  let fileIndex = 1;
  const defFiles: string[] = [];
  let currentFileSqls: string[] = ["DELETE FROM facility_deficiencies;"];
  let currentInserts = 0;

  for (let i = 0; i < defValues.length; i += DEF_BATCH) {
    const batch = defValues.slice(i, i + DEF_BATCH);
    const values = batch.join(",\n");
    currentFileSqls.push(
      `INSERT INTO facility_deficiencies (cms_id,survey_date,deficiency_category,deficiency_tag_number,deficiency_description,scope_severity_code,deficiency_corrected,correction_date,inspection_cycle,standard_deficiency,complaint_deficiency) VALUES\n${values};`,
    );
    currentInserts++;

    if (currentInserts >= INSERTS_PER_FILE) {
      const fileName = `scripts/seed_deficiencies_${String(fileIndex).padStart(3, "0")}.sql`;
      writeFileSync(fileName, currentFileSqls.join("\n\n"));
      defFiles.push(fileName);
      console.log(`Wrote ${fileName} (${currentInserts} inserts, ~${batch.length * currentInserts} rows)`);
      fileIndex++;
      currentFileSqls = [];
      currentInserts = 0;
    }
  }

  // Write remaining
  if (currentFileSqls.length > 0) {
    const fileName = `scripts/seed_deficiencies_${String(fileIndex).padStart(3, "0")}.sql`;
    writeFileSync(fileName, currentFileSqls.join("\n\n"));
    defFiles.push(fileName);
    console.log(`Wrote ${fileName} (${currentInserts} inserts)`);
  }

  // Generate loader scripts
  const loadLocal = defFiles.map((f) => `echo "Loading ${f}..." && npx wrangler d1 execute nursinghomegrade --local --file=${f}`).join("\n");
  const loadRemote = defFiles.map((f) => `echo "Loading ${f}..." && npx wrangler d1 execute nursinghomegrade --remote --file=${f}`).join("\n");

  writeFileSync("scripts/load-local.sh", `#!/bin/bash\nset -e\necho "Loading facilities..."\nnpx wrangler d1 execute nursinghomegrade --local --file=scripts/seed.sql\n${loadLocal}\necho "Done!"\n`);
  writeFileSync("scripts/load-remote.sh", `#!/bin/bash\nset -e\necho "Loading facilities..."\nnpx wrangler d1 execute nursinghomegrade --remote --file=scripts/seed.sql\n${loadRemote}\necho "Done!"\n`);

  console.log(`\nGenerated ${defFiles.length} deficiency files`);
  console.log("Run locally:  bash scripts/load-local.sh");
  console.log("Run remote:   bash scripts/load-remote.sh");
}

function esc(s: string): string {
  return String(s ?? "").replace(/'/g, "''");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
