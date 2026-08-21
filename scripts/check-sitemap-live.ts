// Validates the sitemaps as they are actually served, not as they are
// generated: npx tsx scripts/check-sitemap-live.ts [--sample 25] [--update-baseline]
//
// This is the check that can reproduce a Search Console warning, because it
// sees what Googlebot sees — the deployed index, the children it references,
// and whether the URLs inside them return 200 on the canonical host.
//
// It also guards two failure modes that a purely structural check (see
// sitemap-xml.test.ts) cannot see because they only exist at the network edge:
// a sharp drop in total indexable URLs (discovery collapsing without the
// generator itself being at fault — e.g. a stale KV upload, a partial deploy),
// and the www host serving live content instead of redirecting to the
// canonical apex host it claims in every rel=canonical tag.

import { readFileSync, writeFileSync } from "node:fs";
import { validateIndex, validateUrlset, SITEMAP_BASE, type SitemapEntry, type SitemapIndexEntry } from "../src/sitemap-xml";
import {
  classifySitemapUrl,
  compareSitemapCoverage,
  parseSitemapBaseline,
  shouldUpdateSitemapBaseline,
  type SitemapBaseline,
  type SitemapCoverage,
} from "../src/indexation-health";

const args = process.argv.slice(2);
const sampleSize = Number(args[args.indexOf("--sample") + 1]) || 25;
const updateBaseline = args.includes("--update-baseline");

// Relative to the repo root, matching the other read/write paths in this
// script and in scripts/sitemap.ts — both are documented to run from there.
const BASELINE_PATH = "scripts/sitemap-baseline.json";
// A drop this large is not noise — it is the signature of a broken shard, a
// stale KV upload, or the discovery collapse this checker exists to catch.
const REGRESSION_THRESHOLD = 0.9;

