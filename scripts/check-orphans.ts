/**
 * Internal-link coverage check (spec 3.4).
 *
 * Every facility URL in the sitemap should be reachable by at least
 * MIN_INBOUND_LINKS internal links from other facility or city pages. Before the
 * peer rework every facility page in a state linked the same handful of
 * statewide winners, so most facilities had only their own city listing pointing
 * at them.
 *
 * Fails the build when the orphan count exceeds --max (default 0). Pass a higher
 * --max to ratchet down over time rather than blocking on a known residue.
 *
 * Usage:
 *   npx tsx scripts/check-orphans.ts --local
 *   npx tsx scripts/check-orphans.ts --remote --max 0
 */
import { execFileSync } from "node:child_process";
import { computeCoverage, type LinkNode } from "../src/link-graph";

const DB_NAME = "nursinghomegrade";
const args = process.argv.slice(2);
const remote = args.includes("--remote");
const maxArg = args.indexOf("--max");
const maxOrphans = maxArg !== -1 ? Number(args[maxArg + 1]) : 0;

function query<T>(sql: string): T[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, remote ? "--remote" : "--local", "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
  );
  return (JSON.parse(out) as Array<{ results: T[] }>)[0]?.results ?? [];
}

function main() {
  const rows = query<LinkNode>(
    "SELECT cms_id, city, state, latitude, longitude, grade_letter, grade_score FROM facilities",
  );
  console.log(`Loaded ${rows.length} facilities.`);

  // Per state: the link graph never crosses state lines, so evaluating the whole
  // corpus at once would be O(n^2) over 14,700 rows for no added signal.
  const byState = new Map<string, LinkNode[]>();
  for (const r of rows) {
    const list = byState.get(r.state) ?? [];
    list.push(r);
    byState.set(r.state, list);
  }

  let totalOrphans = 0;
  const worst: Array<{ state: string; orphanCount: number; minInbound: number }> = [];

  for (const [state, nodes] of [...byState.entries()].sort()) {
    const report = computeCoverage(nodes);
    totalOrphans += report.orphanCount;
    if (report.orphanCount > 0) {
      worst.push({ state, orphanCount: report.orphanCount, minInbound: report.minInbound });
    }
  }

  console.log(`\nOrphan count (fewer than 3 inbound internal links): ${totalOrphans}`);
  if (worst.length > 0) {
    console.log("\nStates with orphans:");
    for (const w of worst.sort((a, b) => b.orphanCount - a.orphanCount)) {
      console.log(`  ${w.state}: ${w.orphanCount} orphaned, lowest inbound ${w.minInbound}`);
    }
    console.log(
      "\nOrphans are typically the only facility in a peripheral town — no metro\n" +
        "facility ranks them in its nearest-8, so they rely on their own city page.\n" +
        "Closing the residue needs a precomputed symmetric link graph at ingest.",
    );
  }

  if (totalOrphans > maxOrphans) {
    console.error(`\nFAIL: ${totalOrphans} orphans exceeds the allowed maximum of ${maxOrphans}.`);
    process.exit(1);
  }
  console.log(`\nPASS: within the allowed maximum of ${maxOrphans}.`);
}

main();
