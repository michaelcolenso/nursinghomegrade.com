import { describe, expect, it } from "vitest";
import { buildInspectionSummary } from "../src/inspection-summary";
import type { Deficiency } from "../src/types";

const deficiency: Deficiency = {
  id: 1, cms_id: "015001", survey_date: "2026-01-01",
  deficiency_category: null, deficiency_tag_number: null,
  deficiency_description: null, scope_severity_code: "F",
  deficiency_corrected: "Deficient, Provider has date of correction",
  correction_date: "2026-02-01", inspection_cycle: 1,
  standard_deficiency: "Y", complaint_deficiency: "N",
};
const facility = { inspection_rating: 2 };

describe("buildInspectionSummary", () => {
  it("uses available rows, not a latest-cycle aggregate, and bounds G–L and J–L", () => {
    const rows = ["A", "F", "G", "H", "I", "J", "K", "L", "M", "JJ", null].map(
      (scope_severity_code, index) => ({ ...deficiency, id: index, scope_severity_code, inspection_cycle: index % 3 + 1 }),
    );
    const summary = buildInspectionSummary(facility, rows);
    expect(summary).toContain("11 deficiencies in the available inspection records");
    expect(summary).toContain("6 involved actual harm or worse (G–L), including 3 at immediate jeopardy level (J–L)");
    expect(summary).toContain("3 with unknown severity");
    expect(summary).toContain("0 outstanding, 11 recorded as corrected, 0 unknown");
  });

  it("keeps both open statuses outstanding even with a conflicting correction date", () => {
    const summary = buildInspectionSummary(facility, [
      { ...deficiency, deficiency_corrected: "Deficient, Provider has plan of correction" },
      { ...deficiency, deficiency_corrected: "Deficient, Provider has no plan of correction" },
      deficiency,
      { ...deficiency, deficiency_corrected: null },
      { ...deficiency, deficiency_corrected: "unrecognised status" },
    ]);
    expect(summary).toContain("2 outstanding, 1 recorded as corrected, 2 unknown");
    expect(summary).toContain("not current conditions or a guarantee of safety");
  });

  it("does not turn a failed lookup into zero findings", () => {
    const summary = buildInspectionSummary(facility, null);
    expect(summary).toContain("CMS health inspection rating: 2 out of 5 stars");
    expect(summary).toContain("could not be loaded");
    expect(summary).toContain("correction status are unknown");
    expect(summary).not.toContain("0 deficiencies");
  });

  it("reports zero rows without claiming a clean inspection history", () => {
    const summary = buildInspectionSummary(facility, []);
    expect(summary).toContain("0 deficiencies in the available inspection records");
    expect(summary).toContain("0 outstanding, 0 recorded as corrected, 0 unknown");
    expect(summary).not.toMatch(/excellent|strong|clean inspection/i);
  });

  it.each([null, 0, 6, 1.5, NaN])("does not invent a CMS rating for %s", (inspection_rating) => {
    expect(buildInspectionSummary({ inspection_rating }, [])).toContain("CMS health inspection rating is not available");
  });

  it.each([1, 2, 3, 4, 5])("uses the CMS inspection rating %s directly", (inspection_rating) => {
    expect(buildInspectionSummary({ inspection_rating }, [deficiency])).toContain(`CMS health inspection rating: ${inspection_rating} out of 5 stars`);
  });
});
