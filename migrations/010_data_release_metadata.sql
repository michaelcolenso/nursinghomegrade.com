-- Keep CMS data vintage, public release date, and NursingHomeGrade ingest time
-- as separate facts. `cms_release_date` and `ingested_at` already exist from 006.
ALTER TABLE data_releases ADD COLUMN cms_modified_date TEXT;
ALTER TABLE data_releases ADD COLUMN next_update_date TEXT;
