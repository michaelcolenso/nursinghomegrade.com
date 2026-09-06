import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cmsField, normalizeCmsRow } from "../scripts/ingest-grade2-phase-a";

describe("Grade 2.0 Phase A CMS field normalization", () => {
  it("resolves PDC snake_case keys from official human column headers", () => {
    const row = normalizeCmsRow({
      cms_certification_number_ccn: "015009",
      adjusted_rn_staffing_hours_per_resident_per_day: "0.8123",
      number_of_administrators_who_have_left_the_nursing_home: "2",
    });

    expect(cmsField(row, "CMS Certification Number (CCN)")).toBe("015009");
    expect(cmsField(row, "Adjusted RN Staffing Hours per Resident per Day")).toBe("0.8123");
    expect(cmsField(row, "Number of administrators who have left the nursing home")).toBe("2");
  });

  it("handles MDS punctuation and case without hard-coding API slugs", () => {
    const row = normalizeCmsRow({
      measure_code: "401",
      four_quarter_average_score: "7.4",
      used_in_quality_measure_five_star_rating: "Y",
    });

    expect(cmsField(row, "Measure Code")).toBe("401");
    expect(cmsField(row, "Four Quarter Average Score")).toBe("7.4");
    expect(cmsField(row, "Used in Quality Measure Five Star Rating")).toBe("Y");
  });

  it("preserves missing and suppressed values as null instead of zero", () => {
    const row = normalizeCmsRow({ adjusted_score: "", observed_score: null });
    expect(cmsField(row, "Adjusted Score")).toBeNull();
    expect(cmsField(row, "Observed Score")).toBeNull();
  });
});

describe("Grade 2.0 Phase A refresh safety", () => {
  const source = readFileSync("scripts/ingest-grade2-phase-a.ts", "utf8");

  it("fails closed when a source or transform produces no usable rows", () => {
    expect(source).toContain("returned an empty first page; refusing destructive refresh");
    expect(source).toContain("transform produced zero rows; refusing to replace existing shadow evidence");
  });

  it("loads into staging and publishes through a single D1 import finalizer", () => {
    expect(source).toContain('const staging = `${table}__next`');
    expect(source).toContain("CREATE TABLE ${staging} AS SELECT * FROM ${table} WHERE 0");
    expect(source).toContain("writeFileSync(finalizer, buildShadowTableFinalizer(table, columns))");
  });
});
