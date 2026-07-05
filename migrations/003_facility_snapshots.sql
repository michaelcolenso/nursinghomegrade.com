CREATE TABLE IF NOT EXISTS facility_snapshots (
  cms_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  overall_rating INTEGER,
  quality_rating INTEGER,
  staffing_rating INTEGER,
  inspection_rating INTEGER,
  rn_hours_per_resident_day REAL,
  total_deficiencies INTEGER,
  grade_score INTEGER NOT NULL,
  grade_letter TEXT NOT NULL,
  PRIMARY KEY (cms_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_facility_snapshots_cms_id ON facility_snapshots(cms_id);
CREATE INDEX IF NOT EXISTS idx_facility_snapshots_date ON facility_snapshots(snapshot_date);
