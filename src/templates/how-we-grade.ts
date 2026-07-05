import { layout } from "../templates/layout";

export function howWeGradePage(): string {
  const body = `
    <h1 class="display">How Nursing Home Ratings Work</h1>

    <div class="lede">
      Every nursing home in the U.S. that accepts Medicare or Medicaid is surveyed by federal inspectors.
      NursingHomeGrade takes that public CMS data and converts it into an A–F grade so you can compare
      facilities at a glance.
    </div>

    <h2>How the A–F grade is calculated</h2>
    <p>The NursingHomeGrade Score (0–100) maps to letter grades: A (80–100), B (65–79), C (50–64), D (35–49), and F (0–34). The score is a weighted composite of four CMS data points:</p>
    <div class="results-list" style="margin: var(--space-l) 0;">
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Staffing Compliance (35%)</span>
        <span class="result-stat-value">RN hours per resident per day vs. the federal minimum of 0.55. Facilities below this threshold are flagged.</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Inspection Clean Rate (30%)</span>
        <span class="result-stat-value">Number of health deficiencies cited during the most recent CMS inspection cycle.</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Quality Measures (20%)</span>
        <span class="result-stat-value">CMS quality star rating covering clinical outcomes, vaccination rates, and hospital readmissions.</span>
      </div>
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Staffing Consistency (15%)</span>
        <span class="result-stat-value">CMS staffing star rating — how consistently a facility meets staffing benchmarks.</span>
      </div>
    </div>

    <h2>What the letter grades mean</h2>
    <div class="results-list" style="margin: var(--space-l) 0; display: grid; gap: var(--space-s);">
      <div style="background:#fff;border-left:4px solid #2e7d32;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#2e7d32;min-width:2rem;">A</span>
        <span style="font-size:0.9rem;">Score 80–100. Excellent staffing, clean inspection records, strong quality measures.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #558b2f;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#558b2f;min-width:2rem;">B</span>
        <span style="font-size:0.9rem;">Score 65–79. Above average. Meets or exceeds most standards.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #f9a825;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#f9a825;min-width:2rem;">C</span>
        <span style="font-size:0.9rem;">Score 50–64. Average. Some deficiencies on record but no pattern of severe harm.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #ef6c00;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#ef6c00;min-width:2rem;">D</span>
        <span style="font-size:0.9rem;">Score 35–49. Below average. Multiple deficiencies or staffing below federal minimum.</span>
      </div>
      <div style="background:#fff;border-left:4px solid #c62828;padding:var(--space-s) var(--space-m);display:flex;align-items:center;gap:var(--space-s);">
        <span style="font-weight:800;font-size:1.3rem;color:#c62828;min-width:2rem;">F</span>
        <span style="font-size:0.9rem;">Score 0–34. Well below acceptable standards. Serious inspection or staffing failures.</span>
      </div>
    </div>

    <h2>Where the data comes from</h2>
    <p>All data is sourced from <a href="https://data.cms.gov/provider-data/topics/nursing-homes">CMS Nursing Home Compare</a>, the official federal dataset covering 15,000+ Medicare- and Medicaid-certified nursing facilities. Updated monthly. No editorial adjustments — what CMS reports is what you see.</p>

    <h2>Start searching</h2>
    <p>Ready to find ratings for a specific facility? Search by ZIP code or browse our <a href="/states">state directory</a> to compare nursing home grades in your area.</p>
    <p style="margin-top:2rem;"><a href="/explore" class="btn">Browse the nursing home database →</a></p>
  `;

  return layout(
    "How Nursing Home Ratings Work — A–F Grades Explained | NursingHomeGrade",
    "Learn how nursing home ratings are calculated. Our A–F grading system combines CMS staffing, inspection, and quality data into one clear score. No commissions, no conflicts.",
    body,
    { canonicalPath: "/how-we-grade" },
  );
}
