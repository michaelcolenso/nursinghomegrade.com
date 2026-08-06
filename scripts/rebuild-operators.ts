// Rebuild the operators table from existing D1 data and emit a SQL file.
//
// Why: the original ingest derived operators from CMS ownership rows using a
// role-based filter that admitted EVERY Organization — including banks, REITs,
// investment funds, audit/accounting firms, and trusts that CMS lists as
// "additional data providers" (ADP) or interest holders but which do not
// operate nursing homes. This script re-derives operators from the same
// facility_owners + facilities tables, applying:
//   1. Name-based classification (see src/operator-classify.ts)
//   2. A composite operator score (grade/staffing/deficiency)
//   3. A size tier (Mega/Large/Mid/Small)
//
// Flow (matches repo convention ingest → seed.sql → load-remote.sh):
//   1. Dump facility_owners + facilities from remote D1 to /tmp JSON
//   2. Classify + score in memory
//   3. Write scripts/rebuild_operators.sql
//   4. Apply it: npx wrangler d1 execute nursinghomegrade --remote --file=scripts/rebuild_operators.sql
//
// Usage: npm run rebuild-operators
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { classifyOperatorName, computeOperatorScore, operatorTier } from "../src/operator-classify";
import { toOperatorSlug } from "../src/ownership";

interface OwnerRow {
  normalized_name: string;
  cms_id: string;
  owner_type: string | null;
  role: string | null;
}

interface FacilityRow {
  cms_id: string;
  grade_score: number | null;
  rn_hours_per_resident_day: number | null;
  total_deficiencies: number | null;
}

function wranglerQuery(sql: string): unknown[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "nursinghomegrade", "--remote", "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  const parsed = JSON.parse(out) as Array<{ results?: unknown[] }>;
  const rows: unknown[] = [];
  for (const result of parsed) {
    if (result?.results) rows.push(...result.results);
  }
  return rows;
}

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

export function rebuildOperatorsFromData(owners: OwnerRow[], facilities: FacilityRow[]) {
  const facilityByCmsId = new Map<string, FacilityRow>();
  for (const f of facilities) facilityByCmsId.set(f.cms_id, f);

  const operatorMap = new Map<
    string,
    { cmsIds: Set<string>; hasOperationalRole: boolean; isIndividual: boolean }
  >();
  for (const o of owners) {
    const name = o.normalized_name ?? "";
    if (!name) continue;
    const role = (o.role ?? "").toUpperCase();
    const entry = operatorMap.get(name) ?? {
      cmsIds: new Set<string>(),
      hasOperationalRole: false,
      isIndividual: false,
    };
    entry.cmsIds.add(o.cms_id);
    if (role.includes("OPERATIONAL") || role.includes("MANAGERIAL")) entry.hasOperationalRole = true;
    if ((o.owner_type ?? "").toUpperCase() === "INDIVIDUAL") entry.isIndividual = true;
    operatorMap.set(name, entry);
  }

  const kept: Array<{
    normalized_name: string;
    slug: string;
    facility_count: number;
    avg_grade: number;
    avg_staffing: number | null;
    avg_deficiency: number | null;
    operator_score: number;
    operator_tier: string;
  }> = [];
  let dropped = 0;

  for (const [name, entry] of operatorMap) {
    if (entry.cmsIds.size < 2) continue; // Only operators with 2+ facilities

    const cls = classifyOperatorName(name);
    if (cls === "financial") {
      dropped += 1;
      continue;
    }
    if (entry.isIndividual && !entry.hasOperationalRole) {
      dropped += 1;
      continue;
    }

    let gradeSum = 0;
    let gradeCount = 0;
    let staffingSum = 0;
    let staffingCount = 0;
    let defSum = 0;
    let defCount = 0;
    for (const cmsId of entry.cmsIds) {
      const f = facilityByCmsId.get(cmsId);
      if (!f) continue;
      const g = Number(f.grade_score);
      if (Number.isFinite(g)) {
        gradeSum += g;
        gradeCount += 1;
      }
      const rn = f.rn_hours_per_resident_day;
      if (rn !== null && rn !== undefined && Number.isFinite(Number(rn))) {
        staffingSum += Number(rn);
        staffingCount += 1;
      }
      const d = f.total_deficiencies;
      if (d !== null && d !== undefined && Number.isFinite(Number(d))) {
        defSum += Number(d);
        defCount += 1;
      }
    }
    if (gradeCount === 0) {
      dropped += 1;
      continue;
    }
    const avgGrade = Math.round(gradeSum / gradeCount);
    const avgStaffing = staffingCount > 0 ? staffingSum / staffingCount : null;
    const avgDeficiency = defCount > 0 ? defSum / defCount : null;
    const score = computeOperatorScore(avgGrade, avgStaffing, avgDeficiency);
    const tier = operatorTier(entry.cmsIds.size);

    kept.push({
      normalized_name: name,
      slug: toOperatorSlug(name),
      facility_count: entry.cmsIds.size,
      avg_grade: avgGrade,
      avg_staffing: avgStaffing,
      avg_deficiency: avgDeficiency,
      operator_score: score,
      operator_tier: tier,
    });
  }

  const sqlLines = ["DELETE FROM operators;"];
  const BATCH = 100;
  for (let i = 0; i < kept.length; i += BATCH) {
    const batch = kept.slice(i, i + BATCH);
    const values = batch
      .map((op) => {
        const staffing = op.avg_staffing === null ? "NULL" : op.avg_staffing.toFixed(3);
        const def = op.avg_deficiency === null ? "NULL" : op.avg_deficiency.toFixed(2);
        return `('${esc(op.normalized_name)}','${esc(op.slug)}',${op.facility_count},${op.avg_grade},${staffing},${def},NULL,${op.operator_score},'${op.operator_tier}')`;
      })
      .join(",\n");
    sqlLines.push(
      `INSERT INTO operators (normalized_name,slug,facility_count,avg_grade,avg_staffing_score,avg_deficiency_score,avg_penalty_score,operator_score,operator_tier) VALUES\n${values};`,
    );
  }

  return { sql: sqlLines.join("\n\n"), keptCount: kept.length, dropped };
}

function main() {
  console.log("Dumping facility_owners from remote D1...");
  const ownerRows = wranglerQuery(
    "SELECT normalized_name, cms_id, owner_type, role FROM facility_owners",
  ) as OwnerRow[];
  console.log(`  ${ownerRows.length} owner rows`);

  console.log("Dumping facilities from remote D1...");
  const facilityRows = wranglerQuery(
    "SELECT cms_id, grade_score, rn_hours_per_resident_day, total_deficiencies FROM facilities",
  ) as FacilityRow[];
  console.log(`  ${facilityRows.length} facility rows`);

  const { sql, keptCount, dropped } = rebuildOperatorsFromData(ownerRows, facilityRows);
  writeFileSync("scripts/rebuild_operators.sql", sql);
  console.log(`Operators rebuilt: ${keptCount} kept, ${dropped} dropped.`);
  console.log("Wrote scripts/rebuild_operators.sql");
  console.log("Apply with: npx wrangler d1 execute nursinghomegrade --remote --file=scripts/rebuild_operators.sql");
}

main();
