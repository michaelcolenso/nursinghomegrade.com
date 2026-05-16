import { describe, expect, it } from "vitest";
import { facilityPage } from "../src/templates/facility";
import type { FacilityPageData, Deficiency } from "../src/types";

const baseFacility: FacilityPageData = {
  cms_id: "015001",
  name: "Sunrise Care Center",
  address: "123 Main St",
  city: "Birmingham",
  state: "AL",
  zip: "35201",
  latitude: 33.5186,
  longitude: -86.8104,
  overall_rating: 3,
  quality_rating: 4,
  staffing_rating: 2,
  inspection_rating: 3,
  rn_hours_per_resident_day: 0.48,
  total_deficiencies: 7,
  grade_score: 62,
  grade_letter: "C",
  grade_summary: "Staffing is slightly below ideal but quality is mixed.",
  slug: "sunrise-care-center",
  updated_at: "2026-01-01T00:00:00.000Z",
  complaint_deficiencies_cycle_1: 2,
};

const sampleDeficiency: Deficiency = {
  id: 1,
  cms_id: "015001",
  survey_date: "2023-03-02",
  deficiency_category: "Infection Control Deficiencies",
  deficiency_tag_number: "0880",
  deficiency_description: "Provide and implement an infection prevention and control program.",
  scope_severity_code: "F",
  deficiency_corrected: "Deficient, Provider has date of correction",
  correction_date: "2023-04-06",
  inspection_cycle: 1,
  standard_deficiency: "Y",
  complaint_deficiency: "N",
};

describe("facilityPage", () => {
  it("renders basic facility info", () => {
    const html = facilityPage(baseFacility, []);
    expect(html).toContain("Sunrise Care Center");
    expect(html).toContain("123 Main St");
    expect(html).toContain("Birmingham, AL 35201");
  });

  it("renders quality breakdown cards", () => {
    const html = facilityPage(baseFacility, []);
    expect(html).toContain('class="table-container quality-breakdown"');
    expect(html).toContain('class="quality-table"');
    expect(html).toContain('class="quality-value-cell"');
    expect(html).toContain("RN Staffing");
    expect(html).toContain("Health Deficiencies");
    expect(html).toContain("CMS Ratings");
  });

  it("renders actual deficiency details when available", () => {
    const html = facilityPage(baseFacility, [sampleDeficiency]);
    expect(html).toContain("Inspection Deficiencies");
    expect(html).toContain("Provide and implement an infection prevention and control program.");
    expect(html).toContain("F0880");
    expect(html).toContain("Status: Corrected");
  });

  it("shows empty state when no deficiencies available", () => {
    const html = facilityPage(baseFacility, []);
    expect(html).toContain("No deficiencies reported for this facility.");
  });

  it("uses live route shapes for breadcrumb links and structured data", () => {
    const html = facilityPage(baseFacility, []);
    expect(html).toContain('href="/state/alabama"');
    expect(html).toContain('href="/state/alabama/birmingham"');
    expect(html).toContain('"item":"https://nursinghomegrade.com/state/alabama"');
    expect(html).toContain('"item":"https://nursinghomegrade.com/state/alabama/birmingham"');
    expect(html).not.toContain("/states/al");
    expect(html).not.toContain("/city/al/birmingham");
  });
});
