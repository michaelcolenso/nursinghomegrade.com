import type { Facility, FacilityInspectionDetails, Deficiency, Env } from "./types";
import { cityDisplayName, citySlug } from "./states";

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

export async function getFacilitiesByBounds(
  env: Env,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLatLng: number },
  limit = 500,
): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE latitude > ? AND latitude < ? AND longitude > ? AND longitude < ? LIMIT ?",
  )
    .bind(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLatLng, limit)
    .all<Facility>();
  return results.results ?? [];
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

export async function getTopRatedFacilities(env: Env, limit = 8): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE grade_letter IN ('A', 'B') AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY grade_score DESC LIMIT ?",
  )
    .bind(limit)
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
  try {
    const results = await env.DB.prepare(
      `SELECT * FROM facility_deficiencies WHERE cms_id = ? ORDER BY inspection_cycle ASC, deficiency_category ASC`
    ).bind(cmsId).all<Deficiency>();
    return results.results ?? [];
  } catch {
    return [];
  }
}

export async function getFacilitiesByState(env: Env, state: string, limit = 200): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE state = ? ORDER BY grade_score DESC LIMIT ?"
  )
    .bind(state, limit)
    .all<Facility>();
  return results.results ?? [];
}

export async function countFacilitiesByState(env: Env, state: string): Promise<number> {
  const result = await env.DB.prepare("SELECT COUNT(*) as count FROM facilities WHERE state = ?")
    .bind(state)
    .first<{ count: number }>();
  return result?.count ?? 0;
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

  const merged = new Map<string, { city: string; count: number }>();
  for (const row of results.results ?? []) {
    const slug = citySlug(row.city);
    const existing = merged.get(slug);
    if (existing) {
      existing.count += row.count;
      if (shouldPreferCityDisplayName(existing.city, row.city)) {
        existing.city = cityDisplayName(row.city);
      }
      continue;
    }

    merged.set(slug, { city: cityDisplayName(row.city), count: row.count });
  }

  return [...merged.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

export async function getNearbyFacilities(
  env: Env,
  cmsId: string,
  city: string,
  state: string,
  limit = 5,
): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE state = ? AND city = ? AND cms_id != ? ORDER BY grade_score DESC LIMIT ?"
  )
    .bind(state, city, cmsId, limit)
    .all<Facility>();
  return results.results ?? [];
}

export async function getTopRatedByState(
  env: Env,
  state: string,
  excludeCmsId: string,
  limit = 5,
): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE state = ? AND cms_id != ? ORDER BY grade_score DESC LIMIT ?"
  )
    .bind(state, excludeCmsId, limit)
    .all<Facility>();
  return results.results ?? [];
}

export interface CitySnapshot {
  cityName: string;
  facilityCount: number;
  pctFailing: number;
  gradeDistribution: Record<string, number>;
  facilities: Facility[];
}

export async function getCitySnapshot(
  env: Env,
  state: string,
  slug: string,
  limit = 200,
): Promise<CitySnapshot | null> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE state = ? ORDER BY grade_score DESC"
  )
    .bind(state)
    .all<Facility>();

  const matchingFacilities = (results.results ?? []).filter((facility) => citySlug(facility.city) === slug);
  if (matchingFacilities.length === 0) {
    return null;
  }

  const cityName = matchingFacilities.reduce((preferred, facility) => {
    return shouldPreferCityDisplayName(preferred, facility.city) ? facility.city : preferred;
  }, matchingFacilities[0].city);

  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let failingCount = 0;

  for (const facility of matchingFacilities) {
    gradeDistribution[facility.grade_letter] = (gradeDistribution[facility.grade_letter] ?? 0) + 1;
    if (facility.rn_hours_per_resident_day !== null && facility.rn_hours_per_resident_day < 0.55) {
      failingCount += 1;
    }
  }

  const pctFailing = Number(((failingCount / matchingFacilities.length) * 100).toFixed(1));

  return {
    cityName: cityDisplayName(cityName),
    facilityCount: matchingFacilities.length,
    pctFailing,
    gradeDistribution,
    facilities: matchingFacilities.slice(0, limit),
  };
}

function shouldPreferCityDisplayName(current: string, candidate: string): boolean {
  const currentHasLower = /[a-z]/.test(current);
  const candidateHasLower = /[a-z]/.test(candidate);

  if (candidateHasLower && !currentHasLower) return true;
  if (currentHasLower && !candidateHasLower) return false;
  return candidate.length < current.length;
}
