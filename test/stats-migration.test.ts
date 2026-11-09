import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SITE_GRADE_DISTRIBUTION_REFRESH_SQL,
  SITE_STATS_REFRESH_SQL,
  STATE_STATS_CLEANUP_SQL,
  STATE_STATS_REFRESH_SQL,
} from "../scripts/stats-sql";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = join(repoRoot, "node_modules/wrangler/bin/wrangler.js");
const migrationSql = readFileSync(join(repoRoot, "migrations/008_stats_tables.sql"), "utf8");
const distributionMigrationSql = readFileSync(join(repoRoot, "migrations/014_site_grade_distribution.sql"), "utf8");

interface WranglerResult {
  results: Array<Record<string, unknown>>;
  success: boolean;
}

/** Execute a fixture against a fresh local D1 database through Wrangler. */
function executeFixture(sql: string, queryCount: number): Array<Array<Record<string, unknown>>> {
  const root = join(tmpdir(), `nhg-stats-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const configDir = join(root, "config");
  const fixturePath = join(root, "fixture.sql");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(fixturePath, sql);

  const output = execFileSync(
    process.execPath,
    [
      wranglerBin,
      "d1",
      "execute",
      "nursinghomegrade",
      "--local",
      "--persist-to",
      root,
      "--file",
      fixturePath,
      "--yes",
      "--json",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, XDG_CONFIG_HOME: configDir },
      encoding: "utf8",
    },
  );

  const jsonStart = output.indexOf("[");
  if (jsonStart < 0) throw new Error(`Wrangler did not return JSON: ${output}`);
  const responses = JSON.parse(output.slice(jsonStart)) as WranglerResult[];
  return responses.slice(-queryCount).map((response) => response.results);
}

function facilitiesTableSql(rows = "") {
  return `
    CREATE TABLE facilities (
      cms_id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      grade_score REAL NOT NULL,
      grade_letter TEXT NOT NULL,
      rn_hours_per_resident_day REAL,
      total_deficiencies REAL
    );
    ${rows}
  `;
}

describe("stats migration and refresh SQL", () => {
  it("backfills national and state stats from a populated facilities table", () => {
    const [siteStats, stateStats] = executeFixture(
      `${facilitiesTableSql(`
        INSERT INTO facilities VALUES
          ('al-1', 'AL', 80, 'A', 0.4, 2),
          ('al-2', 'AL', 90, 'A', 0.6, 4),
          ('ca-1', 'CA', 70, 'B', 0.8, NULL);
      `)}
      ${migrationSql}
      SELECT avg_grade, avg_rn_hours, avg_deficiencies, total_facilities, pct_failing FROM site_stats;
      SELECT state, pct_failing, rn_median FROM state_stats ORDER BY state;
    `,
      2,
    );

    expect(siteStats).toEqual([
      { avg_grade: 80, avg_rn_hours: 0.6, avg_deficiencies: 3, total_facilities: 3, pct_failing: 33.3 },
    ]);
    expect(stateStats).toEqual([
      { state: "AL", pct_failing: 50, rn_median: 0.5 },
      { state: "CA", pct_failing: 0, rn_median: 0.8 },
    ]);
  }, 20_000);

  it("creates a safe national row when migrating an empty database", () => {
    const [siteStats, stateCount] = executeFixture(
      `${facilitiesTableSql()}
      ${migrationSql}
      SELECT avg_grade, total_facilities, pct_failing FROM site_stats;
      SELECT COUNT(*) AS count FROM state_stats;
    `,
      2,
    );

    expect(siteStats).toEqual([{ avg_grade: 0, total_facilities: 0, pct_failing: null }]);
    expect(stateCount).toEqual([{ count: 0 }]);
  }, 20_000);

  it("refreshes from retained rows and removes states that stop reporting RN hours", () => {
    const [siteStats, stateStats] = executeFixture(
      `${facilitiesTableSql()}
      ${migrationSql}
      INSERT INTO facilities VALUES
        ('wa-1', 'WA', 80, 'A', 0.4, 1),
        ('or-1', 'OR', 90, 'A', 0.8, 2);
      ${SITE_STATS_REFRESH_SQL}
      ${STATE_STATS_CLEANUP_SQL}
      ${STATE_STATS_REFRESH_SQL}
      UPDATE facilities SET rn_hours_per_resident_day = NULL WHERE cms_id = 'or-1';
      ${SITE_STATS_REFRESH_SQL}
      ${STATE_STATS_CLEANUP_SQL}
      ${STATE_STATS_REFRESH_SQL}
      SELECT total_facilities, avg_grade FROM site_stats;
      SELECT state FROM state_stats ORDER BY state;
    `,
      2,
    );

    expect(siteStats).toEqual([{ total_facilities: 2, avg_grade: 85 }]);
    expect(stateStats).toEqual([{ state: "WA" }]);
  }, 20_000);

  it("excludes an NR row even if a stale nonnegative compatibility score remains", () => {
    const [siteStats] = executeFixture(
      `${facilitiesTableSql(`
        INSERT INTO facilities VALUES
          ('rated', 'WA', 80, 'A', 0.7, 1),
          ('withheld', 'WA', 95, 'NR', 0.7, 1);
      `)}
      ${migrationSql}
      ${SITE_STATS_REFRESH_SQL}
      SELECT total_facilities, avg_grade FROM site_stats;
    `,
      1,
    );

    expect(siteStats).toEqual([{ total_facilities: 2, avg_grade: 80 }]);
  }, 20_000);
});

describe("site_grade_distribution (migration 014 and refresh SQL)", () => {
  const rows = `
    INSERT INTO facilities VALUES
      ('a1', 'WA', 100, 'A', 0.7, 1),
      ('a2', 'WA', 85, 'A', 0.7, 1),
      ('b1', 'WA', 72, 'B', 0.7, 1),
      ('c1', 'WA', 50, 'C', 0.7, 1),
      ('d1', 'OR', 35, 'D', 0.7, 1),
      ('f1', 'OR', 0, 'F', 0.7, 1),
      ('nr1', 'OR', -1, 'NR', NULL, NULL),
      ('nr2', 'OR', 95, 'NR', 0.7, 1);
  `;
  const expected = [
    { bucket: "A", n: 2 }, { bucket: "B", n: 1 }, { bucket: "C", n: 1 }, { bucket: "D", n: 1 }, { bucket: "F", n: 1 }, { bucket: "NR", n: 2 },
    { bucket: "s00", n: 1 }, { bucket: "s10", n: 0 }, { bucket: "s20", n: 0 }, { bucket: "s30", n: 1 }, { bucket: "s40", n: 0 },
    { bucket: "s50", n: 1 }, { bucket: "s60", n: 0 }, { bucket: "s70", n: 1 }, { bucket: "s80", n: 1 }, { bucket: "s90", n: 1 },
  ];
  const select = "SELECT bucket, n FROM site_grade_distribution ORDER BY CASE WHEN bucket GLOB 's*' THEN 1 ELSE 0 END, bucket;";

  it("migration backfills letters, NR and 10-point buckets, folding 100 into s90 and excluding NR rows from score buckets", () => {
    const [dist] = executeFixture(`${facilitiesTableSql(rows)}\n${distributionMigrationSql}\n${select}`, 1);
    expect(dist).toEqual(expected);
  }, 20_000);

  it("refresh SQL creates the table itself, so the production refresh works without migration 014", () => {
    const [dist] = executeFixture(`${facilitiesTableSql(rows)}\n${SITE_GRADE_DISTRIBUTION_REFRESH_SQL}\n${select}`, 1);
    expect(dist).toEqual(expected);
  }, 20_000);

  it("migration and refresh produce identical rows, and applying either repeatedly is idempotent", () => {
    const [once] = executeFixture(`${facilitiesTableSql(rows)}\n${distributionMigrationSql}\n${select}`, 1);
    const [repeated] = executeFixture(
      `${facilitiesTableSql(rows)}
      ${distributionMigrationSql}
      ${SITE_GRADE_DISTRIBUTION_REFRESH_SQL}
      ${distributionMigrationSql}
      ${select}`,
      1,
    );
    expect(repeated).toEqual(once);
    expect(repeated).toEqual(expected);
  }, 20_000);

  it("rebuilds from current rows: regraded and removed facilities leave no stale counts", () => {
    const [dist] = executeFixture(
      `${facilitiesTableSql(rows)}
      ${SITE_GRADE_DISTRIBUTION_REFRESH_SQL}
      UPDATE facilities SET grade_score = -1, grade_letter = 'NR' WHERE cms_id = 'a1';
      DELETE FROM facilities WHERE cms_id = 'f1';
      ${SITE_GRADE_DISTRIBUTION_REFRESH_SQL}
      SELECT bucket, n FROM site_grade_distribution WHERE bucket IN ('A','F','NR','s90','s00') ORDER BY bucket;`,
      1,
    );
    expect(dist).toEqual([{ bucket: "A", n: 1 }, { bucket: "F", n: 0 }, { bucket: "NR", n: 2 + 1 }, { bucket: "s00", n: 0 }, { bucket: "s90", n: 0 }]);
  }, 20_000);

  it("handles an empty facilities table without NULLs", () => {
    const [dist] = executeFixture(`${facilitiesTableSql()}\n${SITE_GRADE_DISTRIBUTION_REFRESH_SQL}\nSELECT COUNT(*) AS rows, SUM(n) AS total FROM site_grade_distribution;`, 1);
    expect(dist).toEqual([{ rows: 16, total: 0 }]);
  }, 20_000);
});
