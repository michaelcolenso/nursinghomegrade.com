import { describe, expect, it } from "vitest";
import { bestPage, worstPage } from "../src/templates/best";

interface Row {
  cms_id: string;
  name: string;
  city: string;
  state: string;
  rn_hours_per_resident_day: number | null;
  total_deficiencies: number | null;
  grade_score: number;
  grade_letter: string;
  slug: string;
}

function row(n: number, over: Partial<Row> = {}): Row {
  return {
    cms_id: `1000${n}`,
    name: `Top Care ${n}`,
    city: "Springfield",
    state: "IL",
    rn_hours_per_resident_day: 1.1,
    total_deficiencies: 1,
    grade_score: 90 + n,
    grade_letter: "A",
    slug: `top-care-${n}`,
    ...over,
  };
}

const sample = [row(1), row(2), row(3)];

describe("bestPage", () => {
  it("serves score and rating data in the first 300 words of the intro", () => {
    const html = bestPage(sample);
    const intro = html.slice(html.indexOf("<h1>"), html.indexOf("Rankings"));
    expect(intro.split(/\s+/).length).toBeLessThan(300);

    // Real figures computed from the rendered rows: top score, median, A count.
    expect(intro).toContain("top-rated facility scores 93/100");
    expect(intro).toContain("median score across the 3 ranked facilities is 92/100");
    expect(intro).toContain("3 hold an A grade");
  });

  it("computes a true median for an even number of facilities", () => {
    const html = bestPage([row(1, { grade_score: 80 }), row(2, { grade_score: 90 }), row(3, { grade_score: 70 }), row(4, { grade_score: 85 })]);
    expect(html).toContain("median score across the 4 ranked facilities is 83/100");
  });

  it("renders the state-scoped variant with state figures", () => {
    const html = bestPage([row(1, { state: "KY", city: "Louisville" }), row(2, { state: "KY", city: "Lexington", grade_score: 88, grade_letter: "B" })], "Kentucky");
    expect(html).toContain("Best Nursing Homes in Kentucky");
    expect(html).toContain("top-rated facility scores 91/100");
    expect(html).toContain("median score across the 2 ranked facilities is 90/100");
    expect(html).toContain("1 holds an A grade");
  });

  it("degrades gracefully with no facilities", () => {
    const html = bestPage([]);
    expect(html).toContain("No facilities found.");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("NaN");
  });
});

describe("worstPage", () => {
  it("still renders its warning box and table", () => {
    const html = worstPage([row(1, { grade_score: 7, grade_letter: "F" })]);
    expect(html).toContain("significant concerns in one or more areas");
    expect(html).toContain("Top Care 1");
    expect(html).toContain("See highest-rated");
  });
});
