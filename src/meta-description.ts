import type { Facility, Deficiency } from "./types";

// Meta descriptions for facility pages.
//
// Every facility page previously emitted the same shape — "{Name} in {City},
// {State} earns a grade of {X} ({score}/100). Overall trend: unknown trend." —
// with "unknown trend" on literally every page, because facility_snapshots is
// empty so no facility has a trajectory. Near-identical, low-information
// descriptions across ~15,000 pages is a direct contributor to Google's
// crawled-not-indexed bucket.
//
// This builds a description from the most decision-relevant fact that is true of
// the specific facility, using the first branch that applies. No branch may emit
// "unknown", an empty interpolation, or a placeholder — if a fact is unavailable
// the branch does not apply and we fall through to one that does.

export interface DescriptionFacts {
  /** Deficiencies still open, from the same rows the page renders. */
  outstandingCount: number;
  /** Survey date of the most recent still-open finding, ISO or CMS format. */
  latestOutstandingSurveyDate: string | null;
  /** Year of the most recent actual-harm (G–L) citation. */
  harmYear: number | null;
  /** Median RN hours per resident day across reporting facilities in the state. */
  stateMedianRnHours: number | null;
  /** Total deficiency rows across the three survey cycles. */
  totalDeficiencies: number | null;
}

/** Percentage difference from the state median that counts as "notable". */
const NOTABLE_PCT = 15;

function year(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  // Guard against sentinel dates that would render as an implausible year.
  return y >= 1990 && y <= 2100 ? y : null;
}

/** Collapses whitespace so no branch can emit a doubled space. */
function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function gradeClause(f: Facility): string {
  return `Grade ${f.grade_letter} (${f.grade_score}/100)`;
}

/**
 * Derives the per-facility facts from its deficiency rows. `stateMedianRnHours`
 * is supplied separately by the caller because it is a per-state aggregate, not
 * a property of these rows.
 */
export function deriveDescriptionFacts(
  deficiencies: Deficiency[] | null,
  stateMedianRnHours: number | null = null,
): DescriptionFacts {
  // null means the lookup failed. Report no counts rather than zeros, so the
  // cascade falls through instead of asserting a clean record we cannot verify.
  if (deficiencies === null) {
    return {
      outstandingCount: 0,
      latestOutstandingSurveyDate: null,
      harmYear: null,
      stateMedianRnHours,
      totalDeficiencies: null,
    };
  }

  const outstanding = deficiencies.filter(
    (d) =>
      d.deficiency_corrected === "Deficient, Provider has no plan of correction" ||
      d.deficiency_corrected === "Deficient, Provider has plan of correction",
  );

  const outstandingDates = outstanding
    .map((d) => d.survey_date)
    .filter((d): d is string => !!d)
    .sort();

  const harmYears = deficiencies
    .filter((d) => !!d.scope_severity_code && d.scope_severity_code >= "G" && d.scope_severity_code <= "L")
    .map((d) => year(d.survey_date))
    .filter((y): y is number => y !== null);

  return {
    outstandingCount: outstanding.length,
    latestOutstandingSurveyDate: outstandingDates.length > 0 ? outstandingDates[outstandingDates.length - 1]! : null,
    harmYear: harmYears.length > 0 ? Math.max(...harmYears) : null,
    stateMedianRnHours,
    totalDeficiencies: deficiencies.length,
  };
}

export function generateMetaDescription(facility: Facility, facts: DescriptionFacts): string {
  const where = `${facility.name} in ${facility.city}, ${facility.state}`;
  const grade = gradeClause(facility);
  const rn = facility.rn_hours_per_resident_day;

  // 1. Unresolved violations — the single most decision-relevant fact.
  if (facts.outstandingCount > 0) {
    const y = year(facts.latestOutstandingSurveyDate);
    const noun = facts.outstandingCount === 1 ? "unresolved federal violation" : "unresolved federal violations";
    // Only claim a date when we have a real one.
    const asOf = y !== null ? ` as of the ${y} inspection` : "";
    return tidy(`${where} has ${facts.outstandingCount} ${noun}${asOf}. ${grade}.`);
  }

  // 2. Actual harm on record.
  if (facts.harmYear !== null) {
    return tidy(`${where} was cited for actual harm to residents in ${facts.harmYear}. ${grade}.`);
  }

  // 3. RN staffing notably above or below the state median.
  if (rn !== null && facts.stateMedianRnHours !== null && facts.stateMedianRnHours > 0) {
    const pct = Math.round(((rn - facts.stateMedianRnHours) / facts.stateMedianRnHours) * 100);
    if (Math.abs(pct) >= NOTABLE_PCT) {
      const direction = pct > 0 ? "above" : "below";
      return tidy(
        `${where} provides ${rn.toFixed(2)} RN hours per resident daily, ${Math.abs(pct)}% ${direction} the ${facility.state} median. ${grade}.`,
      );
    }
  }

  // 4. Fallback — still specific to this facility, and every value is real.
  const parts: string[] = [];
  if (facts.totalDeficiencies !== null) {
    parts.push(`${facts.totalDeficiencies} federal ${facts.totalDeficiencies === 1 ? "deficiency" : "deficiencies"}`);
  }
  if (rn !== null) {
    parts.push(`${rn.toFixed(2)} RN hours per resident day`);
  }

  if (parts.length === 0) {
    // Nothing beyond identity and grade is known. Say only what is true.
    return tidy(`${where}. ${grade}, based on federal CMS inspection and staffing data.`);
  }

  return tidy(`${where}. ${grade}, based on ${parts.join(" and ")}.`);
}
