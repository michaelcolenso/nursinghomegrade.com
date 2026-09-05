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
  penalties: {
    cadence: "Monthly",
    used_for:
      "Civil money penalties and Medicare/Medicaid payment denials, including individual action dates, fine amounts and denial lengths when CMS publishes them. Shown in each facility's enforcement history.",
  },
  ownership: {
    cadence: "Monthly",
    used_for: "Owning organizations and individuals, used to group facilities into chains.",
  },
};

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  // CMS metadata dates are normally YYYY-MM-DD. Render date-only values without
  // passing through a timezone conversion that could move midnight UTC backward
  // a day for a US reader.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }
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
          <td>${formatDate(r.ingested_at)}</td>
        </tr>
        <tr>
          <td colspan="4" style="padding-top:0;color:var(--muted);font-size:0.9rem;">
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
            <th style="text-align:left;">Cadence</th>
            <th style="text-align:left;">CMS public release</th>
            <th style="text-align:left;">Imported by NursingHomeGrade</th>
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
      the underlying records — the grade is a computation over them, not a revision of them.
    </p>

    ${table}

    <h2>Data period, release date and import date are different</h2>
    <p>
      <strong>CMS public release</strong> is when CMS made that monthly copy available. <strong>Imported by
      NursingHomeGrade</strong> is when we loaded that copy. Facility pages separately show the CMS
      processing/data-period date carried by the provider record. A later import date never makes an
      older survey or reporting period more current.
    </p>
    <p>
      The ingest pipeline reads the release metadata from CMS itself rather than stamping the current
      date into this page. That same source metadata is used for sitemap freshness so rerunning an
      unchanged import does not manufacture a new content date.
    </p>

    <h2>What we do not yet use directly</h2>
    <p>
      CMS publishes additional files we do not currently ingest directly, including Payroll-Based
      Journal daily staffing and the facility-level MDS Quality Measures file. We do use CMS's
      published staffing and quality star ratings from Provider Information, but not the full daily
      PBJ or measure-level MDS records yet.
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
    "Every CMS file NursingHomeGrade uses, its release cadence, public release date, import date, and role in the grade or facility record.",
    body,
    { canonicalPath: "/data-sources" },
  );
}
