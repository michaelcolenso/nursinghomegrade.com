// Run after data load: npx tsx scripts/sitemap.ts [--local|--remote]
// Generates public/sitemap*.xml, validates them against the sitemaps protocol,
// and uploads them to KV. A validation error aborts the run before anything is
// published — a sitemap that would earn a warning in Search Console should
// never reach Search Console.

import { getAllStateSlugs } from "../src/states";
import { citySlug } from "../src/states";
import {
  SITEMAP_BASE,
  escapeXml,
  newestLastmod,
  toSitemapIndex,
  toXml,
  validateIndex,
  validateUrlset,
  type SitemapEntry,
  type SitemapIndexEntry,
  type ValidationIssue,
} from "../src/sitemap-xml";

// KV keys this generator no longer writes. `sitemap-facilities` was the single
// pre-shard facility file; after the per-state split it is orphaned — still
// served at /sitemap-facilities.xml, still listed in whatever index a crawler
// cached, and frozen at the data it held on the day it stopped being written.
// It is deleted on every run so a stale copy cannot outlive the index entry.
const RETIRED_KV_KEYS = ["sitemap-facilities"];

const SITEMAP_UPLOADS = [
  { key: "sitemap", path: "public/sitemap.xml" },
  { key: "sitemap-core", path: "public/sitemap-core.xml" },
  { key: "sitemap-cities", path: "public/sitemap-cities.xml" },
];


/**
 * Parses wrangler's `--json` output.
 *
 * wrangler writes advisory text to stdout ahead of the JSON — "Proxy
 * environment variables detected" behind a proxy, `▲ [WARNING] ...` update
 * banners elsewhere — so parsing the raw stream fails with "Unexpected token".
 *
 * Seeking to the first `[` or `{` is not enough: `[WARNING]` contains one. So
 * try each structural character in turn and keep the first that yields valid
 * JSON, which is the payload itself rather than any bracket inside the prose.
 */
function parseWranglerJson<T>(raw: string, what: string): T {
  let lastError: string | null = null;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== "[" && ch !== "{") continue;
    try {
      return JSON.parse(raw.slice(i)) as T;
    } catch (err) {
      lastError = (err as Error).message;
    }
  }
  throw new Error(
    `Could not parse wrangler output for ${what}` +
      `${lastError ? ` (last error: ${lastError})` : ""}:\n${raw.slice(0, 500)}`,
  );
}

