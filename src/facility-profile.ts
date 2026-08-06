// Derivations for the facility page's identity, verdict, contact, enforcement
// and metadata blocks.
//
// Everything here is pure and deterministic: same row in, same string out. No
// branch may emit a placeholder, an inferred value, or a judgement about
// whether a facility is good, safe, or advisable. When a field is missing the
// derivation returns null and the caller renders nothing.

import type { Facility, FacilityPenalty } from "./types";

/** CMS publishes phone numbers as 10 digits with no punctuation. */
export function formatPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  // Anything else is not a phone number we can vouch for. Better to show
  // nothing than to publish a mangled number a family might dial.
  return null;
}

/** `tel:` href for a number that formatPhone accepted, else null. */
export function telHref(raw: string | null | undefined): string | null {
  if (!formatPhone(raw)) return null;
  const digits = (raw ?? "").replace(/\D/g, "");
  return `tel:+1${digits.length === 11 ? digits.slice(1) : digits}`;
}

/**
 * True when CMS classifies the facility as government owned (federal, state,
 * county, city, or hospital district). These are the facilities whose records
 * are subject to public audit, and the only ones we title as such.
 */
export function isGovernmentOwned(f: Facility): boolean {
  return (f.ownership_type ?? "").toLowerCase().startsWith("government");
}

/** Short ownership category: "For profit", "Non profit", "Government". */
export function ownershipCategory(f: Facility): string | null {
  const t = f.ownership_type;
  if (!t) return null;
  const head = t.split("-")[0]?.trim();
  return head && head.length > 0 ? head : t;
}

export function formatDollars(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return null;
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Formats any date CMS publishes about a facility.
 *
 * The lower bound is 1900, not 1990: certification dates legitimately reach
 * back to the start of Medicare in 1966, and a tighter bound silently dropped
 * the "certified since" fact for every facility certified before 1990. The
 * bound exists only to reject sentinel and corrupt values that would render as
 * an implausible year.
 */
export function formatIsoDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1900 || y > 2100) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * Year of an inspection or survey date. Bounded at 1990 rather than 1900
 * because the only callers describe recent survey activity — a 1970 survey year
 * in that sentence would be a data error, not a fact worth publishing.
 */
export function yearOf(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  return y >= 1990 && y <= 2100 ? y : null;
}

// ── Enforcement ──────────────────────────────────────────────────────────────

export interface PenaltySummary {
  /** Individual enforcement rows we hold for this facility. */
  actions: FacilityPenalty[];
  fineCount: number;
  fineTotal: number | null;
  paymentDenialCount: number;
  /**
   * True only when we can affirmatively state the facility has no penalty in
   * the covered window — i.e. the aggregate counts CMS publishes are present
   * and zero. A facility whose aggregates we simply do not hold is not "clean".
   */
  affirmativelyNone: boolean;
  /** True when we hold no per-action rows and no aggregate counts at all. */
  unknown: boolean;
}

export function summarizePenalties(f: Facility, penalties: FacilityPenalty[] | null): PenaltySummary {
  const actions = penalties ?? [];
  const fines = actions.filter((p) => (p.penalty_type ?? "").toLowerCase() === "fine");
  const denials = actions.filter((p) => (p.penalty_type ?? "").toLowerCase().includes("denial"));

  const fineTotalFromRows = fines.reduce<number | null>(
    (sum, p) => (p.fine_amount === null ? sum : (sum ?? 0) + p.fine_amount),
    null,
  );

  const aggregatesPresent =
    f.total_penalties !== null && f.total_penalties !== undefined
      ? true
      : f.number_of_fines !== null && f.number_of_fines !== undefined;

  const fineCount = fines.length > 0 ? fines.length : (f.number_of_fines ?? 0);
  const paymentDenialCount = denials.length > 0 ? denials.length : (f.number_of_payment_denials ?? 0);
  const fineTotal = fineTotalFromRows ?? f.total_fines_dollars ?? null;

  const aggregateZero =
    aggregatesPresent &&
    (f.total_penalties ?? 0) === 0 &&
    (f.number_of_fines ?? 0) === 0 &&
    (f.number_of_payment_denials ?? 0) === 0;

  return {
    actions,
    fineCount,
    fineTotal: fineTotal === null ? null : fineTotal,
    paymentDenialCount,
    affirmativelyNone: actions.length === 0 && aggregateZero,
    unknown: actions.length === 0 && !aggregatesPresent,
  };
}

// ── Verdict ──────────────────────────────────────────────────────────────────

export interface VerdictInputs {
  /** Deficiency counts across the three survey cycles the page renders. */
  deficiencies: { total: number; outstanding: number; harm: number } | null;
  penalties: PenaltySummary;
}

/**
 * A two-to-three sentence factual summary built only from published ratings and
 * inspection records. Each sentence attributes its source. No sentence
 * characterises the facility as good, bad, safe, or unsafe, and no sentence is
 * emitted when the facts behind it are missing.
 */
