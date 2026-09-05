import { layout, escHtml } from "./layout";

// Names every CMS file behind the site, its release cadence, its URL, and the
// release date of the copy currently in production. Release dates come from
// `data_releases`; hard-coding freshness here would recreate the bug this page
// is intended to prevent.

export interface DataRelease {
  source_key: string;
  label: string;
  cms_release_date: string | null;
  ingested_at: string | null;
  source_url: string | null;
}

/** Files we ingest, including clearly labelled shadow/research sources. */
const SOURCE_NOTES: Record<string, { cadence: string; used_for: string }> = {
  provider_info: {
    cadence: "Monthly",
    used_for:
      "Public Grade 1.x + facility profile. Supplies facility identity, ownership/bed fields, CMS star ratings, reported RN staffing, and the four base-grade components. Grade 2.0 also extracts richer adjusted staffing fields from this file into shadow evidence tables.",
  },
  health_deficiencies: {
    cadence: "Monthly, reflecting surveys conducted on a rolling basis",
    used_for:
      "Public Grade 1.x. Supplies health inspection citations for the last three survey cycles, including scope/severity and correction status, used for deficiency counts and both safety penalty terms.",
  },
  penalties: {
    cadence: "Monthly",
    used_for:
      "Civil money penalties and Medicare/Medicaid payment denials, including individual action dates, fine amounts and denial lengths when CMS publishes them. Shown in each facility's enforcement history.",
  },
  ownership: {
    cadence: "Monthly",
    used_for: "Facility record. Supplies owning organizations and individuals used to group facilities into chains.",
  },
  survey_summary: {
    cadence: "Monthly, reflecting surveys conducted on a rolling basis",
    used_for:
      "Grade 2.0 shadow/research evidence only. Records the three most recent inspection cycles, including survey dates even when an inspection produced zero citations, so a verified clean survey can be distinguished from missing deficiency data.",
  },
  mds_quality_measures: {
    cadence: "Monthly",
    used_for:
      "Grade 2.0 shadow/research evidence only. Stores facility/measure-level MDS quality outcomes and quarterly/four-quarter values for validation; these rows do not change the public Grade 1.x score.",
  },
  claims_quality_measures: {
    cadence: "Monthly",
    used_for:
      "Grade 2.0 shadow/research evidence only. Stores facility/measure-level Medicare claims outcomes, including adjusted/observed/expected values where CMS supplies them; these rows do not change the public Grade 1.x score.",
  },
};

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
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
      the underlying records. The table also identifies Grade 2.0 shadow sources that we ingest for
      research and validation but do not yet use to change the public Grade 1.x score.
    </p>

    ${table}

    <h2>Data period, release date and import date are different</h2>
    <p>
      <strong>CMS public release</strong> is when CMS made that copy available. <strong>Imported by
      NursingHomeGrade</strong> is when we loaded that copy. Facility pages separately show the CMS
      processing/data-period date carried by the provider record. A later import date never makes an
      older survey or reporting period more current.
    </p>
    <p>
      The ingest pipeline reads release metadata from CMS itself rather than stamping the current date
      into this page. That same source metadata is used for sitemap freshness so rerunning an unchanged
      public-data import does not manufacture a new content date.
    </p>

    <h2>Public grade inputs vs. Grade 2.0 shadow evidence</h2>
    <p>
      The public Grade 1.x formula still uses Provider Information plus Health Deficiencies for its score
      and penalties. Grade 2.0 research additionally ingests Survey Summary, measure-level MDS Quality
      Measures, Medicare Claims Quality Measures, and richer staffing fields from Provider Information.
      Those Phase A tables are intentionally <strong>shadow evidence only</strong>: they are stored so we
      can test missingness, build historical features and backtest candidate models without silently
      changing anyone's public grade.
    </p>
    <p>
      Payroll-Based Journal daily staffing remains a later Grade 2.0 phase and is not ingested by the
      Phase A pipeline in this change.
    </p>

    <h2>Reproducing our numbers</h2>
    <p>
      The public Grade 1.x source files are public and free. Combined with the
      <a href="/methodology">published formula</a>, they are sufficient to reproduce every public grade
      we display. Shadow Grade 2.0 evidence is versioned separately and is not part of that production
      calculation. If you reproduce the public formula and get a different answer,
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
    "Every CMS file NursingHomeGrade ingests, its release dates, and whether it powers the public Grade 1.x model or Grade 2.0 shadow research.",
    body,
    { canonicalPath: "/data-sources" },
  );
}
