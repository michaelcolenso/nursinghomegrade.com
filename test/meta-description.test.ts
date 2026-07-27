import { describe, expect, it } from "vitest";
import { generateMetaDescription, deriveDescriptionFacts, type DescriptionFacts } from "../src/meta-description";
import type { Facility, Deficiency } from "../src/types";

const base: Facility = {
  cms_id: "015001",
  name: "Sunrise Care Center",
  address: "123 Main St",
  city: "Birmingham",
  state: "AL",
  zip: "35201",
  latitude: 33.5,
  longitude: -86.8,
  overall_rating: 3,
  quality_rating: 4,
  staffing_rating: 2,
  inspection_rating: 3,
  rn_hours_per_resident_day: 0.48,
  total_deficiencies: 7,
  grade_score: 62,
  grade_letter: "C",
  grade_summary: "",
  slug: "sunrise-care-center",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const noFacts: DescriptionFacts = {
  outstandingCount: 0,
  latestOutstandingSurveyDate: null,
  harmYear: null,
  stateMedianRnHours: null,
  totalDeficiencies: null,
};

function def(p: Partial<Deficiency>): Deficiency {
  return {
    id: 1,
    cms_id: "015001",
    survey_date: "2025-03-14",
    deficiency_category: "Quality of Care",
    deficiency_tag_number: "F684",
    deficiency_description: "d",
    scope_severity_code: "D",
    deficiency_corrected: "Deficient, Provider has date of correction",
    correction_date: "2025-04-01",
    inspection_cycle: 1,
    standard_deficiency: "Y",
    complaint_deficiency: "N",
    ...p,
  } as Deficiency;
}

describe("meta description: forbidden content", () => {
  // The spec's hard requirement. Every branch of the cascade, plus the derived
  // paths, must be free of placeholder text and malformed interpolation.
  const cases: Array<[string, string]> = [
    ["outstanding", generateMetaDescription(base, { ...noFacts, outstandingCount: 3, latestOutstandingSurveyDate: "2025-03-14" })],
    ["outstanding without date", generateMetaDescription(base, { ...noFacts, outstandingCount: 1 })],
    ["harm", generateMetaDescription(base, { ...noFacts, harmYear: 2024 })],
    ["staffing below median", generateMetaDescription(base, { ...noFacts, stateMedianRnHours: 0.8 })],
    ["staffing above median", generateMetaDescription({ ...base, rn_hours_per_resident_day: 1.2 }, { ...noFacts, stateMedianRnHours: 0.8 })],
    ["fallback with both", generateMetaDescription(base, { ...noFacts, totalDeficiencies: 7 })],
    ["fallback deficiencies only", generateMetaDescription({ ...base, rn_hours_per_resident_day: null }, { ...noFacts, totalDeficiencies: 7 })],
    ["fallback bare", generateMetaDescription({ ...base, rn_hours_per_resident_day: null }, noFacts)],
    ["zero deficiencies", generateMetaDescription(base, { ...noFacts, totalDeficiencies: 0 })],
    ["lookup failed", generateMetaDescription(base, deriveDescriptionFacts(null))],
  ];

  for (const [label, text] of cases) {
    it(`${label}: contains no placeholder or malformed value`, () => {
      for (const bad of ["unknown", "null", "undefined", "NaN", "Infinity", "[object"]) {
        expect(text.toLowerCase()).not.toContain(bad.toLowerCase());
      }
      expect(text).not.toMatch(/ {2}/);
      expect(text).not.toMatch(/\s\./);
      expect(text.trim()).toBe(text);
      expect(text.length).toBeGreaterThan(20);
    });
  }
});

describe("meta description: cascade priority", () => {
  it("leads with unresolved violations when present", () => {
    const t = generateMetaDescription(base, {
      ...noFacts,
      outstandingCount: 3,
      latestOutstandingSurveyDate: "2025-03-14",
      harmYear: 2024,
      totalDeficiencies: 19,
    });
    expect(t).toContain("3 unresolved federal violations");
    expect(t).toContain("2025");
    expect(t).toContain("Grade C (62/100)");
  });

  it("singularizes a lone violation", () => {
    const t = generateMetaDescription(base, { ...noFacts, outstandingCount: 1 });
    expect(t).toContain("1 unresolved federal violation.");
    expect(t).not.toContain("violations");
  });

  it("falls to harm when nothing is outstanding", () => {
    const t = generateMetaDescription(base, { ...noFacts, harmYear: 2024, totalDeficiencies: 9 });
    expect(t).toContain("cited for actual harm to residents in 2024");
  });

  it("uses staffing only when the gap from the median is notable", () => {
    const notable = generateMetaDescription(base, { ...noFacts, stateMedianRnHours: 0.8, totalDeficiencies: 7 });
    expect(notable).toContain("40% below the AL median");

    // 0.48 vs 0.50 is a 4% gap — not notable, so it must fall through.
    const slight = generateMetaDescription(base, { ...noFacts, stateMedianRnHours: 0.5, totalDeficiencies: 7 });
    expect(slight).not.toContain("median");
    expect(slight).toContain("7 federal deficiencies");
  });

  it("produces different text for facilities that differ only in their facts", () => {
    const a = generateMetaDescription(base, { ...noFacts, outstandingCount: 3 });
    const b = generateMetaDescription(base, { ...noFacts, harmYear: 2024 });
    const c = generateMetaDescription(base, { ...noFacts, totalDeficiencies: 7 });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe("deriveDescriptionFacts", () => {
  it("counts only genuinely open findings", () => {
    const facts = deriveDescriptionFacts([
      def({ deficiency_corrected: "Deficient, Provider has no plan of correction" }),
      def({ deficiency_corrected: "Deficient, Provider has plan of correction" }),
      def({ deficiency_corrected: "Deficient, Provider has date of correction" }),
      def({ deficiency_corrected: "Past Non-Compliance" }),
    ]);
    expect(facts.outstandingCount).toBe(2);
    expect(facts.totalDeficiencies).toBe(4);
  });

  it("takes the most recent harm year and ignores non-harm severities", () => {
    const facts = deriveDescriptionFacts([
      def({ scope_severity_code: "G", survey_date: "2023-05-01" }),
      def({ scope_severity_code: "J", survey_date: "2025-06-01" }),
      def({ scope_severity_code: "D", survey_date: "2026-01-01" }),
    ]);
    expect(facts.harmYear).toBe(2025);
  });

  it("reports no harm year when no citation reaches G", () => {
    expect(deriveDescriptionFacts([def({ scope_severity_code: "F" })]).harmYear).toBeNull();
  });

  it("ignores unparseable and implausible survey dates", () => {
    const facts = deriveDescriptionFacts([def({ scope_severity_code: "G", survey_date: "not-a-date" })]);
    expect(facts.harmYear).toBeNull();
  });

  it("returns null totals when the lookup failed", () => {
    const facts = deriveDescriptionFacts(null);
    expect(facts.totalDeficiencies).toBeNull();
    expect(facts.outstandingCount).toBe(0);
  });
});
