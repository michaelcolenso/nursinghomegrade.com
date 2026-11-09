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
             WHERE grade_letter != 'NR' AND grade_score >= 0), 0),
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

/**
 * National grade distribution behind the homepage histogram. One row per bucket:
 *   'A'..'F'      rated facilities per letter
 *   'NR'          facilities whose grade is withheld (NR, or a negative score)
 *   's00'..'s90'  rated facilities per 10-point score bucket (100 folds into s90)
 * "Rated" matches site_stats.avg_grade: grade_letter != 'NR' AND grade_score >= 0.
 *
 * Starts with CREATE TABLE IF NOT EXISTS so the production data refresh creates
 * the table itself if migration 014 was never applied remotely. Migration 014
 * contains the same statements for databases that apply it directly.
 */
export const SITE_GRADE_DISTRIBUTION_REFRESH_SQL = `CREATE TABLE IF NOT EXISTS site_grade_distribution (
  bucket TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  computed_at TEXT NOT NULL
);

DELETE FROM site_grade_distribution;

WITH rated AS (
  SELECT grade_letter, grade_score
    FROM facilities
   WHERE grade_letter != 'NR' AND grade_score >= 0
),
buckets(bucket) AS (
  VALUES ('A'),('B'),('C'),('D'),('F'),('NR'),
         ('s00'),('s10'),('s20'),('s30'),('s40'),('s50'),('s60'),('s70'),('s80'),('s90')
)
INSERT INTO site_grade_distribution (bucket, n, computed_at)
SELECT b.bucket,
       CASE
         WHEN b.bucket IN ('A','B','C','D','F')
           THEN (SELECT COUNT(*) FROM rated WHERE grade_letter = b.bucket)
         WHEN b.bucket = 'NR'
           THEN (SELECT COUNT(*) FROM facilities) - (SELECT COUNT(*) FROM rated)
         ELSE (SELECT COUNT(*) FROM rated
                WHERE MIN(CAST(grade_score / 10 AS INTEGER), 9) = CAST(substr(b.bucket, 2, 1) AS INTEGER))
       END,
       datetime('now')
  FROM buckets b;`;
