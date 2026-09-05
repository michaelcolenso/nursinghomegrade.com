-- Grade 2.0 Phase A stores source-level evidence without changing the public
-- Grade 1.x model. These tables are intentionally raw/near-raw and versionable
-- by processing date / measure period so later validation can avoid leakage.

CREATE TABLE IF NOT EXISTS facility_survey_summaries (
  cms_id TEXT NOT NULL,
  inspection_cycle INTEGER NOT NULL,
  health_survey_date TEXT,
  fire_safety_survey_date TEXT,
  total_health_deficiencies INTEGER,
  total_fire_safety_deficiencies INTEGER,
  infection_control_deficiencies INTEGER,
  processing_date TEXT,
  PRIMARY KEY (cms_id, inspection_cycle)
);
CREATE INDEX IF NOT EXISTS idx_survey_summary_date
  ON facility_survey_summaries(health_survey_date);

CREATE TABLE IF NOT EXISTS facility_staffing_features (
  cms_id TEXT PRIMARY KEY,
  reported_total_nurse_hprd REAL,
  weekend_total_nurse_hprd REAL,
  weekend_rn_hprd REAL,
  rn_turnover_pct REAL,
  total_nursing_turnover_pct REAL,
  administrators_left INTEGER,
  nursing_case_mix_index REAL,
  nursing_case_mix_index_ratio REAL,
  case_mix_rn_hprd REAL,
  case_mix_total_nurse_hprd REAL,
  case_mix_weekend_total_nurse_hprd REAL,
  adjusted_rn_hprd REAL,
  adjusted_total_nurse_hprd REAL,
  adjusted_weekend_total_nurse_hprd REAL,
  processing_date TEXT
);

CREATE TABLE IF NOT EXISTS facility_mds_quality_measures (
  cms_id TEXT NOT NULL,
  measure_code TEXT NOT NULL,
  measure_description TEXT,
  resident_type TEXT,
  q1_score REAL,
  q1_footnote TEXT,
  q2_score REAL,
  q2_footnote TEXT,
  q3_score REAL,
  q3_footnote TEXT,
  q4_score REAL,
  q4_footnote TEXT,
  four_quarter_average_score REAL,
  four_quarter_footnote TEXT,
  used_in_five_star TEXT,
  measure_period TEXT NOT NULL DEFAULT '',
  processing_date TEXT,
  PRIMARY KEY (cms_id, measure_code, measure_period)
);
CREATE INDEX IF NOT EXISTS idx_mds_measure_code
  ON facility_mds_quality_measures(measure_code);

CREATE TABLE IF NOT EXISTS facility_claims_quality_measures (
  cms_id TEXT NOT NULL,
  measure_code TEXT NOT NULL,
  measure_description TEXT,
  resident_type TEXT,
  adjusted_score REAL,
  observed_score REAL,
  expected_score REAL,
  footnote TEXT,
  used_in_five_star TEXT,
  measure_period TEXT NOT NULL DEFAULT '',
  processing_date TEXT,
  PRIMARY KEY (cms_id, measure_code, measure_period)
);
CREATE INDEX IF NOT EXISTS idx_claims_measure_code
  ON facility_claims_quality_measures(measure_code);
