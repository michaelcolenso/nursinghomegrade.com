import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { htmlCacheKey, pageCache } from "../src/cache";
import type { Env, Facility } from "../src/types";

const facility: Facility = {
  cms_id: "999999", name: "Example Care", slug: "example-care",
  address: "1 Test Ave", city: "Seattle", state: "WA", zip: "98101",
  latitude: null, longitude: null, overall_rating: 4, quality_rating: 4,
  staffing_rating: 4, inspection_rating: 4, rn_hours_per_resident_day: 0.6,
  total_deficiencies: 1, grade_score: 85, grade_letter: "A", grade_summary: "Example",
  updated_at: "2026-09-04T00:00:00Z",
};

function createEnv() {
  const failure = { all: false, snapshots: false, missingFacility: false };
  const prepare = vi.fn((query: string) => {
    if (failure.all) throw new Error("D1_TIMEOUT: simulated");
    const statement = {
      bind: (..._values: unknown[]) => statement,
      first: async () => {
        if (query.includes("SELECT * FROM facilities WHERE cms_id = ?")) {
          return failure.missingFacility ? null : facility;
        }
        if (query.includes("FROM site_stats")) {
          return { pct_failing: 70, avg_grade: 75, avg_rn_hours: 0.5, avg_deficiencies: 6, total_facilities: 1 };
        }
        if (query.includes("FROM state_stats")) return { pct_failing: 60, rn_median: 0.5 };
        if (query.includes("SELECT COUNT(*) as count")) return { count: 1 };
        return null;
      },
      all: async () => {
        if (failure.snapshots && query.includes("FROM facility_snapshots")) {
          throw new Error("D1_RENDER: simulated");
        }
        if (query.includes("FROM data_releases")) {
          return { results: [{ source_key: "provider_info", label: "Provider Information", cms_release_date: "2026-08-26", ingested_at: "2026-09-04T00:00:00Z", source_url: null }] };
        }
        if (query.includes("GROUP BY city")) return { results: [{ city: "Seattle", count: 1 }] };
        if (query.includes("GROUP BY grade_letter")) return { results: [{ grade_letter: "A", count: 1 }] };
        if (query.includes("SELECT cms_id, name, address, city") || query.includes("SELECT cms_id, name, slug, city")) {
          return { results: [facility] };
        }
        return { results: [] };
      },
    };
    return statement;
  });
  return { env: { DB: { prepare } } as unknown as Env, prepare, failure };
}

/** Model Cache API expiry from the stored response's max-age, independently of page keys. */
function installCache() {
  let now = 0;
  const entries = new Map<string, { response: Response; expiresAt: number }>();
  const cache = {
    match: vi.fn(async (req: Request) => {
      const entry = entries.get(req.url);
      return entry && now < entry.expiresAt ? entry.response.clone() : undefined;
    }),
    put: vi.fn(async (req: Request, response: Response) => {
      const ttl = Number(/max-age=(\d+)/.exec(response.headers.get("Cache-Control") ?? "")?.[1] ?? 0);
      entries.set(req.url, { response: response.clone(), expiresAt: now + ttl });
    }),
    delete: vi.fn(async (req: Request) => entries.delete(req.url)),
  };
  vi.stubGlobal("caches", { default: cache });
  return { ...cache, advance: (seconds: number) => { now += seconds; } };
}

