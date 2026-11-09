import type { DataRelease } from "./data-sources";

/** Parse a CMS ISO date or UTC import timestamp to a valid YYYY-MM-DD, or null. Never falls back to render time. */
function validDate(value: string | null): { iso: string; label: string } | null {
  const date = /^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/.exec(value ?? "")?.[1];
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const label = parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  return { iso: date, label };
}

/** The scoring sources (see dataFreshness) */
const SCORING_SOURCES = ["provider_info", "health_deficiencies"] as const;

/**
 * Newest CMS release date across the public scoring sources, or null when none
 * is recorded. Used for short "data as of" labels; the full per-source
 * disclosure stays in dataFreshness().
 */
export function latestCmsRelease(releases: DataRelease[]): { iso: string; label: string } | null {
  const dates = releases
    .filter((r) => (SCORING_SOURCES as readonly string[]).includes(r.source_key))
    .map((r) => validDate(r.cms_release_date))
    .filter((d): d is { iso: string; label: string } => d !== null)
    .sort((a, b) => (a.iso < b.iso ? 1 : -1));
  return dates[0] ?? null;
}

function releaseDate(value: string | null): string {
  // These fields contain CMS ISO dates or UTC import timestamps. Never use
  // render time as a substitute, including on a cached page.
  const date = /^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/.exec(value ?? "")?.[1];
  if (!date) return "Not recorded";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return "Not recorded";
  }
  const label = parsed.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
  return `<time datetime="${date}">${label}</time>`;
}

/** Public scoring sources only: a newer shadow import must not imply fresher grades. */
export function dataFreshness(releases: DataRelease[]): string {
  const sources = [
    ["provider_info", "Provider information"],
    ["health_deficiencies", "Health inspections"],
  ] as const;
  return `
    <aside class="freshness" aria-label="Data freshness">
      <p class="freshness-head"><strong>Data freshness</strong> · <a href="/data-sources">Source dates and reporting periods</a></p>
      <div class="freshness-grid">
        ${sources.map(([key, label]) => {
          const release = releases.find((r) => r.source_key === key);
          return `<div><strong>${label}</strong><br>
            <strong>Data as of:</strong> ${releaseDate(release?.cms_release_date ?? null)} (CMS release)<br>
            <strong>Loaded:</strong> ${releaseDate(release?.ingested_at ?? null)} by NursingHomeGrade
          </div>`;
        }).join("")}
      </div>
    </aside>`;
}
