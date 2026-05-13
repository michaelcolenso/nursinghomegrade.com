// Run after data load: npx tsx scripts/sitemap.ts [--local|--remote]
// Generates public/sitemap.xml and uploads it to KV.

import { getAllStateSlugs } from "../src/states";
import { citySlug } from "../src/states";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  const { execSync } = await import("child_process");
  const { writeFileSync, mkdirSync } = await import("fs");

  const args = process.argv.slice(2);
  const useLocal = args.includes("--local") || !args.includes("--remote");
  const d1Flag = useLocal ? "--local" : "--remote";

  console.log(`Querying D1 ${useLocal ? "local" : "remote"} database...`);

  // Pull cms_id and slug from D1
  const result = execSync(
    `npx wrangler d1 execute nursinghomegrade ${d1Flag} --command "SELECT cms_id, slug FROM facilities ORDER BY cms_id;" --json`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );

  // wrangler d1 execute --json returns an array of result sets
  const parsed = JSON.parse(result) as Array<{ results: Array<{ cms_id: string; slug: string }> }>;
  const rows = parsed[0]?.results ?? [];

  // Pull distinct cities by state
  const cityResult = execSync(
    `npx wrangler d1 execute nursinghomegrade ${d1Flag} --command "SELECT state, city FROM facilities GROUP BY state, LOWER(city);" --json`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const cityParsed = JSON.parse(cityResult) as Array<{ results: Array<{ state: string; city: string }> }>;
  const cityRows = cityParsed[0]?.results ?? [];

  const { STATE_NAMES } = await import("../src/states");

  const BASE = "https://nursinghomegrade.com";
  const stateSlugs = getAllStateSlugs();
  const cityUrls = [...new Set(cityRows
    .map((r) => {
      const info = STATE_NAMES[r.state.toUpperCase()];
      if (!info) return null;
      return `${BASE}/state/${info.slug}/${citySlug(r.city)}`;
    })
    .filter((u): u is string => u !== null))].map(escapeXml);

  const urls = [
    `${BASE}/`,
    `${BASE}/about`,
    `${BASE}/states`,
    ...stateSlugs.map((s) => `${BASE}/state/${escapeXml(s)}`),
    ...cityUrls,
    ...rows.map((r) => `${BASE}/facility/${escapeXml(r.cms_id)}-${escapeXml(r.slug)}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;

  mkdirSync("public", { recursive: true });
  writeFileSync("public/sitemap.xml", xml);
  console.log(`Wrote public/sitemap.xml with ${urls.length} URLs`);

  // Upload to KV
  try {
    execSync(
      `npx wrangler kv key put sitemap --path public/sitemap.xml --namespace-id=fa0faa67ae0c434093a3aeaa14a5992e --metadata '{"generatedAt":"${new Date().toISOString()}"}'`,
      { encoding: "utf8", stdio: "inherit" },
    );
    console.log("Uploaded sitemap to KV");
  } catch (err) {
    console.error("Failed to upload sitemap to KV:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
