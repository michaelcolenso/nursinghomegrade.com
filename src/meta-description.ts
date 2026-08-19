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

/**
 * Whether the facility's grade belongs in the SERP snippet at all.
 *
 * A grade only helps a searcher decide to click when it is a point in the
 * facility's favour — an A or B. For C, D and F the letter in the snippet
 * broadcasts a verdict with zero context: this is the exact pattern that left
 * 'Salyersville Grade F 7/100' at position 6 with 434 impressions and a 0%
 * CTR. Low grades are therefore omitted from the snippet so it leads with
 * what the report contains; the grade itself is still rendered on the page,
 * in the score hero and the ratings breakdown.
 */
export function shouldShowGrade(f: Facility): boolean {
  return f.grade_letter === "A" || f.grade_letter === "B";
}

/**
 * Sentence-fragment form of the grade for branches that include it, including
 * the leading space and trailing period. Empty string when the grade is
 * suppressed, so callers can interpolate it directly after any full stop.
 */
function gradeSentence(f: Facility): string {
  return shouldShowGrade(f) ? ` Grade ${f.grade_letter} (${f.grade_score}/100).` : "";
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
  // Present only for A/B — see shouldShowGrade. Every branch below leads with
  // what the report contains and appends the grade only when it helps the
  // searcher decide to click.
  const grade = gradeSentence(facility);
  const rn = facility.rn_hours_per_resident_day;

  // 1. Unresolved violations — the single most decision-relevant fact.
  if (facts.outstandingCount > 0) {
    const y = year(facts.latestOutstandingSurveyDate);
    const noun = facts.outstandingCount === 1 ? "unresolved federal violation" : "unresolved federal violations";
    // Only claim a date when we have a real one.
    const asOf = y !== null ? ` as of the ${y} inspection` : "";
    return tidy(`${where} has ${facts.outstandingCount} ${noun}${asOf}.${grade}`);
  }

  // 2. Actual harm on record.
  if (facts.harmYear !== null) {
    return tidy(`${where} was cited for actual harm to residents in ${facts.harmYear}.${grade}`);
  }

  // 3. RN staffing notably above or below the state median.
  if (rn !== null && facts.stateMedianRnHours !== null && facts.stateMedianRnHours > 0) {
    const pct = Math.round(((rn - facts.stateMedianRnHours) / facts.stateMedianRnHours) * 100);
    if (Math.abs(pct) >= NOTABLE_PCT) {
      const direction = pct > 0 ? "above" : "below";
      return tidy(
        `${where} provides ${rn.toFixed(2)} RN hours per resident daily, ${Math.abs(pct)}% ${direction} the ${facility.state} median.${grade}`,
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
    // Nothing beyond identity is known. Describe what the report covers
    // without asserting that any particular record exists.
    return tidy(`${where}.${grade} See inspection records, staffing data, and ratings in the full report.`);
  }

  return tidy(`${where}.${grade} Based on ${parts.join(" and ")}.`);
}
