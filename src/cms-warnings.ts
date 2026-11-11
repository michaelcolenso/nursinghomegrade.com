// CMS warning signals from the Provider Information file that the A–F grade does
// not use directly. Definitions and footnote wording follow the CMS Nursing Home
// Data Dictionary (October 2026): Table 2 (Abuse Icon, Special Focus Status) and
// Table 15 (footnote codes). See docs/data-stories/UNTOLD-STORIES.md §1–2.

export type SpecialFocusKind = "sff" | "candidate";

/** CMS publishes "SFF", "SFF Candidate", or an empty value. */
export function specialFocusKind(status: string | null | undefined): SpecialFocusKind | null {
  const s = (status ?? "").trim().toUpperCase();
  if (s === "SFF") return "sff";
  if (s === "SFF CANDIDATE") return "candidate";
  return null;
}

export function isAbuseFlagged(icon: string | null | undefined): boolean {
  return (icon ?? "").trim().toUpperCase() === "Y";
}

/** CMS's own definition of the abuse icon, in plain language. */
export const ABUSE_ICON_DEFINITION =
  "CMS shows this warning when a home was cited for abuse or neglect that harmed a resident on its most recent " +
  "inspection cycle, or for abuse or neglect with the potential for harm on each of its last two inspection cycles.";

export const SPECIAL_FOCUS_CLAUSE = "which it uses for nursing homes with a history of serious quality issues";
export const SPECIAL_FOCUS_DEFINITION =
  "CMS uses its Special Focus Facility program for nursing homes with a history of serious quality issues.";

/** Health-deficiency category CMS uses for abuse, neglect and exploitation citations. */
export function isAbuseCategory(category: string | null | undefined): boolean {
  return (category ?? "").startsWith("Freedom from Abuse");
}

export function countAbuseCitations(deficiencies: ReadonlyArray<{ deficiency_category: string | null }>): number {
  return deficiencies.filter((d) => isAbuseCategory(d.deficiency_category)).length;
}

export interface StaffingNote {
  code: string;
  /** CMS footnote text, verbatim. */
  text: string;
  /** True for notes a family should see before anything else on the page. */
  urgent: boolean;
}

// Table 15. 23–25 also explain a staffing-rating downgrade (Table 16, 202501).
const STAFFING_FOOTNOTES: Record<string, Omit<StaffingNote, "code">> = {
  "24": { text: "This facility reported a high number of days without a registered nurse onsite.", urgent: true },
  "23": { text: "This facility did not submit staffing data.", urgent: false },
  "25": { text: "The accuracy of the staffing data for this measure could not be validated by CMS.", urgent: false },
  "6": {
    text: "This facility submitted data that did not meet the criteria required to calculate a staffing measure.",
    urgent: false,
  },
};

/** CMS footnote fields can hold one code or several separated by commas. */
export function parseFootnoteCodes(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,;]+/)
    .map((c) => c.trim())
    .filter((c) => /^\d+$/.test(c));
}

/** Known staffing footnotes for a facility, de-duplicated across the two CMS fields, urgent first. */
export function staffingNotes(
  ratingFootnote: string | null | undefined,
  reportedFootnote: string | null | undefined,
): StaffingNote[] {
  const seen = new Set<string>();
  const notes: StaffingNote[] = [];
  for (const code of [...parseFootnoteCodes(ratingFootnote), ...parseFootnoteCodes(reportedFootnote)]) {
    const known = STAFFING_FOOTNOTES[code];
    if (!known || seen.has(code)) continue;
    seen.add(code);
    notes.push({ code, ...known });
  }
  return notes.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

/** The staffing-footnote codes the ingest keeps (everything else is irrelevant to these notes). */
export const STORED_STAFFING_FOOTNOTE_CODES = Object.keys(STAFFING_FOOTNOTES);
