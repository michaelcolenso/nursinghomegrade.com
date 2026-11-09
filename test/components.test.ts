import { describe, expect, it } from "vitest";
import {
  COMPARE_CHIP_JS,
  breadcrumb,
  compareToggle,
  facilityCard,
  gradeDescriptor,
  gradeDistribution,
  gradeKey,
  gradePill,
  scoreBar,
  scoreChip,
  scoreMeter,
  starRating,
} from "../src/templates/components";

const base = {
  cms_id: "015001",
  slug: "sunrise-care-center",
  name: "Sunrise Care Center",
  city: "Birmingham",
  state: "AL",
  grade_letter: "B",
  grade_score: 72,
};

const filled = (html: string) => (html.match(/<i class="on">/g) ?? []).length;
const squash = (html: string) => html.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();

describe("gradeDescriptor / gradeKey", () => {
  it("maps letters to absolute descriptors, never relative ones", () => {
    expect(["A", "B", "C", "D", "F", "NR"].map(gradeDescriptor)).toEqual(["Strong", "Good", "Fair", "Poor", "Failing", "Not rated"]);
    expect(gradeDescriptor("X")).toBe("Not rated");
  });
  it("treats withheld grades as NR", () => {
    expect(gradeKey("B", -1)).toBe("NR");
    expect(gradeKey("NR", 50)).toBe("NR");
    expect(gradeKey(undefined)).toBe("NR");
  });
});

describe("scoreMeter", () => {
  it("fills round(score/10) of ten segments and is decorative", () => {
    for (const [score, n] of [[88, 9], [72, 7], [45, 5], [4, 0], [100, 10], [0, 0]] as const) {
      const html = scoreMeter(score, "B");
      expect(filled(html)).toBe(n);
      expect((html.match(/<i/g) ?? []).length).toBe(10);
      expect(html).toContain('aria-hidden="true"');
    }
  });
  it("renders an empty meter for NR", () => {
    expect(filled(scoreMeter(-1, "NR"))).toBe(0);
    expect(filled(scoreMeter(null, "A"))).toBe(0);
  });
});

describe("scoreChip", () => {
  it.each([["A", 88, "Strong"], ["B", 72, "Good"], ["C", 57, "Fair"], ["D", 41, "Poor"], ["F", 22, "Failing"]] as const)(
    "%s chip shows score, letter, descriptor and meter", (letter, score, desc) => {
      const html = scoreChip({ grade_letter: letter, grade_score: score });
      expect(html).toContain(`chip--${letter}`);
      expect(html).toContain(`meter--${letter}`);
      expect(html).toContain(`>${score}</span>`);
      expect(html).toContain(desc);
      expect(filled(html)).toBe(Math.round(score / 10));
      expect(html).not.toContain("Partial data");
    },
  );

  it("NR chip shows a dash, never -1, and links to the explanation", () => {
    const html = scoreChip({ grade_letter: "NR", grade_score: -1 });
    expect(html).toContain("Not rated");
    expect(html).toContain("—");
    expect(html).not.toContain("-1");
    expect(html).not.toContain("/100");
    expect(html).toContain('href="/how-we-grade#not-rated"');
    expect(filled(html)).toBe(0);
    expect(scoreChip({ grade_letter: "NR", grade_score: -1 }, { linkNr: false })).not.toContain("<a ");
  });

  it("marks partial completeness", () => {
    const html = scoreChip({ grade_letter: "C", grade_score: 55, grade_completeness: "partial" });
    expect(html).toContain("Partial data");
    expect(html).toContain("lower bound");
  });

  it("supports sizes", () => {
    expect(scoreChip({ grade_letter: "A", grade_score: 90 }, { size: "lg" })).toContain("chip--lg");
    expect(scoreChip({ grade_letter: "A", grade_score: 90 }, { size: "sm" })).toContain("chip--sm");
  });
});

describe("compare page chip twin", () => {
  const run = new Function(`${COMPARE_CHIP_JS}; return chipHtml;`)() as (f: Record<string, unknown>) => string;
  it.each([
    { grade_letter: "A", grade_score: 88 },
    { grade_letter: "B", grade_score: 72, grade_completeness: "complete" },
    { grade_letter: "C", grade_score: 57, grade_completeness: "partial" },
    { grade_letter: "D", grade_score: 41 },
    { grade_letter: "F", grade_score: 4 },
    { grade_letter: "NR", grade_score: -1 },
    { grade_letter: "B", grade_score: -1 },
  ])("matches scoreChip(sm) for %o", (f) => {
    expect(squash(run(f))).toBe(squash(scoreChip(f as never, { size: "sm", linkNr: false })));
  });
});

