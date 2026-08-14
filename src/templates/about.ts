import { layout } from "./layout";

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does NursingHomeGrade calculate facility scores?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The NursingHomeGrade Score (0–100) is a weighted composite of four CMS data points: Staffing compliance (35%) based on RN hours vs the 2024 federal benchmark of 0.55 hrs/resident/day (repealed February 2026; retained as a quality benchmark), Inspection clean rate (30%) based on health inspection deficiencies and severity, Quality measures (20%) based on CMS quality star rating, and Staffing consistency (15%) based on CMS staffing star rating."
      }
    },
    {
      "@type": "Question",
      "name": "Does NursingHomeGrade take payments from nursing facilities?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. NursingHomeGrade never receives payments from nursing facilities. We display contextual advertising and earn small referral fees when users click through to comparison services, but these relationships never affect our grades."
      }
    },
    {
      "@type": "Question",
      "name": "Where does the nursing home data come from?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "All data comes from CMS Nursing Home Compare, a public dataset updated monthly by the Centers for Medicare & Medicaid Services. We apply no editorial adjustments to the underlying data."
      }
    },
    {
      "@type": "Question",
      "name": "How often is the nursing home data updated?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our data is updated monthly, aligned with the CMS Nursing Home Compare monthly release cycle."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a federal minimum staffing standard for nursing homes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Not a numeric one. The 2024 CMS rule setting 0.55 registered nurse (RN) hours per resident per day was vacated in court, blocked by Congress, and repealed by CMS effective February 2, 2026. The remaining fixed RN schedule is an RN on duty 8 consecutive hours a day, 7 days a week, plus a full-time director of nursing. Other duties survive the repeal, including the general sufficient-staffing requirement at 42 CFR 483.35, facility assessment requirements, daily staffing posting, and payroll-based staffing reporting. NursingHomeGrade still grades facilities against the repealed 0.55 hour benchmark and flags any facility below it."
      }
    }
  ]
};

export function aboutPage(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About NursingHomeGrade",
      "url": "https://nursinghomegrade.com/about",
      "mainEntity": {
        "@type": "Organization",
        "name": "NursingHomeGrade",
        "url": "https://nursinghomegrade.com/",
        "description": "Independent ratings for U.S. nursing homes based on federal CMS data.",
        // Real profiles, matching the links in the site footer.
        "sameAs": [
          "https://twitter.com/nursinghomegrade",
          "https://linkedin.com/company/nursinghomegrade",
        ],
        "email": "info@nursinghomegrade.com",
        // foundingDate is intentionally absent: the spec asks for it, but we do
        // not know it, and a guessed date published as structured data is a
        // fabricated fact about a real organization.
      },
    },
  ];

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

    <p style="background:#fff;border-left:4px solid var(--ink);padding:var(--space-m);margin:var(--space-l) 0;">
      <strong>This is not medical, legal, or placement advice.</strong> NursingHomeGrade publishes
      independent analysis of public CMS data to help you research nursing homes. It is not a
      substitute for professional advice, and no grade should be the sole basis for a care decision.
    </p>

    <h2>How we grade facilities</h2>
    <p>The NursingHomeGrade Score (0–100) is a weighted composite of four CMS data points:</p>
    <div class="results-list" style="margin: var(--space-l) 0;">
      <div class="result-stat" style="background:#fff;border-top:4px solid var(--ink);padding:var(--space-m);">
        <span class="result-stat-label">Staffing compliance (35%)</span>
        <span class="result-stat-value">RN hours vs the repealed 2024 benchmark of 0.55</span>
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


    <h2>The repealed federal staffing standard</h2>
    <p>
      The 0.55 RN hours per resident per day figure in our staffing component came from the CMS 2024
      minimum staffing rule. That rule was vacated by two federal district courts, blocked by Congress
      through 2034, and repealed by CMS effective February 2, 2026. It is not currently enforced.
      We still grade against it, and we say so everywhere we cite it.
      <a href="/reports/staffing-standard-repeal">Read the full explanation →</a>
    </p>

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
    <h2>Who runs this</h2>
    <p>
      NursingHomeGrade is written and maintained by The NursingHomeGrade Team. Questions or corrections:
      <a href="mailto:info@nursinghomegrade.com">info@nursinghomegrade.com</a>.
    </p>

    <p style="margin-top:2rem;"><a href="/">← Back to home</a></p>
  `;
  return layout(
    "About NursingHomeGrade — No Commissions, No Conflicts",
    "How NursingHomeGrade grades nursing homes and why we take no commissions from facilities.",
    body,
    { canonicalPath: "/about", jsonLd: [...jsonLd, FAQ_JSON_LD] },
  );
}
