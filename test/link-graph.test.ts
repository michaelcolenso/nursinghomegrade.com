import { describe, expect, it } from "vitest";
import { computeCoverage, peersFor, betterGradedFor, type LinkNode } from "../src/link-graph";

function node(id: string, city: string, over: Partial<LinkNode> = {}): LinkNode {
  return {
    cms_id: id,
    city,
    state: "WA",
    latitude: 47,
    longitude: -122,
    grade_letter: "C",
    grade_score: 55,
    ...over,
  };
}

describe("peer selection", () => {
  it("prefers same-city facilities when there are enough", () => {
    const all = [
      node("1", "Seattle"),
      node("2", "Seattle"),
      node("3", "Seattle"),
      node("4", "Seattle"),
      node("9", "Spokane", { latitude: 47.6, longitude: -117.4 }),
    ];
    const peers = peersFor(all[0]!, all);
    expect(peers.every((p) => p.city === "Seattle")).toBe(true);
  });

  it("widens beyond the city when the city is too small", () => {
    // Hoquiam has one other facility; the module still needs to fill.
    const all = [
      node("1", "Hoquiam", { latitude: 46.97, longitude: -123.88 }),
      node("2", "Hoquiam", { latitude: 46.98, longitude: -123.89 }),
      node("3", "Aberdeen", { latitude: 46.97, longitude: -123.8 }),
      node("4", "Olympia", { latitude: 47.03, longitude: -122.9 }),
    ];
    const peers = peersFor(all[0]!, all);
    expect(peers.length).toBeGreaterThanOrEqual(3);
    expect(peers.some((p) => p.city !== "Hoquiam")).toBe(true);
  });

  it("orders widened peers by proximity", () => {
    const all = [
      node("1", "Hoquiam", { latitude: 46.97, longitude: -123.88 }),
      node("far", "Spokane", { latitude: 47.66, longitude: -117.43 }),
      node("near", "Aberdeen", { latitude: 46.97, longitude: -123.8 }),
    ];
    const peers = peersFor(all[0]!, all);
    expect(peers[0]!.cms_id).toBe("near");
  });

  it("never returns the facility itself or out-of-state facilities", () => {
    const all = [node("1", "Seattle"), node("2", "Portland", { state: "OR" })];
    const peers = peersFor(all[0]!, all);
    expect(peers.some((p) => p.cms_id === "1")).toBe(false);
    expect(peers.some((p) => p.state !== "WA")).toBe(false);
  });
});

describe("better-graded selection", () => {
  it("returns nothing for a facility already in the top band", () => {
    const all = [node("1", "Seattle", { grade_letter: "A" }), node("2", "Seattle", { grade_letter: "B" })];
    expect(betterGradedFor(all[0]!, all)).toHaveLength(0);
  });

  it("prefers the closest better band first", () => {
    const all = [
      node("f", "Seattle", { grade_letter: "F" }),
      node("a", "Seattle", { grade_letter: "A" }),
      node("d", "Seattle", { grade_letter: "D" }),
    ];
    // An F facility should surface the adjacent D before the distant A.
    expect(betterGradedFor(all[0]!, all)[0]!.cms_id).toBe("d");
  });
});

describe("coverage", () => {
  // The spec's assertion: every facility reachable by at least 3 internal links.
  it("reports zero orphans for a realistically sized state", () => {
    const all = Array.from({ length: 40 }, (_, i) =>
      node(String(i), i < 20 ? "Seattle" : "Spokane", {
        latitude: 47 + i * 0.01,
        longitude: -122 - i * 0.01,
        grade_letter: ["A", "B", "C", "D", "F"][i % 5]!,
        grade_score: 90 - i,
      }),
    );
    const report = computeCoverage(all);
    expect(report.totalFacilities).toBe(40);
    expect(report.orphanCount).toBe(0);
    expect(report.minInbound).toBeGreaterThanOrEqual(3);
  });

  it("detects orphaning when every page links the same few facilities", () => {
    // Models the old statewide-top-rated behaviour: inbound links concentrate on
    // a handful of facilities and everything else is left with only its city page.
    const all = Array.from({ length: 10 }, (_, i) => node(String(i), `City${i}`, { latitude: null, longitude: null }));
    const report = computeCoverage(all);
    expect(report.orphanCount).toBeGreaterThan(0);
    expect(report.orphans[0]!.inbound).toBeLessThan(3);
  });

  it("does not count the state hub, which lists only the top few", () => {
    const all = [node("1", "Lonely", { latitude: null, longitude: null })];
    // Only the city listing counts: 1 inbound, below the threshold.
    expect(computeCoverage(all).orphans[0]!.inbound).toBe(1);
  });
});
