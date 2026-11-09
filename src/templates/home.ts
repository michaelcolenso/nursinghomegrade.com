import { layout, escHtml } from "./layout";
import { repealDisclosureHtml } from "../staffing-standard";
import type { DataRelease } from "./data-sources";
import { dataFreshness } from "./data-freshness";

export function homePage(pctFailing: number, releases: DataRelease[] = []): string {
  const body = `
    <h1 class="display">Find honest nursing home grades</h1>
    <p class="lede">
      <strong>${pctFailing}% of U.S. nursing homes that report RN staffing</strong> staff below the
      level the 2024 federal rule would have required. Independent grades based on CMS data — no
      facility payments, no conflicts.
    </p>
    ${repealDisclosureHtml()}
    ${dataFreshness(releases)}

    <form action="/search" method="GET" class="search-bar">
      <label for="zip-search" class="visually-hidden">ZIP code</label>
      <input type="text" id="zip-search" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code" inputmode="numeric">
      <button type="submit">Search</button>
      <button type="button" id="geo-btn" class="geo-btn">Use my location</button>
    </form>
    <p style="font-size:0.875rem;margin-top:var(--space-xs);"><a href="/ask">Or ask a question about nursing home care →</a></p>

    <blockquote class="pull-quote">
      <strong>Why this site exists</strong> A Place for Mom earns up to $3,500 per family they refer to a facility —
      paid by the facility. Their incentive is placement, not quality. We do not take payments from nursing facilities, and outside referral relationships never change our grades.
      <a href="/about" style="font-weight:800;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;display:inline-block;margin-top:var(--space-s);border:none;">Read more →</a>
    </blockquote>
  `;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "NursingHomeGrade",
      "url": "https://nursinghomegrade.com/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://nursinghomegrade.com/search?zip={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "NursingHomeGrade",
      "url": "https://nursinghomegrade.com/",
      "description": "Independent ratings for U.S. nursing homes based on federal CMS data."
    }
  ];

  return layout(
    "NursingHomeGrade — Independent Nursing Home Ratings",
    `${pctFailing}% of U.S. nursing homes reporting RN staffing fall short of the 2024 federal rule. Unbiased A–F grades from CMS data — no facility payments.`,
    body,
    { jsonLd, canonicalPath: "/" }
  );
}
