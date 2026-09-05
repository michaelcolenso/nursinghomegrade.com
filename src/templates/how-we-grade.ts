import { layout } from "../templates/layout";
import { RN_BENCHMARK } from "../staffing-standard";

export function howWeGradePage(): string {
  const body = `
    <h1 class="display">How Nursing Home Ratings Work</h1>

    <div class="lede">
      Every nursing home in the U.S. that accepts Medicare or Medicaid is surveyed by federal inspectors.
      NursingHomeGrade takes that public CMS data and converts it into an A–F grade so you can compare
      facilities at a glance. The grade combines staffing, inspection and quality evidence, then applies
      explicit penalties when CMS records unresolved findings or actual harm.
    </div>

    <h2>How the A–F grade is calculated</h2>
    <p>Each facility starts with a 0–100 base score built from four CMS measures:</p>
    <div class="results-list" style="margin: var(--space-l) 0;">
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">RN Staffing (35%)</span>
        <span class="result-stat-value">Reported RN hours per resident per day compared with the 2024 benchmark of ${RN_BENCHMARK} hours. The federal rule that created this benchmark was repealed in February 2026; we retain the value as a disclosed grading benchmark, not as a current legal minimum.</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Inspection Record (30%)</span>
        <span class="result-stat-value">Number of health deficiencies CMS records for the most recent rating cycle. Zero deficiencies receives full base-score credit; the component falls to zero at 20 or more.</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Quality Measures (20%)</span>
        <span class="result-stat-value">CMS quality-measure star rating, normalized from one to five stars.</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Staffing Rating (15%)</span>
        <span class="result-stat-value">CMS staffing star rating, normalized from one to five stars.</span>
      </div>
    </div>

    <h2>Safety penalties are applied after the base score</h2>
    <p>The weighted base score is not necessarily the final score. We then apply two evidence-based penalty terms from the CMS Health Deficiencies file:</p>
    <ul>
      <li><strong>Unresolved findings:</strong> up to 25 points can be deducted for deficiencies that CMS still records as uncorrected. More severe and more recent findings receive larger penalties, and a finding with no correction plan is weighted more heavily than one with a plan awaiting verification.</li>
      <li><strong>Actual harm:</strong> up to another 25 points can be deducted for scope/severity G–L findings. Immediate-jeopardy findings (J–L) carry a larger penalty than G–I findings.</li>
    </ul>
    <p><strong>No-plan rule:</strong> if CMS records any deficiency with no plan of correction, the facility cannot receive an A even if its numeric score remains 80 or higher. Its letter grade is capped at B.</p>
    <p>For the exact arithmetic, recency weights, severity weights and changelog, see the <a href="/methodology">full methodology</a>.</p>

    <h2>What the letter grades mean</h2>
    <p>The letter is a band applied to the <strong>final score after applicable penalties</strong>. It is a composite result, not a promise that every individual metric is equally strong.</p>
    <div class="results-list" style="margin: var(--space-l) 0; display: grid; gap: var(--space-s);">
      <div style="background:#fff;border-left:4px solid #2e7d32;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#2e7d32;min-width:2rem;">A</span>
        <span style="font-size:0.9rem;">Final score 80–100, with no active no-plan cap.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #558b2f;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#558b2f;min-width:2rem;">B</span>
        <span style="font-size:0.9rem;">Final score 65–79, or a score of 80+ capped at B because CMS records a deficiency with no plan of correction.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #f9a825;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#f9a825;min-width:2rem;">C</span>
        <span style="font-size:0.9rem;">Final score 50–64 after applicable penalties.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #ef6c00;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#ef6c00;min-width:2rem;">D</span>
        <span style="font-size:0.9rem;">Final score 35–49 after applicable penalties.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #c62828;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#c62828;min-width:2rem;">F</span>
        <span style="font-size:0.9rem;">Final score 0–34 after applicable penalties.</span>
      </div>
    </div>

    <h2>Where the data comes from</h2>
    <p>All underlying evidence comes from public <a href="https://data.cms.gov/provider-data/topics/nursing-homes">CMS nursing-home datasets</a>. NursingHomeGrade does not alter the CMS source records; our A–F grade is a reproducible calculation over those records. See <a href="/data-sources">data sources</a> for the exact files and release dates currently in production.</p>

    <h2>Start searching</h2>
    <p>Ready to browse nursing home ratings for a specific facility? Search by ZIP code or browse our <a href="/states">state directory</a> to compare nursing home grades in your area.</p>
    <p style="margin-top:2rem;"><a href="/explore" class="btn">Search nursing home ratings →</a></p>
  `;

  return layout(
    "How Nursing Home Ratings Work — A–F Grades Explained | NursingHomeGrade",
    "Learn how NursingHomeGrade computes its A–F score from CMS staffing, inspection and quality data, including unresolved-finding and actual-harm penalties.",
    body,
    { canonicalPath: "/how-we-grade" },
  );
}
