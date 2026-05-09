// Run after data load: npx tsx scripts/sitemap.ts
// Writes public/sitemap.xml

import { getAllStateSlugs } from "../src/states";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  const { execSync } = await import("child_process");
  const { writeFileSync, mkdirSync } = await import("fs");

  // Pull cms_id and slug from local D1
  // Use a large maxBuffer to handle 14k+ facility rows
  const result = execSync(
    `npx wrangler d1 execute nursinghomegrade --local --command "SELECT cms_id, slug FROM facilities ORDER BY cms_id;" --json`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );

  // wrangler d1 execute --json returns an array of result sets
  const parsed = JSON.parse(result) as Array<{ results: Array<{ cms_id: string; slug: string }> }>;
  const rows = parsed[0]?.results ?? [];

  const BASE = "https://nursinghomegrade.com";
  const stateSlugs = getAllStateSlugs();
  const urls = [
    `${BASE}/`,
    `${BASE}/about`,
    `${BASE}/states`,
    ...stateSlugs.map((s) => `${BASE}/state/${escapeXml(s)}`),
    ...rows.map((r) => `${BASE}/facility/${escapeXml(r.cms_id)}-${escapeXml(r.slug)}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;

  mkdirSync("public", { recursive: true });
  writeFileSync("public/sitemap.xml", xml);
  console.log(`Wrote public/sitemap.xml with ${urls.length} URLs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
