import { describe, expect, it } from "vitest";
import {
  buildContactFacts,
  buildFacilityTitle,
  buildVerdict,
  formatPhone,
  isGovernmentOwned,
  summarizePenalties,
  telHref,
  TITLE_SOFT_LIMIT,
} from "../src/facility-profile";
import type { Facility, FacilityPenalty } from "../src/types";

const base: Facility = {
  cms_id: "345403",
  name: "Highfield Nursing and Rehabilitation",
  address: "6590 Tryon Road",
  city: "Cary",
  state: "NC",
  zip: "27518",
  latitude: 35.75,
  longitude: -78.82,
  overall_rating: 1,
  quality_rating: 4,
  staffing_rating: 1,
  inspection_rating: 2,
  rn_hours_per_resident_day: 0.32841,
  total_deficiencies: 12,
  grade_score: 41,
  grade_letter: "F",
  grade_summary: "Below benchmark staffing.",
  slug: "highfield-nursing-and-rehabilitation",
  updated_at: "2026-07-10T00:00:00.000Z",
  phone: "9198518000",
  ownership_type: "For profit - Corporation",
  legal_business_name: "6590 TRYON ROAD OPCO LLC",
  provider_type: "Medicare and Medicaid",
  certified_beds: 120,
  cms_processing_date: "2026-07-01",
  latest_standard_survey_date: "2026-03-26",
  number_of_fines: 2,
  total_fines_dollars: 175559,
  number_of_payment_denials: 0,
  total_penalties: 2,
};

describe("formatPhone", () => {
  it("formats the ten digits CMS publishes", () => {
    expect(formatPhone("9198518000")).toBe("(919) 851-8000");
    expect(telHref("9198518000")).toBe("tel:+19198518000");
  });

  it("returns null rather than a mangled number for anything unparseable", () => {
    // A partial number is worse than no number: a family would dial it.
    expect(formatPhone("919851")).toBeNull();
    expect(formatPhone("")).toBeNull();
    expect(formatPhone(null)).toBeNull();
    expect(formatPhone(undefined)).toBeNull();
    expect(telHref("919851")).toBeNull();
  });
});

describe("buildContactFacts", () => {
  it("never exposes an email field, because the source data has none", () => {
    const facts = buildContactFacts(base);
    expect(facts.hasEmail).toBe(false);
    expect(JSON.stringify(facts).toLowerCase()).not.toContain("@");
  });

  it("omits phone entirely when CMS publishes none", () => {
    const facts = buildContactFacts({ ...base, phone: null });
    expect(facts.phone).toBeNull();
    expect(facts.telHref).toBeNull();
  });

  it("links the CMS record by provider number", () => {
    expect(buildContactFacts(base).cmsProfileUrl).toContain("345403");
  });
});

describe("buildFacilityTitle", () => {
  it("uses the reviews pattern for a private facility", () => {
    expect(buildFacilityTitle({ ...base, name: "Embassy of Scranton" })).toBe(
      "Embassy of Scranton Reviews, Ratings & Inspections | NursingHomeGrade",
    );
  });

  it("uses the audit pattern only for government-owned facilities", () => {
    const gov = { ...base, name: "Coos County Nursing Home", ownership_type: "Government - County" };
    expect(isGovernmentOwned(gov)).toBe(true);
    expect(buildFacilityTitle(gov)).toContain("Audit, Inspections & Ratings");
    expect(buildFacilityTitle(base)).not.toContain("Audit");
  });

  it("drops the brand suffix before it drops any part of the facility name", () => {
    const long = { ...base, name: "Greenville Health and Rehabilitation Center" };
    const title = buildFacilityTitle(long);
    expect(title).toContain("Greenville Health and Rehabilitation Center");
    expect(title).not.toContain("NursingHomeGrade");
    expect(title.length).toBeLessThanOrEqual(TITLE_SOFT_LIMIT);
  });

  it("keeps an extremely long name whole rather than truncating it", () => {
    const name = "The Rehabilitation and Skilled Nursing Center of Northwestern Metropolitan County";
    const title = buildFacilityTitle({ ...base, name });
    expect(title).toBe(name);
    expect(title).not.toContain("…");
    expect(title).not.toContain("...");
  });
});

describe("summarizePenalties", () => {
  const fine: FacilityPenalty = {
    id: 1,
    cms_id: "345403",
    penalty_date: "2024-09-01",
    penalty_type: "Fine",
    fine_amount: 175559,
    payment_denial_start_date: null,
    payment_denial_length_days: null,
    processing_date: "2026-07-01",
  };

  it("prefers per-action rows over aggregate counts", () => {
    const s = summarizePenalties(base, [fine]);
    expect(s.fineCount).toBe(1);
    expect(s.fineTotal).toBe(175559);
    expect(s.affirmativelyNone).toBe(false);
    expect(s.unknown).toBe(false);
  });

  it("states no penalties only when CMS aggregates are present and zero", () => {
    const clean = { ...base, number_of_fines: 0, total_fines_dollars: 0, number_of_payment_denials: 0, total_penalties: 0 };
    const s = summarizePenalties(clean, []);
    expect(s.affirmativelyNone).toBe(true);
    expect(s.unknown).toBe(false);
  });

  it("treats absent aggregates as unknown, never as a clean record", () => {
    const sparse: Facility = { ...base };
    delete sparse.number_of_fines;
    delete sparse.number_of_payment_denials;
    delete sparse.total_penalties;
    delete sparse.total_fines_dollars;
    const s = summarizePenalties(sparse, null);
    expect(s.unknown).toBe(true);
    expect(s.affirmativelyNone).toBe(false);
  });
});

describe("buildVerdict", () => {
  it("states ratings, inspection findings and enforcement, each attributed", () => {
    const verdict = buildVerdict(base, {
      deficiencies: { total: 43, outstanding: 2, harm: 5 },
      penalties: summarizePenalties(base, []),
    });
    expect(verdict).toContain("CMS rates");
    expect(verdict).toContain("43 health deficiencies");
    expect(verdict).toContain("5 at actual-harm level or higher");
    expect(verdict).toContain("2 still recorded as uncorrected");
    expect(verdict).toContain("$175,559");
    // Two to three sentences, not an essay.
    expect(verdict.split(". ").length).toBeLessThanOrEqual(4);
  });

  it("makes no judgement about whether the facility is good, bad or safe", () => {
    const verdict = buildVerdict(base, {
      deficiencies: { total: 43, outstanding: 2, harm: 5 },
      penalties: summarizePenalties(base, []),
    }).toLowerCase();
    for (const word of ["unsafe", "dangerous", "excellent", "best", "worst", "avoid", "recommend"]) {
      expect(verdict).not.toContain(word);
    }
  });

  it("says nothing about deficiencies when the lookup failed", () => {
    const verdict = buildVerdict(base, { deficiencies: null, penalties: summarizePenalties(base, []) });
    expect(verdict).not.toContain("deficienc");
  });

  it("returns an empty string when nothing is known", () => {
    const bare: Facility = {
      ...base,
      overall_rating: null,
      quality_rating: null,
      staffing_rating: null,
      inspection_rating: null,
    };
    delete bare.number_of_fines;
    delete bare.number_of_payment_denials;
    delete bare.total_penalties;
    delete bare.total_fines_dollars;
    expect(buildVerdict(bare, { deficiencies: null, penalties: summarizePenalties(bare, null) })).toBe("");
  });
});
