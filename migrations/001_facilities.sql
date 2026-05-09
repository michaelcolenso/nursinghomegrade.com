CREATE TABLE IF NOT EXISTS facilities (
  cms_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  overall_rating INTEGER,
  quality_rating INTEGER,
  staffing_rating INTEGER,
  inspection_rating INTEGER,
  rn_hours_per_resident_day REAL,
  total_deficiencies INTEGER,
  grade_score INTEGER NOT NULL,
  grade_letter TEXT NOT NULL,
  grade_summary TEXT NOT NULL,
  slug TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facilities_state ON facilities(state);
CREATE INDEX IF NOT EXISTS idx_facilities_zip ON facilities(zip);
CREATE INDEX IF NOT EXISTS idx_facilities_slug ON facilities(slug);
CREATE INDEX IF NOT EXISTS idx_facilities_grade ON facilities(grade_score DESC);
