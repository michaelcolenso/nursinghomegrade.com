// Builds the facility_deficiencies seed batches and the shell loaders that
// apply them.
//
// The live table is never emptied in place. A setup file creates an empty
// staging table, every batch inserts into it, the loader checks the staged row
// count against what ingest generated, and only then swaps the staging table in
// with two renames. If a load stops partway, the live table still holds the
// previous complete load.
//
// Background: the old seed began with `DELETE FROM facility_deficiencies` in
// the first of ~420 files. On 2026-10-02 wrangler reported that first file as
// failed ("Not currently importing anything") after D1 had already applied it,
// the loader stopped, and production was left with 1,000 of ~419,000 citations.

export const LIVE_TABLE = "facility_deficiencies";
export const STAGING_TABLE = "facility_deficiencies_next";
export const RETIRED_TABLE = "facility_deficiencies_old";
export const SETUP_FILE = "scripts/seed_deficiencies_setup.sql";
export const SWAP_FILE = "scripts/seed_deficiencies_swap.sql";

export const DEF_BATCH = 50;
export const INSERTS_PER_FILE = 20;

const COLUMNS =
  "cms_id,survey_date,deficiency_category,deficiency_tag_number,deficiency_description,scope_severity_code,deficiency_corrected,correction_date,inspection_cycle,standard_deficiency,complaint_deficiency";

// Mirrors migrations/002_deficiencies.sql. The staging table becomes the live
// table on swap, so its definition must match the migration exactly.
const TABLE_BODY = `(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cms_id TEXT NOT NULL,
  survey_date TEXT,
  deficiency_category TEXT,
  deficiency_tag_number TEXT,
  deficiency_description TEXT,
  scope_severity_code TEXT,
  deficiency_corrected TEXT,
  correction_date TEXT,
  inspection_cycle INTEGER,
  standard_deficiency TEXT,
  complaint_deficiency TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

/** Recreates an empty staging table. Safe to rerun. */
export function buildStagingSetupSql(): string {
  return `DROP TABLE IF EXISTS ${STAGING_TABLE};\n\nCREATE TABLE ${STAGING_TABLE} ${TABLE_BODY};`;
}

// No leading DROP of the retired table: if a previous swap died between its
// renames, the first rename fails here instead of discarding that data.
// Indexes are created after the old table (which owns the index names) is gone.
export function buildSwapSql(): string {
  return [
    `ALTER TABLE ${LIVE_TABLE} RENAME TO ${RETIRED_TABLE};`,
    `ALTER TABLE ${STAGING_TABLE} RENAME TO ${LIVE_TABLE};`,
    `DROP TABLE ${RETIRED_TABLE};`,
    `CREATE INDEX IF NOT EXISTS idx_deficiencies_cms_id ON ${LIVE_TABLE}(cms_id);`,
    `CREATE INDEX IF NOT EXISTS idx_deficiencies_cycle ON ${LIVE_TABLE}(inspection_cycle);`,
  ].join("\n");
}

export interface SeedFile {
  name: string;
  sql: string;
  rows: number;
}

/** Split pre-escaped VALUES tuples into batch files that insert into staging. */
export function buildDeficiencySeedFiles(values: string[]): SeedFile[] {
  if (values.length === 0) {
    throw new Error("Refusing to build a deficiency seed with zero rows");
  }
  const files: SeedFile[] = [];
  for (let start = 0; start < values.length; start += DEF_BATCH * INSERTS_PER_FILE) {
    const fileValues = values.slice(start, start + DEF_BATCH * INSERTS_PER_FILE);
    const statements: string[] = [];
    for (let i = 0; i < fileValues.length; i += DEF_BATCH) {
      statements.push(
        `INSERT INTO ${STAGING_TABLE} (${COLUMNS}) VALUES\n${fileValues.slice(i, i + DEF_BATCH).join(",\n")};`,
      );
    }
    files.push({
      name: `scripts/seed_deficiencies_${String(files.length + 1).padStart(3, "0")}.sql`,
      sql: statements.join("\n\n"),
      rows: fileValues.length,
    });
  }
  return files;
}

/**
 * Shell loader: create staging, load every batch, verify the staged count,
 * refuse a large shrink of the live table, swap, then load facilities and
 * grades. Set ALLOW_DEFICIENCY_SHRINK=1 to accept a staged count below half of
 * live.
 *
 * Wrangler can report a failure after D1 has applied a file (each file applies
 * as one unit). After any error the loader reads the staged count: it continues
 * if the batch landed, retries if it didn't, and stops on any other count.
 */
export function buildLoaderScript(
  files: Array<Pick<SeedFile, "name" | "rows">>,
  flag: "--local" | "--remote",
): string {
  const first = files[0];
  if (!first) throw new Error("Loader needs at least one deficiency seed file");
  let staged = 0;
  const loads = files
    .map((f) => {
      const line = `load_batch ${f.name} ${staged} ${staged + f.rows}`;
      staged += f.rows;
      return line;
    })
    .join("\n");
  return `#!/bin/bash
