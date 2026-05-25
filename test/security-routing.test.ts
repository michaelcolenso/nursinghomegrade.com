import { describe, expect, it } from "vitest";
import app from "../src/index";
import { handleSearch } from "../src/handlers/home";
import { errorPage, notFoundPage, subscribePage } from "../src/templates/subscribe";
import { homePage } from "../src/templates/home";
import type { Env, Facility } from "../src/types";

const uppercaseCmsFacility: Facility = {
  cms_id: "05A269",
  name: "Meadowbrook Behavioral Health Center",
  address: "3951 E BLVD",
  city: "LOS ANGELES",
  state: "CA",
  zip: "90066",
  latitude: null,
  longitude: null,
  overall_rating: 1,
  quality_rating: 2,
  staffing_rating: 1,
  inspection_rating: 1,
  rn_hours_per_resident_day: 0.32,
  total_deficiencies: 21,
  grade_score: 18,
  grade_letter: "F",
  grade_summary: "Below federal staffing minimum.",
  slug: "meadowbrook-behavioral-health-center",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function createFacilityEnv(): Env {
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) {
          return {
            async first<T>() {
              if (query.includes("SELECT * FROM facilities WHERE cms_id = ?")) {
                return uppercaseCmsFacility as T;
              }
              return null as T | null;
            },
            async all<T>() {
              return { results: [] as T[] };
            },
          };
        },
      };
    },
  };

  const cache = {
    async get() {
      return null;
    },
    async put() {
      return;
    },
  };

  return {
    DB: db as unknown as D1Database,
    CACHE: cache as unknown as KVNamespace,
  };
}

function createSitemapEnv(sitemaps: Record<string, string>): Env {
  const cache = {
    async get(key: string) {
      return sitemaps[key] ?? null;
    },
  };

  return {
    DB: {} as D1Database,
    CACHE: cache as unknown as KVNamespace,
  };
}

describe("search routing safety", () => {
  it("redirects invalid ZIP input without throwing", async () => {
    const response = await handleSearch(
      new Request("http://127.0.0.1:8787/search?zip=abcde"),
      {} as Env,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:8787/");
  });
});

describe("facility routing safety", () => {
  it("routes CMS ids that contain uppercase letters", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/facility/05A269-meadowbrook-behavioral-health-center"),
      createFacilityEnv(),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Meadowbrook Behavioral Health Center");
  });

  it("redirects facility slug variants to the canonical path and keeps query params", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/facility/05A269-old-name?from=search"),
      createFacilityEnv(),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:8787/facility/05A269-meadowbrook-behavioral-health-center?from=search",
    );
  });
});

describe("sitemap routing", () => {
  it("serves the sitemap index and grouped sitemap payloads from KV", async () => {
    const env = createSitemapEnv({
      sitemap: "<sitemapindex>index</sitemapindex>",
      "sitemap:core": "<urlset>core</urlset>",
      "sitemap:cities": "<urlset>cities</urlset>",
      "sitemap:facilities": "<urlset>facilities</urlset>",
    });

    const index = await app.fetch(new Request("http://127.0.0.1:8787/sitemap.xml"), env);
    const core = await app.fetch(new Request("http://127.0.0.1:8787/sitemap-core.xml"), env);
    const cities = await app.fetch(new Request("http://127.0.0.1:8787/sitemap-cities.xml"), env);
    const facilities = await app.fetch(new Request("http://127.0.0.1:8787/sitemap-facilities.xml"), env);

    expect(await index.text()).toContain("sitemapindex");
    expect(await core.text()).toContain("core");
    expect(await cities.text()).toContain("cities");
    expect(await facilities.text()).toContain("facilities");
    expect(index.headers.get("content-type")).toBe("application/xml");
    expect(core.status).toBe(200);
    expect(cities.status).toBe(200);
    expect(facilities.status).toBe(200);
    expect(cities.headers.get("content-type")).toBe("application/xml");
  });
});

describe("subscribe page safety", () => {
  it("escapes facility names and drops unsafe return URLs", () => {
    const html = subscribePage("<img src=x onerror=alert(1)>", "javascript:alert(1)");

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain('href="javascript:alert(1)"');
  });

  it("keeps same-origin return paths as relative links", () => {
    const html = subscribePage(
      "Sunrise Care Center",
      "https://nursinghomegrade.com/facility/015001-sunrise-care-center?from=search",
    );

    expect(html).toContain('href="/facility/015001-sunrise-care-center?from=search"');
  });
});

describe("SEO metadata safety", () => {
  it("uses the built-in OG image that the Worker serves", () => {
    const html = homePage(44.2);

    expect(html).toContain('<meta property="og:image" content="https://nursinghomegrade.com/og.svg">');
    expect(html).not.toContain("https://nursinghomegrade.com/NHG.png");
  });

  it("noindexes 404 and error pages", () => {
    expect(notFoundPage("/missing")).toContain('<meta name="robots" content="noindex, follow">');
    expect(errorPage("Service unavailable", "Try again later.")).toContain(
      '<meta name="robots" content="noindex, follow">',
    );
  });
});
