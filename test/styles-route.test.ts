import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { layout } from "../src/templates/layout";
import { SITE_CSS, SITE_CSS_HASH, SITE_CSS_HREF } from "../src/styles";
import type { Env } from "../src/types";

const env = { DB: {} as D1Database, CACHE: {} as KVNamespace } as Env;
const get = (path: string) => worker.fetch(new Request(`https://nursinghomegrade.com${path}`), env);

describe("site stylesheet route", () => {
  it("serves the current hashed stylesheet as immutable text/css", async () => {
    const res = await get(SITE_CSS_HREF);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/css");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(await res.text()).toBe(SITE_CSS);
  });

  it("serves a stale hash with the current CSS and a short TTL", async () => {
    const res = await get("/assets/site.deadbeef.css");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(await res.text()).toBe(SITE_CSS);
  });

  it("hash is stable and derived from the CSS", () => {
    expect(SITE_CSS_HASH).toMatch(/^[0-9a-f]{8}$/);
    expect(SITE_CSS_HREF).toBe(`/assets/site.${SITE_CSS_HASH}.css`);
  });
});

describe("layout() head", () => {
  const html = layout("T", "D", "<p>x</p>");

  it("links the external stylesheet instead of inlining CSS", () => {
    expect(html).toContain(`<link rel="stylesheet" href="${SITE_CSS_HREF}">`);
    expect(html).not.toContain("<style>");
  });
});
