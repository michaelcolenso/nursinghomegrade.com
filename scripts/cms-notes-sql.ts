// Seed SQL for facility_cms_notes: CMS staffing footnotes the facility page shows
// (src/cms-warnings.ts). The seed creates the table itself, the same way
// site_grade_distribution is handled, so the production refresh needs no new
// workflow step. Only facilities with a footnote we display get a row.
import type { CMSFacility } from "../src/types";
import { parseFootnoteCodes, STORED_STAFFING_FOOTNOTE_CODES } from "../src/cms-warnings";

export const CMS_NOTES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS facility_cms_notes (
  cms_id TEXT PRIMARY KEY,
  staffing_rating_footnote TEXT,
  reported_staffing_footnote TEXT,
  processing_date TEXT
);`;

const BATCH = 200;

function keep(raw: string | undefined): string | null {
  const codes = parseFootnoteCodes(raw).filter((c) => STORED_STAFFING_FOOTNOTE_CODES.includes(c));
  return codes.length > 0 ? codes.join(",") : null;
}

const sqlText = (v: string | null): string => (v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`);

export function buildCmsNotesSql(facilities: ReadonlyArray<CMSFacility>): string[] {
  const rows = facilities
    .map((f) => ({
      cms_id: f.cms_certification_number_ccn,
      rating: keep(f.staffing_rating_footnote),
      reported: keep(f.reported_staffing_footnote),
      processing: f.processing_date?.trim() || null,
    }))
    .filter((r) => r.cms_id && (r.rating !== null || r.reported !== null));

  const statements = [CMS_NOTES_TABLE_SQL, "DELETE FROM facility_cms_notes;"];
  for (let i = 0; i < rows.length; i += BATCH) {
    const values = rows
      .slice(i, i + BATCH)
      .map((r) => `(${sqlText(r.cms_id)},${sqlText(r.rating)},${sqlText(r.reported)},${sqlText(r.processing)})`)
      .join(",\n");
    statements.push(
      `INSERT INTO facility_cms_notes (cms_id,staffing_rating_footnote,reported_staffing_footnote,processing_date) VALUES\n${values};`,
    );
  }
  return statements;
}
