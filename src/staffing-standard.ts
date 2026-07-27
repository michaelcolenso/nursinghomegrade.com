// Single source of truth for how the site talks about the 2024 CMS minimum
// staffing standard.
//
// Regulatory status: the 0.55 RN hours-per-resident-day threshold came from the
// CMS 2024 final rule "Medicare and Medicaid Programs; Minimum Staffing
// Standards for Long-Term Care Facilities" (42 CFR 483.35). It was vacated by
// the N.D. Texas in April 2025 and by the N.D. Iowa in June 2025, placed under
// a statutory implementation moratorium through 2034-09-30 by Pub. L. 119-21
// (2025-07-04), and repealed by the CMS interim final rule published
// 2025-12-03, effective 2026-02-02.
//
// It is NOT current federal law. Every rendered reference to it must carry the
// repeal qualifier. NursingHomeGrade still grades against it as an
// evidence-based benchmark — see the report page linked below.

/** Repealed 2024 CMS threshold, in RN hours per resident per day. */
export const RN_BENCHMARK = 0.55;

/** Date the repeal took effect (CMS interim final rule, 90 FR, 2025-12-03). */
export const REPEAL_EFFECTIVE_DATE = "February 2, 2026";

export const REPEAL_REPORT_PATH = "/reports/staffing-standard-repeal";

/**
 * Label for a facility's RN hours relative to the repealed benchmark.
 * Source: CMS Provider Information file, column `reported_rn_staffing_hours_per_resident_per_day`.
 */
export function benchmarkLabel(meetsBenchmark: boolean): string {
  // "At or above", not "Above": the comparison is `>=`, so a facility reporting
  // exactly 0.55 satisfies it. Saying "above" of an equal value is false.
  return meetsBenchmark
    ? `At or above the repealed ${RN_BENCHMARK} hr benchmark`
    : `Below the repealed ${RN_BENCHMARK} hr benchmark`;
}

/** Short label for the table row description on facility pages. */
export const BENCHMARK_ROW_NOTE = `2024 federal benchmark: ${RN_BENCHMARK} hrs. Repealed ${REPEAL_EFFECTIVE_DATE.replace(/ \d+,/, "")}.`;

/** Plain-text form of the disclosure, for meta descriptions and non-HTML contexts. */
export const REPEAL_DISCLOSURE_TEXT = `The ${RN_BENCHMARK} hour RN standard was repealed effective ${REPEAL_EFFECTIVE_DATE} and is not currently enforced. We still grade against it.`;

/**
 * Persistent one-line disclosure rendered beneath every RN staffing figure and
 * beneath the headline staffing stat on the homepage and state pages.
 */
export function repealDisclosureHtml(): string {
  return `<p class="repeal-disclosure">${REPEAL_DISCLOSURE_TEXT} <a href="${REPEAL_REPORT_PATH}">Why</a></p>`;
}
