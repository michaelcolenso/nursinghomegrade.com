import { SITEMAP_BASE } from "./sitemap-xml";

export type SitemapPageClass = "core" | "city" | "facility" | "unknown";

export interface SitemapPageClasses {
  core: number;
  city: number;
  facility: number;
  unknown?: number;
}

export interface SitemapCoverage {
  totalUrls: number;
  shardCount: number;
  pageClasses: SitemapPageClasses;
}

export interface SitemapBaseline {
  totalUrls: number;
  shardCount: number;
  pageClasses?: SitemapPageClasses;
  recordedAt: string;
}

const REQUIRED_CLASSES = ["core", "city", "facility"] as const;
const REGRESSION_THRESHOLD = 0.9;
const CORE_PATHS = new Set([
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/faq",
  "/glossary",
  "/reports/staffing-standard-repeal",
  "/states",
]);

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function pageClassTotal(pageClasses: SitemapPageClasses): number {
  return pageClasses.core + pageClasses.city + pageClasses.facility + (pageClasses.unknown ?? 0);
}

/**
 * Classify the routes that the sitemap generator is allowed to publish.
 * Unknown classes are deliberately not coerced into "core": a new URL family
 * must be reviewed before it can silently enter the indexation corpus.
 */
export function classifySitemapUrl(rawUrl: string): SitemapPageClass {
  try {
    const url = new URL(rawUrl);
    if (url.origin !== SITEMAP_BASE || url.search || url.hash) return "unknown";
    if (url.pathname.startsWith("/facility/") && /^\/facility\/[A-Za-z0-9-]+$/.test(url.pathname)) return "facility";
    if (/^\/state\/[a-z-]+\/[a-z-]+$/.test(url.pathname)) return "city";
    if (/^\/state\/[a-z-]+$/.test(url.pathname) || CORE_PATHS.has(url.pathname)) return "core";
  } catch {
    return "unknown";
  }
  return "unknown";
}

/**
 * Parse and validate the persisted coverage baseline. A malformed baseline is
 * a failed health check, not an instruction to disable regression detection.
 */
export function parseSitemapBaseline(raw: string): SitemapBaseline {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("sitemap baseline is not valid JSON");
  }
  if (!value || typeof value !== "object") throw new Error("sitemap baseline must be an object");
  const candidate = value as Record<string, unknown>;
  if (!isPositiveInteger(candidate.totalUrls)) throw new Error("sitemap baseline totalUrls must be a positive integer");
  if (!isPositiveInteger(candidate.shardCount)) throw new Error("sitemap baseline shardCount must be a positive integer");
  if (typeof candidate.recordedAt !== "string" || Number.isNaN(Date.parse(candidate.recordedAt))) {
    throw new Error("sitemap baseline recordedAt must be a date");
  }

  const rawClasses = candidate.pageClasses;
  let pageClasses: SitemapPageClasses | undefined;
  if (rawClasses !== undefined) {
    if (!rawClasses || typeof rawClasses !== "object") throw new Error("sitemap baseline pageClasses must be an object");
    const classes = rawClasses as Record<string, unknown>;
    pageClasses = {
      core: classes.core as number,
      city: classes.city as number,
      facility: classes.facility as number,
      unknown: (classes.unknown ?? 0) as number,
    };
    for (const name of REQUIRED_CLASSES) {
      if (!isNonNegativeInteger(pageClasses[name])) {
        throw new Error(`sitemap baseline pageClasses.${name} must be a non-negative integer`);
      }
    }
    if (!isNonNegativeInteger(pageClasses.unknown)) {
      throw new Error("sitemap baseline pageClasses.unknown must be a non-negative integer");
    }
    if (pageClassTotal(pageClasses) !== candidate.totalUrls) {
      throw new Error("sitemap baseline page classes must sum to totalUrls");
    }
  }

  return {
    totalUrls: candidate.totalUrls,
    shardCount: candidate.shardCount,
    ...(pageClasses ? { pageClasses } : {}),
    recordedAt: candidate.recordedAt,
  };
}

/**
 * Compare a served sitemap corpus with its last known-good baseline.
 * The page-class comparison catches a complete core/city/facility collapse even
 * when the overall URL count remains within the 10% tolerance.
 */
export function compareSitemapCoverage(
  current: SitemapCoverage,
  baseline: SitemapBaseline,
  threshold = REGRESSION_THRESHOLD,
): string[] {
  const problems: string[] = [];
  if (!isNonNegativeInteger(current.totalUrls) || current.totalUrls === 0) {
    problems.push(`Current sitemap URL count is invalid: ${current.totalUrls}.`);
  }
  if (!isNonNegativeInteger(current.shardCount) || current.shardCount === 0) {
    problems.push(`Current sitemap shard count is invalid: ${current.shardCount}.`);
  }
  if (pageClassTotal(current.pageClasses) !== current.totalUrls) {
    problems.push("Current sitemap page classes do not sum to totalUrls.");
  }
  if ((current.pageClasses.unknown ?? 0) > 0) {
    problems.push(`Current sitemap contains ${current.pageClasses.unknown} unknown URL class(es).`);
  }

  const urlRatio = current.totalUrls / baseline.totalUrls;
  const shardRatio = current.shardCount / baseline.shardCount;
  if (urlRatio < threshold) {
    problems.push(
      `Total sitemap URLs dropped to ${current.totalUrls} from a baseline of ${baseline.totalUrls} ` +
        `(recorded ${baseline.recordedAt}) — a ${Math.round((1 - urlRatio) * 100)}% drop.`,
    );
  }
  if (shardRatio < threshold) {
    problems.push(
      `Sitemap shard count dropped to ${current.shardCount} from a baseline of ${baseline.shardCount} ` +
        `(recorded ${baseline.recordedAt}).`,
    );
  }

  for (const name of REQUIRED_CLASSES) {
    const currentCount = current.pageClasses[name];
    if (currentCount === 0) {
      problems.push(`Sitemap ${name} URL class dropped to zero.`);
    }
    if (baseline.pageClasses) {
      const baselineCount = baseline.pageClasses[name];
      if (baselineCount > 0 && currentCount / baselineCount < threshold) {
        problems.push(
          `Sitemap ${name} URLs dropped to ${currentCount} from a baseline of ${baselineCount} ` +
            `(recorded ${baseline.recordedAt}).`,
        );
      }
    }
  }
  return problems;
}

/** Never replace a known-good baseline with a run that already found problems. */
export function shouldUpdateSitemapBaseline(requested: boolean, problems: readonly string[]): boolean {
  return requested && problems.length === 0;
}
