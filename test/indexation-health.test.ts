import { describe, expect, it } from "vitest";
import { getAllStateSlugs } from "../src/states";
import {
  classifySitemapUrl,
  comparePlannedCityReduction,
  compareSitemapCoverage,
  parseAcceptedCityReduction,
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

describe("planned city reduction", () => {
  const reduced = (): SitemapCoverage => coverage({
    totalUrls: 75,
    pageClasses: { core: 10, city: 5, facility: 60 },
  });

  it("requires an explicit expected count and baseline-update request", () => {
    expect(parseAcceptedCityReduction([])).toBeUndefined();
    expect(parseAcceptedCityReduction(["--update-baseline"])).toBeUndefined();
    expect(parseAcceptedCityReduction(["--update-baseline", "--accept-city-reduction", "5"])).toBe(5);
    expect(() => parseAcceptedCityReduction(["--accept-city-reduction", "5"])).toThrow(/requires/);
    expect(() => parseAcceptedCityReduction(["--update-baseline", "--accept-city-reduction"])).toThrow(/positive integer/);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid expected count %s", (count) => {
    expect(comparePlannedCityReduction(reduced(), baseline, count)).not.toEqual([]);
    expect(() => parseAcceptedCityReduction(["--update-baseline", "--accept-city-reduction", String(count)])).toThrow();
  });

  it("accepts only the planned city and corresponding total reduction", () => {
    expect(comparePlannedCityReduction(reduced(), baseline, 5)).toEqual([]);
    expect(compareSitemapCoverage(reduced(), baseline).length).toBeGreaterThan(0);
    expect(comparePlannedCityReduction(reduced(), baseline, 6)).not.toEqual([]);
    expect(comparePlannedCityReduction(coverage(), baseline, 30)).not.toEqual([]);
    expect(comparePlannedCityReduction(coverage(), baseline, 31)).not.toEqual([]);
  });

  it("requires a class-aware healthy baseline from before rollout", () => {
    const { pageClasses: _classes, ...legacy } = baseline;
    expect(comparePlannedCityReduction(reduced(), legacy, 5).join()).toContain("before rollout");
  });

  it.each(["core", "facility"] as const)("rejects any %s loss even below the usual regression threshold", (name) => {
    const current = reduced();
    current.pageClasses[name] -= 1;
    current.totalUrls -= 1;
    expect(comparePlannedCityReduction(current, baseline, 5).join()).toContain(`${name} URLs decreased`);
  });

  it("rejects any lost shard", () => {
    expect(comparePlannedCityReduction({ ...reduced(), shardCount: 3 }, baseline, 5).join()).toContain("shard count decreased");
  });

  it.each([
    { totalUrls: 76 },
    { totalUrls: 0 },
    { shardCount: NaN },
    { pageClasses: { core: 10, city: 5, facility: 59, unknown: 1 } },
    { totalUrls: 76, pageClasses: { core: 10, city: 5, facility: 60, unknown: 1 } },
    { totalUrls: 76, pageClasses: { core: 10.5, city: 5, facility: 60.5 } },
    { totalUrls: 74, pageClasses: { core: 10, city: 5, facility: 60, unknown: -1 } },
    { pageClasses: { core: 10, city: 5, facility: NaN } },
    { totalUrls: 65, pageClasses: { core: 0, city: 5, facility: 60 } },
  ])("preserves invalid, unknown, empty and inconsistent count failures: %j", (change) => {
    expect(comparePlannedCityReduction({ ...reduced(), ...change }, baseline, 5)).not.toEqual([]);
  });

  it.each(["invalid XML", "5xx", "listed noindex", "thin 200", "canonical mismatch"])(
    "never approves a baseline write after a structural/probe failure: %s", (problem) => {
      const problems = [problem, ...comparePlannedCityReduction(reduced(), baseline, 5)];
      expect(shouldUpdateSitemapBaseline(true, problems)).toBe(false);
    },
  );
});
