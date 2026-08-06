// Sitemap XML construction and validation.
//
// Extracted from scripts/sitemap.ts so the rules a sitemap has to satisfy —
// canonical host, no duplicates, truthful lastmod, protocol limits — are
// enforced by a function with tests rather than by reading the generator.

export const SITEMAP_BASE = "https://nursinghomegrade.com";
/** Sitemaps protocol maximum URLs per file. */
export const MAX_URLS_PER_FILE = 50000;
/** Sitemaps protocol maximum uncompressed bytes per file. */
export const MAX_BYTES_PER_FILE = 50 * 1024 * 1024;

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toXml(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((e) => {
    const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : "";
    const changefreq = e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : "";
    const priority = e.priority ? `\n    <priority>${e.priority}</priority>` : "";
    return `  <url>\n    <loc>${e.loc}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
  })
  .join("\n")}
</urlset>`;
}

/**
 * Sitemap index. Each child carries its own lastmod — the newest lastmod among
 * the URLs inside it, so the value is a fact about the child rather than the
 * build clock. Crawlers use it to skip children that have not changed; a build
 * timestamp on every child would make that signal worthless.
 */
export function toSitemapIndex(sitemaps: SitemapIndexEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map((s) => `  <sitemap>\n    <loc>${s.loc}</loc>${s.lastmod ? `\n    <lastmod>${s.lastmod}</lastmod>` : ""}\n  </sitemap>`)
  .join("\n")}
</sitemapindex>`;
}

/** The newest lastmod among a set of entries, or undefined if none carry one. */
export function newestLastmod(entries: SitemapEntry[]): string | undefined {
  let newest: string | undefined;
  for (const e of entries) {
    if (e.lastmod && (newest === undefined || e.lastmod > newest)) newest = e.lastmod;
  }
  return newest;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

/**
 * Every rule a generated urlset has to satisfy before it is published.
 *
 * `today` is injected rather than read from the clock so the future-lastmod
 * check is testable and so a machine with a skewed clock cannot silently pass.
 */
export function validateUrlset(
  name: string,
  entries: SitemapEntry[],
  xml: string,
  today: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (level: "error" | "warning", message: string) => issues.push({ level, message: `${name}: ${message}` });

  if (entries.length === 0) push("error", "contains no URLs");
  if (entries.length > MAX_URLS_PER_FILE) push("error", `has ${entries.length} URLs, over the ${MAX_URLS_PER_FILE} limit`);

  const bytes = Buffer.byteLength(xml, "utf8");
  if (bytes > MAX_BYTES_PER_FILE) push("error", `is ${bytes} bytes, over the ${MAX_BYTES_PER_FILE} limit`);

  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) push("error", "missing XML declaration");
  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) push("error", "missing sitemap namespace");

  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.loc.startsWith(`${SITEMAP_BASE}/`)) {
      push("error", `URL is not on the canonical https host: ${e.loc}`);
    }
    if (/[<>"']/.test(e.loc)) {
      push("error", `URL contains an unescaped XML character: ${e.loc}`);
    }
    const key = e.loc.toLowerCase();
    if (seen.has(key)) push("error", `duplicate URL: ${e.loc}`);
    seen.add(key);

    if (e.lastmod !== undefined) {
      if (!ISO_DATE.test(e.lastmod)) {
        push("error", `lastmod is not a W3C date: ${e.lastmod} (${e.loc})`);
      } else if (e.lastmod > today) {
        // A lastmod in the future is the classic "falsified freshness" signal
        // that makes a crawler discount the field across the whole site.
        push("error", `lastmod is in the future: ${e.lastmod} (${e.loc})`);
      }
    }
  }

  return issues;
}

export function validateIndex(children: SitemapIndexEntry[], xml: string, today: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (level: "error" | "warning", message: string) => issues.push({ level, message: `sitemap.xml: ${message}` });

  if (children.length === 0) push("error", "index lists no sitemaps");
  if (children.length > MAX_URLS_PER_FILE) push("error", `index lists ${children.length} sitemaps, over the limit`);
  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) push("error", "missing sitemap namespace");

  const seen = new Set<string>();
  for (const c of children) {
    if (!c.loc.startsWith(`${SITEMAP_BASE}/`)) push("error", `child sitemap is not on the canonical https host: ${c.loc}`);
    if (seen.has(c.loc)) push("error", `duplicate child sitemap: ${c.loc}`);
    seen.add(c.loc);
    if (c.lastmod === undefined) {
      push("warning", `child sitemap has no lastmod: ${c.loc}`);
    } else if (!ISO_DATE.test(c.lastmod)) {
      push("error", `child lastmod is not a W3C date: ${c.lastmod}`);
    } else if (c.lastmod > today) {
      push("error", `child lastmod is in the future: ${c.lastmod}`);
    }
  }

  return issues;
}
