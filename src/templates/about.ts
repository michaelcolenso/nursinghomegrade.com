import { layout } from "./layout";

export function aboutPage(): string {
  const body = `
    <h1 class="display" style="margin-bottom:2rem;">About NursingHomeGrade</h1>

    <h2>Why we built this</h2>
    <p>
      The dominant nursing home referral services earn commissions from the facilities they recommend —
      as much as $3,500 per family placed. In May 2024, the Washington Post and a Senate investigation
      documented how this creates incentives to hide violation records.
    </p>
    <p>
      NursingHomeGrade takes no commissions. We surface the same CMS data that's publicly available,
      organized and scored in a way that's actually useful.
    </p>

    <h2>How we grade facilities</h2>
    <p>The NursingHomeGrade Score (0–100) is a weighted composite of four CMS data points:</p>
    <ul style="margin-left:1.5rem;margin-bottom:1.5rem;">
      <li><strong>Staffing compliance (35%):</strong> RN hours per resident per day vs. the 2024 federal minimum of 0.55 hours</li>
      <li><strong>Inspection clean rate (30%):</strong> Total health inspection deficiencies and their severity</li>
      <li><strong>Quality measures (20%):</strong> CMS quality star rating</li>
      <li><strong>Staffing consistency (15%):</strong> CMS staffing star rating</li>
    </ul>

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