set -euo pipefail
FLAG="${flag}"
EXPECTED_ROWS=${staged}

if [ ! -s scripts/seed.sql ]; then
  echo "scripts/seed.sql is missing or empty — run 'npm run ingest' first." >&2
  echo "Refusing to reload deficiencies without the matching facility seed." >&2
  exit 1
fi
if [ ! -s ${SETUP_FILE} ] || [ ! -s ${SWAP_FILE} ] || ! grep -q "INSERT INTO ${STAGING_TABLE} " ${first.name}; then
  echo "Deficiency seed files predate the staged loader — run 'npm run ingest' to regenerate them." >&2
  exit 1
fi

d1() {
  npx wrangler d1 execute nursinghomegrade "$FLAG" --yes "$@"
}

# Prints the integer column n from a one-row query, or fails.
query_n() {
  d1 --json --command "$1" \\
    | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{const n=JSON.parse(s.slice(s.indexOf("[")))[0]?.results?.[0]?.n;if(!Number.isInteger(n)){console.error("Could not read a count");process.exit(1)}console.log(n)})'
}

count_rows() {
  query_n "SELECT COUNT(*) AS n FROM $1;"
}

setup_staging() {
  local attempt n
  for attempt in 1 2 3; do
    echo "Creating empty ${STAGING_TABLE}..."
    if d1 --file=${SETUP_FILE}; then return 0; fi
    n=$(count_rows ${STAGING_TABLE}) || n=""
    if [ "$n" = "0" ]; then
      echo "Staging setup applied despite the error above; continuing." >&2
      return 0
    fi
    sleep $((attempt * 5))
  done
  echo "Could not create ${STAGING_TABLE}. Live table untouched." >&2
  return 1
}

load_batch() {
  local file="$1" before="$2" after="$3" attempt n
  for attempt in 1 2 3; do
    echo "Loading $file..."
    if d1 --file="$file"; then return 0; fi
    n=$(count_rows ${STAGING_TABLE}) || n=""
    if [ "$n" = "$after" ]; then
      echo "$file applied despite the error above; continuing." >&2
      return 0
    fi
    if [ "$n" != "$before" ]; then
      echo "After $file the staging table has '$n' rows, expected $before or $after. Live table untouched." >&2
      return 1
    fi
    sleep $((attempt * 5))
  done
  echo "$file failed 3 times. Live table untouched." >&2
  return 1
}

swap_in() {
  local attempt
  for attempt in 1 2 3; do
    if d1 --file=${SWAP_FILE}; then return 0; fi
    if [ "$(query_n "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='${STAGING_TABLE}';" || echo x)" = "0" ] \\
      && [ "$(count_rows ${LIVE_TABLE} || echo x)" = "$1" ]; then
      echo "Swap applied despite the error above; continuing." >&2
      return 0
    fi
    sleep $((attempt * 5))
  done
  echo "Swap failed 3 times." >&2
  return 1
}

setup_staging
${loads}

STAGED=$(count_rows ${STAGING_TABLE})
if [ "$STAGED" -ne "$EXPECTED_ROWS" ]; then
  echo "Staged $STAGED deficiency rows, expected $EXPECTED_ROWS. Live table left untouched." >&2
  exit 1
fi
LIVE=$(count_rows ${LIVE_TABLE})
if [ $((STAGED * 2)) -lt "$LIVE" ] && [ "\${ALLOW_DEFICIENCY_SHRINK:-}" != "1" ]; then
  echo "Staged $STAGED rows is under half of the $LIVE live rows. Set ALLOW_DEFICIENCY_SHRINK=1 to accept." >&2
  exit 1
fi

echo "Verified $STAGED staged rows (live had $LIVE). Swapping into place..."
swap_in "$STAGED"

echo "Loading facilities and grades..."
d1 --file=scripts/seed.sql
echo "Done!"
`;
}
