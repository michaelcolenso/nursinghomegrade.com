import { describe, expect, it } from "vitest";
import { facilityPage } from "../src/templates/facility";
import type { FacilityPageData, Facility } from "../src/types";

// All 194 Washington facility pages previously carried an identical "Top Rated
// in Washington" block linking the same four facilities. That creates
// near-duplicate link blocks at scale and starves the other 190 pages of
// internal links. Peers are now selected per facility.

const base: FacilityPageData = {
  cms_id: "505081",
  name: "Pacific Care",
  address: "1 Main St",
  city: "Hoquiam",
  state: "WA",
  zip: "98550",
  latitude: 46.97,
  longitude: -123.88,
  overall_rating: 2,
  quality_rating: 2,
  staffing_rating: 2,
  inspection_rating: 2,
  rn_hours_per_resident_day: 0.3,
  total_deficiencies: 12,
  grade_score: 30,
  grade_letter: "F",
  grade_summary: "",
  slug: "pacific-care",
  updated_at: "2026-01-01T00:00:00.000Z",
  complaint_deficiencies_cycle_1: 1,
};

function peer(n: number, over: Partial<Facility> = {}): Facility {
  return {
    ...base,
    cms_id: `9000${n}`,
    name: `Peer ${n}`,
    slug: `peer-${n}`,
    grade_letter: "C",
    grade_score: 55,
    ...over,
  } as Facility;
}

function facilityLinks(html: string): string[] {
  return [...html.matchAll(/href="\/facility\/([^"]+)"/g)].map((m) => m[1]!);
}

describe("per-facility peer links", () => {
  it("links peers drawn from outside the city when the city is small", () => {
    // Hoquiam is small: peers come from elsewhere in the state.
    const peers = [peer(1, { city: "Aberdeen" }), peer(2, { city: "Olympia" }), peer(3, { city: "Tacoma" })];
    const html = facilityPage(base, [], peers, []);
    const links = facilityLinks(html);
    for (const p of peers) expect(links.some((l) => l.startsWith(p.cms_id))).toBe(true);
  });

  it("never renders an empty module even with no peers at all", () => {
    const html = facilityPage(base, [], [], []);
    expect(html).toContain("More Facilities");
    // Falls back to city and state hubs rather than an empty list.
    expect(html).toContain("/state/washington/hoquiam");
    expect(html).toContain("/state/washington");
  });

  it("surfaces better-graded nearby options for a poorly graded facility", () => {
    const better = [
      peer(7, { city: "Aberdeen", grade_letter: "D", grade_score: 42 }),
      peer(8, { city: "Olympia", grade_letter: "C", grade_score: 58 }),
    ];
    const html = facilityPage(base, [], [], better);
    expect(html).toContain("Better graded nearby");
    const links = facilityLinks(html);
    expect(links.some((l) => l.startsWith("90007"))).toBe(true);
    expect(links.some((l) => l.startsWith("90008"))).toBe(true);
  });

  it("omits the better-graded block when there is nothing better to point at", () => {
    const html = facilityPage({ ...base, grade_letter: "A", grade_score: 92 }, [], [peer(1)], []);
    expect(html).not.toContain("Better graded nearby");
  });

  it("does not link the same facility twice on one page", () => {
    const peers = Array.from({ length: 8 }, (_, i) => peer(i + 1, { city: "Aberdeen" }));
    const html = facilityPage(base, [], peers, [peers[0]!]);
    const links = facilityLinks(html);
    expect(new Set(links).size).toBe(links.length);
  });

  it("no longer renders a statewide top-rated block", () => {
    const html = facilityPage(base, [], [peer(1)], []);
    expect(html).not.toContain("Top Rated in");
  });
});
