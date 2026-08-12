import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SITE_STATS_REFRESH_SQL,
  STATE_STATS_CLEANUP_SQL,
  STATE_STATS_REFRESH_SQL,
} from "../scripts/stats-sql";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = join(repoRoot, "node_modules/wrangler/bin/wrangler.js");
const migrationSql = readFileSync(join(repoRoot, "migrations/008_stats_tables.sql"), "utf8");

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
          ('al-1', 'AL', 80, 0.4, 2),
          ('al-2', 'AL', 90, 0.6, 4),
          ('ca-1', 'CA', 70, 0.8, NULL);
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
        ('wa-1', 'WA', 80, 0.4, 1),
        ('or-1', 'OR', 90, 0.8, 2);
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
});
