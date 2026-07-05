import { describe, expect, it } from "vitest";
import app from "../src/index";
import { handleSearch } from "../src/handlers/home";
import { subscribePage } from "../src/templates/subscribe";
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
      const statement = {
        async first<T>() {
          if (query.includes("SELECT * FROM facilities WHERE cms_id = ?")) {
            return uppercaseCmsFacility as T;
          }
          return null as T | null;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
        bind(..._args: unknown[]) {
          return statement;
        },
      };
      return statement;
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

function createSitemapEnv(): Env {
  const cache = {
    async get(key: string) {
      if (key === "sitemap-core") {
        return '<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>';
      }
      return null;
    },
    async put() {
      return;
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
});

describe("sitemap routing safety", () => {
  it("serves child sitemap files from KV", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/sitemap-core.xml"),
      createSitemapEnv(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/xml");
    expect(await response.text()).toContain("<urlset>");
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
