import { describe, expect, it } from "vitest";
import { facilityPage } from "../src/templates/facility";
import type { Deficiency, Facility, FacilityPageData, Trajectory } from "../src/types";

const base: FacilityPageData = {
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
  grade_summary: "Stored summary that must never be echoed for withheld grades.",
  grade_completeness: "complete",
  slug: "sunrise-care-center",
  updated_at: "2026-01-01T00:00:00.000Z",
  complaint_deficiencies_cycle_1: 0,
};

const def = (id: number, code: string, corrected: string, tag = "0880"): Deficiency => ({
  id, cms_id: "015001", survey_date: "2026-03-02", deficiency_category: "Quality of Care Deficiencies", deficiency_tag_number: tag,
  deficiency_description: `Citation ${id}`, scope_severity_code: code, deficiency_corrected: corrected, correction_date: null,
  inspection_cycle: 1, standard_deficiency: "Y", complaint_deficiency: "N",
});
const CORRECTED = "Deficient, Provider has date of correction";
const NO_PLAN = "Deficient, Provider has no plan of correction";

const nearby = { ...base, cms_id: "015002", name: "Pinecrest", slug: "pinecrest", grade_letter: "B", grade_score: 72 } as Facility;

describe("facility header", () => {
  const html = facilityPage(base, [def(1, "D", CORRECTED)]);

  it("shows the large score chip instead of a giant letter", () => {
    expect(html).toContain("chip chip--lg chip--C");
    expect(html).toContain(">62</span>");
    expect(html).toContain("Fair");
    expect(html).not.toContain("facility-grade-hero");
  });

  it("keeps the compare toggle contract and adds print and a JS-only share button", () => {
    expect(html).toContain('id="save-015001"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("compare-toggle-label");
    expect(html).toContain("window.print()");
    expect(html).toMatch(/<button[^>]*data-share[^>]*hidden/);
  });

  it("prints the page URL under the title (print only)", () => {
    expect(html).toContain('class="print-only print-url">https://nursinghomegrade.com/facility/015001-sunrise-care-center');
  });

  it("share script avoids the literals the sparse-data tests forbid", () => {
    const script = html.slice(html.indexOf("data-share]"), html.indexOf("</script>", html.indexOf("data-share]")));
    expect(script).toContain("navigator.share");
    expect(script).toContain("navigator.clipboard");
    for (const bad of ["null", "undefined", "NaN"]) expect(script).not.toContain(bad);
  });
});

describe("grade completeness notice", () => {
  it("is absent for a complete grade", () => {
    expect(facilityPage(base, [])).not.toContain('class="notice');
  });

  it("explains a withheld grade from the inputs, not the stored summary", () => {
    const html = facilityPage({ ...base, grade_letter: "NR", grade_score: -1, grade_completeness: "insufficient", rn_hours_per_resident_day: null }, []);
    expect(html).toContain("chip chip--lg chip--NR");
    expect(html).toContain("Not rated");
    expect(html).toContain('class="notice notice--insufficient"');
    expect(html).toContain("Grade withheld.");
    expect(html).not.toContain("Stored summary that must never be echoed");
    expect(html).not.toContain("-1/100");
    expect(html).toContain('href="/how-we-grade#not-rated"');
  });

  it("flags partial data on the chip and in the summary", () => {
    const html = facilityPage({ ...base, grade_completeness: "partial", grade_missing_inputs: "rn_staffing", rn_hours_per_resident_day: null }, []);
    expect(html).toContain("Partial data");
    expect(html).toContain('class="notice notice--partial"');
  });
});

describe("in-page navigation", () => {
  const staffing = { stateRnMedian: 0.55, nationalAvgRn: 0.62 };

  it("links only to sections the page rendered, and every target exists", () => {
    const html = facilityPage(base, [def(1, "D", CORRECTED)], [], [], null, "", "", null, { penalties: [], ...staffing });
    const hrefs = [...html.matchAll(/<a href="#([a-z-]+)">/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["summary", "quality", "staffing", "inspections", "enforcement", "contact", "sources"]);
    for (const id of hrefs) expect(html, id).toContain(`id="${id}"`);
    expect(html).toContain('<nav class="fac-nav" aria-label="On this page">');
  });

  it("omits links to sections that are not rendered", () => {
    const html = facilityPage({ ...base, rn_hours_per_resident_day: null }, [], [], [], null, "", "", null, { penalties: [] });
    const hrefs = [...html.matchAll(/<a href="#([a-z-]+)">/g)].map((m) => m[1]);
    expect(hrefs).not.toContain("staffing");
    for (const id of hrefs) expect(html, id).toContain(`id="${id}"`);
  });

  it("does not repeat full section headings that tests locate by first occurrence", () => {
    const html = facilityPage(base, [], [], [], null, "", "", null, { penalties: [], ...staffing });
    expect(html.indexOf("Ownership and Contact Information")).toBeGreaterThan(html.indexOf('class="fac-nav"'));
    expect(html.match(/Ownership and Contact Information/g)).toHaveLength(1);
  });
});

describe("summary card", () => {
  it("shows the four score inputs with benchmark and deficiency context", () => {
    const html = facilityPage(base, [def(1, "G", NO_PLAN), def(2, "D", CORRECTED)]);
    expect(html).toContain('id="summary"');
    expect(html).toContain("RN staffing");
    expect(html).toContain("0.48");
    expect(html).toContain("Below the repealed 0.55 hr benchmark");
    expect(html).toContain("Deficiencies (3 cycles)");
    expect(html).toContain("1 outstanding · 1 actual harm or worse");
    expect(html).toContain("CMS quality rating");
    expect(html).toContain("CMS staffing rating");
  });

  it("says Not reported only when the inspection lookup failed", () => {
    const failed = facilityPage(base, null);
    expect(failed).toContain("Deficiencies (3 cycles)");
    expect(failed).toMatch(/Deficiencies \(3 cycles\)[\s\S]{0,200}Not reported/);
    const clean = facilityPage(base, []);
    expect(clean).toMatch(/Deficiencies \(3 cycles\)<\/div><div class="stat-tile-value">0</);
  });

  it("renders a trajectory with its glyph and tone class", () => {
    const t: Trajectory = { cms_id: "015001", status: "declining", staffing_change_pct: -5, deficiency_change_pct: 12, grade_change: -4, rn_hours_trend: "down" };
    const html = facilityPage(base, [], [], [], t);
    expect(html).toContain("trend trend--declining");
    expect(html).toContain("▼");
    expect(html).toContain("Staffing -5%");
    expect(facilityPage(base, [], [], [], { ...t, status: "mystery" } as unknown as Trajectory)).toContain("trend trend--stable");
  });
});

describe("deficiency cards", () => {
  it("tier severity by CMS scope/severity group and mark outstanding items", () => {
    const html = facilityPage(base, [def(1, "B", CORRECTED), def(2, "E", CORRECTED), def(3, "H", NO_PLAN), def(4, "K", NO_PLAN)]);
    for (const tier of ["low", "potential", "harm", "jeopardy"]) {
      expect(html, tier).toContain(`sev-pill sev-pill--${tier}`);
      expect(html, tier).toContain(`def def--${tier}`);
    }
    expect(html.match(/def--open/g)).toHaveLength(2);
    expect(html).toContain("Status: Outstanding — No Plan");
    expect(html).toContain("Status: Corrected");
    expect(html).toContain("F0880");
  });

  it("keeps the cycle grouping and puts outstanding items first", () => {
    const html = facilityPage(base, [def(1, "D", CORRECTED), def(2, "D", NO_PLAN)]);
    expect(html).toContain("Most recent inspection (");
    expect(html.indexOf("Citation 2")).toBeLessThan(html.indexOf("Citation 1"));
  });
});

describe("staffing comparison bars", () => {
  it("scales bars to the largest value shown and labels each row", () => {
    const html = facilityPage(base, [], [], [], null, "", "", null, { penalties: [], stateRnMedian: 0.96, nationalAvgRn: 0.48 });
    const widths = [...html.matchAll(/hbar-fill" style="--pct:(\d+)%"/g)].map((m) => Number(m[1]));
    expect(widths).toEqual([50, 100, 50]);
    expect(html).toContain("This facility");
    expect(html).toContain("AL median");
    expect(html).toContain("National average");
    expect(html).toContain("0.96 hrs");
  });

  it("draws no bars without an RN figure", () => {
    const html = facilityPage({ ...base, rn_hours_per_resident_day: null }, [], [], [], null, "", "", null, { penalties: [], stateRnMedian: 0.5, nationalAvgRn: 0.6 });
    expect(html).not.toContain("hbar-fill");
  });
});

describe("nearby facilities", () => {
  it("render as tiles with the compare link intact", () => {
    const html = facilityPage(base, [], [nearby]);
    expect(html).toContain("fcard fcard--tile fcard--B");
    expect(html).toContain('href="/facility/015002-pinecrest"');
    expect(html).toContain('href="/compare?ids=015001%2C015002"');
    expect(html).toContain("Nearby facilities in Birmingham");
  });
});

describe("no static inline styles", () => {
  it("rendered facility pages carry style attributes only for custom properties", () => {
    const html = facilityPage(base, [def(1, "J", NO_PLAN)], [nearby], [], null, "An assessment.", "", null, { penalties: [], stateRnMedian: 0.5, nationalAvgRn: 0.6 });
    const offenders = [...html.matchAll(/ style="(?!--)[^"]*"/g)].map((m) => m[0]);
    expect(offenders).toEqual([]);
  });
});
