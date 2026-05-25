export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const SITEMAP_KV_NAMESPACE_ID = "fa0faa67ae0c434093a3aeaa14a5992e";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sitemapKvUploadTarget(useLocal: boolean): string {
  if (useLocal) return "--binding CACHE --preview --local";
  return `--namespace-id=${SITEMAP_KV_NAMESPACE_ID} --remote`;
}

export function buildSitemapUrlSetXml(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => {
    const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
    const changefreq = entry.changefreq ? `\n    <changefreq>${escapeXml(entry.changefreq)}</changefreq>` : "";
    const priority = entry.priority ? `\n    <priority>${escapeXml(entry.priority)}</priority>` : "";
    return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
  })
  .join("\n")}
</urlset>`;
}

export function buildSitemapIndexXml(sitemapUrls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map((url) => `  <sitemap>\n    <loc>${escapeXml(url)}</loc>\n  </sitemap>`)
  .join("\n")}
</sitemapindex>`;
}
