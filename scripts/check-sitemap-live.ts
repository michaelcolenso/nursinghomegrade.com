// Validates the sitemaps as they are actually served, not as they are
// generated: npx tsx scripts/check-sitemap-live.ts [--sample 25]
//
// This is the check that can reproduce a Search Console warning, because it
// sees what Googlebot sees — the deployed index, the children it references,
// and whether the URLs inside them return 200 on the canonical host.

import { validateIndex, validateUrlset, SITEMAP_BASE, type SitemapEntry, type SitemapIndexEntry } from "../src/sitemap-xml";

const args = process.argv.slice(2);
const sampleSize = Number(args[args.indexOf("--sample") + 1]) || 25;

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
      if (canonical && canonical !== url) {
        problems.push(`${url} canonicalises to ${canonical}`);
      }
    }
    console.log(`Checked ${name}: ${entries.length} URLs, sampled ${Math.ceil(locs.length / step)}.`);
  }

  console.log(`\nTotal URLs across the index: ${totalUrls}`);
  if (problems.length === 0) {
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
