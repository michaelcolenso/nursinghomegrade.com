CREATE TABLE IF NOT EXISTS facility_deficiencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cms_id TEXT NOT NULL,
  survey_date TEXT,
  deficiency_category TEXT,
  deficiency_tag_number TEXT,
  deficiency_description TEXT,
  scope_severity_code TEXT,
  deficiency_corrected TEXT,
  correction_date TEXT,
  inspection_cycle INTEGER,
  standard_deficiency TEXT,
  complaint_deficiency TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deficiencies_cms_id ON facility_deficiencies(cms_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_cycle ON facility_deficiencies(inspection_cycle);
