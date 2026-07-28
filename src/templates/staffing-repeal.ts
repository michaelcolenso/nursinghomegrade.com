import { layout, escHtml } from "./layout";
import { getStateInfo } from "../states";
import type { BenchmarkShortfall } from "../db";
import { RN_BENCHMARK, REPEAL_EFFECTIVE_DATE, REPEAL_REPORT_PATH } from "../staffing-standard";

// Editorial page explaining the regulatory status of the 2024 CMS minimum
// staffing standard. The only numbers here that are not regulatory citations
// come from `getBenchmarkShortfall` (CMS Provider Information file, column
// `reported_rn_staffing_hours_per_resident_per_day`) and are computed per
// request. Nothing on this page is hardcoded from a data snapshot.

function renderStateTable(shortfall: BenchmarkShortfall): string {
  const rows = shortfall.byState
    .filter((row) => row.reported > 0)
    .map((row) => {
      const info = getStateInfo(row.state);
      const name = info?.name ?? row.state;
      const href = info?.slug ? `/state/${info.slug}` : null;
      const pct = ((row.below / row.reported) * 100).toFixed(1);
      return `
        <tr>
          <td>${href ? `<a href="${href}">${escHtml(name)}</a>` : escHtml(name)}</td>
          <td style="text-align:right;">${row.below.toLocaleString()}</td>
          <td style="text-align:right;">${row.reported.toLocaleString()}</td>
          <td style="text-align:right;">${pct}%</td>
        </tr>`;
    })
    .join("");

  if (!rows) return "";

  return `
    <div class="table-container">
      <table class="quality-table">
        <thead>
          <tr>
            <th style="text-align:left;">State</th>
            <th style="text-align:right;">Below ${RN_BENCHMARK} hrs</th>
            <th style="text-align:right;">Facilities reporting</th>
            <th style="text-align:right;">Share</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function staffingStandardRepealPage(shortfall: BenchmarkShortfall): string {
  const { belowNational, reportedNational } = shortfall;
  const nationalPct = reportedNational > 0 ? ((belowNational / reportedNational) * 100).toFixed(1) : null;

  const liveFigures =
    reportedNational > 0
      ? `
    <h2 id="how-many">How many facilities fall below 0.55 today</h2>
    <p>
      These figures are computed from the current CMS data in our database each time this page is
      requested. Facilities that do not report RN staffing hours are excluded from both the count and
      the denominator.
    </p>
    <p class="lede" style="margin-bottom:var(--space-l);">
      <strong>${belowNational.toLocaleString()}</strong> of
      <strong>${reportedNational.toLocaleString()}</strong> reporting nursing facilities nationally
      ${nationalPct ? `(${nationalPct}%)` : ""} staff below ${RN_BENCHMARK} RN hours per resident per
      day — the level the repealed 2024 rule would have required.
    </p>
    ${renderStateTable(shortfall)}`
      : "";

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">The Repealed Staffing Standard</span>
    </nav>

    <h1>The federal nursing home staffing standard was repealed</h1>

    <p class="lede" style="max-width:800px;">
      In 2024 the federal government set a minimum staffing level for nursing homes for the first
      time. Courts vacated it, Congress blocked it, and CMS repealed it effective
      ${REPEAL_EFFECTIVE_DATE}. NursingHomeGrade still grades facilities against it. This page
      explains what the rule required, how it died, what actually applies now, and why we kept the
      benchmark.
    </p>

    <h2 id="what-it-required">What the 2024 rule required</h2>
    <p>
      The CMS final rule "Minimum Staffing Standards for Long-Term Care Facilities and Medicaid
      Institutional Payment Transparency Reporting," published May 2024, would have required every
      Medicare- or Medicaid-certified nursing facility to provide, at minimum:
    </p>
    <ul>
      <li><strong>0.55 registered nurse (RN) hours</strong> per resident per day.</li>
      <li><strong>2.45 nurse aide hours</strong> per resident per day.</li>
      <li><strong>3.48 total nurse staffing hours</strong> per resident per day, inclusive of the two figures above.</li>
      <li>An <strong>RN on site 24 hours a day, 7 days a week</strong>, replacing the older 8-hour requirement.</li>
    </ul>
    <p>
      The requirements were to phase in over three years for urban facilities and five years for rural
      facilities, with the total-hours and 24/7 RN provisions arriving before the individual RN and
      aide thresholds. Facilities could apply for hardship exemptions tied to local workforce
      availability. The rule also imposed a new, enforceable facility assessment process and required
      daily posting of actual staffing levels.
    </p>

    <h2 id="timeline">How it died</h2>
    <ul>
      <li>
        <strong>April 2025 — Northern District of Texas.</strong> In litigation brought by the nursing
        home industry, the court vacated the rule in full, holding that CMS had exceeded its statutory
        authority in setting numeric staffing minimums Congress had not authorized.
      </li>
      <li>
        <strong>June 2025 — Northern District of Iowa.</strong> A second court vacated the 24/7 RN
        requirement and the minimum hours-per-resident-day provisions on similar grounds.
      </li>
      <li>
        <strong>July 4, 2025 — Public Law 119-21.</strong> Congress imposed a moratorium barring CMS
        from implementing or enforcing the staffing minimums through <strong>September 30, 2034</strong>.
      </li>
      <li>
        <strong>December 3, 2025 — CMS interim final rule.</strong> CMS published "Medicare and
        Medicaid Programs; Repeal of Minimum Staffing Standards for Long-Term Care Facilities" in the
        Federal Register, formally removing the hours-per-resident-day requirements and the 24/7 RN
        requirement from the regulations.
      </li>
      <li>
        <strong>${REPEAL_EFFECTIVE_DATE} — repeal effective.</strong> The pre-2024 staffing rules are
        the operative federal requirement.
      </li>
    </ul>

    <h2 id="current-requirement">What federal law actually requires now</h2>
    <p>
      The reinstated standard is the one that governed nursing homes before 2024: a facility must have
      a registered nurse on duty <strong>at least 8 consecutive hours a day, 7 days a week</strong>,
      and must employ a <strong>full-time director of nursing</strong>. Both are subject to waiver
      where a facility can demonstrate it is unable to recruit staff and the state agency approves.
    </p>
    <p>
      This is materially weaker than what was repealed, and not merely by degree. The 2024 rule scaled
      with the number of residents; the current rule does not scale at all. A 120-bed facility and a
      30-bed facility satisfy it identically — one RN, one third of the day. For the 120-bed facility
      that works out to roughly 0.07 RN hours per resident per day if the RN works no other shift,
      against the 0.55 the repealed rule would have required. For the remaining 16 hours of the day,
      federal law requires no registered nurse in the building at all. The current requirement is a
      staffing floor for the facility, not a care standard for the resident.
    </p>

    <h2 id="still-applies">What still applies</h2>
    <p>
      The repeal was not total. These obligations survive and remain enforceable:
    </p>
    <ul>
      <li>
        <strong>Sufficient staffing (42 CFR 483.35).</strong> Facilities must have sufficient nursing
        staff with the appropriate competencies to assure resident safety and attain each resident's
        highest practicable well-being. This is a qualitative standard with no number attached, which
        is precisely why the 2024 rule was written.
      </li>
      <li>
        <strong>Facility assessment requirements.</strong> The enhanced assessment process introduced
        by the 2024 rule — requiring facilities to evaluate resident acuity and determine the staffing
        needed to meet it — remains in effect.
      </li>
      <li>
        <strong>Daily staffing posting.</strong> Facilities must continue to post actual daily nurse
        staffing levels where residents and visitors can see them.
      </li>
      <li>
        <strong>Payroll-based journal reporting.</strong> Facilities still submit verified daily
        staffing data to CMS, which is what makes the figures on this site possible.
      </li>
    </ul>

    <h2 id="why-we-keep-it">Why we still grade against 0.55</h2>
    <p>
      CMS did not arrive at 0.55 RN hours arbitrarily. It came out of a commissioned staffing study
      and decades of research linking registered nurse hours to pressure ulcers, avoidable
      hospitalizations, infection rates, and mortality. The rule was struck down on questions of
      administrative authority and blocked on questions of cost and workforce supply. Nothing in the
      litigation, the statute, or the repeal notice found that residents need less nursing care than
      the evidence indicated. A staffing level does not stop being the level residents need because
      the agency that identified it lost the authority to require it. We report the current legal
      requirement honestly wherever we cite it, and we grade against the benchmark.
    </p>

    <p style="font-size:0.9rem;color:var(--muted);max-width:70ch;">
      Sources: Federal Register, "Medicare and Medicaid Programs; Repeal of Minimum Staffing Standards
      for Long-Term Care Facilities" (published December 3, 2025);
      <em>American Health Care Association v. Becerra</em>, U.S. District Court for the Northern
      District of Texas (decided April 2025); the multistate challenge decided by the U.S. District
      Court for the Northern District of Iowa (June 2025);
      Public Law 119-21 (2025); 42 CFR 483.35.
    </p>

    ${liveFigures}

    <div class="cta-box" style="margin-top:var(--space-2xl);">
      <h3>Related</h3>
      <p>See which facilities staff below the benchmark, and how we build the grades.</p>
      <a class="btn" href="/reports/staffing-failures">Facilities below the benchmark →</a>
      <a href="/how-we-grade" class="btn-secondary">How we grade →</a>
    </div>
  `;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "The federal nursing home staffing standard was repealed",
      description:
        "What the 2024 CMS minimum staffing rule required, how it was vacated and repealed, what federal law requires now, and why NursingHomeGrade still grades against the repealed benchmark.",
      // The date this page shipped. Not invented: it is the commit date of the
      // Phase 1 change that introduced it.
      datePublished: "2026-07-27",
      dateModified: "2026-07-27",
      author: { "@type": "Organization", name: "NursingHomeGrade", url: "https://nursinghomegrade.com/" },
      publisher: { "@type": "Organization", name: "NursingHomeGrade", url: "https://nursinghomegrade.com/" },
      mainEntityOfPage: { "@type": "WebPage", "@id": `https://nursinghomegrade.com${REPEAL_REPORT_PATH}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://nursinghomegrade.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "The Repealed Staffing Standard",
          item: `https://nursinghomegrade.com${REPEAL_REPORT_PATH}`,
        },
      ],
    },
  ];

  return layout(
    `The Repealed Federal Nursing Home Staffing Standard — NursingHomeGrade`,
    `The 0.55 RN hour federal staffing minimum was vacated by two courts, blocked by Congress through 2034, and repealed by CMS effective ${REPEAL_EFFECTIVE_DATE}. What applies now, and why NursingHomeGrade still grades against it.`,
    body,
    { canonicalPath: REPEAL_REPORT_PATH, jsonLd },
  );
}
