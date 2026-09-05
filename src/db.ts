import type { Facility, FacilityInspectionDetails, Deficiency, Env, Operator, FacilitySnapshot, FacilityPenalty, StateFacilityCard } from "./types";
import { cityDisplayName, citySlug } from "./states";
import type { DataRelease } from "./templates/data-sources";

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
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  limit = 500,
): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE latitude > ? AND latitude < ? AND longitude > ? AND longitude < ? LIMIT ?",
  )
    .bind(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng, limit)
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

/**
 * Share of a state's *reporting* facilities below the repealed 0.55 hr RN
 * benchmark. Facilities that do not report RN hours are excluded from the
 * denominator so this matches getBenchmarkShortfall — counting them as passing
 * would understate the shortfall and disagree with the repeal report.
 * Source: CMS Provider Information file, column
 * `reported_rn_staffing_hours_per_resident_per_day`. The 0.55 threshold is the
 * repealed 2024 CMS standard — see src/staffing-standard.ts.
 */
/**
 * Reads a value scripts/ingest.ts precomputes into state_stats, rather than
 * scanning facilities per request — this figure is identical for every page
 * in the state and only changes when CMS data is re-ingested.
 */
export async function getStatePctFailing(env: Env, state: string): Promise<number> {
  const result = await env.DB.prepare("SELECT pct_failing FROM state_stats WHERE state = ?")
    .bind(state)
    .first<{ pct_failing: number | null }>();
  return result?.pct_failing ?? 0;
}

/** National counterpart to getStatePctFailing, precomputed into site_stats. */
export async function getNationalPctFailing(env: Env): Promise<number> {
  const result = await env.DB.prepare("SELECT pct_failing FROM site_stats WHERE id = 1").first<{
    pct_failing: number | null;
  }>();
  return result?.pct_failing ?? 0;
}

export interface BenchmarkShortfall {
  /** Facilities nationally with reported RN hours below the repealed 0.55 benchmark. */
  belowNational: number;
  /** Facilities nationally with RN hours reported at all (the denominator). */
  reportedNational: number;
  byState: Array<{ state: string; below: number; reported: number }>;
}

/**
 * Live count of facilities below the repealed 0.55 RN benchmark, nationally and
 * per state. Source: CMS Provider Information file, column
 * `reported_rn_staffing_hours_per_resident_per_day` (stored as
 * `facilities.rn_hours_per_resident_day`). Facilities that do not report the
 * measure are excluded from both numerator and denominator.
 */
export async function getBenchmarkShortfall(env: Env): Promise<BenchmarkShortfall> {
  const results = await env.DB.prepare(
    `SELECT state,
            SUM(CASE WHEN rn_hours_per_resident_day < 0.55 THEN 1 ELSE 0 END) as below,
            COUNT(*) as reported
       FROM facilities
      WHERE rn_hours_per_resident_day IS NOT NULL
      GROUP BY state
      ORDER BY state ASC`,
  ).all<{ state: string; below: number; reported: number }>();

  const byState = results.results ?? [];
  return {
    belowNational: byState.reduce((sum, row) => sum + row.below, 0),
    reportedNational: byState.reduce((sum, row) => sum + row.reported, 0),
    byState,
  };
}

/**
 * CMS source files and the release dates of the copies in production.
 * Returns [] if the table has not been populated yet, so the page degrades to
 * its prose rather than rendering an empty or invented date.
 */
export async function getDataReleases(env: Env): Promise<DataRelease[]> {
  try {
    const results = await env.DB.prepare(
      `SELECT source_key, label, cms_release_date, ingested_at, source_url
         FROM data_releases ORDER BY label ASC`,
    ).all<DataRelease>();
    return results.results ?? [];
  } catch {
    return [];
  }
}

