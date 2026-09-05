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
        "The full NursingHomeGrade formula: component weights, missing-data policy, penalty terms, grade band cutoffs, update cadence, and the grade changelog.",
      datePublished: "2026-07-27",
      dateModified: "2026-09-05",
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
    <p>Each facility starts with a 0–100 composite of four CMS measures, weighted as follows:</p>
    <div class="table-container">
      <table class="quality-table">
        <thead>
          <tr><th style="text-align:left;">Component</th><th style="text-align:right;">Weight</th><th style="text-align:left;">How it is scored</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Staffing compliance</td><td style="text-align:right;">35%</td>
            <td>Reported RN hours per resident per day divided by ${RN_BENCHMARK}, capped at 150% of the benchmark. A facility at or above ${RN_BENCHMARK} scores at least 0.67 on this component; one at 0.825 or higher scores the full 1.0.</td>
          </tr>
          <tr>
            <td>Inspection clean rate</td><td style="text-align:right;">30%</td>
            <td>1.0 at a verified zero-deficiency current survey, falling linearly to 0.0 at 20 or more deficiencies. A missing inspection is never treated as zero.</td>
          </tr>
          <tr>
            <td>Quality measures</td><td style="text-align:right;">20%</td>
            <td>CMS quality star rating, normalized from 1–5 stars to 0.0–1.0.</td>
          </tr>
          <tr>
            <td>Staffing consistency</td><td style="text-align:right;">15%</td>
            <td>CMS staffing star rating, normalized from 1–5 stars to 0.0–1.0.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>The weighted components are summed and multiplied by 100. That is the base score.</p>
    ${repealDisclosureHtml()}

    <h2 id="missing-data">Missing-data policy</h2>
    <p>
      Missing evidence is not a zero, and it is not a clean record. Every facility is assigned one of
      three evidence-completeness states before the grade is published.
    </p>
    <div class="table-container">
      <table class="quality-table">
        <thead><tr><th style="text-align:left;">State</th><th style="text-align:left;">Meaning</th><th style="text-align:left;">Grade behavior</th></tr></thead>
        <tbody>
          <tr><td><strong>Complete</strong></td><td>All four Grade 1.x score inputs and current inspection evidence are present.</td><td>Normal score and letter grade.</td></tr>
          <tr><td><strong>Partial</strong></td><td>Current inspection evidence is present, but RN staffing, the CMS quality rating, or the CMS staffing rating is unavailable.</td><td>A conservative lower-bound score is shown. Missing components earn zero points and the remaining weights are <em>not</em> renormalized upward.</td></tr>
          <tr><td><strong>Insufficient</strong></td><td>The current inspection/deficiency evidence required to distinguish a real clean survey from missing data is unavailable.</td><td>The NursingHomeGrade score and letter are withheld and displayed as not rated.</td></tr>
        </tbody>
      </table>
    </div>
    <p>
      This policy is intentionally asymmetric: missing evidence is never allowed to improve a score.
      A verified survey with zero deficiencies can earn the full inspection component; a missing survey
      cannot. Grade 2.0 will use the CMS Survey Summary source as an additional authoritative check
      because that file records inspection dates even when an inspection produced no citations.
    </p>

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
      <li><strong>Plan weight</strong> — no plan of correction on file: 2. Plan submitted but not yet verified: 1.</li>
      <li><strong>Recency weight</strong> — most recent survey cycle: 1.0. Second cycle: 0.6. Third: 0.35.</li>
    </ul>
    <p>The total is capped at 25 points.</p>

    <h3>Actual harm (up to 25 points)</h3>
    <p>
      Scored separately from raw deficiency counts. Each citation at scope and severity G through L
      costs 8 points for immediate jeopardy (J–L) or 4 points for actual harm (G–I), multiplied by
      the same recency weight. Capped at 25 points.
    </p>

    <h2 id="hard-rule">The no-plan rule</h2>
    <p>
      Independent of the arithmetic above: <strong>no facility holding any deficiency in "no plan of
      correction" status can be graded A.</strong> Such a facility is capped at B regardless of its
      score. This rule only ever lowers a grade — it never raises one.
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
          <tr><td>NR</td><td>Not rated because critical current inspection evidence is insufficient</td></tr>
        </tbody>
      </table>
    </div>

    <h2 id="cadence">Update cadence and freshness</h2>
    <p>
      CMS publishes the nursing-home datasets we use on a recurring schedule, while individual health
      inspections occur on a rolling basis. We re-ingest the CMS files and recompute all grades when a
      new source release is loaded.
    </p>
    <p>
      We track the CMS source-modified date, CMS public release date, NursingHomeGrade import timestamp,
      and CMS processing/data-period date separately. See <a href="/data-sources">data sources</a> for
      the release and import dates currently in production.
    </p>
    <p>
      Sitemap freshness uses the CMS source-modified date rather than the import clock. Rerunning an
      unchanged ingest therefore does not manufacture a newer <code>lastmod</code> date.
    </p>

    <h2 id="grade2">Grade 2.0 research track</h2>
    <p>
      Grade 2.0 is being built and validated separately from the public Grade 1.x formula. Its Phase A
      evidence layer adds CMS Survey Summary, measure-level MDS quality measures, Medicare claims quality
      measures, and richer case-mix-adjusted staffing data. Those sources are stored in shadow tables and
      do <strong>not</strong> change the public grade until a versioned model passes temporal validation and
      migration review.
    </p>

    <h2 id="changelog">Grade changelog</h2>
    <div class="table-container">
      <table class="quality-table">
        <thead><tr><th style="text-align:left;">Date</th><th style="text-align:left;">Change</th></tr></thead>
        <tbody>
          <tr>
            <td style="white-space:nowrap;">2026-09-05</td>
            <td>Added explicit complete/partial/insufficient grading semantics. Missing inspection evidence now withholds the grade instead of receiving clean-inspection credit; other missing components produce a labelled lower-bound partial score without weight renormalization.</td>
          </tr>
          <tr>
            <td style="white-space:nowrap;">2026-07-27</td>
            <td>
              Added the uncorrected-findings and actual-harm penalty terms and the no-plan rule.
              Of 14,703 facilities, 3,858 (26%) moved down at least one letter grade and 10,845 were
              unchanged. The number of A grades fell from 2,677 to 2,184. No facility's grade improved
              as a result of this change.
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
    "The full NursingHomeGrade formula: component weights, missing-data policy, penalty terms, grade band cutoffs, update cadence, and the grade changelog.",
    body,
    { canonicalPath: "/methodology", jsonLd },
  );
}
