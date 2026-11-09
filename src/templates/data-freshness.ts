import type { DataRelease } from "./data-sources";

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
