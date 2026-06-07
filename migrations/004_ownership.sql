CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  normalized_name TEXT UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  avg_grade NUMERIC,
  avg_staffing_score NUMERIC,
  avg_deficiency_score NUMERIC,
  avg_penalty_score NUMERIC,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facility_owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cms_id TEXT NOT NULL,
  raw_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  owner_type TEXT,
  role TEXT,
  ownership_percentage TEXT,
  association_date TEXT,
  processing_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facility_owners_cms_id ON facility_owners(cms_id);
CREATE INDEX IF NOT EXISTS idx_facility_owners_normalized ON facility_owners(normalized_name);
CREATE INDEX IF NOT EXISTS idx_operators_slug ON operators(slug);
