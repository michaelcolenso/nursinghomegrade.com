import { describe, expect, it } from "vitest";
import { facilityPage } from "../src/templates/facility";
import type { Deficiency, FacilityPageData, FacilityPenalty } from "../src/types";

// Fixtures mirror the real CMS Provider Information rows for the five pages
// Search Console already ranks near page one, so what these tests assert is
// what those URLs will actually render.
function facility(overrides: Partial<FacilityPageData> & Pick<FacilityPageData, "cms_id" | "name" | "slug">): FacilityPageData {
  return {
    address: "1 Main St",
    city: "Springfield",
    state: "NC",
    zip: "27000",
    latitude: null,
    longitude: null,
    overall_rating: 3,
    quality_rating: 3,
    staffing_rating: 3,
    inspection_rating: 3,
    rn_hours_per_resident_day: 0.6,
    total_deficiencies: 5,
    grade_score: 70,
    grade_letter: "C",
    grade_summary: "Mixed record.",
    updated_at: "2026-07-10T00:00:00.000Z",
    complaint_deficiencies_cycle_1: 1,
    provider_type: "Medicare and Medicaid",
    cms_processing_date: "2026-07-01",
    ...overrides,
  } as FacilityPageData;
}

const deficiency = (over: Partial<Deficiency> = {}): Deficiency => ({
  id: 1,
  cms_id: "345403",
  survey_date: "2026-03-26",
  deficiency_category: "Quality of Life and Care Deficiencies",
  deficiency_tag_number: "0684",
  deficiency_description: "Provide appropriate treatment and care according to orders.",
  scope_severity_code: "D",
  deficiency_corrected: "Deficient, Provider has date of correction",
  correction_date: "2026-04-30",
  inspection_cycle: 1,
  standard_deficiency: "Y",
  complaint_deficiency: "N",
  ...over,
});

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

// ── Priority route fixtures ──────────────────────────────────────────────────

const highfield = facility({
  cms_id: "345403",
  name: "Highfield Nursing and Rehabilitation",
  slug: "highfield-nursing-and-rehabilitation",
  address: "6590 Tryon Road",
  city: "Cary",
  state: "NC",
  zip: "27518",
  overall_rating: 1,
  quality_rating: 4,
  staffing_rating: 1,
  inspection_rating: 2,
  rn_hours_per_resident_day: 0.32841,
  grade_score: 38,
  grade_letter: "F",
  phone: "9198518000",
  ownership_type: "For profit - Corporation",
  legal_business_name: "6590 TRYON ROAD OPCO LLC",
  certified_beds: 120,
  latest_standard_survey_date: "2026-03-26",
  rn_turnover_pct: 66.7,
  total_nursing_turnover_pct: 53.2,
  number_of_fines: 2,
  total_fines_dollars: 175559,
  number_of_payment_denials: 0,
  total_penalties: 2,
});

const embassy = facility({
  cms_id: "395273",
  name: "Embassy of Scranton",
  slug: "embassy-of-scranton",
  address: "2148 Marion Street",
  city: "Scranton",
  state: "PA",
  zip: "18509",
  overall_rating: 1,
  quality_rating: 3,
  staffing_rating: 3,
  inspection_rating: 1,
  rn_hours_per_resident_day: 0.49735,
  grade_score: 45,
  grade_letter: "F",
  phone: "5703465704",
  ownership_type: "For profit - Limited Liability company",
  legal_business_name: "EMBASSY OF SCRANTON, LLC",
  certified_beds: 139,
  latest_standard_survey_date: "2026-05-08",
  number_of_fines: 2,
  total_fines_dollars: 33670,
  number_of_payment_denials: 2,
  total_penalties: 4,
});

