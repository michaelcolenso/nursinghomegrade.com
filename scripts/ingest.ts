import type { CMSFacility, Facility } from "../src/types";
import { computeGrade, scoreToSummary, toSlug, type PenaltyDeficiency } from "../src/scoring";
import { normalizeOwnerName, toOperatorSlug } from "../src/ownership";
import { SITE_STATS_REFRESH_SQL, STATE_STATS_CLEANUP_SQL, STATE_STATS_REFRESH_SQL } from "./stats-sql";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const PROVIDER_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0";
const DEFICIENCY_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0";
const OWNERSHIP_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/y2hd-n93e/0";
const PENALTIES_API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/g6vv-u9sr/0";
const PAGE_SIZE = 500;

function parseNum(val: string): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/** Empty string means "CMS publishes nothing here", which is null, not "". */
function textOrNull(val: string | undefined): string | null {
  if (val === undefined || val === null) return null;
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * SQL literal for a nullable text column. A missing value becomes the SQL
 * keyword NULL, never the two-character string '' — the difference is what
 * lets the page distinguish "CMS publishes nothing" from "blank value".
 */
function sqlText(val: string | null | undefined): string {
  return val === null || val === undefined ? "NULL" : `'${esc(val)}'`;
}

function parseIntOrNull(val: string): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

/**
 * `deficiencies` carries the facility's rows from the CMS Health Deficiencies
 * file. They are required for the harm and uncorrected penalties — without them
 * this returns the base-formula grade only, which would silently undo the
 * penalty terms on the next monthly ingest.
 */
export function mapCMSFacility(
  raw: CMSFacility,
  deficiencies: PenaltyDeficiency[] = [],
): Facility {
  const rnHours = parseNum(raw.reported_rn_staffing_hours_per_resident_per_day);
  const cycle1Deficiencies = parseIntOrNull(raw.rating_cycle_1_total_number_of_health_deficiencies);
  const qualityRating = parseIntOrNull(raw.qm_rating);
  const staffingRating = parseIntOrNull(raw.staffing_rating);
  const surveyDate = textOrNull(raw.rating_cycle_1_standard_survey_health_date);

  const graded = computeGrade(
    {
      rnHoursPerResidentDay: rnHours,
      totalDeficiencies: cycle1Deficiencies,
      qualityRating,
      staffingRating,
      inspectionEvidenceAvailable: cycle1Deficiencies !== null && surveyDate !== null,
    },
    deficiencies,
  );
  const safeScore = graded.score ?? -1;
  const grade_letter = graded.letter ?? "NR";
  const grade_summary = scoreToSummary(
    graded.score,
    graded.letter,
    rnHours,
    graded.completeness,
    graded.missingInputs,
  );

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
    total_deficiencies: cycle1Deficiencies,
    grade_score: safeScore,
    grade_letter,
    grade_summary,
    grade_completeness: graded.completeness,
    grade_missing_inputs: graded.missingInputs.length > 0 ? graded.missingInputs.join(",") : null,
    slug: toSlug(raw.provider_name ?? raw.cms_certification_number_ccn ?? "unknown"),
    updated_at: new Date().toISOString(),
    // Profile fields, copied verbatim from CMS. `textOrNull` maps an empty
    // string to null so a facility with no published value renders nothing
    // rather than an empty label.
    phone: textOrNull(raw.telephone_number),
    ownership_type: textOrNull(raw.ownership_type),
    legal_business_name: textOrNull(raw.legal_business_name),
    provider_type: textOrNull(raw.provider_type),
    county: textOrNull(raw.countyparish),
    certified_beds: parseIntOrNull(raw.number_of_certified_beds ?? ""),
    avg_residents_per_day: parseNum(raw.average_number_of_residents_per_day ?? ""),
    certification_date: textOrNull(raw.date_first_approved_to_provide_medicare_and_medicaid_services),
    special_focus_status: textOrNull(raw.special_focus_status),
    abuse_icon: textOrNull(raw.abuse_icon),
    number_of_fines: parseIntOrNull(raw.number_of_fines ?? ""),
    total_fines_dollars: parseNum(raw.total_amount_of_fines_in_dollars ?? ""),
    number_of_payment_denials: parseIntOrNull(raw.number_of_payment_denials ?? ""),
    total_penalties: parseIntOrNull(raw.total_number_of_penalties ?? ""),
    latest_standard_survey_date: surveyDate,
    rn_turnover_pct: parseNum(raw.registered_nurse_turnover ?? ""),
    total_nursing_turnover_pct: parseNum(raw.total_nursing_staff_turnover ?? ""),
    cms_processing_date: textOrNull(raw.processing_date),
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

interface CMSPenalty {
  cms_certification_number_ccn: string;
  penalty_date: string;
  penalty_type: string;
  fine_amount: string;
  payment_denial_start_date: string;
  payment_denial_length_in_days: string;
  processing_date: string;
}

async function fetchPenaltyPage(offset: number): Promise<CMSPenalty[]> {
  const url = `${PENALTIES_API_URL}?limit=${PAGE_SIZE}&offset=${offset}&sort_order=ASC&sort_by=cms_certification_number_ccn`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CMS Penalties API error: ${res.status} at offset ${offset}`);
  const json = (await res.json()) as { results: CMSPenalty[] };
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

  // Fetch all penalties (fines and payment denials)
  console.log("Fetching penalties...");
  // The seed this feeds begins with DELETE FROM facility_penalties. If the
  // endpoint transiently answers 200 with an empty result set, accepting it as
  // "no penalties exist" would generate a seed that wipes every enforcement
  // action and replaces it with nothing. Treat an empty first page as a failed
  // fetch and abort, the same way the provider fetch does.
  const firstPenaltyPage = await fetchPenaltyPage(0);
  if (firstPenaltyPage.length === 0) throw new Error("CMS Penalties API returned no results");

  const allPenalties: CMSPenalty[] = [...firstPenaltyPage];
  let penOffset = PAGE_SIZE;
  if (firstPenaltyPage.length === PAGE_SIZE) {
    while (true) {
      const page = await fetchPenaltyPage(penOffset);
      if (page.length === 0) break;
      allPenalties.push(...page);
      penOffset += PAGE_SIZE;
      if (page.length < PAGE_SIZE) break;
    }
  }
  console.log(`Total penalty records: ${allPenalties.length}`);

  // Group deficiencies by CMS ID
  const deficienciesByCmsId = new Map<string, CMSDeficiency[]>();
  for (const def of allDeficiencies) {
    const list = deficienciesByCmsId.get(def.cms_certification_number_ccn) ?? [];
    list.push(def);
    deficienciesByCmsId.set(def.cms_certification_number_ccn, list);
  }

  // Map + score facilities
  // Deficiencies are grouped above, so the grade computed here already carries
  // the harm and uncorrected penalties. facilityByCmsId feeds the operator
  // aggregates below, so those pick up the penalized scores too.
  const mapped = allFacilities.map((raw) =>
    mapCMSFacility(
      raw,
      (deficienciesByCmsId.get(raw.cms_certification_number_ccn) ?? []).map((d) => ({
        scope_severity_code: d.scope_severity_code || null,
        deficiency_corrected: d.deficiency_corrected || null,
        inspection_cycle: parseIntOrNull(d.inspection_cycle),
      })),
    ),
  );
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
          `('${esc(f.cms_id)}','${esc(f.name)}','${esc(f.address)}','${esc(f.city)}','${esc(f.state)}','${esc(f.zip)}',${f.latitude ?? "NULL"},${f.longitude ?? "NULL"},${f.overall_rating ?? "NULL"},${f.quality_rating ?? "NULL"},${f.staffing_rating ?? "NULL"},${f.inspection_rating ?? "NULL"},${f.rn_hours_per_resident_day ?? "NULL"},${f.total_deficiencies ?? "NULL"},${f.grade_score},'${esc(f.grade_letter)}','${esc(f.grade_summary)}','${esc(f.grade_completeness ?? "complete")}',${sqlText(f.grade_missing_inputs)},'${esc(f.slug)}','${esc(f.updated_at)}',${sqlText(f.phone)},${sqlText(f.ownership_type)},${sqlText(f.legal_business_name)},${sqlText(f.provider_type)},${sqlText(f.county)},${f.certified_beds ?? "NULL"},${f.avg_residents_per_day ?? "NULL"},${sqlText(f.certification_date)},${sqlText(f.special_focus_status)},${sqlText(f.abuse_icon)},${f.number_of_fines ?? "NULL"},${f.total_fines_dollars ?? "NULL"},${f.number_of_payment_denials ?? "NULL"},${f.total_penalties ?? "NULL"},${sqlText(f.latest_standard_survey_date)},${f.rn_turnover_pct ?? "NULL"},${f.total_nursing_turnover_pct ?? "NULL"},${sqlText(f.cms_processing_date)})`,
      )
      .join(",\n");
    facilitySqls.push(
      `INSERT OR REPLACE INTO facilities (cms_id,name,address,city,state,zip,latitude,longitude,overall_rating,quality_rating,staffing_rating,inspection_rating,rn_hours_per_resident_day,total_deficiencies,grade_score,grade_letter,grade_summary,grade_completeness,grade_missing_inputs,slug,updated_at,phone,ownership_type,legal_business_name,provider_type,county,certified_beds,avg_residents_per_day,certification_date,special_focus_status,abuse_icon,number_of_fines,total_fines_dollars,number_of_payment_denials,total_penalties,latest_standard_survey_date,rn_turnover_pct,total_nursing_turnover_pct,cms_processing_date) VALUES\n${values};`,
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
        return `('${esc(f.cms_id)}',date('now'),${f.overall_rating ?? "NULL"},${f.quality_rating ?? "NULL"},${f.staffing_rating ?? "NULL"},${f.inspection_rating ?? "NULL"},${f.rn_hours_per_resident_day ?? "NULL"},${f.total_deficiencies ?? "NULL"},${f.grade_score},'${esc(f.grade_letter)}','${esc(f.grade_completeness ?? "complete")}',${sqlText(f.grade_missing_inputs)},${nurseHours ?? "NULL"},${f.total_deficiencies ?? "NULL"})`;
      })
      .join(",\n");
    snapshotSqls.push(
      `INSERT OR IGNORE INTO facility_snapshots (cms_id,snapshot_date,overall_rating,quality_rating,staffing_rating,inspection_rating,rn_hours_per_resident_day,total_deficiencies,grade_score,grade_letter,grade_completeness,grade_missing_inputs,nurse_hours_per_resident_day,deficiency_count) VALUES\n${values};`,
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
        if (facility.grade_letter !== "NR" && facility.grade_score >= 0) facilityGrades.push(facility.grade_score);
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
  // Record when each CMS file was pulled. cms_release_date is deliberately not
  // written here: CMS does not expose a release date on these endpoints, and
  // inventing one would defeat the purpose of the table. It stays NULL until a
  // real release date is available.
  const releaseSql = `INSERT INTO data_releases (source_key,label,cms_release_date,ingested_at,source_url) VALUES
  ('provider_info','Provider Information',NULL,datetime('now'),'${PROVIDER_API_URL}'),
  ('health_deficiencies','Health Deficiencies',NULL,datetime('now'),'${DEFICIENCY_API_URL}'),
  ('ownership','Ownership',NULL,datetime('now'),'${OWNERSHIP_API_URL}'),
  ('penalties','Penalties',NULL,datetime('now'),'${PENALTIES_API_URL}')
  ON CONFLICT(source_key) DO UPDATE SET ingested_at=excluded.ingested_at, source_url=excluded.source_url;`;

  // Penalty INSERTs. The DELETE runs in the same file so the table never holds
  // a mix of two CMS releases — a stale fine row would show a family an
  // enforcement action CMS has since dropped from the file.
  const penaltySqls: string[] = ["DELETE FROM facility_penalties;"];
  const PENALTY_BATCH = 100;
  for (let i = 0; i < allPenalties.length; i += PENALTY_BATCH) {
    const batch = allPenalties.slice(i, i + PENALTY_BATCH);
    const values = batch
      .map(
        (p) =>
          `('${esc(p.cms_certification_number_ccn)}',${sqlText(textOrNull(p.penalty_date))},${sqlText(textOrNull(p.penalty_type))},${parseNum(p.fine_amount ?? "") ?? "NULL"},${sqlText(textOrNull(p.payment_denial_start_date))},${parseIntOrNull(p.payment_denial_length_in_days ?? "") ?? "NULL"},${sqlText(textOrNull(p.processing_date))})`,
      )
      .join(",\n");
    penaltySqls.push(
      `INSERT INTO facility_penalties (cms_id,penalty_date,penalty_type,fine_amount,payment_denial_start_date,payment_denial_length_days,processing_date) VALUES\n${values};`,
    );
  }

  const seedSql = [
    "DELETE FROM facility_owners;",
    ...facilitySqls,
    ...snapshotSqls,
    ...ownerSqls,
    ...operatorSqls,
    ...penaltySqls,
    SITE_STATS_REFRESH_SQL,
    STATE_STATS_CLEANUP_SQL,
    STATE_STATS_REFRESH_SQL,
    releaseSql,
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

  // Deficiencies load BEFORE seed.sql. Grades now carry harm and uncorrected
  // penalties derived from these rows, and the first deficiency file starts with
  // DELETE FROM facility_deficiencies. Publishing grades first would leave a
  // window — the whole load, or indefinitely if a command fails — where a
  // facility's score reflects citations its own page cannot display. Loading
  // detail first means the worst case is grades that lag their citations, which
  // understates rather than fabricates.
  // scripts/seed.sql is gitignored, so a fresh checkout has the 400+ deficiency
  // batches but not the facility seed. Without this guard the loader would
  // delete and reload every citation and only then fail on the missing file,
  // leaving D1 with new citations scored by stale grades and no profile or
  // penalty data. Fail before the first destructive statement instead.
  const loadHeader = `#!/bin/bash\nset -e\nif [ ! -s scripts/seed.sql ]; then\n  echo "scripts/seed.sql is missing or empty — run 'npm run ingest' first." >&2\n  echo "Refusing to reload deficiencies without the matching facility seed." >&2\n  exit 1\nfi\necho "Loading deficiencies first — grades depend on them..."\n`;
  const loadFooter = (flag: string) =>
    `echo "Loading facilities and grades..."\nnpx wrangler d1 execute nursinghomegrade ${flag} --file=scripts/seed.sql\necho "Done!"\n`;
  writeFileSync("scripts/load-local.sh", `${loadHeader}${loadLocal}\n${loadFooter("--local")}`);
  writeFileSync("scripts/load-remote.sh", `${loadHeader}${loadRemote}\n${loadFooter("--remote")}`);

  console.log(`\nGenerated ${defFiles.length} deficiency files`);
  console.log("Run locally:  bash scripts/load-local.sh");
  console.log("Run remote:   bash scripts/load-remote.sh");
}

function esc(s: string): string {
  return String(s ?? "").replace(/'/g, "''");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
