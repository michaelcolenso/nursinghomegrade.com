import type { Facility, FacilityInspectionDetails, Deficiency, Env } from "./types";

export async function getFacilityById(env: Env, cmsId: string): Promise<Facility | null> {
  const result = await env.DB.prepare("SELECT * FROM facilities WHERE cms_id = ?").bind(cmsId).first<Facility>();
  return result ?? null;
}

export async function getFacilityBySlugId(env: Env, slugId: string): Promise<Facility | null> {
  const cmsId = slugId.split("-")[0];
  if (!cmsId) return null;
  return getFacilityById(env, cmsId);
}

export async function getFacilityInspectionDetails(env: Env, cmsId: string): Promise<FacilityInspectionDetails> {
  try {
    const rawRow = await env.DB.prepare("SELECT raw_json FROM facility_rawparse WHERE cms_id = ?")
      .bind(cmsId)
      .first<{ raw_json: string | null }>();

    if (!rawRow?.raw_json) {
      return { complaint_deficiencies_cycle_1: null };
    }

    const parsed = JSON.parse(rawRow.raw_json) as {
      rating_cycle_1_number_of_complaint_health_deficiencies?: unknown;
    };
    const value = parsed.rating_cycle_1_number_of_complaint_health_deficiencies;

    if (typeof value === "number" && Number.isFinite(value)) {
      return { complaint_deficiencies_cycle_1: value };
    }

    if (typeof value === "string") {
      const parsedInt = Number.parseInt(value, 10);
      return { complaint_deficiencies_cycle_1: Number.isNaN(parsedInt) ? null : parsedInt };
    }

    return { complaint_deficiencies_cycle_1: null };
  } catch {
    return { complaint_deficiencies_cycle_1: null };
  }
}

export async function searchByZipExact(env: Env, zip: string, limit = 25): Promise<Facility[]> {
  const results = await env.DB.prepare("SELECT * FROM facilities WHERE zip = ? ORDER BY grade_score DESC LIMIT ?")
    .bind(zip, limit)
    .all<Facility>();
  return results.results ?? [];
}

export async function searchNearby(env: Env, state: string, limit = 200): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE state = ? AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY grade_score DESC LIMIT ?",
  )
    .bind(state, limit)
    .all<Facility>();
  return results.results ?? [];
}

export async function getStatesWithCounts(env: Env): Promise<Array<{ state: string; count: number }>> {
  const results = await env.DB.prepare(
    "SELECT state, COUNT(*) as count FROM facilities GROUP BY state ORDER BY count DESC",
  ).all<{ state: string; count: number }>();
  return results.results ?? [];
}

export async function getStatePctFailing(env: Env, state: string): Promise<number> {
  const result = await env.DB.prepare(
    `SELECT ROUND(100.0 * SUM(CASE WHEN rn_hours_per_resident_day < 0.55 THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
         FROM facilities WHERE state = ?`,
  )
    .bind(state)
    .first<{ pct: number }>();
  return result?.pct ?? 0;
}

export async function getNationalPctFailing(env: Env): Promise<number> {
  const result = await env.DB.prepare(
    `SELECT ROUND(100.0 * SUM(CASE WHEN rn_hours_per_resident_day < 0.55 THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
         FROM facilities`,
  ).first<{ pct: number }>();
  return result?.pct ?? 0;
}

export async function getFacilityDeficiencies(env: Env, cmsId: string): Promise<Deficiency[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM facility_deficiencies WHERE cms_id = ? ORDER BY inspection_cycle ASC, deficiency_category ASC`
  ).bind(cmsId).all<Deficiency>();
  return results.results ?? [];
}

export async function getFacilitiesByState(env: Env, state: string, limit = 200): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE state = ? ORDER BY grade_score DESC LIMIT ?"
  )
    .bind(state, limit)
    .all<Facility>();
  return results.results ?? [];
}

export async function getStateGradeDistribution(
  env: Env,
  state: string,
): Promise<Record<string, number>> {
  const results = await env.DB.prepare(
    "SELECT grade_letter, COUNT(*) as count FROM facilities WHERE state = ? GROUP BY grade_letter"
  )
    .bind(state)
    .all<{ grade_letter: string; count: number }>();

  const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const row of results.results ?? []) {
    distribution[row.grade_letter] = row.count;
  }
  return distribution;
}

export async function getStateCityList(
  env: Env,
  state: string,
): Promise<Array<{ city: string; count: number }>> {
  const results = await env.DB.prepare(
    "SELECT city, COUNT(*) as count FROM facilities WHERE state = ? GROUP BY city ORDER BY count DESC, city ASC"
  )
    .bind(state)
    .all<{ city: string; count: number }>();
  return results.results ?? [];
}