const coosCounty = facility({
  cms_id: "305102",
  name: "Coos County Nursing Home",
  slug: "coos-county-nursing-home",
  address: "136 Coos County Road",
  city: "Berlin",
  state: "NH",
  zip: "03570",
  overall_rating: 2,
  quality_rating: 2,
  staffing_rating: 4,
  inspection_rating: 2,
  rn_hours_per_resident_day: 0.80148,
  grade_score: 66,
  grade_letter: "C",
  phone: "6037522343",
  ownership_type: "Government - County",
  legal_business_name: "COOS COUNTY NURSING HOME",
  certified_beds: 100,
  latest_standard_survey_date: "2026-02-26",
  number_of_fines: 0,
  total_fines_dollars: 0,
  number_of_payment_denials: 0,
  total_penalties: 0,
});

const fairacres = facility({
  cms_id: "065211",
  name: "Fairacres Manor, Inc.",
  slug: "fairacres-manor-inc",
  address: "1700 18th Avenue",
  city: "Greeley",
  state: "CO",
  zip: "80631",
  overall_rating: 4,
  quality_rating: 2,
  staffing_rating: 4,
  inspection_rating: 4,
  rn_hours_per_resident_day: 0.87873,
  grade_score: 81,
  grade_letter: "B",
  phone: "9703533370",
  ownership_type: "For profit - Limited Liability company",
  legal_business_name: "FAIRACRES MANOR, INC",
  certified_beds: 116,
  certification_date: "1985-08-01",
  latest_standard_survey_date: "2024-06-06",
  number_of_fines: 0,
  total_fines_dollars: 0,
  number_of_payment_denials: 0,
  total_penalties: 0,
});

const greenville = facility({
  cms_id: "345181",
  name: "Greenville Health and Rehabilitation Center",
  slug: "greenville-health-and-rehabilitation-center",
  address: "1620 East Arlington Boulevard",
  city: "Greenville",
  state: "NC",
  zip: "27858",
  overall_rating: 1,
  quality_rating: 2,
  staffing_rating: 1,
  inspection_rating: 1,
  rn_hours_per_resident_day: 0.49716,
  grade_score: 40,
  grade_letter: "F",
  phone: "2527587100",
  ownership_type: "For profit - Corporation",
  legal_business_name: "GREENVILLE OPERATOR LLC",
  certified_beds: 120,
  latest_standard_survey_date: "2025-06-11",
  number_of_fines: 2,
  total_fines_dollars: 64002,
  number_of_payment_denials: 0,
  total_penalties: 2,
});

const render = (f: FacilityPageData, opts: Parameters<typeof facilityPage>[8] = {}) =>
  facilityPage(f, [deficiency({ cms_id: f.cms_id })], [], [], null, "", "", null, {
    stateRnMedian: 0.62,
    nationalAvgRn: 0.68,
    ...opts,
  });

function jsonLdBlocks(html: string): Array<Record<string, unknown>> {
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
  return blocks.map((b) =>
    JSON.parse(
      b.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, "").replace(/\\u003c/g, "<"),
    ),
  );
}

// ── Information hierarchy ────────────────────────────────────────────────────