export function buildVerdict(f: Facility, inputs: VerdictInputs): string {
  const sentences: string[] = [];

  const ratingParts: string[] = [];
  if (f.inspection_rating !== null) ratingParts.push(`${f.inspection_rating} of 5 for health inspections`);
  if (f.staffing_rating !== null) ratingParts.push(`${f.staffing_rating} of 5 for staffing`);
  if (f.quality_rating !== null) ratingParts.push(`${f.quality_rating} of 5 for quality measures`);

  if (f.overall_rating !== null) {
    const detail = ratingParts.length > 0 ? `, with ${ratingParts.join(", ")}` : "";
    sentences.push(`CMS rates ${f.name} ${f.overall_rating} out of 5 stars overall${detail}.`);
  } else if (ratingParts.length > 0) {
    sentences.push(`CMS rates ${f.name} ${ratingParts.join(", ")}.`);
  }

  const d = inputs.deficiencies;
  if (d && d.total > 0) {
    const surveyYear = yearOf(f.latest_standard_survey_date);
    const asOf = surveyYear !== null ? `, most recently surveyed in ${surveyYear}` : "";
    const clauses = [`${d.total} health ${d.total === 1 ? "deficiency" : "deficiencies"} across the last three survey cycles${asOf}`];
    if (d.harm > 0) clauses.push(`${d.harm} at actual-harm level or higher`);
    if (d.outstanding > 0) clauses.push(`${d.outstanding} still recorded as uncorrected`);
    sentences.push(`Federal inspectors cited ${clauses.join(", ")}.`);
  } else if (d && d.total === 0) {
    sentences.push(`Federal inspectors recorded no health deficiencies for this facility across the last three survey cycles.`);
  }

  const p = inputs.penalties;
  if (p.fineCount > 0 || p.paymentDenialCount > 0) {
    const parts: string[] = [];
    if (p.fineCount > 0) {
      const total = formatDollars(p.fineTotal);
      parts.push(`${p.fineCount} ${p.fineCount === 1 ? "fine" : "fines"}${total ? ` totalling ${total}` : ""}`);
    }
    if (p.paymentDenialCount > 0) {
      parts.push(`${p.paymentDenialCount} ${p.paymentDenialCount === 1 ? "payment denial" : "payment denials"}`);
    }
    sentences.push(`CMS enforcement records list ${parts.join(" and ")}.`);
  } else if (p.affirmativelyNone) {
    sentences.push(`CMS lists no fines or payment denials for this facility in the covered period.`);
  }

  // Never return an empty verdict block — the caller renders nothing when this
  // is empty rather than printing a heading over blank space.
  return sentences.join(" ");
}

// ── Titles and descriptions ──────────────────────────────────────────────────

const BRAND = "NursingHomeGrade";
/**
 * Upper bound on title length. Google truncates around 60-70 characters
 * depending on pixel width; past this we shed the brand suffix and then the
 * connective words rather than let the tail be cut mid-phrase.
 */
export const TITLE_SOFT_LIMIT = 70;

/**
 * Conditional title patterns keyed to the intent the page can actually satisfy.
 *
 * - Government-owned facilities render an audit/inspection-records section, so
 *   they get the audit pattern.
 * - Everything else gets the reviews/ratings/inspections pattern, because every
 *   facility page renders official-record analysis under that heading.
 *
 * Long facility names drop the brand suffix, then the connective words, rather
 * than being truncated mid-name.
 */
export function buildFacilityTitle(f: Facility): string {
  const keyword = isGovernmentOwned(f) ? "Audit, Inspections & Ratings" : "Reviews, Ratings & Inspections";
  const full = `${f.name} ${keyword} | ${BRAND}`;
  if (full.length <= TITLE_SOFT_LIMIT) return full;

  const withoutBrand = `${f.name} ${keyword}`;
  if (withoutBrand.length <= TITLE_SOFT_LIMIT) return withoutBrand;

  const shortKeyword = isGovernmentOwned(f) ? "Audit & Inspections" : "Reviews & Inspections";
  const short = `${f.name} ${shortKeyword}`;
  if (short.length <= TITLE_SOFT_LIMIT) return short;

  // Name alone already exceeds the limit. Keep the name whole — a truncated
  // facility name is worse than a long title — and append nothing.
  return f.name;
}

/** Contact facts we can publish, all sourced, none inferred. */
export interface ContactFacts {
  phone: string | null;
  telHref: string | null;
  addressLine: string;
  legalName: string | null;
  ownership: string | null;
  providerNumber: string;
  /** CMS's own profile page for this CCN — the authoritative external record. */
  cmsProfileUrl: string;
  verifiedOn: string | null;
  /**
   * Always false: no federal nursing-home file publishes an email address, so
   * the page states that rather than leaving a silent gap a reader might read
   * as an oversight.
   */
  hasEmail: false;
}

export function buildContactFacts(f: Facility): ContactFacts {
  return {
    phone: formatPhone(f.phone),
    telHref: telHref(f.phone),
    addressLine: `${f.address}, ${f.city}, ${f.state} ${f.zip}`,
    legalName: f.legal_business_name && f.legal_business_name.trim() !== "" ? f.legal_business_name : null,
    ownership: f.ownership_type && f.ownership_type.trim() !== "" ? f.ownership_type : null,
    providerNumber: f.cms_id,
    cmsProfileUrl: `https://www.medicare.gov/care-compare/details/nursing-home/${f.cms_id}`,
    verifiedOn: formatIsoDate(f.cms_processing_date),
    hasEmail: false,
  };
}