/**
 * Median RN hours per resident day among facilities in a state that report it.
 * Median rather than mean: the distribution has a long upper tail, so a mean
 * would overstate the typical facility. Non-reporting facilities are excluded,
 * matching every other staffing figure on the site.
 * Source: CMS Provider Information, `reported_rn_staffing_hours_per_resident_per_day`.
 *
 * Precomputed into state_stats by scripts/ingest.ts. The old version ran this
 * median (two correlated COUNT(*) subqueries plus an ORDER BY/LIMIT/OFFSET)
 * live on every facility page load for a value that is constant across the
 * whole state and only changes when CMS data is re-ingested.
 */
export async function getStateRnMedian(env: Env, state: string): Promise<number | null> {
  try {
    const row = await env.DB.prepare("SELECT rn_median FROM state_stats WHERE state = ?")
      .bind(state)
      .first<{ rn_median: number | null }>();
    return row?.rn_median ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns null when the query fails, [] when the facility genuinely has no
 * citations. Collapsing both to [] would make a clean facility indistinguishable
 * from missing data — and "Not reported" on a facility with a spotless record is
 * a materially misleading thing to show a family.
 */
export async function getFacilityDeficiencies(env: Env, cmsId: string): Promise<Deficiency[] | null> {
  try {
    const results = await env.DB.prepare(
      `SELECT * FROM facility_deficiencies WHERE cms_id = ? ORDER BY inspection_cycle ASC, deficiency_category ASC`
    ).bind(cmsId).all<Deficiency>();
    return results.results ?? [];
  } catch {
    return null;
  }
}

export async function getFacilitiesByState(env: Env, state: string, limit = 200): Promise<Facility[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facilities WHERE state = ? AND grade_letter != 'NR' AND grade_score >= 0 ORDER BY grade_score DESC LIMIT ?"
  )
    .bind(state, limit)
    .all<Facility>();
  return results.results ?? [];
}

/**
 * The top facilities in a state as compact cards — every column the state
 * page's ranked list and ItemList schema actually render. The previous path
 * fetched 200 full rows (every column of `facilities`) to render ten cards:
 * 20x the rows, and the unused columns on the wire, on every cache miss.
 */
export async function getTopFacilitiesByState(env: Env, state: string, limit = 10): Promise<StateFacilityCard[]> {
  const results = await env.DB.prepare(
    `SELECT cms_id, name, slug, city, state, grade_score, grade_letter, rn_hours_per_resident_day
     FROM facilities WHERE state = ? ORDER BY grade_score DESC LIMIT ?`
  )
    .bind(state, limit)
    .all<StateFacilityCard>();
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


/**
 * Grade bands ordered best to worst. There is no E band in CMS-derived grades.
 */
const GRADE_BANDS = ["A", "B", "C", "D", "F"];

function bandIndex(letter: string): number {
  const i = GRADE_BANDS.indexOf(letter);
  return i === -1 ? GRADE_BANDS.length : i;
}

/**
 * Approximate distance ordering without trigonometry.
 *
 * D1 does not reliably expose SQLite's math functions, so instead of haversine
 * we rank by squared offset with longitude scaled by cos(latitude), computed in
 * TypeScript and passed as a bind parameter. At the distances that matter for
 * "other facilities near this one" the ranking is identical to great-circle,
 * and it needs only arithmetic SQLite always has.
 */
function distanceOrdering(lat: number, lng: number): { expr: string; binds: number[] } {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  return {
    expr: "((latitude - ?) * (latitude - ?)) + (((longitude - ?) * ?) * ((longitude - ?) * ?))",
    binds: [lat, lat, lng, cosLat, lng, cosLat],
  };
}

/**
 * Peer facilities for a facility page.
 *
 * Replaces the statewide "top rated" block, which returned the same handful of
 * facilities for every page in a state — so all 194 Washington facility pages
 * linked the same four, creating near-duplicate link blocks at scale and
 * starving the other 190 of internal links.
 *
 * Same city first. If the city has fewer than `minimum`, widen to the nearest
 * facilities in the state by distance, then to the rest of the state. The module
 * must never render empty: Pacific Care in Hoquiam had no nearby block at all
 * because its city is small.
 */
export async function getPeerFacilities(
  env: Env,
  facility: Pick<Facility, "cms_id" | "city" | "state" | "latitude" | "longitude">,
  limit = 5,
  minimum = 3,
): Promise<Facility[]> {
  const picked: Facility[] = [];
  const seen = new Set<string>([facility.cms_id]);

  const add = (rows: Facility[]) => {
    for (const r of rows) {
      if (picked.length >= limit) return;
      if (seen.has(r.cms_id)) continue;
      seen.add(r.cms_id);
      picked.push(r);
    }
  };

  try {
    // Ordered by proximity where we have coordinates, not by grade. Ordering by
    // grade would make only the top few facilities in a city anyone's peer,
    // leaving the rest with no inbound links — the same concentration the
    // statewide block caused, at city scale. See src/link-graph.ts.
    let sameCitySql: string;
    let sameCityBinds: unknown[];
    if (facility.latitude !== null && facility.longitude !== null) {
      const { expr, binds } = distanceOrdering(facility.latitude, facility.longitude);
      sameCitySql = `SELECT * FROM facilities
                      WHERE state = ? AND city = ? AND cms_id != ?
                        AND latitude IS NOT NULL AND longitude IS NOT NULL
                      ORDER BY ${expr} ASC LIMIT ?`;
      sameCityBinds = [facility.state, facility.city, facility.cms_id, ...binds, limit];
    } else {
      sameCitySql =
        "SELECT * FROM facilities WHERE state = ? AND city = ? AND cms_id != ? ORDER BY grade_score DESC LIMIT ?";
      sameCityBinds = [facility.state, facility.city, facility.cms_id, limit];
    }
    const sameCity = await env.DB.prepare(sameCitySql).bind(...sameCityBinds).all<Facility>();
    add(sameCity.results ?? []);

    if (picked.length >= minimum) return picked;

    // Widen by distance when the city is too small to fill the module.
    if (facility.latitude !== null && facility.longitude !== null) {
      const { expr, binds } = distanceOrdering(facility.latitude, facility.longitude);
      const nearest = await env.DB.prepare(
        `SELECT * FROM facilities
          WHERE state = ? AND cms_id != ? AND latitude IS NOT NULL AND longitude IS NOT NULL
          ORDER BY ${expr} ASC LIMIT ?`,
      )
        .bind(facility.state, facility.cms_id, ...binds, limit * 3)
        .all<Facility>();
      add(nearest.results ?? []);
    }

    if (picked.length >= minimum) return picked;

    // Last resort so the module is never empty: anywhere in the state.
    const statewide = await env.DB.prepare(
      "SELECT * FROM facilities WHERE state = ? AND cms_id != ? ORDER BY grade_score DESC LIMIT ?",
    )
      .bind(facility.state, facility.cms_id, limit * 3)
      .all<Facility>();
    add(statewide.results ?? []);

    return picked;
  } catch {
    return picked;
  }
}

/**
 * Facilities in a better grade band near this one — so a family looking at an F
 * facility sees nearby D and C options. Genuinely useful to the reader, and it
 * distributes link equity across the long tail rather than concentrating it on
 * the same statewide winners.
 *
 * Returns [] for a facility already in the best band, where there is no better
 * option to point at.
 */
export async function getBetterGradedNearby(
  env: Env,
  facility: Pick<Facility, "cms_id" | "city" | "state" | "latitude" | "longitude" | "grade_letter">,
  limit = 2,
  excludeIds: Set<string> = new Set(),
): Promise<Facility[]> {
  const currentBand = bandIndex(facility.grade_letter);
  const better = GRADE_BANDS.slice(0, currentBand);
  if (better.length === 0) return [];

  try {
    const placeholders = better.map(() => "?").join(",");
    let sql: string;
    let binds: unknown[];

    if (facility.latitude !== null && facility.longitude !== null) {
      const { expr, binds: geoBinds } = distanceOrdering(facility.latitude, facility.longitude);
      // Closest better band first, then geographically nearest within it.
      sql = `SELECT * FROM facilities
              WHERE state = ? AND cms_id != ? AND grade_letter IN (${placeholders})
                AND latitude IS NOT NULL AND longitude IS NOT NULL
              ORDER BY CASE grade_letter ${better.map((b, i) => `WHEN '${b}' THEN ${better.length - i}`).join(" ")} ELSE 99 END ASC,
                       ${expr} ASC
              LIMIT ?`;
      binds = [facility.state, facility.cms_id, ...better, ...geoBinds, limit + excludeIds.size + 5];
    } else {
      sql = `SELECT * FROM facilities
              WHERE state = ? AND cms_id != ? AND grade_letter IN (${placeholders})
              ORDER BY grade_score DESC LIMIT ?`;
      binds = [facility.state, facility.cms_id, ...better, limit + excludeIds.size + 5];
    }

    const rows = await env.DB.prepare(sql).bind(...binds).all<Facility>();
    return (rows.results ?? []).filter((r) => !excludeIds.has(r.cms_id)).slice(0, limit);
  } catch {
    return [];
  }
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
    `SELECT cms_id, name, address, city, state, overall_rating, rn_hours_per_resident_day, grade_score, grade_letter, slug
     FROM facilities WHERE state = ? ORDER BY grade_score DESC`
  )
    .bind(state)
    .all<Facility>();

  const matchingFacilities = (results.results ?? []).filter((facility) => citySlug(facility.city) === slug);
  if (matchingFacilities.length === 0) {
    return null;
  }

  const cityName = matchingFacilities.reduce((preferred, facility) => {
    return shouldPreferCityDisplayName(preferred, facility.city) ? facility.city : preferred;
  }, matchingFacilities[0]!.city);

  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let failingCount = 0;

  for (const facility of matchingFacilities) {
    gradeDistribution[facility.grade_letter] = (gradeDistribution[facility.grade_letter] ?? 0) + 1;
    // Below the repealed 2024 benchmark — see src/staffing-standard.ts.
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

// Operator queries

export async function getOperatorBySlug(env: Env, slug: string): Promise<Operator | null> {
  const result = await env.DB.prepare("SELECT * FROM operators WHERE slug = ?").bind(slug).first<Operator>();
  return result ?? null;
}

export async function getOperatorFacilities(env: Env, normalizedName: string): Promise<Facility[]> {
  const results = await env.DB.prepare(
    `SELECT f.* FROM facilities f
     INNER JOIN facility_owners fo ON f.cms_id = fo.cms_id
     WHERE fo.normalized_name = ?
     GROUP BY f.cms_id
     ORDER BY f.grade_score DESC`
  ).bind(normalizedName).all<Facility>();
  return results.results ?? [];
}

export async function getOperatorGradeDistribution(env: Env, normalizedName: string): Promise<Record<string, number>> {
  const results = await env.DB.prepare(
    `SELECT f.grade_letter, COUNT(*) as count
     FROM facilities f
     INNER JOIN facility_owners fo ON f.cms_id = fo.cms_id
     WHERE fo.normalized_name = ?
     GROUP BY f.grade_letter`
  ).bind(normalizedName).all<{ grade_letter: string; count: number }>();

  const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const row of results.results ?? []) {
    distribution[row.grade_letter] = row.count;
  }
  return distribution;
}

export async function getOperatorsRanked(env: Env, limit = 50, order: "ASC" | "DESC" = "DESC"): Promise<Operator[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM operators WHERE facility_count >= 3 AND operator_score IS NOT NULL ORDER BY operator_score ${order}, facility_count ${order} LIMIT ?`
  ).bind(limit).all<Operator>();
  return results.results ?? [];
}

export async function getOperatorsByTier(env: Env, tier: string, limit = 25, order: "ASC" | "DESC" = "DESC"): Promise<Operator[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM operators WHERE operator_tier = ? ORDER BY operator_score ${order}, facility_count ${order} LIMIT ?`
  ).bind(tier, limit).all<Operator>();
  return results.results ?? [];
}

export async function getOperatorTierCounts(env: Env): Promise<Record<string, number>> {
  const results = await env.DB.prepare(
    "SELECT operator_tier, COUNT(*) AS count FROM operators GROUP BY operator_tier"
  ).all<{ operator_tier: string; count: number }>();
  const counts: Record<string, number> = { Mega: 0, Large: 0, Mid: 0, Small: 0 };
  for (const row of results.results ?? []) counts[row.operator_tier] = row.count;
  return counts;
}

export async function getAllOperators(env: Env): Promise<Operator[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM operators WHERE facility_count >= 2 ORDER BY operator_score DESC, facility_count DESC, normalized_name ASC"
  ).all<Operator>();
  return results.results ?? [];
}