async function main() {
  const { execSync } = await import("child_process");
  const { existsSync, writeFileSync, mkdirSync } = await import("fs");

  const args = process.argv.slice(2);
  const useLocal = args.includes("--local") || !args.includes("--remote");
  const d1Flag = useLocal ? "--local" : "--remote";

  console.log(`Querying D1 ${useLocal ? "local" : "remote"} database...`);

  // Pull cms_id, slug, and updated_at from D1
  const result = execSync(
    `npx wrangler d1 execute nursinghomegrade ${d1Flag} --command "SELECT cms_id, slug, state, city, updated_at FROM facilities ORDER BY state, cms_id;" --json`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );

  // wrangler d1 execute --json returns an array of result sets
  const parsed = parseWranglerJson<Array<{
    results: Array<{ cms_id: string; slug: string; state: string; city: string; updated_at: string }>;
  }>>(result, "facility rows");
  const rows = parsed[0]?.results ?? [];

  // Pull distinct cities by state
  const cityResult = execSync(
    `npx wrangler d1 execute nursinghomegrade ${d1Flag} --command "SELECT state, city FROM facilities GROUP BY state, LOWER(city);" --json`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const cityParsed = parseWranglerJson<Array<{
    results: Array<{ state: string; city: string }>;
  }>>(cityResult, "city rows");
  const cityRows = cityParsed[0]?.results ?? [];

  const { STATE_NAMES } = await import("../src/states");

  const BASE = SITEMAP_BASE;
  const stateSlugs = getAllStateSlugs();

  const now = new Date().toISOString().split("T")[0];

  // ── lastmod, honestly ────────────────────────────────────────────────
  //
  // A sitemap lastmod is a claim about when the PAGE last changed. Stamping
  // every URL with the build time is the falsification the spec warns about:
  // Google learns the field is noise and stops using it. Facility pages carry
  // their own updated_at; city and state pages derive theirs from the most
  // recently changed facility they list, because that is genuinely when their
  // content last moved.
  const dayOf = (iso: string | null | undefined): string | undefined =>
    iso ? iso.split("T")[0] : undefined;

  const latestByState = new Map<string, string>();
  const latestByCity = new Map<string, string>();
  let latestOverall = "";
  for (const r of rows) {
    const d = dayOf(r.updated_at);
    if (!d) continue;
    if (d > (latestByState.get(r.state) ?? "")) latestByState.set(r.state, d);
    const cityKey = `${r.state}|${r.city.toLowerCase()}`;
    if (d > (latestByCity.get(cityKey) ?? "")) latestByCity.set(cityKey, d);
    if (d > latestOverall) latestOverall = d;
  }
  const siteLastmod = latestOverall || now;

  // ── URL validity ─────────────────────────────────────────────────────
  //
  // A sitemap must contain only 200-status canonical URLs. Search Console
  // reported pages-with-redirect and soft 404s in ours. The facility route is
  // /facility/([A-Za-z0-9-]+), so a row whose id or slug falls outside that
  // cannot resolve and must not be listed.
  const FACILITY_SEGMENT = /^[A-Za-z0-9-]+$/;
  const skipped: string[] = [];
  const validRows = rows.filter((r) => {
    if (!r.cms_id || !r.slug) {
      skipped.push(`${r.cms_id || "(no id)"}: missing id or slug`);
      return false;
    }
    if (!FACILITY_SEGMENT.test(`${r.cms_id}-${r.slug}`)) {
      skipped.push(`${r.cms_id}-${r.slug}: not a routable path segment`);
      return false;
    }
    return true;
  });
  if (skipped.length > 0) {
    console.warn(`Excluded ${skipped.length} facility URLs that would not resolve:`);
    for (const m of skipped.slice(0, 20)) console.warn(`  ${m}`);
  }

  // State slug -> most recent facility change in that state.
  const stateLastmodBySlug = new Map<string, string>();
  for (const [abbr, d] of latestByState) {
    const info = STATE_NAMES[abbr.toUpperCase()];
    if (info?.slug) stateLastmodBySlug.set(info.slug, d);
  }

  const coreEntries: SitemapEntry[] = [
    { loc: `${BASE}/`, lastmod: siteLastmod, changefreq: "weekly", priority: "1.0" },
    {
      loc: `${BASE}/about`,
      lastmod: siteLastmod,
      changefreq: "monthly",
      priority: "0.5",
    },
    {
      loc: `${BASE}/reports/staffing-standard-repeal`,
      lastmod: siteLastmod,
      changefreq: "monthly",
      priority: "0.7",
    },
    {
      loc: `${BASE}/states`,
      lastmod: siteLastmod,
      changefreq: "weekly",
      priority: "0.9",
    },
    ...stateSlugs.map((s) => ({
      loc: `${BASE}/state/${escapeXml(s)}`,
      lastmod: stateLastmodBySlug.get(s) ?? siteLastmod,
      changefreq: "weekly",
      priority: "0.8" as string,
    })),
  ];

  // City URL -> most recent change among the facilities it lists.
  const cityLastmodByUrl = new Map<string, string>();
  for (const [key, d] of latestByCity) {
    const [abbr, cityLower] = key.split("|");
    const info = STATE_NAMES[(abbr ?? "").toUpperCase()];
    if (!info) continue;
    cityLastmodByUrl.set(`${BASE}/state/${info.slug}/${citySlug(cityLower ?? "")}`, d);
  }

  const cityEntries: SitemapEntry[] = [...new Set(cityRows
    .map((r) => {
      const info = STATE_NAMES[r.state.toUpperCase()];
      if (!info) return null;
      return `${BASE}/state/${info.slug}/${citySlug(r.city)}`;
    })
    .filter((u): u is string => u !== null))].map((u) => ({
      loc: escapeXml(u),
      lastmod: cityLastmodByUrl.get(u) ?? siteLastmod,
      changefreq: "weekly",
      priority: "0.7" as string,
    }));

  // ── Facility shards, one per state ───────────────────────────────────
  //
  // The corpus fits inside a single file today, but a per-state split makes an
  // indexation problem attributable to a state instead of to one opaque
  // 14,700-URL document, and keeps every shard far below the 50,000-URL and
  // 50MB limits as the corpus grows.
  const SHARD_URL_LIMIT = 45000;
  const byState = new Map<string, SitemapEntry[]>();
  for (const r of validRows) {
    const info = STATE_NAMES[r.state.toUpperCase()];
    const slug = info?.slug ?? r.state.toLowerCase();
    const list = byState.get(slug) ?? [];
    list.push({
      loc: `${BASE}/facility/${escapeXml(r.cms_id)}-${escapeXml(r.slug)}`,
      lastmod: dayOf(r.updated_at) ?? siteLastmod,
      changefreq: "monthly",
      priority: "0.6",
    });
    byState.set(slug, list);
  }

  mkdirSync("public", { recursive: true });

  const facilityShardFiles: Array<{
    key: string;
    path: string;
    loc: string;
    entries: SitemapEntry[];
    lastmod: string | undefined;
  }> = [];
  let facilityUrlTotal = 0;
  for (const [slug, entries] of [...byState.entries()].sort()) {
    // Split further if a single state ever exceeds the per-file limit.
    for (let i = 0; i * SHARD_URL_LIMIT < entries.length; i += 1) {
      const chunk = entries.slice(i * SHARD_URL_LIMIT, (i + 1) * SHARD_URL_LIMIT);
      const suffix = i === 0 ? slug : `${slug}-${i + 1}`;
      const key = `sitemap-facilities-${suffix}`;
      const path = `public/${key}.xml`;
      facilityShardFiles.push({
        key,
        path,
        loc: `${BASE}/${key}.xml`,
        entries: chunk,
        lastmod: newestLastmod(chunk),
      });
      facilityUrlTotal += chunk.length;
    }
  }

  const indexChildren: SitemapIndexEntry[] = [
    { loc: `${BASE}/sitemap-core.xml`, lastmod: newestLastmod(coreEntries) },
    { loc: `${BASE}/sitemap-cities.xml`, lastmod: newestLastmod(cityEntries) },
    ...facilityShardFiles.map((f) => ({ loc: f.loc, lastmod: f.lastmod })),
  ];
  const sitemapIndex = toSitemapIndex(indexChildren);

  // ── Validate before publishing ───────────────────────────────────────
  const today = new Date().toISOString().split("T")[0]!;
  const issues: ValidationIssue[] = [
    ...validateUrlset("sitemap-core.xml", coreEntries, toXml(coreEntries), today),
    ...validateUrlset("sitemap-cities.xml", cityEntries, toXml(cityEntries), today),
    ...facilityShardFiles.flatMap((f) =>
      validateUrlset(`${f.key}.xml`, f.entries, toXml(f.entries), today),
    ),
    ...validateIndex(indexChildren, sitemapIndex, today),
  ];
  for (const i of issues) console[i.level === "error" ? "error" : "warn"](`[${i.level}] ${i.message}`);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length > 0) {
    console.error(`\nAborting: ${errors.length} sitemap validation error(s). Nothing was written or uploaded.`);
    process.exit(1);
  }
  console.log(`Validation passed with ${issues.length} warning(s).`);

  writeFileSync("public/sitemap.xml", sitemapIndex);
  writeFileSync("public/sitemap-core.xml", toXml(coreEntries));
  writeFileSync("public/sitemap-cities.xml", toXml(cityEntries));
  for (const shard of facilityShardFiles) writeFileSync(shard.path, toXml(shard.entries));
  console.log(`Wrote public/sitemap-core.xml with ${coreEntries.length} URLs`);
  console.log(`Wrote public/sitemap-cities.xml with ${cityEntries.length} URLs`);
  console.log(
    `Wrote ${facilityShardFiles.length} facility shards with ${facilityUrlTotal} URLs total`,
  );

  // Upload to KV
  try {
    const generatedAt = new Date().toISOString();
    const uploads = [
      ...SITEMAP_UPLOADS,
      ...facilityShardFiles.map((f) => ({ key: f.key, path: f.path })),
    ];
    for (const upload of uploads) {
      if (!existsSync(upload.path)) {
        console.warn(`Skipping ${upload.path}; file does not exist`);
        continue;
      }
      execSync(
        `npx wrangler kv key put ${upload.key} --path ${upload.path} --namespace-id=fa0faa67ae0c434093a3aeaa14a5992e ${d1Flag} --metadata '{"generatedAt":"${generatedAt}"}'`,
        { encoding: "utf8", stdio: "inherit" },
      );
      console.log(`Uploaded ${upload.path} to KV key ${upload.key}`);
    }

    // Retire keys the index no longer references, so /sitemap-facilities.xml
    // stops serving a file that is both orphaned and stale.
    const liveKeys = new Set(uploads.map((u) => u.key));
    for (const key of RETIRED_KV_KEYS) {
      if (liveKeys.has(key)) continue;
      try {
        execSync(
          `npx wrangler kv key delete ${key} --namespace-id=fa0faa67ae0c434093a3aeaa14a5992e ${d1Flag}`,
          { encoding: "utf8", stdio: "inherit" },
        );
        console.log(`Deleted retired KV key ${key}`);
      } catch {
        // Already absent on a second run — not a failure.
        console.log(`Retired KV key ${key} not present; nothing to delete`);
      }
    }
  } catch (err) {
    console.error("Failed to upload sitemaps to KV:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