describe("starRating / gradePill / breadcrumb", () => {
  it("gives stars an accessible name and 'Not reported' for null", () => {
    expect(starRating(4)).toContain("4 out of 5");
    expect(starRating(4)).toContain("4/5");
    expect(starRating(null)).toContain("Not reported");
    expect(starRating(undefined)).toContain("Not reported");
  });
  it("renders a pill per grade", () => {
    expect(gradePill("A")).toContain("pill--A");
    expect(gradePill("F", -1)).toContain("pill--NR");
  });
  it("renders a breadcrumb with the current page unlinked and escaped", () => {
    const html = breadcrumb([{ label: "Home", href: "/" }, { label: "A <b>", href: "/x" }, { label: "Here & now" }]);
    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/x">A &lt;b&gt;</a>');
    expect(html).toContain('aria-current="page">Here &amp; now');
    expect(html).not.toContain("<a href=\"/\">Here");
    expect(html.match(/<a /g)).toHaveLength(2);
  });
});

describe("compareToggle", () => {
  it("keeps the id / aria-pressed / label contract the layout script depends on", () => {
    const html = compareToggle(base);
    expect(html).toContain('id="save-015001"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("compare-toggle-label");
    expect(html).toContain("toggleSave('015001', 'Sunrise Care Center', 'B', 72)");
  });
  it("escapes apostrophes and markup in names", () => {
    const html = compareToggle({ ...base, name: `St. Mary's <Home>` });
    expect(html).not.toContain("<Home>");
    expect(html).toContain("St. Mary\\&#39;s &lt;Home&gt;");
  });
});

describe("facilityCard", () => {
  it("renders name link, location, chip and only the stats it knows about", () => {
    const html = facilityCard({ ...base, rn_hours_per_resident_day: 0.63 });
    expect(html).toContain('href="/facility/015001-sunrise-care-center"');
    expect(html).toContain("Birmingham, AL");
    expect(html).toContain("fcard--row");
    expect(html).toContain("RN staffing");
    expect(html).toContain("0.63 hrs");
    expect(html).not.toContain("Deficiencies");
    expect(html).not.toContain("CMS quality");
  });

  it("shows 'Not reported' for null metrics but omits unknown ones", () => {
    const html = facilityCard({ ...base, rn_hours_per_resident_day: null, total_deficiencies: null, quality_rating: null, staffing_rating: null });
    expect(html.match(/Not reported/g)).toHaveLength(4);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("NaN");
  });

  it("marks the RN benchmark with text, not colour alone", () => {
    expect(facilityCard({ ...base, rn_hours_per_resident_day: 0.7 })).toContain("At or above the repealed 0.55 hr benchmark");
    expect(facilityCard({ ...base, rn_hours_per_resident_day: 0.3 })).toContain("Below the repealed 0.55 hr benchmark");
  });

  it("renders NR facilities without a numeric score", () => {
    const html = facilityCard({ ...base, grade_letter: "NR", grade_score: -1, rn_hours_per_resident_day: null }, { summary: true });
    expect(html).toContain("fcard--NR");
    expect(html).toContain("Not rated");
    expect(html).not.toContain("-1");
  });

  it("supports rank, distance, compare, summary, tile layout, heading level and hooks", () => {
    const html = facilityCard(base, { rank: "#3", distance: 4.25, compare: true, summary: true, layout: "tile", headingLevel: 2, className: "hook", attrs: 'data-x="1"' });
    expect(html).toContain("#3");
    expect(html).toContain("4.3 mi");
    expect(html).toContain('id="save-015001"');
    expect(html).toContain("fcard-summary");
    expect(html).toContain("fcard--tile");
    expect(html).toContain('<h2 class="fcard-name">');
    expect(html).toContain("fcard--B hook");
    expect(html).toContain('data-x="1"');
  });

  it("escapes names", () => {
    const html = facilityCard({ ...base, name: `<script>alert(1)</script>` });
    expect(html).not.toContain("<script>");
  });
});

describe("gradeDistribution / scoreBar", () => {
  it("lists every grade with counts, uses rated facilities for widths and discloses NR", () => {
    const html = gradeDistribution({ A: 50, B: 25, C: 25, D: 0, F: 0, NR: 3 });
    for (const l of ["A", "B", "C", "D", "F"]) expect(html).toContain(`Grade ${l}`);
    expect(html).toContain("--pct:50.00%");
    expect(html).not.toContain("dist-seg--D");
    expect(html).toContain("<strong>3</strong> facilities are not rated");
    expect(html).toContain("A–F percentages above use rated facilities only");
    expect(html).toContain('role="img"');
  });
  it("handles an all-zero distribution", () => {
    const html = gradeDistribution({});
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("dist-note");
  });
  it("scoreBar carries score, band and width as data", () => {
    const html = scoreBar(62);
    expect(html).toContain('aria-label="Score 62 out of 100"');
    expect(html).toContain("scorebar--C");
    expect(html).toContain("--pct:62%");
    expect(scoreBar(150)).toContain("--pct:100%");
  });
});

describe("NR chip link target", () => {
  it("how-we-grade defines the #not-rated anchor the chip links to", async () => {
    const { howWeGradePage } = await import("../src/templates/how-we-grade");
    expect(howWeGradePage()).toContain('id="not-rated"');
  });
});