const getPage = (path: string, env: Env, accept?: string) => worker.fetch(
  new Request(`https://nursinghomegrade.com${path}`, { headers: accept ? { Accept: accept } : undefined }), env,
);
const stablePages = [
  ["/facility/999999-example-care", "/facility/:id", "999999", 86400],
  ["/state/washington/seattle", "/state/:state/:city", null, 86400],
  ["/state/washington", "/state/:state", null, 86400],
  ["/", "/", null, 3600],
  ["/data-sources", "/data-sources", null, 86400],
] as const;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("last-known-good stable pages", () => {
  it.each(stablePages)("serves exact prior HTML for %s after fresh expiry and D1 failure", async (path, route, providerId, ttl) => {
    const cache = installCache();
    const logs = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env, failure } = createEnv();
    const fresh = await getPage(path, env);
    expect(fresh.status).toBe(200);
    expect(fresh.headers.get("Cache-Control")).toBe(`public, max-age=${ttl}, stale-while-revalidate=604800`);
    const html = await fresh.text();
    expect(html).toContain("<!DOCTYPE html>");

    cache.advance(ttl + 1);
    failure.all = true;
    cache.put.mockClear();
    const stale = await getPage(path, env);
    expect(stale.status).toBe(200);
    expect(await stale.text()).toBe(html);
    expect(stale.headers.get("X-NHG-Cache")).toBe("stale");
    expect(stale.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(stale.headers.get("Retry-After")).toBeNull();
    expect(stale.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(stale.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(stale.headers.get("Link")).toBe(fresh.headers.get("Link"));
    expect(stale.headers.get("Link")).toContain("/.well-known/");
    if (route === "/state/:state/:city") {
      expect(html).toContain('<meta name="robots" content="noindex, follow">');
    }
    expect(cache.put).not.toHaveBeenCalled();
    expect(logs).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logs.mock.calls[0]![0] as string)).toMatchObject({
      level: "error", msg: "page_render_error", route, provider_id: providerId,
      error: "Error", message: "D1_TIMEOUT: simulated",
    });
  });

  it.each(stablePages)("keeps never-rendered %s failures retryable and never stores the error page", async (path) => {
    const cache = installCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env, failure } = createEnv();
    failure.all = true;
    const response = await getPage(path, env);
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-NHG-Cache")).toBeNull();
    expect(await response.text()).toContain("Service unavailable");
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("serves a fresh canonical facility cache hit without any D1 access", async () => {
    installCache();
    const { env, prepare, failure } = createEnv();
    const first = await getPage("/facility/999999-example-care", env);
    const html = await first.text();
    prepare.mockClear();
    failure.all = true;
    const second = await getPage("/facility/999999-example-care", env);
    expect(second.status).toBe(200);
    expect(await second.text()).toBe(html);
    expect(second.headers.get("Cache-Control")).toBe("public, max-age=86400, stale-while-revalidate=604800");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("uses stale facility HTML when a required render-time query fails after the primary lookup succeeds", async () => {
    const cache = installCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env, failure } = createEnv();
    const fresh = await getPage("/facility/999999-example-care", env);
    const html = await fresh.text();
    cache.advance(86401);
    failure.snapshots = true;
    const response = await getPage("/facility/999999-example-care", env);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-NHG-Cache")).toBe("stale");
    expect(await response.text()).toBe(html);
  });

  it("does not use a canonical facility's cached HTML for another slug", async () => {
    const cache = installCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env, failure } = createEnv();
    await getPage("/facility/999999-example-care", env);
    const wrong = "/facility/999999-wrong-slug";
    const redirect = await getPage(wrong, env);
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get("Location")).toBe("https://nursinghomegrade.com/facility/999999-example-care");
    expect(redirect.headers.get("X-NHG-Cache")).toBeNull();
    failure.missingFacility = true;
    expect((await getPage(wrong, env)).status).toBe(404);
    failure.all = true;
    cache.advance(86401);
    const unavailable = await getPage(wrong, env);
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("X-NHG-Cache")).toBeNull();
  });

  it("keeps a real facility removal as 404 after fresh expiry even when prior HTML is retained", async () => {
    const cache = installCache();
    const { env, failure } = createEnv();
    await getPage("/facility/999999-example-care", env);
    cache.advance(86401);
    failure.missingFacility = true;
    cache.put.mockClear();
    const response = await getPage("/facility/999999-example-care", env);
    expect(response.status).toBe(404);
    expect(response.headers.get("X-NHG-Cache")).toBeNull();
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("does not renew stale retention on fallback and returns 503 once it expires", async () => {
    const cache = installCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env, failure } = createEnv();
    await getPage("/state/washington/seattle", env);
    cache.advance(86401);
    failure.all = true;
    expect((await getPage("/state/washington/seattle", env)).headers.get("X-NHG-Cache")).toBe("stale");
    cache.advance(604800 - 86401);
    cache.put.mockClear();
    const expired = await getPage("/state/washington/seattle", env);
    expect(expired.status).toBe(503);
    expect(expired.headers.get("Retry-After")).toBe("120");
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("never uses stale stable-page HTML to hide a query-specific search failure", async () => {
    const cache = installCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", async () => new Response(null, { status: 404 }));
    const { env, failure } = createEnv();
    await pageCache.putWithStale(htmlCacheKey("page:home"), "Known good home");
    cache.advance(86401);
    failure.all = true;
    cache.put.mockClear();
    cache.match.mockClear();
    const response = await getPage("/search?zip=98101", env);
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-NHG-Cache")).toBeNull();
    expect(cache.put).not.toHaveBeenCalled();
    expect(cache.match.mock.calls.every(([req]) => decodeURIComponent(req.url).includes("zip:latlng:98101"))).toBe(true);
  });

  it("preserves stale and security headers when a cached facility is requested as Markdown", async () => {
    const cache = installCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env, failure } = createEnv();
    const fresh = await getPage("/facility/999999-example-care", env);
    cache.advance(86401);
    failure.all = true;
    const response = await getPage("/facility/999999-example-care", env, "text/markdown");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("X-NHG-Cache")).toBe("stale");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(response.headers.get("Link")).toBe(fresh.headers.get("Link"));
    const markdown = await response.text();
    expect(markdown).toContain("Example Care");
    expect(markdown).not.toContain("<!DOCTYPE html>");
  });

  it("preserves transient failure and security headers for a cold Markdown request", async () => {
    const cache = installCache();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env, failure } = createEnv();
    failure.all = true;
    const response = await getPage("/facility/999999-example-care", env, "text/markdown");
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-NHG-Cache")).toBeNull();
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(response.headers.get("Link")).toContain("/.well-known/");
    expect(await response.text()).toContain("Service unavailable");
    expect(cache.put).not.toHaveBeenCalled();
  });
});
