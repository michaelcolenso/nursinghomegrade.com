import { layout } from "./layout";
import { RN_BENCHMARK, REPEAL_REPORT_PATH, repealDisclosureHtml } from "../staffing-standard";

// Authoritative statement of how a grade is produced. /how-we-grade is the
// plain-language version for readers choosing a facility; this page is the one a
// facility operator disputing its grade, or a journalist checking our work,
// should be able to reconstruct the arithmetic from.

export function methodologyPage(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "NursingHomeGrade Methodology",
      description:
        "The full NursingHomeGrade formula: component weights, penalty terms, grade band cutoffs, update cadence, and the grade changelog.",
      datePublished: "2026-07-27",
      dateModified: "2026-07-27",
      author: { "@type": "Organization", name: "NursingHomeGrade" },
      publisher: { "@type": "Organization", name: "NursingHomeGrade" },
    },
  ];

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Methodology</span>
    </nav>

    <h1>Methodology</h1>
    <p class="lede" style="max-width:800px;">
      Every grade on this site is computed from public CMS data by the formula below. No human
      adjusts an individual facility's score, and no facility can pay to change one. If you can
      obtain the same CMS files, you can reproduce every number we publish.
    </p>

    <h2 id="base">The base score</h2>
    <p>
      Each facility starts with a 0–100 composite of four CMS measures, weighted as follows:
    </p>
    <div class="table-container">
      <table class="quality-table">
        <thead>
          <tr>
            <th style="text-align:left;">Component</th>
            <th style="text-align:right;">Weight</th>
            <th style="text-align:left;">How it is scored</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Staffing compliance</td>
            <td style="text-align:right;">35%</td>
            <td>Reported RN hours per resident per day divided by ${RN_BENCHMARK}, capped at 150% of the benchmark. A facility at or above ${RN_BENCHMARK} scores at least 0.67 on this component; one at 0.825 or higher scores the full 1.0.</td>
          </tr>
          <tr>
            <td>Inspection clean rate</td>
            <td style="text-align:right;">30%</td>
            <td>1.0 at zero deficiencies, falling linearly to 0.0 at 20 or more.</td>
          </tr>
          <tr>
            <td>Quality measures</td>
            <td style="text-align:right;">20%</td>
            <td>CMS quality star rating, normalized from 1–5 stars to 0.0–1.0.</td>
          </tr>
          <tr>
            <td>Staffing consistency</td>
            <td style="text-align:right;">15%</td>
            <td>CMS staffing star rating, normalized from 1–5 stars to 0.0–1.0.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      The weighted components are summed and multiplied by 100. That is the base score.
    </p>
    ${repealDisclosureHtml()}

    <h2 id="penalties">Penalty terms</h2>
    <p>
      The base score is built from averages, which makes it blind to two facts that matter more to a
      family than any average: whether residents were actually harmed, and whether anything found is
      still unfixed. Two penalties are subtracted from the base score to correct that.
    </p>

    <h3>Uncorrected findings (up to 25 points)</h3>
    <p>Each deficiency the facility has not resolved costs:</p>
    <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.9rem;background:#fff;border:2px solid var(--ink);padding:var(--space-m);overflow-x:auto;">
      1.5 &times; severity weight &times; plan weight &times; recency weight
    </p>
    <ul>
      <li><strong>Severity weight</strong> — immediate jeopardy (J–L): 4. Actual harm (G–I): 3. Potential for more than minimal harm (D–F): 1.5. Minimal (A–C): 1.</li>
      <li><strong>Plan weight</strong> — no plan of correction on file: 2. Plan submitted but not yet verified: 1. A missing plan is a refusal to act; a submitted plan is action awaiting confirmation.</li>
      <li><strong>Recency weight</strong> — most recent survey cycle: 1.0. Second cycle: 0.6. Third: 0.35. An open finding from the last inspection is stronger evidence than one from three years ago.</li>
    </ul>
    <p>The total is capped at 25 points.</p>

    <h3>Actual harm (up to 25 points)</h3>
    <p>
      Scored on a separate axis from raw deficiency counts, so that harm is not diluted by volume.
      Each citation at scope and severity G through L costs 8 points for immediate jeopardy (J–L) or
      4 points for actual harm (G–I), multiplied by the same recency weight. Capped at 25 points.
    </p>
    <p>
      The practical consequence is that one J-level citation costs more than three D-level ones. That
      is deliberate. They are not equivalent events.
    </p>

    <h2 id="hard-rule">The no-plan rule</h2>
    <p>
      Independent of the arithmetic above: <strong>no facility holding any deficiency in "no plan of
      correction" status can be graded A.</strong> Such a facility is capped at B regardless of its
      score. An open violation the operator has not committed to fixing is the single most
      decision-relevant fact on a facility page, and no amount of good staffing should paper over it.
      This rule only ever lowers a grade — it never raises one.
    </p>

    <h2 id="bands">Grade bands</h2>
    <div class="table-container">
      <table class="quality-table">
        <thead><tr><th style="text-align:left;">Grade</th><th style="text-align:left;">Score</th></tr></thead>
        <tbody>
          <tr><td>A</td><td>80–100</td></tr>
          <tr><td>B</td><td>65–79</td></tr>
          <tr><td>C</td><td>50–64</td></tr>
          <tr><td>D</td><td>35–49</td></tr>
          <tr><td>F</td><td>0–34</td></tr>
        </tbody>
      </table>
    </div>

    <h2 id="cadence">Update cadence</h2>
    <p>
      CMS publishes Nursing Home Compare data monthly, and the underlying health inspection surveys
      on a rolling basis. We re-ingest monthly and recompute all grades on each ingest.
    </p>
    <p>
      <strong>Known gap:</strong> the date shown on a facility page is currently the date we loaded
      the record, not the date CMS published it. Those are different, sometimes by months, and the
      load date overstates how current the information is. The
      <a href="/data-sources">data sources page</a> carries the dates to rely on until this is
      fixed.
    </p>

    <h2 id="changelog">Grade changelog</h2>
    <div class="table-container">
      <table class="quality-table">
        <thead><tr><th style="text-align:left;">Date</th><th style="text-align:left;">Change</th></tr></thead>
        <tbody>
          <tr>
            <td style="white-space:nowrap;">2026-07-27</td>
            <td>
              Added the uncorrected-findings and actual-harm penalty terms and the no-plan rule
              described above. Before this change the grade counted deficiencies but ignored both
              their severity and whether they had been fixed, which allowed facilities with open,
              unaddressed harm citations to hold an A. Roughly 27% of facilities moved down a letter;
              about 4% of facilities holding an A no longer do. No facility's grade improved as a
              result of this change. Grades held before this date are retained and can be supplied on
              request.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 id="disputes">If you believe a grade is wrong</h2>
    <p>
      We publish a <a href="/contact">corrections policy and a dispute route</a>. Grades are derived
      from CMS data, so a grade we compute incorrectly and a CMS record that is itself wrong are
      different problems with different fixes — the contact page explains both.
    </p>

    <div class="cta-box" style="margin-top:var(--space-2xl);">
      <h3>Related</h3>
      <p>The plain-language version, the underlying files, and the staffing benchmark.</p>
      <a class="btn" href="/how-we-grade">How we grade →</a>
      <a href="/data-sources" class="btn-secondary">Data sources →</a>
      <a href="${REPEAL_REPORT_PATH}" class="btn-secondary">The repealed staffing rule →</a>
    </div>
  `;

  return layout(
    "Methodology — How NursingHomeGrade Scores Are Computed",
    "The full NursingHomeGrade formula: component weights, the uncorrected-findings and actual-harm penalties, the no-plan rule, grade band cutoffs, update cadence, and the grade changelog.",
    body,
    { canonicalPath: "/methodology", jsonLd },
  );
}
