import { describe, expect, it, vi } from "vitest";
import { handleAbuseCitations, handleSpecialFocus } from "../src/handlers/reports";
import type { Env } from "../src/types";

// The handlers cache rendered HTML; keep every test on a fresh render.
vi.mock("../src/cache", async (orig) => {
  const actual = await orig<typeof import("../src/cache")>();
  return { ...actual, pageCache: { get: async () => null, put: async () => undefined } };
});

const row = (cms_id: string, name: string, state: string, grade_letter: string, extra: Record<string, unknown> = {}) => ({
  cms_id,
  name,
  city: "Springfield",
  state,
  grade_score: { A: 85, B: 70, C: 55, D: 40, F: 20 }[grade_letter] ?? -1,
  grade_letter,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  ...extra,
});

function env(handler: (sql: string, args: unknown[]) => { all?: unknown[]; first?: unknown }): Env & { queries: string[] } {
  const queries: string[] = [];
  const db = {
    prepare(sql: string) {
      queries.push(sql);
      let args: unknown[] = [];
      const stmt = {
        bind(...a: unknown[]) {
          args = a;
          return stmt;
        },
        async all() {
          if (sql.includes("?") && args.length === 0) throw new Error("unbound statement");
          return { results: handler(sql, args).all ?? [] };
        },
        async first() {
          if (sql.includes("?") && args.length === 0) throw new Error("unbound statement");
          return handler(sql, args).first ?? null;
        },
      };
      return stmt;
    },
  };
  return { DB: db, queries } as unknown as Env & { queries: string[] };
}

describe("/reports/abuse-citations", () => {
  it("lists flagged homes by state with the count we still grade A or B", async () => {
    const e = env(() => ({ all: [{ state: "AL", count: 12, good_grades: 3 }, { state: "TX", count: 40, good_grades: 0 }] }));
    const res = await handleAbuseCitations(new Request("https://nursinghomegrade.com/reports/abuse-citations"), e);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(e.queries[0]).toContain("abuse_icon = 'Y'");
    expect(html).toContain("52 nursing homes");
    expect(html).toContain("3 of them still hold an A or B grade from us");
    expect(html).toContain('href="/reports/abuse-citations/alabama"');
    expect(html).toContain('rel="canonical" href="https://nursinghomegrade.com/reports/abuse-citations"');
  });

  it("renders a state's flagged homes, lowest grade first", async () => {
    const e = env((sql) =>
      sql.includes("COUNT(*)")
        ? { first: { count: 2, good_grades: 1 } }
        : { all: [row("015009", "Burns Nursing Home", "AL", "F"), row("015010", "Hill Haven", "AL", "B")] },
    );
    const res = await handleAbuseCitations(new Request("https://nursinghomegrade.com/reports/abuse-citations/alabama"), e, "alabama");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("Nursing Homes Cited for Abuse or Neglect in Alabama");
    expect(html).toContain('href="/facility/015009-burns-nursing-home"');
    expect(html).toContain("1 of them hold an A or B grade from us");
    expect(e.queries.some((q) => q.includes("ORDER BY CASE WHEN grade_letter = 'NR' THEN 1 ELSE 0 END, grade_score ASC"))).toBe(true);
  });

  it("404s an unknown state and a state with no flagged homes", async () => {
    const empty = env(() => ({ first: { count: 0, good_grades: 0 } }));
    expect((await handleAbuseCitations(new Request("https://nursinghomegrade.com/reports/abuse-citations/narnia"), empty, "narnia")).status).toBe(404);
    expect((await handleAbuseCitations(new Request("https://nursinghomegrade.com/reports/abuse-citations/vermont"), empty, "vermont")).status).toBe(404);
  });

  it("returns 503, not a broken page, when D1 fails", async () => {
    const broken = env(() => {
      throw new Error("D1 down");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await handleAbuseCitations(new Request("https://nursinghomegrade.com/reports/abuse-citations"), broken)).status).toBe(503);
  });
});

describe("/reports/special-focus-facilities", () => {
  it("splits Special Focus Facilities from candidates", async () => {
    const e = env(() => ({
      all: [
        row("015011", "Oak Manor", "AL", "F", { special_focus_status: "SFF" }),
        row("015012", "Pine Court", "AL", "D", { special_focus_status: "SFF Candidate" }),
        row("455001", "Lone Star Care", "TX", "B", { special_focus_status: "SFF Candidate" }),
      ],
    }));
    const res = await handleSpecialFocus(new Request("https://nursinghomegrade.com/reports/special-focus-facilities"), e);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("1 Special Focus Facility</strong>");
    expect(html).toContain("2 candidates");
    expect(html.indexOf("Oak Manor")).toBeLessThan(html.indexOf('id="candidates"'));
    expect(html.indexOf("Lone Star Care")).toBeGreaterThan(html.indexOf('id="candidates"'));
  });
});
