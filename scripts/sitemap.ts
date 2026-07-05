// Run after data load: npx tsx scripts/sitemap.ts [--local|--remote]
// Generates public/sitemap.xml and uploads available sitemap files to KV.

import { getAllStateSlugs } from "../src/states";
import { citySlug } from "../src/states";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const SITEMAP_UPLOADS = [
  { key: "sitemap", path: "public/sitemap.xml" },
  { key: "sitemap-core", path: "public/sitemap-core.xml" },
  { key: "sitemap-cities", path: "public/sitemap-cities.xml" },
  { key: "sitemap-facilities", path: "public/sitemap-facilities.xml" },
];

function toXml(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((e) => {
    const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : "";
    const changefreq = e.changefreq
      ? `\n    <changefreq>${e.changefreq}</changefreq>`
      : "";
    const priority = e.priority
      ? `\n    <priority>${e.priority}</priority>`
      : "";
    return `  <url>\n    <loc>${e.loc}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
  })
  .join("\n")}
</urlset>`;
}

function toSitemapIndex(sitemaps: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`).join("\n")}
</sitemapindex>`;
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
      loc: `${BASE}/state/${escapeXml(s)}`,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.8" as string,
    })),
  ];

  const cityEntries: SitemapEntry[] = [...new Set(cityRows
    .map((r) => {
      const info = STATE_NAMES[r.state.toUpperCase()];
      if (!info) return null;
      return `${BASE}/state/${info.slug}/${citySlug(r.city)}`;
    })
    .filter((u): u is string => u !== null))].map((u) => ({
      loc: escapeXml(u),
      lastmod: now,
      changefreq: "weekly",
      priority: "0.7" as string,
    }));

  const facilityEntries: SitemapEntry[] = rows.map((r) => ({
    loc: `${BASE}/facility/${escapeXml(r.cms_id)}-${escapeXml(r.slug)}`,
    lastmod: r.updated_at ? r.updated_at.split("T")[0] : now,
    changefreq: "monthly",
    priority: "0.6" as string,
  }));

  const sitemapIndex = toSitemapIndex([
    `${BASE}/sitemap-core.xml`,
    `${BASE}/sitemap-cities.xml`,
    `${BASE}/sitemap-facilities.xml`,
  ]);

  mkdirSync("public", { recursive: true });
  writeFileSync("public/sitemap.xml", sitemapIndex);
  writeFileSync("public/sitemap-core.xml", toXml(coreEntries));
  writeFileSync("public/sitemap-cities.xml", toXml(cityEntries));
  writeFileSync("public/sitemap-facilities.xml", toXml(facilityEntries));
  console.log(`Wrote public/sitemap-core.xml with ${coreEntries.length} URLs`);
  console.log(`Wrote public/sitemap-cities.xml with ${cityEntries.length} URLs`);
  console.log(`Wrote public/sitemap-facilities.xml with ${facilityEntries.length} URLs`);

  // Upload to KV
  try {
    const generatedAt = new Date().toISOString();
    for (const upload of SITEMAP_UPLOADS) {
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
  } catch (err) {
    console.error("Failed to upload sitemaps to KV:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
