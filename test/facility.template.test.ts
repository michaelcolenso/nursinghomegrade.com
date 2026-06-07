import { describe, expect, it } from "vitest";
import { facilityPage } from "../src/templates/facility";
import type { FacilityPageData, Deficiency, Trajectory, Operator } from "../src/types";

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

const nearbyFacility = {
  ...baseFacility,
  cms_id: "015002",
  name: "Birmingham Skilled Nursing",
  address: "456 Oak Ave",
  grade_score: 84,
  grade_letter: "B",
  slug: "birmingham-skilled-nursing",
  rn_hours_per_resident_day: 0.72,
  total_deficiencies: 3,
};

const sampleTrajectory: Trajectory = {
  cms_id: "015001",
  status: "improving",
  staffing_change_pct: 22,
  deficiency_change_pct: -18,
  grade_change: 8,
  rn_hours_trend: "up",
};

const sampleOperator: Operator = {
  id: 1,
  normalized_name: "SUNRISE HEALTHCARE",
  slug: "sunrise-healthcare",
  facility_count: 12,
  avg_grade: 58,
  avg_staffing_score: 0.52,
  avg_deficiency_score: 6.2,
  avg_penalty_score: null,
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

  it("renders nearby facilities with internal links and compare entry point", () => {
    const html = facilityPage(baseFacility, [], [nearbyFacility]);
    expect(html).toContain("Nearby facilities in Birmingham");
    expect(html).toContain("Compare local nursing homes");
    expect(html).toContain('href="/facility/015002-birmingham-skilled-nursing"');
    expect(html).toContain('href="/compare?ids=015001%2C015002"');
    expect(html).toContain("0.72 hrs");
    expect(html).toContain("3</strong> deficiencies");
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

  it("renders enhanced NursingHome schema with geo and url", () => {
    const html = facilityPage(baseFacility, []);
    expect(html).toContain('"@type":"NursingHome"');
    expect(html).toContain('"url":"https://nursinghomegrade.com/facility/015001-sunrise-care-center"');
    expect(html).toContain('"@type":"GeoCoordinates"');
    expect(html).toContain('"latitude":33.5186');
    expect(html).toContain('"longitude":-86.8104');
  });

  it("omits geo from schema when coordinates are unavailable", () => {
    const noGeo = { ...baseFacility, latitude: null, longitude: null };
    const html = facilityPage(noGeo, []);
    expect(html).toContain('"@type":"NursingHome"');
    expect(html).not.toContain('"@type":"GeoCoordinates"');
  });

  it("renders trajectory badge when provided", () => {
    const html = facilityPage(baseFacility, [], [], [], sampleTrajectory);
    expect(html).toContain("improving");
    expect(html).toContain("▲");
    expect(html).toContain("Staffing +22%");
    expect(html).toContain("Deficiencies -18%");
  });

  it("renders assessment when provided", () => {
    const assessment = "This facility is improving. RN staffing up 22%.";
    const html = facilityPage(baseFacility, [], [], [], null, assessment);
    expect(html).toContain("Facility Assessment");
    expect(html).toContain(assessment);
  });

  it("renders operator link when provided", () => {
    const html = facilityPage(baseFacility, [], [], [], null, "", "", sampleOperator);
    expect(html).toContain('href="/operator/sunrise-healthcare"');
    expect(html).toContain("SUNRISE HEALTHCARE");
    expect(html).toContain("12 facilities");
  });

  it("uses summary for meta description when provided", () => {
    const summary = "Custom summary for SEO.";
    const html = facilityPage(baseFacility, [], [], [], null, "", summary);
    expect(html).toContain("Custom summary for SEO.");
  });
});
