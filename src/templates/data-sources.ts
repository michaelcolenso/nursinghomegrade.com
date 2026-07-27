import { layout, escHtml } from "./layout";

// Names every CMS file behind the site, its release cadence, its URL, and the
// release date of the copy currently in production. The release dates come from
// the `data_releases` table rather than being written into this file — a
// hardcoded freshness date is exactly the failure mode this page documents.

export interface DataRelease {
  source_key: string;
  label: string;
  cms_release_date: string | null;
  ingested_at: string | null;
  source_url: string | null;
}

/** Files the site reads today, in the order a reader would care about them. */
const SOURCE_NOTES: Record<string, { cadence: string; used_for: string }> = {
  provider_info: {
    cadence: "Monthly",
    used_for:
      "Facility name, address, ownership type, bed count, CMS star ratings, and reported RN staffing hours per resident per day. Supplies the four components of the base grade.",
  },
  health_deficiencies: {
    cadence: "Monthly, reflecting surveys conducted on a rolling basis",
    used_for:
      "Every health inspection citation for the last three survey cycles, with scope and severity letter and correction status. Supplies the deficiency counts and both penalty terms.",
  },
  ownership: {
    cadence: "Monthly",
    used_for: "Owning organizations and individuals, used to group facilities into chains.",
  },
};

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escHtml(value);
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function dataSourcesPage(releases: DataRelease[]): string {
  const rows = releases
    .map((r) => {
      const notes = SOURCE_NOTES[r.source_key];
      return `
        <tr>
          <td>
            <strong>${escHtml(r.label)}</strong>
            ${r.source_url ? `<br><a href="${escHtml(r.source_url)}" rel="noopener">${escHtml(r.source_url)}</a>` : ""}
          </td>
          <td>${notes ? escHtml(notes.cadence) : "Not recorded"}</td>
          <td>${formatDate(r.cms_release_date)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding-top:0;color:var(--muted);font-size:0.9rem;">
            ${notes ? escHtml(notes.used_for) : ""}
          </td>
        </tr>`;
    })
    .join("");

  const table = rows
    ? `
    <div class="table-container">
      <table class="quality-table">
        <thead>
          <tr>
            <th style="text-align:left;">CMS file</th>
            <th style="text-align:left;">Release cadence</th>
            <th style="text-align:left;">Release date in production</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
    : "";

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Data Sources</span>
    </nav>

    <h1>Data sources</h1>
    <p class="lede" style="max-width:800px;">
      Every figure on this site comes from a public CMS file. We apply no editorial adjustments to
      the underlying data — the grade is a computation over it, not a revision of it.
    </p>

    ${table}

    <h2>Release date, not load date</h2>
    <p>
      The dates above are the dates CMS published each file, not the dates we loaded them. Those are
      different, sometimes by months, and treating the load date as freshness overstates how current
      the information is. A survey conducted in April does not become current because we refreshed
      our database in July.
    </p>
    <p>
      <strong>Known gap:</strong> freshness dates elsewhere on the site do not yet resolve from this
      table. Facility pages show the date we loaded the record, which is later than the date CMS
      published the underlying survey data and is labelled as a load date for that reason. The dates
      on this page are the ones to rely on.
    </p>

    <h2>What we do not yet use</h2>
    <p>
      CMS publishes several files we do not currently ingest, including Payroll-Based Journal daily
      staffing, MDS quality measures, and civil money penalties. We would rather name that gap than
      imply coverage we do not have. Nothing on this site is derived from those files today.
    </p>

    <h2>Reproducing our numbers</h2>
    <p>
      The files above are public and free. Combined with the
      <a href="/methodology">published formula</a>, they are sufficient to reproduce every grade we
      display. If you do that and get a different answer, we would like to know —
      <a href="/contact">tell us</a>.
    </p>

    <div class="cta-box" style="margin-top:var(--space-2xl);">
      <h3>Related</h3>
      <p>How the numbers become a grade, and how to report an error.</p>
      <a class="btn" href="/methodology">Methodology →</a>
      <a href="/contact" class="btn-secondary">Corrections →</a>
    </div>
  `;

  return layout(
    "Data Sources — The CMS Files Behind Every Grade",
    "Every CMS file NursingHomeGrade uses, its release cadence, its URL, and the release date of the copy currently in production.",
    body,
    { canonicalPath: "/data-sources" },
  );
}
