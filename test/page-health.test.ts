import { describe, expect, it } from "vitest";
import { REPRESENTATIVE_PAGE_PROBES, validatePageHealth } from "../src/page-health";

const url = "https://nursinghomegrade.com/state/washington/seattle";
const healthyHtml = (head = `<link rel="canonical" href="${url}">`) =>
  `<!doctype html><html><head>${head}</head><body>${"Facility evidence. ".repeat(140)}</body></html>`;

describe("representative page probes", () => {
  it("always includes the homepage and a facility, state and city", () => {
    expect(REPRESENTATIVE_PAGE_PROBES.map((probe) => probe.path)).toEqual([
      "/", "/facility/505531-heron-s-key", "/state/washington", "/state/washington/seattle",
    ]);
  });

  it("allows intentional noindex only on the explicit city probe", () => {
    for (const probe of REPRESENTATIVE_PAGE_PROBES) {
      expect(probe.requireIndexable).toBe(probe.path !== "/state/washington/seattle");
    }
  });
});

describe("page health", () => {
  it("accepts complete HTML with a self-referencing canonical", () => {
    expect(validatePageHealth(url, { status: 200, text: healthyHtml() })).toEqual([]);
  });

  it.each([301, 404, 500, 503])("rejects HTTP %s even with a full HTML body", (status) => {
    expect(validatePageHealth(url, { status, text: healthyHtml() }).join()).toContain(`returned ${status}`);
  });

  it("rejects a missing canonical", () => {
    expect(validatePageHealth(url, { status: 200, text: healthyHtml("") }).join()).toContain("no canonical");
  });

  it("rejects a canonical that points elsewhere", () => {
    const html = healthyHtml('<link rel="canonical" href="https://nursinghomegrade.com/state/washington">');
    expect(validatePageHealth(url, { status: 200, text: html }).join()).toContain("canonicalises to");
  });

  it.each(["noindex, follow", "NOINDEX, FOLLOW"])("rejects listed noindex pages: %s", (robots) => {
    const html = healthyHtml(`<link rel="canonical" href="${url}"><meta name="robots" content="${robots}">`);
    expect(validatePageHealth(url, { status: 200, text: html }).join()).toContain("marked noindex");
    expect(validatePageHealth(url, { status: 200, text: html }, { requireIndexable: true }).join()).toContain("marked noindex");
    expect(validatePageHealth(url, { status: 200, text: html }, { requireIndexable: false })).toEqual([]);
  });

  it("rejects thin 200 bodies even when a canonical is present", () => {
    const text = `<link rel="canonical" href="${url}"><p>Service unavailable</p>`;
    expect(validatePageHealth(url, { status: 200, text }).join()).toContain("suspiciously thin 200");
  });

  it("keeps status, canonical and body checks when noindex is allowed", () => {
    expect(validatePageHealth(url, { status: 503, text: healthyHtml() }, { requireIndexable: false }).join()).toContain("503");
    expect(validatePageHealth(url, { status: 200, text: healthyHtml("") }, { requireIndexable: false }).join()).toContain("no canonical");
    expect(validatePageHealth(url, { status: 200, text: "Error" }, { requireIndexable: false }).join()).toContain("thin 200");
  });

  it("keeps the existing 2000-character body threshold", () => {
    const head = `<link rel="canonical" href="${url}">`;
    expect(validatePageHealth(url, { status: 200, text: head.padEnd(1999, " ") }).join()).toContain("thin 200");
    expect(validatePageHealth(url, { status: 200, text: head.padEnd(2000, " ") })).toEqual([]);
  });
});