describe("facility page hierarchy", () => {
  const html = render(highfield, { penalties: [fine] });

  it("renders every data-supported section", () => {
    for (const heading of [
      "Reviews, Ratings and Official Records",
      "Ratings and Grade Breakdown",
      "Staffing Compared With State and National Levels",
      "Inspection Deficiencies",
      "Fines and Enforcement Actions",
      "Ownership and Contact Information",
      "Sources and Methodology",
    ]) {
      expect(html).toContain(heading);
    }
  });

  it("satisfies reviews intent without claiming to host testimonials", () => {
    expect(html).toContain("does not collect, host or publish resident");
    expect(html).not.toMatch(/\d+\s+(customer|resident|family|user)\s+reviews/i);
    expect(html).not.toMatch(/based on \d+ reviews/i);
  });

  it("leads with a factual verdict drawn from the records", () => {
    expect(html).toContain("What the records show");
    expect(html).toContain("CMS rates Highfield Nursing and Rehabilitation 1 out of 5 stars overall");
  });

  it("shows identity facts including the provider number and data vintage", () => {
    expect(html).toContain("Provider number (CCN)");
    expect(html).toContain("345403");
    expect(html).toContain("CMS data as of");
    expect(html).toContain("July 1, 2026");
  });

  it("compares staffing with state and national baselines and dates the measurement", () => {
    expect(html).toContain("NC median");
    expect(html).toContain("National average");
    expect(html).toContain("0.62 hrs");
    expect(html).toContain("payroll-based journal reporting");
  });

  it("lists individual enforcement actions with date, action and amount", () => {
    expect(html).toContain("September 1, 2024");
    expect(html).toContain("Fine");
    expect(html).toContain("$175,559");
    expect(html).toContain("g6vv-u9sr");
  });

  it("names its sources with their vintage", () => {
    expect(html).toContain("CMS Provider Information");
    expect(html).toContain("file processed July 1, 2026");
    expect(html).toContain("data.cms.gov/provider-data/dataset/4pq5-n9py");
  });
});

// ── Sparse data ──────────────────────────────────────────────────────────────

describe("sparse-data facility", () => {
  // A row loaded before the profile migration: no phone, ownership, penalties
  // or vintage, and no deficiency lookup.
  const sparse = facility({
    cms_id: "999999",
    name: "Sparse Data Home",
    slug: "sparse-data-home",
    overall_rating: null,
    quality_rating: null,
    staffing_rating: null,
    inspection_rating: null,
    rn_hours_per_resident_day: null,
    total_deficiencies: null,
    cms_processing_date: null,
    provider_type: null,
  });
  const html = facilityPage(sparse, null, [], [], null, "", "", null, {});

  it("renders without inventing any value", () => {
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("N/A");
    expect(html).not.toContain("(000) 000-0000");
  });

  it("omits sections whose data is missing rather than printing empty headings", () => {
    expect(html).not.toContain("Staffing Compared With State and National Levels");
    expect(html).not.toContain("What the records show");
  });

  it("discloses the enforcement gap instead of claiming a clean record", () => {
    expect(html).toContain("gap in our data");
    expect(html).not.toContain("CMS lists no fines and no payment denials");
  });

  it("still renders the identity, reviews and sources scaffolding", () => {
    expect(html).toContain("Reviews, Ratings and Official Records");
    expect(html).toContain("Provider number (CCN)");
    expect(html).toContain("Sources and Methodology");
  });

  it("states plainly that no email is published rather than leaving a silent gap", () => {
    expect(html).toContain("publish no email address");
  });
});

// ── Penalties present and absent ─────────────────────────────────────────────

describe("enforcement states", () => {
  it("reports a truthful empty state when CMS aggregates are zero", () => {
    const html = render(fairacres, { penalties: [] });
    expect(html).toContain("CMS lists no fines and no payment denials for Fairacres Manor, Inc.");
    expect(html).toContain("in the enforcement records covering the");
  });

  it("falls back to CMS counts when per-action rows are unavailable", () => {
    const html = render(greenville, { penalties: [] });
    expect(html).toContain("CMS reports 2 fines totalling $64,002");
    expect(html).toContain("Dates for the individual actions are not");
  });

  it("dates a payment denial from its start date when penalty_date is empty", () => {
    // CMS commonly leaves penalty_date blank on denial rows; the start date is
    // right there in the same row and must not be reported as unpublished.
    const denial: FacilityPenalty = {
      id: 3,
      cms_id: "395273",
      penalty_date: null,
      penalty_type: "Payment Denial",
      fine_amount: null,
      payment_denial_start_date: "2024-10-01",
      payment_denial_length_days: 42,
      processing_date: "2026-07-01",
    };
    const html = render(embassy, { penalties: [denial] });
    expect(html).toContain("October 1, 2024");
    expect(html).not.toContain("Date not published");
  });

  it("renders payment denials with their length", () => {
    const denial: FacilityPenalty = {
      id: 2,
      cms_id: "395273",
      penalty_date: "2024-10-01",
      penalty_type: "Payment Denial",
      fine_amount: null,
      payment_denial_start_date: "2024-10-01",
      payment_denial_length_days: 42,
      processing_date: "2026-07-01",
    };
    const html = render(embassy, { penalties: [denial] });
    expect(html).toContain("Payment Denial");
    expect(html).toContain("42 days");
    expect(html).toContain("October 1, 2024");
  });
});

