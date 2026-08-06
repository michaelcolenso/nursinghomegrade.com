-- Facility profile fields and federal enforcement records.
--
-- Every column below is a verbatim field from the CMS Provider Information
-- file (dataset 4pq5-n9py). Nothing here is derived, inferred, or supplied by a
-- facility. Columns stay NULL until `npm run ingest` + a data load repopulates
-- them, and every template section that reads them renders nothing rather than
-- a placeholder while they are NULL.
--
-- Deliberately absent: email address. The federal source files carry no email
-- field for nursing facilities, so there is nothing to store and nothing to
-- infer.

ALTER TABLE facilities ADD COLUMN phone TEXT;                          -- telephone_number
ALTER TABLE facilities ADD COLUMN ownership_type TEXT;                 -- ownership_type
ALTER TABLE facilities ADD COLUMN legal_business_name TEXT;            -- legal_business_name
ALTER TABLE facilities ADD COLUMN provider_type TEXT;                  -- provider_type
ALTER TABLE facilities ADD COLUMN county TEXT;                         -- countyparish
ALTER TABLE facilities ADD COLUMN certified_beds INTEGER;              -- number_of_certified_beds
ALTER TABLE facilities ADD COLUMN avg_residents_per_day REAL;          -- average_number_of_residents_per_day
ALTER TABLE facilities ADD COLUMN certification_date TEXT;             -- date_first_approved_to_provide_medicare_and_medicaid_services
ALTER TABLE facilities ADD COLUMN special_focus_status TEXT;           -- special_focus_status
ALTER TABLE facilities ADD COLUMN abuse_icon TEXT;                     -- abuse_icon (Y/N)
ALTER TABLE facilities ADD COLUMN number_of_fines INTEGER;             -- number_of_fines
ALTER TABLE facilities ADD COLUMN total_fines_dollars REAL;            -- total_amount_of_fines_in_dollars
ALTER TABLE facilities ADD COLUMN number_of_payment_denials INTEGER;   -- number_of_payment_denials
ALTER TABLE facilities ADD COLUMN total_penalties INTEGER;             -- total_number_of_penalties
ALTER TABLE facilities ADD COLUMN latest_standard_survey_date TEXT;    -- rating_cycle_1_standard_survey_health_date
ALTER TABLE facilities ADD COLUMN rn_turnover_pct REAL;                -- registered_nurse_turnover
ALTER TABLE facilities ADD COLUMN total_nursing_turnover_pct REAL;     -- total_nursing_staff_turnover
ALTER TABLE facilities ADD COLUMN cms_processing_date TEXT;            -- processing_date (source vintage)

-- Individual enforcement actions from the CMS Penalties file (dataset
-- g6vv-u9sr). One row per fine or payment denial, with the date CMS recorded
-- it. A facility with no rows has no penalty in the covered window — which is a
-- fact we can state, not an absence of data, because the file covers every
-- certified facility.
CREATE TABLE IF NOT EXISTS facility_penalties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cms_id TEXT NOT NULL,
  penalty_date TEXT,
  penalty_type TEXT,
  fine_amount REAL,
  payment_denial_start_date TEXT,
  payment_denial_length_days INTEGER,
  processing_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facility_penalties_cms_id ON facility_penalties(cms_id);
