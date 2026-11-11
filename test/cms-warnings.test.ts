import { describe, expect, it } from "vitest";
import {
  countAbuseCitations,
  isAbuseFlagged,
  parseFootnoteCodes,
  specialFocusKind,
  staffingNotes,
} from "../src/cms-warnings";
import { facilityPage, renderCmsWarnings } from "../src/templates/facility";
import { cmsWarningBadges, facilityCard } from "../src/templates/components";
import { buildCmsNotesSql } from "../scripts/cms-notes-sql";
import { classifySitemapUrl } from "../src/indexation-health";
import type { CMSFacility, Deficiency, FacilityPageData } from "../src/types";

const facility: FacilityPageData = {
  cms_id: "015001",
  name: "Sunrise Care Center",
  address: "123 Main St",
  city: "Birmingham",
  state: "AL",
  zip: "35201",
  latitude: null,
  longitude: null,
  overall_rating: 3,
  quality_rating: 4,
  staffing_rating: 2,
  inspection_rating: 3,
  rn_hours_per_resident_day: 0.48,
  total_deficiencies: 7,
  grade_score: 82,
  grade_letter: "A",
  grade_summary: "",
  slug: "sunrise-care-center",
  updated_at: "2026-01-01T00:00:00.000Z",
  complaint_deficiencies_cycle_1: 2,
};

const abuseCitation: Deficiency = {
  id: 1,
  cms_id: "015001",
  survey_date: "2026-03-02",
  deficiency_category: "Freedom from Abuse, Neglect, and Exploitation Deficiencies",
  deficiency_tag_number: "0600",
  deficiency_description: "Protect each resident from all types of abuse.",
  scope_severity_code: "G",
  deficiency_corrected: "Deficient, Provider has date of correction",
  correction_date: "2026-04-06",
  inspection_cycle: 1,
  standard_deficiency: "N",
  complaint_deficiency: "Y",
};

describe("CMS warning flags", () => {
  it("normalises CMS Special Focus values", () => {
    expect(specialFocusKind("SFF")).toBe("sff");
    expect(specialFocusKind("SFF Candidate")).toBe("candidate");
    expect(specialFocusKind(" sff candidate ")).toBe("candidate");
    expect(specialFocusKind("")).toBeNull();
    expect(specialFocusKind(null)).toBeNull();
  });

  it("only treats Y as an abuse flag", () => {
    expect(isAbuseFlagged("Y")).toBe(true);
    expect(isAbuseFlagged("N")).toBe(false);
    expect(isAbuseFlagged(undefined)).toBe(false);
  });

  it("counts abuse-category citations only", () => {
    expect(countAbuseCitations([abuseCitation, { deficiency_category: "Infection Control Deficiencies" }])).toBe(1);
  });

  it("parses single and multiple footnote codes", () => {
    expect(parseFootnoteCodes("24")).toEqual(["24"]);
    expect(parseFootnoteCodes("23, 25")).toEqual(["23", "25"]);
    expect(parseFootnoteCodes("")).toEqual([]);
  });

  it("de-duplicates staffing notes across both CMS fields and puts the no-RN note first", () => {
    const notes = staffingNotes("25,24", "25");
    expect(notes.map((n) => n.code)).toEqual(["24", "25"]);
    expect(notes[0]?.urgent).toBe(true);
    expect(staffingNotes("99", null)).toEqual([]);
  });
});

describe("facility page warnings", () => {
  it("renders nothing for a home with no CMS flags", () => {
    expect(renderCmsWarnings({ ...facility, abuse_icon: "N", special_focus_status: "" }, [], [])).toBe("");
    expect(facilityPage({ ...facility, abuse_icon: "N" })).not.toContain("cms-warnings");
  });

  it("shows the abuse flag with CMS's definition, the citation count and the state list", () => {
    const html = facilityPage({ ...facility, abuse_icon: "Y" }, [abuseCitation]);
    expect(html).toContain("CMS warnings for this home");
    expect(html).toContain("Cited for abuse or neglect");
    expect(html).toContain("lists 1 citation in CMS");
    expect(html).toContain('href="/reports/abuse-citations/alabama"');
    // The flag sits above the facts and the summary, before anything else on the page.
    expect(html.indexOf("cms-warnings")).toBeLessThan(html.indexOf('id="summary"'));
  });

  it("distinguishes Special Focus Facilities from candidates", () => {
    expect(facilityPage({ ...facility, special_focus_status: "SFF" })).toContain("CMS Special Focus Facility");
    const candidate = facilityPage({ ...facility, special_focus_status: "SFF Candidate" });
    expect(candidate).toContain("Candidate for CMS Special Focus program");
    expect(candidate).toContain('href="/reports/special-focus-facilities"');
  });

  it("raises the no-RN footnote to the top and lists every staffing note in the staffing section", () => {
    const html = facilityPage(facility, [], [], [], null, "", "", null, {
      cmsNotes: { staffing_rating_footnote: "24", reported_staffing_footnote: "25" },
    });
    expect(html).toContain("Days without a registered nurse");
    expect(html).toContain("CMS notes on this facility");
    expect(html).toContain("could not be validated by CMS");
    expect(html).toContain("(CMS footnote 24)");
  });

  it("renders no staffing notes when the lookup returned nothing", () => {
    const html = facilityPage(facility, [], [], [], null, "", "", null, { cmsNotes: null });
    expect(html).not.toContain("CMS notes on this facility");
    expect(html).not.toContain("Days without a registered nurse");
  });
});

describe("list badges", () => {
  it("adds CMS warning badges to facility cards", () => {
    const html = facilityCard({ ...facility, abuse_icon: "Y", special_focus_status: "SFF Candidate" });
    expect(html).toContain("Special Focus candidate");
    expect(html).toContain("Cited for abuse or neglect");
  });

  it("adds nothing for an unflagged home or a list that did not select the columns", () => {
    expect(cmsWarningBadges({ abuse_icon: "N", special_focus_status: "" })).toBe("");
    expect(facilityCard(facility)).not.toContain("warn-badge");
  });
});

describe("facility_cms_notes seed", () => {
  const raw = (ccn: string, rating: string, reported: string) =>
    ({ cms_certification_number_ccn: ccn, staffing_rating_footnote: rating, reported_staffing_footnote: reported, processing_date: "2026-10-01" }) as CMSFacility;

  it("creates the table itself and keeps only rows with a displayed footnote", () => {
    const sql = buildCmsNotesSql([raw("015001", "24", ""), raw("015002", "", ""), raw("015003", "18", ""), raw("015004", "", "6")]);
    expect(sql[0]).toContain("CREATE TABLE IF NOT EXISTS facility_cms_notes");
    expect(sql[1]).toBe("DELETE FROM facility_cms_notes;");
    const inserts = sql.slice(2).join("\n");
    expect(inserts).toContain("('015001','24',NULL,'2026-10-01')");
    expect(inserts).toContain("('015004',NULL,'6','2026-10-01')");
    expect(inserts).not.toContain("015002");
    expect(inserts).not.toContain("015003");
  });

  it("still clears the table when no facility has a footnote", () => {
    expect(buildCmsNotesSql([raw("015002", "", "")])).toHaveLength(2);
  });
});

describe("sitemap classification", () => {
  it("classifies the new report pages as core", () => {
    expect(classifySitemapUrl("https://nursinghomegrade.com/reports/abuse-citations")).toBe("core");
    expect(classifySitemapUrl("https://nursinghomegrade.com/reports/abuse-citations/alabama")).toBe("core");
    expect(classifySitemapUrl("https://nursinghomegrade.com/reports/special-focus-facilities")).toBe("core");
  });
});
