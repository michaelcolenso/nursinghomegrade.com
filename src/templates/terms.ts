import { layout } from "./layout";

const LAST_UPDATED = "August 14, 2026";

export function termsPage(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Terms of Use — NursingHomeGrade",
      url: "https://nursinghomegrade.com/terms",
    },
  ];

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Terms of Use</span>
    </nav>

    <h1>Terms of Use</h1>
    <p style="color:var(--muted);margin-bottom:var(--space-l);">Last updated: ${LAST_UPDATED}</p>

    <h2 id="what-this-site-is">What this site is</h2>
    <p class="lede" style="max-width:800px;">
      NursingHomeGrade publishes independent A–F quality grades for U.S. nursing homes, computed from
      public CMS inspection, staffing, and quality-measure data using the methodology described on our
      <a href="/methodology">Methodology page</a>.
    </p>

    <h2 id="not-advice">Not medical, legal, or placement advice</h2>
    <p>
      The information on this site is for general research purposes only. It is not a substitute for
      professional medical, legal, or long-term-care placement advice, and it should not be the sole
      basis for choosing a care facility. Always verify current information directly with a facility
      and, where possible, visit in person before making a decision.
    </p>

    <h2 id="data-accuracy">Data accuracy</h2>
    <p>
      Grades are computed from CMS data as of the date shown on each facility page. CMS updates its
      data monthly; our grades may lag a facility's most current status. We do not independently verify
      CMS's underlying data.
    </p>

    <h2 id="no-liability">No liability</h2>
    <p>
      We provide this site "as is." We are not liable for decisions made based on information here. If
      you believe a grade or a specific data point is wrong, see <a href="/contact">Report an
      Error</a>.
    </p>

    <h2 id="independence">Independence</h2>
    <p>
      We do not accept payment from nursing facilities, operators, or referral services in exchange for
      placement, ranking, or removal from this site.
    </p>

    <p style="margin-top:2rem;"><a href="/">← Back to home</a></p>
  `;

  return layout(
    "Terms of Use — NursingHomeGrade",
    "Terms of use for NursingHomeGrade, including what this site is, data accuracy, and liability.",
    body,
    { canonicalPath: "/terms", jsonLd },
  );
}
