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
