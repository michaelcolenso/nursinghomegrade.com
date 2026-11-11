// Recompute the site's grade for every facility with the production code path
// (scripts/ingest.ts mapCMSFacility -> src/scoring.ts computeGrade) and cross-tab
// it against CMS flags the site does not display.
import { readFileSync } from "node:fs";
import { mapCMSFacility } from "../../../scripts/ingest.ts";

const B = (process.env.CMS_DIR ?? "cms") + "/";
const P = JSON.parse(readFileSync(B + "provider.json", "utf8")) as Record<string, string>[];
const D = JSON.parse(readFileSync(B + "def_reduced.json", "utf8")) as Record<string, [string, string, string][]>;

const tally = (rows: { letter: string }[]) => {
  const c: Record<string, number> = {};
  for (const r of rows) c[r.letter] = (c[r.letter] ?? 0) + 1;
  return c;
};
const graded = P.map((raw) => {
  const defs = (D[raw.cms_certification_number_ccn] ?? []).map(([s, c, cy]) => ({
    scope_severity_code: s || null,
    deficiency_corrected: c || null,
    inspection_cycle: cy ? Number(cy) : null,
  }));
  const f = mapCMSFacility(raw as never, defs);
  return { raw, letter: f.grade_letter, score: f.grade_score };
});
console.log("ALL", tally(graded));
const abuse = graded.filter((g) => g.raw.abuse_icon === "Y");
console.log("ABUSE icon", abuse.length, tally(abuse));
const sff = graded.filter((g) => g.raw.special_focus_status === "SFF");
const cand = graded.filter((g) => g.raw.special_focus_status === "SFF Candidate");
console.log("SFF", sff.length, tally(sff), "| candidates", cand.length, tally(cand));
const noRn = graded.filter((g) => g.raw.staffing_rating_footnote === "24");
console.log("Footnote 24 (many days w/o RN)", noRn.length, tally(noRn));
const old = graded.filter((g) => g.raw.most_recent_health_inspection_more_than_2_years_ago === "Y");
console.log("Inspection >2y old", old.length, tally(old));
