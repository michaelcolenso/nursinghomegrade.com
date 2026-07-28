import { describe, expect, it } from "vitest";
import worker from "../src/index";

// Facility URLs are sharded per state, so the Worker must serve
// /sitemap-facilities-{state}.xml from the matching KV key.

function envWithKeys(keys: Record<string, string>) {
  return {
    DB: {} as never,
    CACHE: { get: async (k: string) => keys[k] ?? null, put: async () => undefined },
  } as never;
}

describe("sitemap shard routing", () => {
  it("serves a per-state facility shard from its KV key", async () => {
    const env = envWithKeys({ "sitemap-facilities-washington": "<urlset/>" });
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/sitemap-facilities-washington.xml"), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/xml");
    expect(await res.text()).toBe("<urlset/>");
  });

  it("still serves the index and core shards", async () => {
    const env = envWithKeys({ sitemap: "<sitemapindex/>", "sitemap-core": "<urlset/>" });
    expect((await worker.fetch(new Request("https://nursinghomegrade.com/sitemap.xml"), env)).status).toBe(200);
    expect((await worker.fetch(new Request("https://nursinghomegrade.com/sitemap-core.xml"), env)).status).toBe(200);
  });

  it("404s a shard that has not been generated rather than erroring", async () => {
    const res = await worker.fetch(
      new Request("https://nursinghomegrade.com/sitemap-facilities-nowhere.xml"),
      envWithKeys({}),
    );
    expect(res.status).toBe(404);
  });

  it("does not treat an arbitrary xml path as a shard", async () => {
    const res = await worker.fetch(new Request("https://nursinghomegrade.com/evil.xml"), envWithKeys({}));
    expect(res.status).toBe(404);
  });
});
