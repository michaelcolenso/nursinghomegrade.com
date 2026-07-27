-- Phase 2 support tables.

-- 2.3 — Snapshot of every facility's grade before the penalty terms were
-- introduced. Written once by scripts/recompute-grades.ts before it updates
-- anything. Needed to render grade trends and to defend a grade change if a
-- facility disputes it, so rows here are append-only: never UPDATE or DELETE.
CREATE TABLE IF NOT EXISTS grade_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cms_id TEXT NOT NULL,
  grade_score INTEGER NOT NULL,
  grade_letter TEXT NOT NULL,
  -- Why this grade was superseded, e.g. 'pre-penalty-baseline'.
  reason TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grade_history_cms_id ON grade_history(cms_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_recorded ON grade_history(recorded_at);

-- 2.2 — One row per CMS source file. The site previously rendered a freshness
-- date from `new Date()` on the homepage and a different hardcoded date on
-- facility pages. Both must resolve from here, and must show the CMS release
-- date rather than our ingest timestamp: a user reading "July 2026" when the
-- underlying survey data is from April is being misled.
CREATE TABLE IF NOT EXISTS data_releases (
  -- Stable key, e.g. 'provider_info', 'health_deficiencies', 'pbj', 'mds_qm',
  -- 'ownership', 'penalties'.
  source_key TEXT PRIMARY KEY,
  -- Human label for rendering, e.g. 'Provider Information'.
  label TEXT NOT NULL,
  -- Date CMS published the file (YYYY-MM-DD). This is what we render.
  cms_release_date TEXT,
  -- When we last pulled it. Diagnostic only — never rendered as freshness.
  ingested_at TEXT,
  source_url TEXT
);
