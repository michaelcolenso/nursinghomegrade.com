import { afterEach, describe, expect, it, vi } from "vitest";
import { htmlCacheKey } from "../src/cache";
import { handleCity } from "../src/handlers/city";
import type { Env, Facility } from "../src/types";

function sampleFacility(index: number): Facility {
  return {
    cms_id: String(265000 + index),
    name: `Example Care ${index}`,
    address: "1 Test Ave",
    city: "ST. LOUIS",
    state: "MO",
    zip: "63101",
    latitude: null,
    longitude: null,
    overall_rating: 4,
    quality_rating: 4,
    staffing_rating: 4,
    inspection_rating: 4,
    rn_hours_per_resident_day: 0.6,
    total_deficiencies: 1,
    grade_score: 85,
    grade_letter: "A",
    grade_summary: "Example",
    slug: `example-care-${index}`,
    updated_at: "2026-09-04T00:00:00Z",
  };
}

function createEnv(facilityCount: number) {
  const facilities = Array.from({ length: facilityCount }, (_, i) => sampleFacility(i + 1));
  const prepare = vi.fn((query: string) => {
    const statement = {
      bind: (..._args: unknown[]) => statement,
      first: async () => ({ pct_failing: 40 }),
      all: async () => {
        if (query.includes("SELECT cms_id, name, address, city")) {
          return { results: facilities };
        }
        if (query.includes("GROUP BY city")) {
          return { results: [{ city: "ST. LOUIS", count: facilityCount }] };
        }
        return { results: [] };
      },
    };
    return statement;
  });
  return { env: { DB: { prepare } } as unknown as Env, prepare, facilities };
}

const request = new Request("https://nursinghomegrade.com/state/missouri/st-louis");

afterEach(() => vi.unstubAllGlobals());

describe("city indexability", () => {
  it.each([1, 2, 3])("returns 200 and preserves discovery links with %i facilities", async (count) => {
    const { env, facilities } = createEnv(count);
    const response = await handleCity(request, env, "missouri", "st-louis");
    expect(response.status).toBe(200);
    const html = await response.text();
    if (count <= 2) {
      expect(html).toContain('<meta name="robots" content="noindex, follow">');
    } else {
      expect(html).not.toContain('content="noindex, follow"');
    }
    expect(html).toContain('<link rel="canonical" href="https://nursinghomegrade.com/state/missouri/st-louis">');
    expect(html).toContain('href="/state/missouri"');
    for (const facility of facilities) {
      expect(html).toContain(`href="/facility/${facility.cms_id}-${facility.slug}"`);
    }
  });

  it("continues to return 404 for a city with no facilities", async () => {
    const { env } = createEnv(0);
    const response = await handleCity(request, env, "missouri", "st-louis");
    expect(response.status).toBe(404);
  });

  it("bypasses prior indexable HTML and caches the thin city's robots meta without additional D1 reads", async () => {
    const entries = new Map<string, Response>();
    const urlFor = (key: string) => `https://nursinghomegrade.com/__cache/${encodeURIComponent(key)}`;
    const oldKey = "html:v29:city:missouri:st-louis";
    entries.set(urlFor(oldKey), new Response("Old indexable city HTML"));
    vi.stubGlobal("caches", { default: {
      match: async (req: Request) => entries.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => { entries.set(req.url, res.clone()); },
    } });

    const { env, prepare } = createEnv(1);
    const cold = await handleCity(request, env, "missouri", "st-louis");
    const html = await cold.text();
    expect(cold.status).toBe(200);
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
    const currentKey = htmlCacheKey("city:missouri:st-louis");
    expect(currentKey).not.toBe(oldKey);
    expect(entries.get(urlFor(currentKey))?.headers.get("Cache-Control")).toBe("public, max-age=86400");

    prepare.mockClear();
    const hit = await handleCity(request, env, "missouri", "st-louis");
    expect(hit.status).toBe(200);
    expect(await hit.text()).toBe(html);
    expect(prepare).not.toHaveBeenCalled();
  });
});
