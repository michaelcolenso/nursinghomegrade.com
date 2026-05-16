import { describe, expect, it } from "vitest";
import { handleState } from "../src/handlers/state";
import type { Facility, Env } from "../src/types";

const sampleFacility: Facility = {
  cms_id: "055001",
  name: "Golden State Care Center",
  address: "123 Main St",
  city: "Los Angeles",
  state: "CA",
  zip: "90210",
  latitude: 34.0522,
  longitude: -118.2437,
  overall_rating: 4,
  quality_rating: 4,
  staffing_rating: 3,
  inspection_rating: 4,
  rn_hours_per_resident_day: 0.72,
  total_deficiencies: 2,
  grade_score: 88,
  grade_letter: "A",
  grade_summary: "Strong staffing and clean inspection record.",
  slug: "golden-state-care-center",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function createEnv(): Env {
  const db = {
    prepare(query: string) {
      const execute = {
        async all<T>() {
          if (query.includes("SELECT * FROM facilities WHERE state = ? ORDER BY grade_score DESC LIMIT ?")) {
            return { results: [sampleFacility] as T[] };
          }
          if (query.includes("SELECT grade_letter, COUNT(*) as count FROM facilities WHERE state = ? GROUP BY grade_letter")) {
            return { results: [{ grade_letter: "A", count: 1 }] as T[] };
          }
          if (query.includes("SELECT city, COUNT(*) as count FROM facilities WHERE state = ? GROUP BY city ORDER BY count DESC, city ASC")) {
            return { results: [{ city: "Los Angeles", count: 1 }] as T[] };
          }
          return { results: [] as T[] };
        },
        async first<T>() {
          if (query.includes("SELECT COUNT(*) as count FROM facilities WHERE state = ?")) {
            return { count: 1 } as T;
          }
          if (query.includes("SUM(CASE WHEN rn_hours_per_resident_day < 0.55")) {
            return { pct: 44.4 } as T;
          }
          return null as T | null;
        },
      };

      return {
        ...execute,
        bind(..._args: unknown[]) {
          return execute;
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

describe("handleState", () => {
  it("renders a state page for a valid state slug", async () => {
    const response = await handleState(
      new Request("http://127.0.0.1:8787/state/california"),
      createEnv(),
      "california",
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Nursing homes in California");
    expect(html).toContain("Golden State Care Center");
  });
});
