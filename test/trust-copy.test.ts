import { describe, expect, it } from "vitest";
import { howWeGradePage } from "../src/templates/how-we-grade";
import { dataSourcesPage } from "../src/templates/data-sources";

describe("public grading explanation", () => {
  it("documents both penalties and the no-plan hard cap", () => {
    const html = howWeGradePage();
    expect(html).toContain("Unresolved findings");
    expect(html).toContain("Actual harm");
    expect(html).toContain("No-plan rule");
    expect(html).toContain("cannot receive an A");
  });

  it("does not promise component outcomes from the composite letter", () => {
    const html = howWeGradePage();
    expect(html).not.toContain("Excellent staffing, clean inspection records");
    expect(html).not.toContain("Some deficiencies on record but no pattern of severe harm");
    expect(html).toContain("composite result");
  });
});

describe("data source disclosure", () => {
  const releases = [
    {
      source_key: "penalties",
      label: "Penalties",
      cms_release_date: "2026-08-26",
      ingested_at: "2026-09-04T20:00:00.000Z",
      source_url: "https://data.cms.gov/provider-data/dataset/g6vv-u9sr",
    },
  ];

  it("identifies penalties as an active source", () => {
    const html = dataSourcesPage(releases);
    expect(html).toContain("Civil money penalties");
    expect(html).toContain("facility's enforcement history");
    expect(html).not.toContain("including Payroll-Based Journal daily staffing, MDS quality measures, and civil money penalties");
  });

  it("distinguishes CMS release from NursingHomeGrade import time", () => {
    const html = dataSourcesPage(releases);
    expect(html).toContain("CMS public release");
    expect(html).toContain("Imported by NursingHomeGrade");
    expect(html).toContain("August 26, 2026");
    expect(html).toContain("September 4, 2026");
  });
});