// ── Structured data ──────────────────────────────────────────────────────────

describe("structured data", () => {
  const blocks = jsonLdBlocks(render(highfield, { penalties: [fine] }));

  it("publishes no review or aggregate-rating claim", () => {
    const serialized = JSON.stringify(blocks);
    expect(serialized).not.toContain("aggregateRating");
    expect(serialized).not.toContain('"@type":"Review"');
    expect(serialized).not.toContain("reviewRating");
    expect(serialized).not.toContain("ratingValue");
  });

  it("emits valid NursingHome and BreadcrumbList objects only", () => {
    expect(blocks).toHaveLength(2);
    const [nursingHome, breadcrumb] = blocks as [Record<string, any>, Record<string, any>];
    expect(nursingHome["@context"]).toBe("https://schema.org");
    expect(nursingHome["@type"]).toBe("NursingHome");
    expect(nursingHome.address["@type"]).toBe("PostalAddress");
    expect(nursingHome.identifier.value).toBe("345403");
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement).toHaveLength(4);
    for (const item of breadcrumb.itemListElement) {
      expect(item.item).toMatch(/^https:\/\/nursinghomegrade\.com\//);
    }
  });

  it("only publishes a telephone that is visible on the page", () => {
    const [nursingHome] = blocks as [Record<string, any>];
    expect(nursingHome.telephone).toBe("(919) 851-8000");
  });

  it("omits telephone entirely when CMS publishes none", () => {
    const noPhone = jsonLdBlocks(render({ ...highfield, phone: null }))[0] as Record<string, any>;
    expect(noPhone.telephone).toBeUndefined();
  });

  it("describes the grade as a property, not a rating", () => {
    const [nursingHome] = blocks as [Record<string, any>];
    const names = nursingHome.additionalProperty.map((p: any) => p.name);
    expect(names).toContain("NursingHomeGrade Score");
    expect(names).toContain("CMS Overall Rating");
  });
});

// ── The five priority routes ─────────────────────────────────────────────────

