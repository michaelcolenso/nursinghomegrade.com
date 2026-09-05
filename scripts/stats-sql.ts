/**
 * SQL used by the CMS ingest to refresh the precomputed statistics tables.
 *
 * Keep these statements in one place so the ingest path and its regression
 * tests exercise the same SQL. Migration 008 contains the corresponding
 * bootstrap statements for an existing database.
 */

/** Recompute national statistics from the facilities table after its upserts. */
export const SITE_STATS_REFRESH_SQL = `INSERT INTO site_stats (id,avg_grade,avg_rn_hours,avg_deficiencies,total_facilities,pct_failing,computed_at)
SELECT
  1,
  COALESCE((SELECT ROUND(AVG(grade_score), 1)
              FROM facilities
             WHERE grade_score >= 0), 0),
  ROUND(AVG(rn_hours_per_resident_day), 2),
  ROUND(AVG(total_deficiencies), 1),
  COUNT(*),
  (SELECT ROUND(100.0 * SUM(CASE WHEN rn_hours_per_resident_day < 0.55 THEN 1 ELSE 0 END) / COUNT(*), 1)
     FROM facilities WHERE rn_hours_per_resident_day IS NOT NULL),
  datetime('now')
FROM facilities
-- WHERE true disambiguates INSERT...SELECT...FROM followed by an upsert
-- clause, which SQLite's parser cannot otherwise distinguish from the
-- SELECT continuing — see https://www.sqlite.org/lang_UPSERT.html.
WHERE true
ON CONFLICT(id) DO UPDATE SET avg_grade=excluded.avg_grade, avg_rn_hours=excluded.avg_rn_hours, avg_deficiencies=excluded.avg_deficiencies, total_facilities=excluded.total_facilities, pct_failing=excluded.pct_failing, computed_at=excluded.computed_at;`;

/** Remove state rows that no longer have any facility reporting RN hours. */
export const STATE_STATS_CLEANUP_SQL = `DELETE FROM state_stats
WHERE state NOT IN (SELECT DISTINCT state FROM facilities WHERE rn_hours_per_resident_day IS NOT NULL);`;

/** Recompute the per-state failure percentage and RN-hours median. */
export const STATE_STATS_REFRESH_SQL = `WITH reported AS (
  SELECT state, rn_hours_per_resident_day AS rn
    FROM facilities
   WHERE rn_hours_per_resident_day IS NOT NULL
),
ranked AS (
  SELECT state, rn,
         ROW_NUMBER() OVER (PARTITION BY state ORDER BY rn) AS rk,
         COUNT(*) OVER (PARTITION BY state) AS cnt
    FROM reported
),
medians AS (
  SELECT state, AVG(rn) AS rn_median
    FROM ranked
   WHERE rk IN ((cnt + 1) / 2, (cnt + 2) / 2)
   GROUP BY state
),
failing AS (
  SELECT state, ROUND(100.0 * SUM(CASE WHEN rn < 0.55 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_failing
    FROM reported
   GROUP BY state
)
INSERT INTO state_stats (state,pct_failing,rn_median,computed_at)
SELECT f.state, f.pct_failing, m.rn_median, datetime('now')
  FROM failing f
  JOIN medians m ON m.state = f.state
 WHERE true
ON CONFLICT(state) DO UPDATE SET pct_failing=excluded.pct_failing, rn_median=excluded.rn_median, computed_at=excluded.computed_at;`;
