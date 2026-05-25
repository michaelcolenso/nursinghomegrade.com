// Run after data load: npx tsx scripts/sitemap.ts [--local|--remote]
// Generates grouped sitemap XML documents and uploads them to KV.

import { getAllStateSlugs } from "../src/states";
import { citySlug } from "../src/states";
import {
  buildSitemapIndexXml,
  buildSitemapUrlSetXml,
  sitemapKvUploadTarget,
  type SitemapEntry,
} from "../src/sitemap";

async function main() {
  const { execSync } = await import("child_process");
  const { writeFileSync, mkdirSync } = await import("fs");

  const args = process.argv.slice(2);
  const useLocal = args.includes("--local") || !args.includes("--remote");
  const d1Flag = useLocal ? "--local" : "--remote";
  const kvUploadTarget = sitemapKvUploadTarget(useLocal);

  console.log(`Querying D1 ${useLocal ? "local" : "remote"} database...`);

  // Pull cms_id, slug, and updated_at from D1
  const result = execSync(
    `npx wrangler d1 execute nursinghomegrade ${d1Flag} --command "SELECT cms_id, slug, updated_at FROM facilities ORDER BY cms_id;" --json`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );

  // wrangler d1 execute --json returns an array of result sets
  const parsed = JSON.parse(result) as Array<{
    results: Array<{ cms_id: string; slug: string; updated_at: string }>;
  }>;
  const rows = parsed[0]?.results ?? [];

  // Pull distinct cities by state
  const cityResult = execSync(
    `npx wrangler d1 execute nursinghomegrade ${d1Flag} --command "SELECT state, city FROM facilities GROUP BY state, LOWER(city);" --json`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const cityParsed = JSON.parse(cityResult) as Array<{
    results: Array<{ state: string; city: string }>;
  }>;
  const cityRows = cityParsed[0]?.results ?? [];

  const { STATE_NAMES } = await import("../src/states");

  const BASE = "https://nursinghomegrade.com";
  const stateSlugs = getAllStateSlugs();

  const now = new Date().toISOString().split("T")[0];

  const coreEntries: SitemapEntry[] = [
    { loc: `${BASE}/`, lastmod: now, changefreq: "weekly", priority: "1.0" },
    {
      loc: `${BASE}/about`,
      lastmod: now,
      changefreq: "monthly",
      priority: "0.5",
    },
    {
      loc: `${BASE}/states`,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.9",
    },
    ...stateSlugs.map((s) => ({
      loc: `${BASE}/state/${s}`,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.8" as string,
    })),
  ];
  const cityEntries: SitemapEntry[] = [
    ...[...new Set(cityRows
      .map((r) => {
        const info = STATE_NAMES[r.state.toUpperCase()];
        if (!info) return null;
        return `${BASE}/state/${info.slug}/${citySlug(r.city)}`;
      })
      .filter((u): u is string => u !== null))].map((u) => ({
      loc: u,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.7" as string,
    })),
  ];
  const facilityEntries: SitemapEntry[] = [
    ...rows.map((r) => ({
      loc: `${BASE}/facility/${r.cms_id}-${r.slug}`,
      lastmod: r.updated_at ? r.updated_at.split("T")[0] : now,
      changefreq: "monthly",
      priority: "0.6" as string,
    })),
  ];

  mkdirSync("public", { recursive: true });
  const sitemapDocs = [
    {
      key: "sitemap",
      file: "public/sitemap.xml",
      label: "sitemap index",
      xml: buildSitemapIndexXml([
        `${BASE}/sitemap-core.xml`,
        `${BASE}/sitemap-cities.xml`,
        `${BASE}/sitemap-facilities.xml`,
      ]),
    },
    {
      key: "sitemap:core",
      file: "public/sitemap-core.xml",
      label: `${coreEntries.length} core URLs`,
      xml: buildSitemapUrlSetXml(coreEntries),
    },
    {
      key: "sitemap:cities",
      file: "public/sitemap-cities.xml",
      label: `${cityEntries.length} city URLs`,
      xml: buildSitemapUrlSetXml(cityEntries),
    },
    {
      key: "sitemap:facilities",
      file: "public/sitemap-facilities.xml",
      label: `${facilityEntries.length} facility URLs`,
      xml: buildSitemapUrlSetXml(facilityEntries),
    },
  ];

  for (const doc of sitemapDocs) {
    writeFileSync(doc.file, doc.xml);
    console.log(`Wrote ${doc.file} with ${doc.label}`);
  }

  const metadata = `{"generatedAt":"${new Date().toISOString()}"}`;
  for (const doc of sitemapDocs) {
    try {
      execSync(
        `npx wrangler kv key put ${doc.key} --path ${doc.file} ${kvUploadTarget} --metadata '${metadata}'`,
        { encoding: "utf8", stdio: "inherit" },
      );
      console.log(`Uploaded ${doc.key} to KV`);
    } catch (err) {
      console.error(`Failed to upload ${doc.key} to KV:`, err);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
