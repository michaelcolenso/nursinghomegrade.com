import { describe, expect, it } from "vitest";
import {
  MAX_URLS_PER_FILE,
  newestLastmod,
  toSitemapIndex,
  toXml,
  validateIndex,
  validateUrlset,
  type SitemapEntry,
} from "../src/sitemap-xml";

const TODAY = "2026-08-06";
const entry = (loc: string, lastmod?: string): SitemapEntry => ({ loc, lastmod });

const good = [
  entry("https://nursinghomegrade.com/", "2026-08-01"),
  entry("https://nursinghomegrade.com/facility/345403-highfield-nursing-and-rehabilitation", "2026-07-10"),
];

const errorsOf = (issues: ReturnType<typeof validateUrlset>) => issues.filter((i) => i.level === "error").map((i) => i.message);

describe("toXml", () => {
  it("emits a declaration and the sitemap namespace", () => {
    const xml = toXml(good);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain("<loc>https://nursinghomegrade.com/</loc>");
  });
});

describe("toSitemapIndex", () => {
  it("carries a lastmod for each child", () => {
    const xml = toSitemapIndex([{ loc: "https://nursinghomegrade.com/sitemap-core.xml", lastmod: "2026-08-01" }]);
    expect(xml).toContain("<lastmod>2026-08-01</lastmod>");
  });

  it("derives a child lastmod from the newest URL inside it, not the build clock", () => {
    expect(newestLastmod(good)).toBe("2026-08-01");
    expect(newestLastmod([entry("https://nursinghomegrade.com/x")])).toBeUndefined();
  });
});

describe("validateUrlset", () => {
  it("passes a well-formed sitemap", () => {
    expect(errorsOf(validateUrlset("ok.xml", good, toXml(good), TODAY))).toEqual([]);
  });

  it("rejects URLs off the canonical https host", () => {
    const bad = [entry("http://nursinghomegrade.com/"), entry("https://www.nursinghomegrade.com/")];
    expect(errorsOf(validateUrlset("bad.xml", bad, toXml(bad), TODAY))).toHaveLength(2);
  });

  it("rejects duplicate URLs, including case-only differences", () => {
    const dupes = [entry("https://nursinghomegrade.com/a"), entry("https://nursinghomegrade.com/A")];
    expect(errorsOf(validateUrlset("d.xml", dupes, toXml(dupes), TODAY))[0]).toContain("duplicate URL");
  });

  it("rejects a lastmod in the future or in the wrong format", () => {
    const future = [entry("https://nursinghomegrade.com/a", "2027-01-01")];
    expect(errorsOf(validateUrlset("f.xml", future, toXml(future), TODAY))[0]).toContain("future");
    const wrong = [entry("https://nursinghomegrade.com/a", "08/06/2026")];
    expect(errorsOf(validateUrlset("w.xml", wrong, toXml(wrong), TODAY))[0]).toContain("W3C date");
  });

  it("rejects an empty file and one over the protocol URL limit", () => {
    expect(errorsOf(validateUrlset("e.xml", [], toXml([]), TODAY))[0]).toContain("no URLs");
    const many = Array.from({ length: MAX_URLS_PER_FILE + 1 }, (_, i) => entry(`https://nursinghomegrade.com/${i}`));
    expect(errorsOf(validateUrlset("big.xml", many, "", TODAY)).join()).toContain("over the");
  });

  it("rejects unescaped XML characters in a URL", () => {
    const raw = [entry("https://nursinghomegrade.com/a?b=1&c=<2>")];
    expect(errorsOf(validateUrlset("x.xml", raw, toXml(raw), TODAY)).join()).toContain("unescaped");
  });
});

describe("validateIndex", () => {
  const children = [
    { loc: "https://nursinghomegrade.com/sitemap-core.xml", lastmod: "2026-08-01" },
    { loc: "https://nursinghomegrade.com/sitemap-cities.xml", lastmod: "2026-08-01" },
  ];

  it("passes an index whose children all carry a valid lastmod", () => {
    const xml = toSitemapIndex(children);
    expect(validateIndex(children, xml, TODAY)).toEqual([]);
  });

  it("warns once per child that is missing lastmod", () => {
    // This is the exact shape of the three warnings the deployed index carried:
    // three children, none with a lastmod.
    const bare = children.map((c) => ({ loc: c.loc }));
    const issues = validateIndex(bare, toSitemapIndex(bare), TODAY);
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.level === "warning" && i.message.includes("no lastmod"))).toBe(true);
  });

  it("rejects a duplicated child sitemap", () => {
    const dupes = [children[0]!, children[0]!];
    expect(validateIndex(dupes, toSitemapIndex(dupes), TODAY).some((i) => i.message.includes("duplicate"))).toBe(true);
  });
});
