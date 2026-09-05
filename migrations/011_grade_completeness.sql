-- Explicitly persist whether a Grade 1.x result is based on complete, partial,
-- or insufficient evidence. Existing rows predate this policy and are marked
-- complete until the next CMS ingest recomputes them.
ALTER TABLE facilities ADD COLUMN grade_completeness TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE facilities ADD COLUMN grade_missing_inputs TEXT;

ALTER TABLE facility_snapshots ADD COLUMN grade_completeness TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE facility_snapshots ADD COLUMN grade_missing_inputs TEXT;

CREATE INDEX IF NOT EXISTS idx_facilities_grade_completeness
  ON facilities(grade_completeness);
