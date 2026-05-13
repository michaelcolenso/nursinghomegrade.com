import { layout } from "./layout";

export function aboutPage(): string {
  const body = `
    <h1 class="display">About NursingHomeGrade</h1>

    <div class="lede">
      The dominant nursing home referral services earn commissions from the facilities they recommend —
      as much as $3,500 per family placed. In May 2024, the Washington Post and a Senate investigation
      documented how this creates incentives to hide violation records.
    </div>

    <p>
      NursingHomeGrade does not take payments from nursing facilities. We surface the same CMS data
      that's publicly available, organized and scored in a way that's actually useful.
    </p>

    <h2>How we grade facilities</h2>
    <p>The NursingHomeGrade Score (0–100) is a weighted composite of four CMS data points:</p>
    <div class="results-list" style="margin: var(--space-l) 0;">
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Staffing compliance (35%)</span>
        <span class="result-stat-value">RN hours vs federal minimum of 0.55</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Inspection clean rate (30%)</span>
        <span class="result-stat-value">Health inspection deficiencies & severity</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Quality measures (20%)</span>
        <span class="result-stat-value">CMS quality star rating</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Staffing consistency (15%)</span>
        <span class="result-stat-value">CMS staffing star rating</span>
      </div>
    </div>


    <h2>Data source</h2>
    <p>
      All data comes from <a href="https://data.cms.gov/provider-data/topics/nursing-homes">CMS Nursing Home Compare</a>,
      a public dataset updated monthly by the Centers for Medicare &amp; Medicaid Services.
      We apply no editorial adjustments.
    </p>

    <h2>Business model</h2>
    <p>
      We display contextual advertising and earn small referral fees when users click through to
      comparison services. We never receive payments from nursing facilities. If that ever changes,
      we'll disclose it prominently.
    </p>
    <p style="margin-top:2rem;"><a href="/">← Back to home</a></p>
  `;
  return layout(
    "About NursingHomeGrade — No Commissions, No Conflicts",
    "How NursingHomeGrade grades nursing homes and why we take no commissions from facilities.",
    body,
  );
}
