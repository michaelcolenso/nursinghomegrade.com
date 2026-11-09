import { describe, expect, it } from "vitest";
import { getHomeStats } from "../src/db";
import type { Env } from "../src/types";

type Row = Record<string, unknown>;

function envFor(handlers: { site?: Row | null; distribution?: Row[] | Error }): Env {
  const db = {
    prepare(sql: string) {
      return {
        async first() {
          if (sql.includes("FROM site_stats")) return handlers.site ?? null;
          return null;
        },
        async all() {
          if (sql.includes("site_grade_distribution")) {
            if (handlers.distribution instanceof Error) throw handlers.distribution;
            return { results: handlers.distribution ?? [] };
          }
          return { results: [] };
        },
      };
    },
  };
  return { DB: db as unknown as D1Database, CACHE: {} as KVNamespace } as Env;
}

const at = "2026-10-12 00:00:00";
const full: Row[] = [
  ...Object.entries({ A: 10, B: 20, C: 30, D: 25, F: 15, NR: 4 }).map(([bucket, n]) => ({ bucket, n, computed_at: at })),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ bucket: `s${i}0`, n: i + 1, computed_at: at })),
];

describe("getHomeStats", () => {
  it("maps the national row and distribution", async () => {
    const stats = await getHomeStats(envFor({ site: { avg_grade: 61.4, total_facilities: 14700 }, distribution: full }));
    expect(stats?.avgScore).toBe(61.4);
    expect(stats?.totalFacilities).toBe(14700);
    expect(stats?.distribution?.gradeCounts).toEqual({ A: 10, B: 20, C: 30, D: 25, F: 15, NR: 4 });
    expect(stats?.distribution?.scoreBuckets).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(stats?.distribution?.computedAt).toBe(at);
  });

  it("returns a null distribution, not an error, when the table is missing", async () => {
    const stats = await getHomeStats(envFor({ site: { avg_grade: 61.4, total_facilities: 14700 }, distribution: new Error("no such table: site_grade_distribution") }));
    expect(stats).toEqual({ avgScore: 61.4, totalFacilities: 14700, distribution: null });
  });

  it("returns a null distribution when the table is empty or has no rated facilities", async () => {
    expect((await getHomeStats(envFor({ site: { avg_grade: 50, total_facilities: 10 }, distribution: [] })))?.distribution).toBeNull();
    const allNr = [{ bucket: "NR", n: 10, computed_at: at }];
    expect((await getHomeStats(envFor({ site: { avg_grade: 0, total_facilities: 10 }, distribution: allNr })))?.distribution).toBeNull();
  });

  it("returns null when there is no national row yet", async () => {
    expect(await getHomeStats(envFor({ site: null, distribution: full }))).toBeNull();
    expect(await getHomeStats(envFor({ site: { avg_grade: 0, total_facilities: 0 }, distribution: full }))).toBeNull();
  });
});
