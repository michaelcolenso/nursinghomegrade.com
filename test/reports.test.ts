import { describe, expect, it } from "vitest";
import { handleStaffingFailures } from "../src/handlers/reports";
import type { Env } from "../src/types";

interface ReportFacility {
  cms_id: string;
  name: string;
  city: string;
  state: string;
  rn_hours_per_resident_day: number | null;
  grade_score: number;
  grade_letter: string;
  slug: string;
}

function createEnv(data: {
  counts?: Array<{ state: string; count: number }>;
  facilities?: ReportFacility[];
  total?: number;
}): Env {
  const counts = data.counts ?? [];
  const facilities = data.facilities ?? [];
  const total = data.total ?? facilities.length;
  let currentQuery = "";
  let bound = false;
  let boundArgs: unknown[] = [];

  const statement = {
    bind(..._args: unknown[]) {
      bound = true;
      boundArgs = _args;
      return statement;
    },
    async all<T>() {
      // Mirrors real D1: executing a statement with ? placeholders before
      // binding throws. This guards the production bug where the returned
      // statement from bind() was discarded and an unbound statement ran.
      if (currentQuery.includes("?") && !bound) {
        throw new Error("D1 statement executed without bind");
      }
      if (currentQuery.includes("GROUP BY state")) {
        return { results: counts } as unknown as { results: T[] };
      }
      if (currentQuery.includes("LIMIT")) {
        const limit = Number(boundArgs[1] ?? facilities.length);
        const offset = Number(boundArgs[2] ?? 0);
        return { results: facilities.slice(offset, offset + limit) } as unknown as { results: T[] };
      }
      return { results: facilities } as unknown as { results: T[] };
    },
    async first<T>() {
      if (currentQuery.includes("?") && !bound) {
        throw new Error("D1 statement executed without bind");
      }
      return { count: total } as unknown as T;
    },
  };

  const db = {
    prepare(query: string) {
      currentQuery = query;
      bound = false;
      boundArgs = [];
      return statement;
    },
  };

  const cache = {
    async get() {
      return null;
    },
    async put() {
      return;
    },
  };

  return { DB: db as unknown as D1Database, CACHE: cache as unknown as KVNamespace } as Env;
}

const sampleFacilities: ReportFacility[] = Array.from({ length: 450 }, (_, i) => ({
  cms_id: `05${String(i).padStart(4, "0")}`,
  name: `Facility ${i + 1}`,
  city: "Austin",
  state: "TX",
  rn_hours_per_resident_day: 0.42,
  grade_score: 40 + (i % 30),
  grade_letter: "D",
  slug: `facility-${i + 1}`,
}));

describe("handleStaffingFailures national page", () => {
  it("renders a state summary instead of the full facility table", async () => {
    const env = createEnv({
      counts: [
        { state: "TX", count: 5 },
        { state: "CA", count: 3 },
      ],
    });
    const res = await handleStaffingFailures(
      new Request("https://nursinghomegrade.com/reports/staffing-failures"),
      env,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("/reports/staffing-failures/texas");
    expect(html).toContain("/reports/staffing-failures/california");
    expect(html).toContain("8 facilities");
    expect(html).toContain("Facilities Below the 0.55 Hour Benchmark, by State");
    expect(html).not.toContain('href="/facility/');
    expect(html).toContain(
      'rel="canonical" href="https://nursinghomegrade.com/reports/staffing-failures"',
    );
  });
});

describe("handleStaffingFailures state pages", () => {
  it("renders page 1 of a paginated state report", async () => {
    const env = createEnv({ facilities: sampleFacilities, total: 450 });
    const res = await handleStaffingFailures(
      new Request("https://nursinghomegrade.com/reports/staffing-failures/texas"),
      env,
      "texas",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Staffing Failures in Texas");
    expect(html).toContain("450 facilities");
    expect(html).toContain("Facility 1");
    expect(html).toContain("Page 1 of 3");
    expect(html).toContain('rel="next"');
    expect(html).not.toContain('rel="prev"');
    expect(html).not.toContain("noindex");
    expect(html).toContain(
      'rel="canonical" href="https://nursinghomegrade.com/reports/staffing-failures/texas"',
    );
  });

  it("noindexes and self-canonicalizes pages beyond the first", async () => {
    const env = createEnv({ facilities: sampleFacilities, total: 450 });
    const res = await handleStaffingFailures(
      new Request("https://nursinghomegrade.com/reports/staffing-failures/texas?page=2"),
      env,
      "texas",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Page 2 of 3");
    expect(html).toContain("(Page 2)");
    expect(html).toContain(
      'rel="canonical" href="https://nursinghomegrade.com/reports/staffing-failures/texas?page=2"',
    );
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
    expect(html).toContain('rel="prev"');
    expect(html).toContain('rel="next"');
    expect(html).toContain("Facility 201");
    expect(html).not.toContain("Facility 401");
  });

  it("omits pagination when everything fits on one page", async () => {
    const env = createEnv({ facilities: sampleFacilities.slice(0, 3), total: 3 });
    const res = await handleStaffingFailures(
      new Request("https://nursinghomegrade.com/reports/staffing-failures/california"),
      env,
      "california",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("3 facilities");
    expect(html).not.toContain("Page 1 of");
    expect(html).not.toContain('aria-label="Pagination"');
  });

  it("returns 404 for a page beyond the last", async () => {
    const env = createEnv({ facilities: sampleFacilities, total: 450 });
    const res = await handleStaffingFailures(
      new Request("https://nursinghomegrade.com/reports/staffing-failures/texas?page=9"),
      env,
      "texas",
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown state slug", async () => {
    const env = createEnv({ facilities: sampleFacilities, total: 450 });
    const res = await handleStaffingFailures(
      new Request("https://nursinghomegrade.com/reports/staffing-failures/atlantis"),
      env,
      "atlantis",
    );
    expect(res.status).toBe(404);
  });

  it("normalizes a non-numeric page parameter to page 1", async () => {
    const env = createEnv({ facilities: sampleFacilities.slice(0, 3), total: 3 });
    const res = await handleStaffingFailures(
      new Request("https://nursinghomegrade.com/reports/staffing-failures/texas?page=abc"),
      env,
      "texas",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Staffing Failures in Texas");
    expect(html).not.toContain("noindex");
  });
});
