-- CMS staffing footnotes shown on facility pages (src/cms-warnings.ts).
-- Production does not need this file: the ingest seed (scripts/cms-notes-sql.ts)
-- runs the same CREATE TABLE IF NOT EXISTS before reloading the rows. It exists
-- so a local D1 built from migrations has the table too.
CREATE TABLE IF NOT EXISTS facility_cms_notes (
  cms_id TEXT PRIMARY KEY,
  staffing_rating_footnote TEXT,
  reported_staffing_footnote TEXT,
  processing_date TEXT
);
