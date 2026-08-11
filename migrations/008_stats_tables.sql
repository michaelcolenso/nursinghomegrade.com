-- Precomputed replacements for the full-table-scan aggregates that used to run
-- live on every facility/state/operator page (getNationalAverages,
-- getNationalPctFailing, getStatePctFailing, getStateRnMedian in src/db.ts).
-- These values only change when CMS data is re-ingested, not per request, so
-- they are computed once by scripts/ingest.ts (and refreshed by
-- scripts/recompute-grades.ts when it rewrites grade_score) instead of being
-- recalculated from ~15k+ rows on every cache miss.

CREATE TABLE IF NOT EXISTS site_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  avg_grade REAL NOT NULL,
  avg_rn_hours REAL,
  avg_deficiencies REAL,
  total_facilities INTEGER NOT NULL,
  pct_failing REAL,
  computed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS state_stats (
  state TEXT PRIMARY KEY,
  pct_failing REAL,
  rn_median REAL,
  computed_at TEXT NOT NULL
);

-- getFacilitiesByState / searchNearby filter by state then ORDER BY
-- grade_score; idx_facilities_state alone leaves SQLite to sort the matches
-- afterward. This composite index lets the same query satisfy both the
-- filter and the ordering as one index walk.
CREATE INDEX IF NOT EXISTS idx_facilities_state_grade ON facilities(state, grade_score DESC);

-- Backfill both tables from whatever `facilities` already holds at migration
-- time. Without this, a database that applies this migration and isn't
-- immediately re-ingested would have getNationalAverages/getStatePctFailing
-- etc. read empty tables and publish zeroed-out stats — which the 24h page
-- cache would then lock in. This duplicates the aggregate logic scripts/
-- ingest.ts runs on every ingest (see the comments there); it's intentional
-- so this migration is self-sufficient and doesn't depend on ingest running
-- right after it. COALESCE guards avg_grade's NOT NULL constraint against a
-- brand new, still-empty `facilities` table (e.g. local/dev D1).
INSERT INTO site_stats (id,avg_grade,avg_rn_hours,avg_deficiencies,total_facilities,pct_failing,computed_at)
SELECT
  1,
  COALESCE(ROUND(AVG(grade_score), 1), 0),
  ROUND(AVG(rn_hours_per_resident_day), 2),
  ROUND(AVG(total_deficiencies), 1),
  COUNT(*),
  (SELECT ROUND(100.0 * SUM(CASE WHEN rn_hours_per_resident_day < 0.55 THEN 1 ELSE 0 END) / COUNT(*), 1)
     FROM facilities WHERE rn_hours_per_resident_day IS NOT NULL),
  datetime('now')
FROM facilities
WHERE true
ON CONFLICT(id) DO UPDATE SET avg_grade=excluded.avg_grade, avg_rn_hours=excluded.avg_rn_hours, avg_deficiencies=excluded.avg_deficiencies, total_facilities=excluded.total_facilities, pct_failing=excluded.pct_failing, computed_at=excluded.computed_at;

WITH reported AS (
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
ON CONFLICT(state) DO UPDATE SET pct_failing=excluded.pct_failing, rn_median=excluded.rn_median, computed_at=excluded.computed_at;
