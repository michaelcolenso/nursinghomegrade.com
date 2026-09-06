import { describe, expect, it } from "vitest";
import { getAllStateSlugs } from "../src/states";
import {
  classifySitemapUrl,
  compareSitemapCoverage,
  parseSitemapBaseline,
  shouldUpdateSitemapBaseline,
  type SitemapCoverage,
} from "../src/indexation-health";

const baseline = parseSitemapBaseline(
  JSON.stringify({
    totalUrls: 100,
    shardCount: 4,
    recordedAt: "2026-08-21T00:00:00.000Z",
    pageClasses: { core: 10, city: 30, facility: 60 },
  }),
);

const coverage = (overrides: Partial<SitemapCoverage> = {}): SitemapCoverage => ({
  totalUrls: 100,
  shardCount: 4,
  pageClasses: { core: 10, city: 30, facility: 60 },
  ...overrides,
});

describe("sitemap URL page classes", () => {
  it("recognizes core, city, and facility routes", () => {
    expect(classifySitemapUrl("https://nursinghomegrade.com/")).toBe("core");
    expect(classifySitemapUrl("https://nursinghomegrade.com/state/washington")).toBe("core");
    expect(classifySitemapUrl("https://nursinghomegrade.com/state/washington/seattle")).toBe("city");
    expect(classifySitemapUrl("https://nursinghomegrade.com/facility/345403-highfield-nursing-and-rehabilitation")).toBe("facility");
  });

  it("rejects an unexpected sitemap route class", () => {
    expect(classifySitemapUrl("https://nursinghomegrade.com/search?zip=27518")).toBe("unknown");
  });

  it("recognizes the staffing report hub and every supported state report", () => {
    expect(classifySitemapUrl("https://nursinghomegrade.com/reports/staffing-failures")).toBe("core");
    for (const slug of getAllStateSlugs()) {
      expect(classifySitemapUrl(`https://nursinghomegrade.com/reports/staffing-failures/${slug}`)).toBe("core");
    }
  });

  it.each([
    "/reports/staffing-failures/atlantis",
    "/reports/staffing-failures/constructor",
    "/reports/staffing-failures/washington/seattle",
    "/reports/staffing-failures/washington/",
    "/reports/staffing-failures/washington?page=2",
    "/reports/staffing-failures#table",
    "/reports/unreviewed",
  ])("keeps unapproved report URLs out of the sitemap: %s", (path) => {
    expect(classifySitemapUrl(`https://nursinghomegrade.com${path}`)).toBe("unknown");
  });
});

describe("sitemap baseline validation", () => {
  it("accepts the legacy total/shard baseline until it is intentionally refreshed", () => {
    const legacy = parseSitemapBaseline(JSON.stringify({ totalUrls: 100, shardCount: 4, recordedAt: "2026-08-21" }));
    expect(legacy.pageClasses).toBeUndefined();
  });

  it("rejects malformed or unsafe baselines instead of silently disabling the check", () => {
    expect(() => parseSitemapBaseline("{}")).toThrow(/totalUrls/);
    expect(() => parseSitemapBaseline(JSON.stringify({ totalUrls: 0, shardCount: 1, recordedAt: "2026-08-21" }))).toThrow(/positive/);
    expect(() => parseSitemapBaseline(JSON.stringify({ totalUrls: 10, shardCount: 1, recordedAt: "not-a-date" }))).toThrow(/recordedAt/);
    expect(() => parseSitemapBaseline(JSON.stringify({ totalUrls: 10, shardCount: 1, recordedAt: "2026-08-21", pageClasses: { core: 10, city: 1, facility: 1 } }))).toThrow(/sum/);
  });
});

describe("sitemap coverage regressions", () => {
  it("catches a core-page collapse even when total URLs barely changes", () => {
    const problems = compareSitemapCoverage(
      coverage({ pageClasses: { core: 0, city: 30, facility: 70 } }),
      baseline,
    );
    expect(problems.some((problem) => problem.includes("core") && problem.includes("dropped"))).toBe(true);
  });

  it("catches unknown routes and preserves the existing total/shard threshold", () => {
    const problems = compareSitemapCoverage(
      coverage({ totalUrls: 5, shardCount: 1, pageClasses: { core: 1, city: 1, facility: 1, unknown: 2 } }),
      baseline,
    );
    expect(problems.some((problem) => problem.includes("unknown"))).toBe(true);
    expect(problems.some((problem) => problem.includes("Total sitemap URLs dropped"))).toBe(true);
    expect(problems.some((problem) => problem.includes("shard count dropped"))).toBe(true);
  });

  it("does not flag a healthy coverage report", () => {
    expect(compareSitemapCoverage(coverage(), baseline)).toEqual([]);
  });

  it("never overwrites a known-good baseline after a failed health run", () => {
    expect(shouldUpdateSitemapBaseline(true, ["thin 200"])).toBe(false);
    expect(shouldUpdateSitemapBaseline(true, [])).toBe(true);
    expect(shouldUpdateSitemapBaseline(false, [])).toBe(false);
  });
});
