ALTER TABLE facility_deficiencies RENAME TO facility_deficiencies_old;
ALTER TABLE facility_deficiencies_next RENAME TO facility_deficiencies;
DROP TABLE facility_deficiencies_old;
CREATE INDEX IF NOT EXISTS idx_deficiencies_cms_id ON facility_deficiencies(cms_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_cycle ON facility_deficiencies(inspection_cycle);