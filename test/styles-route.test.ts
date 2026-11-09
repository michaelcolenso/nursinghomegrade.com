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

describe("layout() brand and chrome", () => {
  const html = layout("T", "D", "<p>x</p>");

  it("carries no retired brand artefacts", () => {
    expect(html).not.toContain("Source Sans");
    expect(html.toLowerCase()).not.toContain("#9f1239");
    expect(html).not.toContain("data:image/svg+xml");
    expect(html).not.toContain('style="');
  });

  it("loads only Inter + Playfair Display and declares icons, manifest and theme colour", () => {
    expect(html).toContain("family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700");
    expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest">');
    expect(html).toContain('<meta name="theme-color" content="#0B1D33">');
  });

  it("uses the outlined wordmark as the logo (no text logo, no old icon)", () => {
    expect(html).toContain('class="brand-wordmark"');
    expect(html).toContain('aria-label="NursingHomeGrade.com — home"');
    expect(html).not.toContain("masthead-name");
    expect(html).not.toContain("masthead-icon");
    expect(html).not.toMatch(/<text[\s>]/);
  });

  it("keeps the menu-toggle and comparison-bar contracts the layout script depends on", () => {
    expect(html).toContain("masthead-toggle");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('id="comparison-bar"');
    for (const id of ["comparison-count", "comparison-clear", "compare-btn-count"]) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("masthead-nav-link");
  });

  it("preserves every masthead and footer href", () => {
    const hrefs = new Set([...html.matchAll(/<(?:header|footer)[\s\S]*?<\/(?:header|footer)>/g)].flatMap((m) => [...m[0].matchAll(/href="(\/[^"]*)"/g)].map((h) => h[1])));
    for (const href of [
      "/", "/explore", "/states", "/best", "/worst", "/compare", "/how-we-grade", "/search",
      "/methodology", "/reports/staffing-failures", "/reports/staffing-standard-repeal", "/reports/uncorrected-deficiencies",
      "/about", "/faq", "/contact", "/glossary", "/terms", "/privacy", "/data-sources",
    ]) {
      expect(hrefs.has(href), `missing ${href}`).toBe(true);
    }
    expect(html).toContain('action="/subscribe"');
  });
});

describe("brand asset routes", () => {
  it("serves the SVG favicon and PNG icons as immutable", async () => {
    const svg = await get("/favicon.svg");
    expect(svg.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(svg.headers.get("Cache-Control")).toContain("immutable");
    expect(await svg.text()).toContain("<svg");

    for (const [path, size] of [["/favicon-32.png", 32], ["/favicon.ico", 32], ["/apple-touch-icon.png", 180], ["/icon-192.png", 192], ["/icon-512.png", 512]] as const) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      expect(res.headers.get("Content-Type"), path).toBe("image/png");
      expect(res.headers.get("Cache-Control"), path).toContain("immutable");
      const bytes = new Uint8Array(await res.arrayBuffer());
      // PNG signature, then IHDR width/height (big-endian).
      expect(Array.from(bytes.slice(0, 4)), path).toEqual([0x89, 0x50, 0x4e, 0x47]);
      const view = new DataView(bytes.buffer);
      expect(view.getUint32(16), `${path} width`).toBe(size);
      expect(view.getUint32(20), `${path} height`).toBe(size);
    }
  });

  it("serves a web manifest with the brand colours and both icons", async () => {
    const res = await get("/site.webmanifest");
    expect(res.headers.get("Content-Type")).toContain("manifest+json");
    const manifest = (await res.json()) as { theme_color: string; background_color: string; icons: Array<{ src: string }> };
    expect(manifest.theme_color).toBe("#0B1D33");
    expect(manifest.background_color).toBe("#F7F9FA");
    expect(manifest.icons.map((i) => i.src)).toEqual(["/icon-192.png", "/icon-512.png"]);
  });
});
