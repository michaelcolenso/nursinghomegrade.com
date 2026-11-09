import { describe, expect, it } from "vitest";
import { homePage, scoreHistogram, sharesToPercents } from "../src/templates/home";
import { latestCmsRelease } from "../src/templates/data-freshness";
import type { HomeStats } from "../src/db";
import type { DataRelease } from "../src/templates/data-sources";
import type { Facility } from "../src/types";

const releases: DataRelease[] = [
  { source_key: "provider_info", label: "Provider Information", cms_release_date: "2026-10-08", ingested_at: "2026-10-12T00:00:00Z", source_url: null },
  { source_key: "health_deficiencies", label: "Health Deficiencies", cms_release_date: "2026-09-17", ingested_at: "2026-10-12T00:00:00Z", source_url: null },
  { source_key: "mds_quality_measures", label: "Shadow evidence", cms_release_date: "2026-11-01", ingested_at: "2026-11-02T00:00:00Z", source_url: null },
];

const stats: HomeStats = {
  avgScore: 61.4,
  totalFacilities: 14712,
  distribution: {
    gradeCounts: { A: 1650, B: 3120, C: 4410, D: 3090, F: 1840, NR: 602 },
    scoreBuckets: [120, 260, 510, 930, 1480, 1960, 2450, 2840, 2380, 1180],
    computedAt: "2026-10-12 00:00:00",
  },
};

const facility = (n: number, letter: string, score: number): Facility => ({
  cms_id: `33500${n}`, name: `Care Center ${n}`, slug: `care-center-${n}`, address: "1 Main St", city: "Albany", state: "NY", zip: "12201",
  latitude: 42.6, longitude: -73.7, overall_rating: 4, quality_rating: 4, staffing_rating: 3, inspection_rating: 4,
  rn_hours_per_resident_day: 0.7, total_deficiencies: 2, grade_score: score, grade_letter: letter, grade_summary: "x", slug_: undefined, updated_at: "2026-10-12",
} as unknown as Facility);

const top = [facility(1, "A", 96), facility(2, "A", 94), facility(3, "A", 93), facility(4, "A", 91)];

describe("homepage: hard rules", () => {
  const html = homePage(62, releases, { stats, topRated: top });

  it("contains no fabricated content from the design mockup", () => {
    for (const banned of ["Millions", "As seen in", "Washington Post", "Reuters", "Newsweek", "KFF", "Better than", "<img"]) {
      expect(html, banned).not.toContain(banned);
    }
  });

  it("uses the D-11 headline and keeps the title and description", () => {
    expect(html).toContain("<h1 class=\"display\">Independent nursing home grades.</h1>");
    expect(html).toContain("<title>NursingHomeGrade — Independent Nursing Home Ratings</title>");
    expect(html).toContain("62% of U.S. nursing homes reporting RN staffing fall short of the 2024 federal rule");
    expect(html).toContain('<link rel="canonical" href="https://nursinghomegrade.com/">');
  });

  it("keeps the evidence-based staffing claim and its repeal disclosure", () => {
    expect(html).toContain("62% of U.S. nursing homes that report RN staffing");
    expect(html).toContain("repealed");
    expect(html).toContain("/reports/staffing-standard-repeal");
  });

  it("keeps the referral-fee aside and links its source", () => {
    expect(html).toContain("Why this site exists");
    expect(html).toContain("$3,500");
    expect(html).toMatch(/<a class="link-arrow" href="\/about">Read more/);
  });

  it("keeps every internal link the old homepage offered plus the new sections", () => {
    for (const href of ["/search", "/states", "/ask", "/how-we-grade", "/methodology", "/best", "/about", "/data-sources"]) {
      expect(html, href).toContain(`href="${href}"`);
    }
    expect(html).toContain('id="geo-btn"');
    expect(html).toContain('name="zip"');
    expect(html).toContain('action="/search"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"@type":"Organization"');
  });

  it("states the four published weights using the methodology page's own labels", () => {
    for (const w of ["35%", "30%", "20%", "15%", "RN staffing", "Inspection record", "Quality measures", "Staffing rating"]) {
      expect(html, w).toContain(w);
    }
  });
});

