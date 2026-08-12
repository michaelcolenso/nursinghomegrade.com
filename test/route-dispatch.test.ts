import { describe, expect, it } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/types";

// /state/:state/report and /state/:state/:city are both matched by paths of
// the shape /state/x/y, and the state-report route must win — otherwise
// "report" is treated as a city slug, no facility exists in a city called
// "report", and every state's report page 404s instead of rendering.

function stubEnv(): Env {
  const statement = {
    async first<T>() {
      return null as T | null;
    },
    async all<T>() {
      return { results: [] as T[] };
    },
    bind(..._args: unknown[]) {
      return statement;
    },
  };
  const db = { prepare: () => statement };
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

describe("/state/:state/report vs /state/:state/:city dispatch", () => {
  it("routes /state/:state/report to the state report handler, not the city handler", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/state/washington/report"), stubEnv());
    // A stub DB with no facilities is a valid (if empty) state report — 200.
    // Before the fix this fell into handleCity("report"), which 404s because
    // no facility exists in a city literally named "report".
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain("Page not found");
  });

  it("still routes a genuine /state/:state/:city path to the city handler", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/state/washington/seattle"), stubEnv());
    // No facilities in the stub DB match any city, so this is a legitimate 404
    // from handleCity — proving the city route still runs for non-"report" slugs.
    expect(res.status).toBe(404);
  });

  it("treats a state literally named with a report-like slug as a state, not breaking /state/:state alone", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/state/washington"), stubEnv());
    expect(res.status).toBe(200);
  });
});

describe("canonical host normalization", () => {
  it("redirects www to the apex host, preserving path and query", async () => {
    const res = await worker.fetch(
      new Request("https://www.nursinghomegrade.com/facility/345403-highfield-nursing-and-rehabilitation?utm_source=x"),
      stubEnv(),
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe(
      "https://nursinghomegrade.com/facility/345403-highfield-nursing-and-rehabilitation?utm_source=x",
    );
  });

  it("redirects www on the homepage too", async () => {
    const res = await worker.fetch(new Request("https://www.nursinghomegrade.com/"), stubEnv());
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://nursinghomegrade.com/");
  });

  it("does not redirect the canonical apex host", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/"), stubEnv());
    expect(res.status).not.toBe(301);
  });

  it("does not redirect an unrelated host that happens to end with the same suffix", async () => {
    // Regression guard for a naive `hostname.endsWith("nursinghomegrade.com")`
    // check, which "evilnursinghomegrade.com" would also satisfy.
    const res = await worker.fetch(new Request("https://evilnursinghomegrade.com/"), stubEnv());
    expect(res.status).not.toBe(301);
  });
});
