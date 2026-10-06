import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEF_BATCH,
  INSERTS_PER_FILE,
  LIVE_TABLE,
  SETUP_FILE,
  STAGING_TABLE,
  SWAP_FILE,
  buildDeficiencySeedFiles,
  buildLoaderScript,
  buildStagingSetupSql,
  buildSwapSql,
} from "../scripts/deficiency-seed";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = join(repoRoot, "node_modules/wrangler/bin/wrangler.js");
const ROWS_PER_FILE = DEF_BATCH * INSERTS_PER_FILE;

function tuple(i: number): string {
  return `('${String(i).padStart(6, "0")}','2026-01-01','Cat','0656','Desc ${i}','D','Deficient, Provider has date of correction','2026-02-01',1,'Y','N')`;
}
const tuples = (n: number) => Array.from({ length: n }, (_, i) => tuple(i));

function tempDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("buildDeficiencySeedFiles", () => {
  const files = buildDeficiencySeedFiles(tuples(ROWS_PER_FILE * 2 + 7));

  it("never empties or recreates the live table", () => {
    for (const f of files) {
      expect(f.sql).not.toMatch(/DELETE FROM/i);
      expect(f.sql).not.toMatch(/DROP TABLE|CREATE TABLE/i);
    }
  });

  it("inserts only into the staging table", () => {
    const targets = files.flatMap((f) => [...f.sql.matchAll(/INSERT INTO (\w+)/g)].map((m) => m[1]));
    expect(new Set(targets)).toEqual(new Set([STAGING_TABLE]));
  });

  it("keeps every row, records per-file counts, and keeps the file layout", () => {
    expect(files.map((f) => [f.name, f.rows])).toEqual([
      ["scripts/seed_deficiencies_001.sql", ROWS_PER_FILE],
      ["scripts/seed_deficiencies_002.sql", ROWS_PER_FILE],
      ["scripts/seed_deficiencies_003.sql", 7],
    ]);
    for (const f of files) expect(f.sql.match(/^\('/gm)?.length).toBe(f.rows);
  });

  it("refuses to build an empty seed", () => {
    expect(() => buildDeficiencySeedFiles([])).toThrow(/zero rows/);
  });
});

describe("staged load and swap on local D1", () => {
  // Real D1 engine via Wrangler, persisted across calls like a remote database.
  const root = tempDir("nhg-def-swap");
  const run = (sql: string): Array<Array<Record<string, unknown>>> => {
    const file = join(root, `q-${Math.random().toString(16).slice(2)}.sql`);
    writeFileSync(file, sql);
    const out = execFileSync(
      process.execPath,
      [wranglerBin, "d1", "execute", "nursinghomegrade", "--local", "--persist-to", root, "--file", file, "--yes", "--json"],
      { cwd: repoRoot, env: { ...process.env, XDG_CONFIG_HOME: join(root, "config") }, encoding: "utf8" },
    );
    return (JSON.parse(out.slice(out.indexOf("["))) as Array<{ results: Array<Record<string, unknown>> }>).map(
      (r) => r.results,
    );
  };
  const count = (table: string) => Number(run(`SELECT COUNT(*) AS n FROM ${table};`).at(-1)?.[0]?.n);
  const columns = (table: string) =>
    run(`PRAGMA table_info(${table});`).at(-1)?.map((c) => `${c.name}:${c.type}:${c.notnull}:${c.pk}`);

  it("leaves live rows untouched until the swap, then replaces them with indexes intact", () => {
    run(readFileSync(join(repoRoot, "migrations/002_deficiencies.sql"), "utf8"));
    run(`INSERT INTO ${LIVE_TABLE} (cms_id) VALUES ('old1'),('old2'),('old3');`);

    const files = buildDeficiencySeedFiles(tuples(ROWS_PER_FILE + 25));
    run(buildStagingSetupSql());
    run(files[0]!.sql); // an interrupted load: only the first batch ran
    expect(count(LIVE_TABLE)).toBe(3);
    expect(columns(STAGING_TABLE)).toEqual(columns(LIVE_TABLE));

    run(buildStagingSetupSql()); // a rerun starts from an empty staging table
    expect(count(STAGING_TABLE)).toBe(0);
    for (const f of files) run(f.sql);
    expect(count(STAGING_TABLE)).toBe(ROWS_PER_FILE + 25);
    expect(count(LIVE_TABLE)).toBe(3);

    run(buildSwapSql());
    expect(count(LIVE_TABLE)).toBe(ROWS_PER_FILE + 25);
    const objects = run(
      `SELECT type, name, tbl_name FROM sqlite_master WHERE name LIKE 'facility_deficiencies%' OR name LIKE 'idx_deficiencies%' ORDER BY name;`,
    ).at(-1);
    expect(objects).toEqual([
      { type: "table", name: LIVE_TABLE, tbl_name: LIVE_TABLE },
      { type: "index", name: "idx_deficiencies_cms_id", tbl_name: LIVE_TABLE },
      { type: "index", name: "idx_deficiencies_cycle", tbl_name: LIVE_TABLE },
    ]);

    // A second full cycle works with the same index names.
    run(buildStagingSetupSql());
    run(files[0]!.sql);
    run(buildSwapSql());
    expect(count(LIVE_TABLE)).toBe(ROWS_PER_FILE);
  }, 120_000);
});

describe("generated loader script", () => {
  const files = buildDeficiencySeedFiles(tuples(ROWS_PER_FILE * 2 + 30));
  const expected = ROWS_PER_FILE * 2 + 30;

  interface LoaderEnv {
    LIVE: string;
    FAIL_ON?: string; // file whose wrangler call reports an error
    FAIL_MODE?: "applied" | "once" | "always"; // applied = lands then errors (2026-10-02)
    STAGED_OVERRIDE?: string; // force the staged count that COUNT queries report
    ALLOW_DEFICIENCY_SHRINK?: string;
  }

  // Runs the loader against a fake `npx wrangler` that keeps the staged and
  // live row counts in files, so error-recovery paths see realistic counts.
  function runLoader(env: LoaderEnv, firstFileSql?: string) {
    const dir = tempDir("nhg-loader");
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "bin"));
    writeFileSync(join(dir, "scripts/seed.sql"), "SELECT 1;");
    files.forEach((f, i) => writeFileSync(join(dir, f.name), i === 0 && firstFileSql ? firstFileSql : f.sql));
    writeFileSync(join(dir, SETUP_FILE), buildStagingSetupSql());
    writeFileSync(join(dir, SWAP_FILE), buildSwapSql());
    writeFileSync(join(dir, "load.sh"), buildLoaderScript(files, "--remote"));
    writeFileSync(join(dir, "calls.log"), "");
    writeFileSync(join(dir, "live"), env.LIVE);
    writeFileSync(
      join(dir, "bin/npx"),
      `#!/bin/bash
D="${dir}"
echo "$*" >> "$D/calls.log"
f=""; cmd=""
while [ $# -gt 0 ]; do case "$1" in --file=*) f="\${1#--file=}";; --command) cmd="$2"; shift;; esac; shift; done
apply() {
  case "$1" in
    ${SETUP_FILE}) echo 0 > "$D/staged";;
    ${SWAP_FILE}) mv "$D/staged" "$D/live";;
    scripts/seed.sql) ;;
    *) echo $(( $(cat "$D/staged") + $(grep -c "^('" "$1") )) > "$D/staged";;
  esac
}
if [ -n "$f" ]; then
  if [ "$f" = "\${FAIL_ON:-}" ]; then
    case "\${FAIL_MODE:-}" in
      applied) apply "$f"; echo "Not currently importing anything" >&2; exit 1;;
      always) exit 1;;
      once) if [ ! -e "$D/failed-once" ]; then touch "$D/failed-once"; exit 1; fi;;
    esac
  fi
  apply "$f"; exit 0
fi
if [[ "$cmd" == *sqlite_master* ]]; then n=$([ -e "$D/staged" ] && echo 1 || echo 0)
elif [[ "$cmd" == *${STAGING_TABLE}* ]]; then [ -e "$D/staged" ] || exit 1; n=\${STAGED_OVERRIDE:-$(cat "$D/staged")}
else n=$(cat "$D/live"); fi
echo "[{\\"results\\":[{\\"n\\":$n}],\\"success\\":true}]"
`,
    );
    writeFileSync(join(dir, "bin/sleep"), "#!/bin/bash\nexit 0\n");
    chmodSync(join(dir, "bin/npx"), 0o755);
    chmodSync(join(dir, "bin/sleep"), 0o755);
    const result = spawnSync("bash", ["load.sh"], {
      cwd: dir,
      env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}`, ...env },
      encoding: "utf8",
    });
    const calls = readFileSync(join(dir, "calls.log"), "utf8").trim().split("\n").filter(Boolean);
    const fileCalls = (name: string) => calls.filter((c) => c.includes(`--file=${name}`)).length;
    return {
      status: result.status,
      stderr: result.stderr,
      calls,
      fileCalls,
      swapped: fileCalls(SWAP_FILE) > 0,
      seeded: fileCalls("scripts/seed.sql") > 0,
      live: Number(readFileSync(join(dir, "live"), "utf8")),
    };
  }

  it("is valid bash", () => {
    const dir = tempDir("nhg-loader-syntax");
    writeFileSync(join(dir, "load.sh"), buildLoaderScript(files, "--remote"));
    expect(spawnSync("bash", ["-n", join(dir, "load.sh")]).status).toBe(0);
  });

  it("creates staging first, swaps after the last batch, and loads grades last", () => {
    const r = runLoader({ LIVE: "1000" });
    expect(r.status).toBe(0);
    expect(r.live).toBe(expected);
    const at = (name: string) => r.calls.findIndex((c) => c.includes(`--file=${name}`));
    expect(at(SETUP_FILE)).toBe(0);
    expect(at(SWAP_FILE)).toBeGreaterThan(at(files.at(-1)!.name));
    expect(at("scripts/seed.sql")).toBe(r.calls.length - 1);
  });

  it("continues when wrangler reports an error for a batch that landed (2026-10-02)", () => {
    for (const f of files) {
      const r = runLoader({ LIVE: "1000", FAIL_ON: f.name, FAIL_MODE: "applied" });
      expect(r.status).toBe(0);
      expect(r.fileCalls(f.name)).toBe(1);
      expect(r.live).toBe(expected);
    }
  });

  it("continues when setup or swap report an error after landing", () => {
    for (const name of [SETUP_FILE, SWAP_FILE]) {
      const r = runLoader({ LIVE: "1000", FAIL_ON: name, FAIL_MODE: "applied" });
      expect(r.status).toBe(0);
      expect(r.fileCalls(name)).toBe(1);
      expect(r.live).toBe(expected);
      expect(r.seeded).toBe(true);
    }
  });

  it("retries a batch that failed without landing", () => {
    const r = runLoader({ LIVE: "1000", FAIL_ON: files[1]!.name, FAIL_MODE: "once" });
    expect(r.status).toBe(0);
    expect(r.fileCalls(files[1]!.name)).toBe(2);
    expect(r.live).toBe(expected);
  });

  it("stops before the swap when a batch keeps failing", () => {
    const r = runLoader({ LIVE: "1000", FAIL_ON: files[1]!.name, FAIL_MODE: "always" });
    expect(r.status).not.toBe(0);
    expect(r.fileCalls(files[1]!.name)).toBe(3);
    expect(r.swapped).toBe(false);
    expect(r.seeded).toBe(false);
    expect(r.live).toBe(1000);
  });

  it("stops when a failed batch leaves an unexpected staged count", () => {
    const r = runLoader({ LIVE: "1000", FAIL_ON: files[1]!.name, FAIL_MODE: "always", STAGED_OVERRIDE: "1" });
    expect(r.status).not.toBe(0);
    expect(r.fileCalls(files[1]!.name)).toBe(1);
    expect(r.swapped).toBe(false);
  });

  it("stops before the swap when the final staged count is wrong", () => {
    const r = runLoader({ LIVE: "1000", STAGED_OVERRIDE: String(expected - 1) });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/expected/);
    expect(r.swapped).toBe(false);
    expect(r.live).toBe(1000);
  });

  it("refuses to shrink the live table by more than half unless told to", () => {
    const blocked = runLoader({ LIVE: String(expected * 3) });
    expect(blocked.status).not.toBe(0);
    expect(blocked.swapped).toBe(false);
    const allowed = runLoader({ LIVE: String(expected * 3), ALLOW_DEFICIENCY_SHRINK: "1" });
    expect(allowed.status).toBe(0);
    expect(allowed.live).toBe(expected);
  });

  it("keeps load-deficiencies-batched.ts from running setup and swap after the batches", () => {
    const dir = tempDir("nhg-batched");
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "bin"));
    for (const f of files) writeFileSync(join(dir, f.name), f.sql);
    writeFileSync(join(dir, SETUP_FILE), buildStagingSetupSql());
    writeFileSync(join(dir, SWAP_FILE), buildSwapSql());
    writeFileSync(join(dir, "calls.log"), "");
    writeFileSync(join(dir, "bin/npx"), `#!/bin/bash\necho "$*" >> "${join(dir, "calls.log")}"\n`);
    chmodSync(join(dir, "bin/npx"), 0o755);
    const r = spawnSync(
      join(repoRoot, "node_modules/.bin/tsx"),
      [join(repoRoot, "scripts/load-deficiencies-batched.ts"), "--remote"],
      { cwd: dir, env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` }, encoding: "utf8" },
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/load-remote\.sh/);
    expect(readFileSync(join(dir, "calls.log"), "utf8")).toBe("");
  }, 60_000);

  it("refuses seed files written by the old in-place loader", () => {
    const r = runLoader(
      { LIVE: "1000" },
      "DELETE FROM facility_deficiencies;\n\nINSERT INTO facility_deficiencies (cms_id) VALUES ('x');",
    );
    expect(r.status).not.toBe(0);
    expect(r.calls).toEqual([]);
    expect(r.live).toBe(1000);
  });
});