/**
 * Precomputed into site_stats by scripts/ingest.ts. This used to run
 * AVG()/COUNT() over the entire facilities table on nearly every page
 * render (facility, operator, state-report, reports) for a value that is
 * identical across the whole site and only changes on re-ingest — it was
 * the single most expensive query on the site (43% of total D1 runtime).
 */
export async function getNationalAverages(env: Env): Promise<{
  avgGrade: number;
  avgRnHours: number;
  avgDeficiencies: number;
  totalFacilities: number;
}> {
  const result = await env.DB.prepare(
    "SELECT avg_grade, avg_rn_hours, avg_deficiencies, total_facilities FROM site_stats WHERE id = 1",
  ).first<{ avg_grade: number; avg_rn_hours: number; avg_deficiencies: number; total_facilities: number }>();
  return {
    avgGrade: result?.avg_grade ?? 0,
    avgRnHours: result?.avg_rn_hours ?? 0,
    avgDeficiencies: result?.avg_deficiencies ?? 0,
    totalFacilities: result?.total_facilities ?? 0,
  };
}

export async function getFacilitySnapshots(env: Env, cmsId: string): Promise<FacilitySnapshot[]> {
  const results = await env.DB.prepare(
    "SELECT * FROM facility_snapshots WHERE cms_id = ? ORDER BY snapshot_date ASC"
  ).bind(cmsId).all<FacilitySnapshot>();
  return results.results ?? [];
}