describe("homepage: national overview", () => {
  it("renders the real average, shares computed from counts, and a ten-bar histogram", () => {
    const html = homePage(62, releases, { stats, topRated: top });
    expect(html).toContain(">61.4<");
    expect(html).toContain("14,712");
    expect((html.match(/<rect class="hist-bar/g) ?? []).length).toBe(10);
    // rated = 14,110: A 11.7%, B+C 53.4%, D+F 34.9% -> largest remainder gives 12 / 53 / 35 (sums to 100)
    expect(sharesToPercents([1650, 7530, 4930])).toEqual([12, 53, 35]);
    const tiles = [...html.matchAll(/class="grade-(?:A|B|D)">(\d+)%/g)].map((m) => Number(m[1]));
    expect(tiles).toEqual([12, 53, 35]);
    expect(html).toContain("more are not rated");
    expect(html).toMatch(/<time datetime="2026-10-08">October 8, 2026<\/time>/);
    expect(html).toContain('role="img" aria-label="Distribution of NursingHomeGrade scores across 14,110 rated nursing homes');
  });

  it("degrades without a distribution: average and total only, no histogram", () => {
    const html = homePage(62, releases, { stats: { ...stats, distribution: null } });
    expect(html).toContain(">61.4<");
    expect(html).toContain("14,712 graded nursing homes");
    expect(html).not.toContain("hist-bar");
    expect(html).not.toContain("Graded A");
  });

  it("degrades with no stats at all, with no extras, and with no releases", () => {
    const none = homePage(62, [], { stats: null, topRated: [] });
    expect(none).toContain("National figures are temporarily unavailable");
    expect(none).not.toContain("NaN");
    expect(none).not.toContain("undefined");
    expect(homePage(41)).toContain("Independent nursing home grades.");
  });

  it("never prints a release date it does not have", () => {
    const html = homePage(41, [], { stats });
    // Only the freshness box's four "Not recorded" placeholders; no invented dates elsewhere.
    expect(html.match(/Not recorded/g)).toHaveLength(4);
    expect(html).not.toContain("Data as of <time");
    expect(html).not.toContain("latest CMS data release");
  });

  it("does not assert a render-time update date", () => {
    expect(homePage(41, releases, { stats })).not.toContain("Last updated:");
  });
});

describe("homepage: top rated and facts", () => {
  it("shows four facility tiles with ranks and real inputs, no photos", () => {
    const html = homePage(62, releases, { stats, topRated: top });
    expect((html.match(/class="fcard fcard--tile/g) ?? []).length).toBe(4);
    expect(html).toContain("#1");
    expect(html).toContain("#4");
    expect(html).toContain("Care Center 1");
    expect(html).toContain("RN staffing");
    expect(html).toContain("CMS quality");
    expect(html).not.toContain("1 Main St");
    expect(html).toContain('href="/best"');
  });

  it("omits the section when there are no top-rated facilities", () => {
    expect(homePage(62, releases, { stats, topRated: [] })).not.toContain("Top-rated nursing homes");
  });

  it("facts band uses real totals and the newest scoring-source release (not shadow sources)", () => {
    const html = homePage(62, releases, { stats });
    expect(html).toContain("nursing homes graded");
    expect(html).toContain("October 8, 2026");
    expect(html).not.toContain("November 1, 2026");
    expect(html).toContain("$0");
  });
});

describe("sharesToPercents", () => {
  it("sums to exactly 100 using largest remainder", () => {
    expect(sharesToPercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(sharesToPercents([1650, 7530, 4930])).toEqual([12, 53, 35]);
    for (const counts of [[1, 2, 3], [5, 5, 5], [0, 0, 7], [99, 1, 0], [1650, 7530, 4930]]) {
      expect(sharesToPercents(counts).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
  it("returns zeros for an empty total", () => {
    expect(sharesToPercents([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe("scoreHistogram", () => {
  const svg = scoreHistogram([0, 10, 20, 40, 80, 0, 0, 0, 0, 5], "summary");
  it("scales bars to the largest bucket and draws nothing for empty buckets", () => {
    const heights = [...svg.matchAll(/height="(\d+)" rx/g)].map((m) => Number(m[1]));
    expect(heights).toHaveLength(10);
    expect(heights[4]).toBe(92);
    expect(heights[0]).toBe(0);
    expect(heights[1]).toBeGreaterThanOrEqual(3);
    expect(heights[3]).toBeLessThan(heights[4]!);
  });
  it("colours bars by grade band and labels the axis 0/25/50/75/100", () => {
    expect(svg).toContain("hist-bar--F");
    expect(svg).toContain("hist-bar--A");
    for (const v of ["0", "25", "50", "75", "100"]) expect(svg).toContain(`>${v}</text>`);
    expect(svg).toContain('aria-label="summary"');
  });
  it("handles all-empty buckets", () => {
    expect(scoreHistogram(Array(10).fill(0), "x")).not.toContain("NaN");
  });
});

describe("latestCmsRelease", () => {
  it("picks the newest valid scoring-source date and ignores shadow sources and bad dates", () => {
    expect(latestCmsRelease(releases)).toEqual({ iso: "2026-10-08", label: "October 8, 2026" });
    expect(latestCmsRelease([{ ...releases[0]!, cms_release_date: "2026-02-30" }])).toBeNull();
    expect(latestCmsRelease([])).toBeNull();
    expect(latestCmsRelease([{ ...releases[2]! }])).toBeNull();
  });
});
