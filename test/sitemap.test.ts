import { describe, expect, it } from "vitest";
import { buildSitemapIndexXml, sitemapKvUploadTarget } from "../src/sitemap";

describe("buildSitemapIndexXml", () => {
  it("lists the grouped sitemap documents on the canonical host", () => {
    const xml = buildSitemapIndexXml([
      "https://nursinghomegrade.com/sitemap-core.xml",
      "https://nursinghomegrade.com/sitemap-cities.xml",
      "https://nursinghomegrade.com/sitemap-facilities.xml",
    ]);

    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://nursinghomegrade.com/sitemap-core.xml</loc>");
    expect(xml).toContain("<loc>https://nursinghomegrade.com/sitemap-cities.xml</loc>");
    expect(xml).toContain("<loc>https://nursinghomegrade.com/sitemap-facilities.xml</loc>");
  });
});

describe("sitemapKvUploadTarget", () => {
  it("uses the local preview binding that wrangler dev reads", () => {
    expect(sitemapKvUploadTarget(true)).toBe("--binding CACHE --preview --local");
  });

  it("keeps remote sitemap uploads on the production KV namespace", () => {
    expect(sitemapKvUploadTarget(false)).toBe(
      "--namespace-id=fa0faa67ae0c434093a3aeaa14a5992e --remote",
    );
  });
});
