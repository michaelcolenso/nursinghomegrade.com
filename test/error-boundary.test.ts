import { describe, expect, it } from "vitest";
import worker, { routePattern, providerIdFromPath } from "../src/index";

// Googlebot demotes a page that returns 500 and retries one that returns 503
// with Retry-After. With 2,196 URLs sitting in Search Console's server-error
// bucket — a quarter of the not-indexed deficit — that distinction is the point
// of this work.

// Throws the moment a handler touches the database, standing in for a D1
// timeout or a subrequest limit hit under a crawler burst.
const brokenEnv = {
  get DB(): never {
    throw new Error("D1_TIMEOUT: simulated");
  },
  CACHE: { get: async () => null, put: async () => undefined },
} as never;

describe("5xx responses are marked transient", () => {
  it("adds Retry-After to a handler's own 503", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/state/washington"), brokenEnv);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.headers.get("Retry-After")).toBe("120");
  });

  it("never allows a failed response to be cached", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/state/washington"), brokenEnv);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not mark a 404 as retryable", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/no-such-page"), brokenEnv);
    expect(res.status).toBe(404);
    expect(res.headers.get("Retry-After")).toBeNull();
  });

  it("leaves successful responses cacheable", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/robots.txt"), brokenEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).not.toBe("no-store");
  });
});

describe("error log grouping", () => {
  // Raw paths are unbounded, so logs keyed by them cannot be grouped. Patterns
  // are what make a failing route visible in aggregate.
  it("collapses high-cardinality paths to patterns", () => {
    expect(routePattern("/facility/505531-heron-s-key")).toBe("/facility/:id");
    expect(routePattern("/state/washington")).toBe("/state/:state");
    expect(routePattern("/state/washington/seattle")).toBe("/state/:state/:city");
    expect(routePattern("/state/washington/report")).toBe("/state/:state/report");
    expect(routePattern("/operator/life-care-centers")).toBe("/operator/:slug");
    expect(routePattern("/best/washington")).toBe("/best/:state");
    expect(routePattern("/")).toBe("/");
  });

  it("keeps low-cardinality report paths intact", () => {
    expect(routePattern("/reports/staffing-standard-repeal")).toBe("/reports/staffing-standard-repeal");
  });

  it("extracts the CMS provider id so a failure traces to a facility", () => {
    expect(providerIdFromPath("/facility/505531-heron-s-key")).toBe("505531");
    expect(providerIdFromPath("/state/washington")).toBeNull();
    expect(providerIdFromPath("/facility/malformed")).toBeNull();
  });
});
