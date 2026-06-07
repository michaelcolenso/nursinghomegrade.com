import type { CMSFacility, Facility } from "../src/types";
import { computeGradeScore, scoreToGrade, scoreToSummary, toSlug } from "../src/scoring";
import { normalizeOwnerName, toOperatorSlug } from "../src/ownership";

const PROVIDER_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0";
const DEFICIENCY_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0";
const OWNERSHIP_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/y2hd-n93e/0";
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

interface CMSOwnership {
  cms_certification_number_ccn: string;
  owner_name: string;
  owner_type: string;
  role_played_by_owner_or_manager_in_facility: string;
  ownership_percentage: string;
  association_date: string;
  processing_date: string;
}

async function fetchOwnershipPage(offset: number): Promise<CMSOwnership[]> {
  const url = `${OWNERSHIP_API_URL}?limit=${PAGE_SIZE}&offset=${offset}&sort_order=ASC&sort_by=cms_certification_number_ccn`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CMS Ownership API error: ${res.status} at offset ${offset}`);
  const json = (await res.json()) as { results: CMSOwnership[] };
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

  // Fetch all ownership records
  console.log("Fetching ownership data...");
  const allOwnership: CMSOwnership[] = [];
  let ownOffset = 0;
  while (true) {
    const page = await fetchOwnershipPage(ownOffset);
    if (page.length === 0) break;
    allOwnership.push(...page);
    if (ownOffset % 5000 === 0) {
      console.log(`Fetched ${allOwnership.length} ownership records...`);
    }
    ownOffset += PAGE_SIZE;
    if (page.length < PAGE_SIZE) break;
  }
  console.log(`Total ownership records: ${allOwnership.length}`);

  // Group deficiencies by CMS ID
  const deficienciesByCmsId = new Map<string, CMSDeficiency[]>();
  for (const def of allDeficiencies) {
    const list = deficienciesByCmsId.get(def.cms_certification_number_ccn) ?? [];
    list.push(def);
    deficienciesByCmsId.set(def.cms_certification_number_ccn, list);
  }

  // Map + score facilities
  const mapped = allFacilities.map(mapCMSFacility);
  const facilityByCmsId = new Map(mapped.map((f) => [f.cms_id, f]));

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

  // Build snapshot INSERT statements with enhanced columns
  const snapshotSqls: string[] = [];
  for (let i = 0; i < mapped.length; i += FACILITY_BATCH) {
    const batch = mapped.slice(i, i + FACILITY_BATCH);
    const values = batch
      .map((f) => {
        const raw = allFacilities.find((r) => r.cms_certification_number_ccn === f.cms_id);
        const nurseHours = raw ? parseNum(raw.reported_total_nurse_staffing_hours_per_resident_per_day) : null;
        return `('${esc(f.cms_id)}',date('now'),${f.overall_rating ?? "NULL"},${f.quality_rating ?? "NULL"},${f.staffing_rating ?? "NULL"},${f.inspection_rating ?? "NULL"},${f.rn_hours_per_resident_day ?? "NULL"},${f.total_deficiencies ?? "NULL"},${f.grade_score},'${esc(f.grade_letter)}',${nurseHours ?? "NULL"},${f.total_deficiencies ?? "NULL"})`;
      })
      .join(",\n");
    snapshotSqls.push(
      `INSERT OR IGNORE INTO facility_snapshots (cms_id,snapshot_date,overall_rating,quality_rating,staffing_rating,inspection_rating,rn_hours_per_resident_day,total_deficiencies,grade_score,grade_letter,nurse_hours_per_resident_day,deficiency_count) VALUES\n${values};`,
    );
  }

  // Build ownership INSERT statements
  // Filter to Organization owners or Operational/Managerial Control roles
  const relevantOwners = allOwnership.filter((o) => {
    const role = (o.role_played_by_owner_or_manager_in_facility ?? "").toUpperCase();
    return o.owner_type === "Organization" || role.includes("OPERATIONAL") || role.includes("MANAGERIAL");
  });

  const ownerSqls: string[] = [];
  const OWNER_BATCH = 100;
  for (let i = 0; i < relevantOwners.length; i += OWNER_BATCH) {
    const batch = relevantOwners.slice(i, i + OWNER_BATCH);
    const values = batch
      .map(
        (o) =>
          `('${esc(o.cms_certification_number_ccn)}','${esc(o.owner_name)}','${esc(normalizeOwnerName(o.owner_name))}','${esc(o.owner_type)}','${esc(o.role_played_by_owner_or_manager_in_facility)}','${esc(o.ownership_percentage)}','${esc(o.association_date)}','${esc(o.processing_date)}')`,
      )
      .join(",\n");
    ownerSqls.push(
      `INSERT INTO facility_owners (cms_id,raw_name,normalized_name,owner_type,role,ownership_percentage,association_date,processing_date) VALUES\n${values};`,
    );
  }

  // Derive operators from ownership data
  const operatorMap = new Map<string, { normalized_name: string; slug: string; cmsIds: Set<string> }>();
  for (const o of relevantOwners) {
    const normalized = normalizeOwnerName(o.owner_name);
    if (!normalized) continue;
    const existing = operatorMap.get(normalized);
    if (existing) {
      existing.cmsIds.add(o.cms_certification_number_ccn);
    } else {
      operatorMap.set(normalized, {
        normalized_name: normalized,
        slug: toOperatorSlug(normalized),
        cmsIds: new Set([o.cms_certification_number_ccn]),
      });
    }
  }

  // Build operator INSERT statements
  const operatorValues: string[] = [];
  for (const op of operatorMap.values()) {
    if (op.cmsIds.size < 2) continue; // Only operators with 2+ facilities
    const facilityGrades = [];
    const staffingScores = [];
    const deficiencyScores = [];
    for (const cmsId of op.cmsIds) {
      const facility = facilityByCmsId.get(cmsId);
      if (facility) {
        facilityGrades.push(facility.grade_score);
        if (facility.rn_hours_per_resident_day !== null) staffingScores.push(facility.rn_hours_per_resident_day);
        if (facility.total_deficiencies !== null) deficiencyScores.push(facility.total_deficiencies);
      }
    }
    const avgGrade = facilityGrades.length > 0
      ? Math.round(facilityGrades.reduce((a, b) => a + b, 0) / facilityGrades.length)
      : "NULL";
    const avgStaffing = staffingScores.length > 0
      ? (staffingScores.reduce((a, b) => a + b, 0) / staffingScores.length).toFixed(2)
      : "NULL";
    const avgDeficiency = deficiencyScores.length > 0
      ? (deficiencyScores.reduce((a, b) => a + b, 0) / deficiencyScores.length).toFixed(1)
      : "NULL";

    operatorValues.push(
      `('${esc(op.normalized_name)}','${esc(op.slug)}',${op.cmsIds.size},${avgGrade},${avgStaffing},${avgDeficiency},NULL)`
    );
  }

  const operatorSqls: string[] = [];
  if (operatorValues.length > 0) {
    for (let i = 0; i < operatorValues.length; i += FACILITY_BATCH) {
      const batch = operatorValues.slice(i, i + FACILITY_BATCH);
      operatorSqls.push(
        `INSERT OR REPLACE INTO operators (normalized_name,slug,facility_count,avg_grade,avg_staffing_score,avg_deficiency_score,avg_penalty_score) VALUES\n${batch.join(",\n")};`
      );
    }
  }

  // Write seed file with facilities, snapshots, and operators
  const seedSql = [
    "DELETE FROM facility_owners;",
    ...facilitySqls,
    ...snapshotSqls,
    ...ownerSqls,
    ...operatorSqls,
  ].join("\n\n");
  writeFileSync("scripts/seed.sql", seedSql);
  console.log(`Wrote scripts/seed.sql (${mapped.length} facilities + snapshots + ownership)`);

  // Build deficiency INSERT statements in small batches and split into files
  const DEF_BATCH = 50;
  const INSERTS_PER_FILE = 20;

  const defValues: string[] = [];
  for (const [cmsId, defs] of deficienciesByCmsId) {
    for (const d of defs) {
      defValues.push(
        `('${esc(cmsId)}','${esc(d.survey_date)}','${esc(d.deficiency_category)}','${esc(d.deficiency_tag_number)}','${esc(d.deficiency_description)}','${esc(d.scope_severity_code)}','${esc(d.deficiency_corrected)}','${esc(d.correction_date)}',${parseIntOrNull(d.inspection_cycle) ?? "NULL"},'${esc(d.standard_deficiency)}','${esc(d.complaint_deficiency)}')`,
      );
    }
  }

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
