import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { htmlCacheKey } from "../src/cache";
import { dataFreshness } from "../src/templates/data-freshness";
import type { DataRelease } from "../src/templates/data-sources";
import type { Env, Facility } from "../src/types";

const releases: DataRelease[] = [
  { source_key: "provider_info", label: "Provider Information", cms_release_date: "2026-08-26", ingested_at: "2026-09-04T23:30:00Z", source_url: null },
  { source_key: "health_deficiencies", label: "Health Deficiencies", cms_release_date: "2026-08-20", ingested_at: "2026-09-03 01:00:00", source_url: null },
  { source_key: "mds_quality_measures", label: "Shadow evidence", cms_release_date: "2026-10-01", ingested_at: "2026-10-02T00:00:00Z", source_url: null },
];

const facility: Facility = {
  cms_id: "999999", name: "Example Care", slug: "example-care",
  address: "1 Test Ave", city: "Seattle", state: "WA", zip: "98101",
  latitude: null, longitude: null, overall_rating: 4, quality_rating: 4,
  staffing_rating: 4, inspection_rating: 4, rn_hours_per_resident_day: 0.6,
  total_deficiencies: 1, grade_score: 85, grade_letter: "A", grade_summary: "Example",
  updated_at: "2026-09-04T00:00:00Z",
};

function stubEnv(options: { empty?: boolean; missingReleases?: boolean } = {}) {
  const prepare = vi.fn((sql: string) => {
    const statement = {
      bind: (..._values: unknown[]) => statement,
      first: async () => ({ pct_failing: 70 }),
      all: async () => {
        if (sql.includes("FROM data_releases")) {
          if (options.missingReleases) throw new Error("No release metadata");
          return { results: releases };
        }
        return { results: options.empty ? [] : [facility] };
      },
    };
    return statement;
  });
  return { env: { DB: { prepare } } as unknown as Env, prepare };
}

afterEach(() => vi.unstubAllGlobals());

describe("visible data freshness", () => {
  it("distinguishes each public source's CMS release from its load date", () => {
    const html = dataFreshness(releases);
    expect(html).toContain('aria-label="Data freshness"');
    expect(html).toContain("Data as of:");
    expect(html).toContain("(CMS release)");
    expect(html).toContain("Loaded:");
    expect(html).toContain("by NursingHomeGrade");
    for (const date of ["August 26, 2026", "August 20, 2026", "September 4, 2026", "September 3, 2026"]) {
      expect(html).toContain(date);
    }
    expect(html).not.toContain("October");
    expect(html).toContain('href="/data-sources"');
  });

  it.each([null, "", "not-a-date", "2026-02-30", "<script>alert(1)</script>"])(
    "discloses missing/invalid dates without inventing freshness: %s", (date) => {
      const html = dataFreshness([{ ...releases[0]!, cms_release_date: date, ingested_at: date }]);
      expect(html.match(/Not recorded/g)).toHaveLength(4);
      expect(html).not.toContain("<time");
      expect(html).not.toContain("<script");
    },
  );

  it.each([
    ["/", false], ["/search", false], ["/search?zip=98101", false], ["/search?zip=98101", true],
  ] as const)("renders dates server-side for %s (empty=%s)", async (path, empty) => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 404 }));
    const { env, prepare } = stubEnv({ empty });
    const res = await worker.fetch(new Request(`https://nursinghomegrade.com${path}`), env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('aria-label="Data freshness"');
    expect(html).toContain("August 26, 2026");
    expect(html).toContain("September 4, 2026");
    expect(prepare.mock.calls.filter(([sql]) => sql.includes("FROM data_releases"))).toHaveLength(1);
    if (path.includes("zip=")) {
      expect(html).toContain(empty ? "No facilities found" : "Example Care");
    }
  });

  it("keeps working when release metadata is unavailable, without stamping today's date", async () => {
    const { env } = stubEnv({ missingReleases: true });
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/"), env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("70%");
    expect(html.match(/Not recorded/g)).toHaveLength(4);
  });

  it("bypasses old HTML and serves the new cached home without any D1 reads", async () => {
    const entries = new Map<string, Response>();
    const urlFor = (key: string) => `https://nursinghomegrade.com/__cache/${encodeURIComponent(key)}`;
    entries.set(urlFor("html:v28:page:home"), new Response("old home"));
    vi.stubGlobal("caches", { default: {
      match: async (req: Request) => entries.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => { entries.set(req.url, res.clone()); },
    } });
    const { env, prepare } = stubEnv();
    const request = new Request("https://nursinghomegrade.com/");
    const cold = await worker.fetch(request, env);
    const html = await cold.text();
    expect(html).toContain("August 26, 2026");
    const stored = entries.get(urlFor(htmlCacheKey("page:home")));
    expect(stored?.headers.get("Cache-Control")).toBe("public, max-age=3600");
    prepare.mockClear();
    const hit = await worker.fetch(request, env);
    expect(await hit.text()).toBe(html);
    expect(prepare).not.toHaveBeenCalled();
  });
});
