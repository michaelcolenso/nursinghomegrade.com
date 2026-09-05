-- Grade 2.0 Phase B: versioned feature store and shadow-score persistence.
-- Nothing in these tables is read by the public Grade 1.x experience.

CREATE TABLE IF NOT EXISTS grade2_measure_registry (
  source_key TEXT NOT NULL,
  measure_code TEXT NOT NULL,
  resident_type TEXT NOT NULL DEFAULT '',
  measure_label TEXT NOT NULL,
  favorable_direction TEXT NOT NULL CHECK (favorable_direction IN ('higher','lower')),
  registry_version TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  rationale TEXT,
  PRIMARY KEY (source_key, measure_code, resident_type, registry_version)
);

CREATE TABLE IF NOT EXISTS grade2_feature_runs (
  run_id TEXT PRIMARY KEY,
  feature_version TEXT NOT NULL,
  model_version TEXT NOT NULL,
  as_of_date TEXT NOT NULL,
  source_release_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS grade2_feature_snapshots (
  run_id TEXT NOT NULL,
  cms_id TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('safety','staffing','outcomes')),
  feature_key TEXT NOT NULL,
  raw_value REAL,
  normalized_value REAL,
  weight REAL,
  missing_reason TEXT,
  source_key TEXT NOT NULL,
  source_field TEXT,
  source_period TEXT,
  source_processing_date TEXT,
  PRIMARY KEY (run_id, cms_id, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_grade2_features_facility
  ON grade2_feature_snapshots(cms_id, run_id);
CREATE INDEX IF NOT EXISTS idx_grade2_features_pillar
  ON grade2_feature_snapshots(run_id, pillar, feature_key);

CREATE TABLE IF NOT EXISTS grade2_shadow_scores (
  run_id TEXT NOT NULL,
  cms_id TEXT NOT NULL,
  safety_score REAL,
  staffing_score REAL,
  outcomes_score REAL,
  overall_score REAL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low','insufficient')),
  evidence_coverage REAL NOT NULL,
  missing_pillars TEXT,
  explanation_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (run_id, cms_id)
);
CREATE INDEX IF NOT EXISTS idx_grade2_shadow_facility
  ON grade2_shadow_scores(cms_id, run_id);