export interface UncorrectedRow {
  cms_id: string;
  name: string;
  city: string;
  state: string;
  grade_score: number;
  grade_letter: string;
  slug: string;
  uncorrected_count: number;
  worst_severity: string | null;
}

export async function getFacilitiesWithUncorrectedDeficiencies(env: Env, limit = 200): Promise<UncorrectedRow[]> {
  const results = await env.DB.prepare(
    `SELECT
      f.cms_id, f.name, f.city, f.state, f.grade_score, f.grade_letter, f.slug,
      COUNT(fd.id) as uncorrected_count,
      MAX(fd.scope_severity_code) as worst_severity
    FROM facilities f
    INNER JOIN facility_deficiencies fd ON f.cms_id = fd.cms_id
    WHERE fd.deficiency_corrected IN ('Deficient, Provider has no plan of correction', 'Deficient, Provider has plan of correction')
    GROUP BY f.cms_id
    ORDER BY
      CASE
        WHEN MAX(fd.scope_severity_code) >= 'J' THEN 0
        WHEN MAX(fd.scope_severity_code) >= 'G' THEN 1
        WHEN MAX(fd.scope_severity_code) >= 'D' THEN 2
        ELSE 3
      END,
      uncorrected_count DESC
    LIMIT ?`
  ).bind(limit).all<UncorrectedRow>();
  return results.results ?? [];
}

/**
 * Enforcement actions for one facility from the CMS Penalties file.
 *
 * Returns null when the lookup fails (including when the table does not exist
 * yet), [] when CMS lists no penalty for the facility. The template treats the
 * two differently: [] is a statement we can make, null is a gap we disclose.
 */
export async function getFacilityPenalties(env: Env, cmsId: string): Promise<FacilityPenalty[] | null> {
  try {
    const results = await env.DB.prepare(
      `SELECT id, cms_id, penalty_date, penalty_type, fine_amount,
              payment_denial_start_date, payment_denial_length_days, processing_date
         FROM facility_penalties WHERE cms_id = ?
        ORDER BY penalty_date DESC, id DESC`,
    )
      .bind(cmsId)
      .all<FacilityPenalty>();
    return results.results ?? [];
  } catch {
    return null;
  }
}