describe("priority routes", () => {
  const cases: Array<[string, FacilityPageData, RegExp]> = [
    // `&` is HTML-escaped inside <title>, so the patterns match what ships.
    ["Highfield", highfield, /Highfield Nursing and Rehabilitation Reviews, Ratings &amp; Inspections/],
    ["Embassy of Scranton", embassy, /Embassy of Scranton Reviews, Ratings &amp; Inspections/],
    ["Coos County", coosCounty, /Coos County Nursing Home Audit, Inspections &amp; Ratings/],
    ["Fairacres", fairacres, /Fairacres Manor, Inc\. Reviews, Ratings &amp; Inspections/],
    ["Greenville", greenville, /Greenville Health and Rehabilitation Center Reviews &amp; Inspections/],
  ];

  for (const [label, f, titlePattern] of cases) {
    it(`${label}: renders a self-referencing canonical and an intent-matched title`, () => {
      const html = render(f, { penalties: [] });
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
      expect(title).toMatch(titlePattern);
      expect(title.length).toBeLessThanOrEqual(75);
      expect(html).toContain(
        `<link rel="canonical" href="https://nursinghomegrade.com/facility/${f.cms_id}-${f.slug}">`,
      );
    });

    it(`${label}: renders the standard hierarchy with contact details`, () => {
      const html = render(f, { penalties: [] });
      expect(html).toContain("Reviews, Ratings and Official Records");
      expect(html).toContain("Ownership and Contact Information");
      expect(html).toContain("Sources and Methodology");
      expect(html).toContain(f.cms_id);
    });
  }

  it("descriptions differ between priority pages", () => {
    const descriptions = cases.map(
      ([, f]) => render(f, { penalties: [] }).match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "",
    );
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const d of descriptions) expect(d.length).toBeGreaterThan(50);
  });

  it("Coos County states which records are covered and does not imply an audit was reviewed", () => {
    const html = render(coosCounty, { penalties: [] });
    expect(html).toContain("Audit and Inspection Reports");
    expect(html).toContain("have not reviewed, any");
    expect(html).toContain("Most recent standard health survey");
    expect(html).not.toMatch(/2023 audit report/i);
  });

  it("Fairacres surfaces verified contact details near the top, with no inferred email", () => {
    const html = render(fairacres, { penalties: [] });
    const factsIndex = html.indexOf("(970) 353-3370");
    const contactSection = html.indexOf("Ownership and Contact Information");
    expect(factsIndex).toBeGreaterThan(-1);
    // The phone appears in the identity block above the contact section too.
    expect(factsIndex).toBeLessThan(contactSection);
    expect(html).toContain("tel:+19703533370");
    expect(html).toContain("FAIRACRES MANOR, INC");
    expect(html).toContain("Details verified against CMS data dated");
    // Certified in 1985 — the date must survive formatting, not be dropped.
    expect(html).toContain("Medicare/Medicaid certified since");
    expect(html).toContain("August 1, 1985");
    // No email anywhere in the facility's own contact block. (The site footer
    // carries NursingHomeGrade's own address; that is ours, not the facility's.)
    const block = html.slice(contactSection, html.indexOf("How We Stay Independent", contactSection));
    expect(block).not.toMatch(/mailto:/);
    expect(block).not.toMatch(/@/);
  });

  it("Embassy of Scranton carries a rating summary and nearby comparison", () => {
    const nearby = { ...greenville, city: "Scranton", state: "PA" } as FacilityPageData;
    const html = facilityPage(embassy, [deficiency({ cms_id: "395273" })], [nearby], [], null, "", "", null, {
      penalties: [],
      stateRnMedian: 0.55,
      nationalAvgRn: 0.68,
    });
    expect(html).toContain("What the records show");
    expect(html).toContain("Nearby facilities in Scranton");
    expect(html).toContain("Greenville Health and Rehabilitation Center");
  });
});

// ── Content-integrity guards ─────────────────────────────────────────────────

describe("content integrity", () => {
  const pages = [highfield, embassy, coosCounty, fairacres, greenville].map((f) => render(f, { penalties: [] }));

  it("never renders an empty heading or an empty definition term", () => {
    for (const html of pages) {
      expect(html).not.toMatch(/<h[1-3][^>]*>\s*<\/h[1-3]>/);
      expect(html).not.toMatch(/<dd[^>]*>\s*<\/dd>/);
    }
  });

  it("never claims a source date it does not have", () => {
    for (const html of pages) {
      expect(html).not.toContain("as of Invalid Date");
      expect(html).not.toContain("Invalid Date");
    }
  });

  it("does not claim fines or payment denials feed the grade", () => {
    // computeGrade uses staffing, ratings, deficiency count, and the severity
    // and correction status of citations. No fine or denial term exists.
    for (const html of pages) {
      expect(html).not.toMatch(/enforcement history, weighted/);
      expect(html).toContain("the severity and correction status of those citations");
    }
  });

  it("never presents government records as consumer testimonials", () => {
    for (const html of pages) {
      expect(html).not.toMatch(/what (residents|families) say/i);
      expect(html).not.toMatch(/verified reviews/i);
      expect(html).not.toMatch(/\bstar rating from \d+ reviews/i);
    }
  });
});