function readBaseline(): SitemapBaseline | null {
  try {
    return parseSitemapBaseline(readFileSync(BASELINE_PATH, "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

function parseLocs(xml: string, tag: "url" | "sitemap"): Array<{ loc: string; lastmod?: string }> {
  const blocks = xml.match(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "g")) ?? [];
  return blocks.map((b) => ({
    loc: b.match(/<loc>([^<]*)<\/loc>/)?.[1] ?? "",
    lastmod: b.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1],
  }));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

async function main() {
  const today = new Date().toISOString().split("T")[0]!;
  const problems: string[] = [];

  const indexXml = await fetchText(`${SITEMAP_BASE}/sitemap.xml`);
  const children = parseLocs(indexXml, "sitemap") as SitemapIndexEntry[];
  console.log(`Index lists ${children.length} child sitemaps.`);
  for (const issue of validateIndex(children, indexXml, today)) {
    console.log(`[${issue.level}] ${issue.message}`);
    if (issue.level === "error") problems.push(issue.message);
  }

  let totalUrls = 0;
  const allLocs = new Set<string>();
  const pageClasses = { core: 0, city: 0, facility: 0, unknown: 0 };
  for (const child of children) {
    const xml = await fetchText(child.loc);
    const entries = parseLocs(xml, "url") as SitemapEntry[];
    totalUrls += entries.length;
    const name = child.loc.split("/").pop() ?? child.loc;
    for (const issue of validateUrlset(name, entries, xml, today)) {
      console.log(`[${issue.level}] ${issue.message}`);
      if (issue.level === "error") problems.push(issue.message);
    }
    // A URL listed in two different children is a duplicate to a crawler even
    // though neither file repeats it internally.
    for (const e of entries) {
      if (allLocs.has(e.loc)) problems.push(`${e.loc} appears in more than one child sitemap`);
      allLocs.add(e.loc);
      pageClasses[classifySitemapUrl(e.loc)] += 1;
    }

    // Sample the URLs: a listed URL must answer 200 on the canonical host with
    // a self-referencing canonical. Redirects and canonical mismatches are the
    // two things Search Console reports against a submitted sitemap.
    const locs = entries.map((e) => e.loc);
    const step = Math.max(1, Math.floor(locs.length / sampleSize));
    for (let i = 0; i < locs.length; i += step) {
      const url = locs[i]!;
      const res = await fetch(url, { redirect: "manual" });
      if (res.status !== 200) {
        problems.push(`${url} returned ${res.status} (sitemaps must list only 200 URLs)`);
        continue;
      }
      const html = await res.text();
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      if (canonical === undefined) {
        // Absent is a failure, not a pass: the checker's contract is that every
        // listed URL carries a self-referencing canonical, and a dropped or
        // reformatted tag is exactly what this run exists to catch.
        problems.push(`${url} has no canonical tag this checker can read`);
      } else if (canonical !== url) {
        problems.push(`${url} canonicalises to ${canonical}`);
      }
      // A sitemap listing a noindex URL is a direct contradiction — the sitemap
      // asks Google to crawl it, the page asks Google not to keep it.
      const robotsMeta = html.match(/<meta name="robots" content="([^"]*)"/)?.[1];
      if (robotsMeta?.includes("noindex")) {
        problems.push(`${url} is listed in the sitemap but marked noindex`);
      }
      // Catches a D1/subrequest failure that degrades silently into a thin 200
      // (an error or empty-state page) instead of the retryable 5xx the error
      // boundary is supposed to produce — invisible to the status-code check
      // above because the edge status is still 200.
      if (html.length < 2000) {
        problems.push(`${url} returned a suspiciously thin 200 (${html.length} bytes) — possible masked failure`);
      }
    }
    console.log(`Checked ${name}: ${entries.length} URLs, sampled ${Math.ceil(locs.length / step)}.`);
  }

  console.log(`\nTotal URLs across the index: ${totalUrls}`);

  // ── Canonical host consistency ───────────────────────────────────────
  //
  // Every page's rel=canonical hardcodes the apex host (src/templates/layout.ts).
  // www.nursinghomegrade.com is a proxied CNAME to the same Worker, so if it
  // isn't redirected it serves the identical page at 200 on a second host —
  // duplicate content the canonical tag alone does not prevent a crawler from
  // fetching, and crawl budget the facility corpus needs instead.
  const wwwUrl = `https://www.nursinghomegrade.com/`;
  const wwwRes = await fetch(wwwUrl, { redirect: "manual" });
  if (wwwRes.status < 300 || wwwRes.status >= 400) {
    problems.push(`${wwwUrl} returned ${wwwRes.status} instead of redirecting to the apex host`);
  } else {
    const location = wwwRes.headers.get("Location") ?? "";
    if (!location.startsWith(SITEMAP_BASE)) {
      problems.push(`${wwwUrl} redirects to ${location || "(no Location header)"}, not the canonical host`);
    }
  }

  // ── Sitemap coverage regression ──────────────────────────────────────
  //
  // Structural validation passes even for a sitemap that has quietly lost most
  // of its URLs — a stale KV upload, a truncated shard, a generator run against
  // an empty local DB by mistake. Compare against the last known-good count.
  const shardCount = children.length;
  const baseline = readBaseline();
  if (baseline) {
    const coverage: SitemapCoverage = { totalUrls, shardCount, pageClasses };
    problems.push(...compareSitemapCoverage(coverage, baseline, REGRESSION_THRESHOLD));
  } else {
    console.log(`No baseline at ${BASELINE_PATH} yet — run with --update-baseline to record one.`);
  }

  if (updateBaseline && problems.length > 0) {
    console.error("Refusing to update the sitemap baseline while health problems are present.");
  }

  if (problems.length === 0) {
    if (shouldUpdateSitemapBaseline(updateBaseline, problems)) {
      const next: SitemapBaseline = {
        totalUrls,
        shardCount,
        pageClasses,
        recordedAt: new Date().toISOString(),
      };
      writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
      console.log(`Updated baseline: ${totalUrls} URLs across ${shardCount} shards.`);
    }
    console.log("No problems found in the served sitemaps.");
    return;
  }
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
