import { layout } from "./layout";

const LAST_UPDATED = "August 14, 2026";

export function privacyPage(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy Policy — NursingHomeGrade",
      url: "https://nursinghomegrade.com/privacy",
    },
  ];

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Privacy Policy</span>
    </nav>

    <h1>Privacy Policy</h1>
    <p style="color:var(--muted);margin-bottom:var(--space-l);">Last updated: ${LAST_UPDATED}</p>

    <p class="lede" style="max-width:800px;">
      NursingHomeGrade ("we," "us") publishes nursing home quality grades computed from public CMS
      data. This policy covers the personal information we collect directly from you.
    </p>

    <h2 id="what-we-collect">What we collect</h2>
    <ul>
      <li><strong>Email address</strong>, if you subscribe to grade-change alerts or our newsletter.</li>
      <li><strong>Approximate location</strong>, only if you tap "Use my location" — this request goes
        to your browser, not to us, unless you allow it.</li>
      <li><strong>Standard web log data</strong> (IP address, user agent, pages visited) via
        Cloudflare, our hosting provider.</li>
    </ul>

    <h2 id="what-we-dont-collect">What we don't collect</h2>
    <p>
      We do not require an account to browse grades. We do not sell personal information. We do not
      share your email with nursing facilities, referral companies, or advertisers.
    </p>

    <h2 id="facility-data">Facility data</h2>
    <p>
      The nursing home data on this site (names, addresses, staffing, inspections) comes entirely from
      <a href="https://data.cms.gov/provider-data/topics/nursing-homes">CMS Nursing Home Compare</a>, a
      public federal dataset — it is not personal information about you.
    </p>

    <h2 id="your-choices">Your choices</h2>
    <p>
      You can unsubscribe from any email via the link in that email. To request deletion of your
      subscription record, contact <a href="mailto:info@nursinghomegrade.com">info@nursinghomegrade.com</a>.
    </p>

    <h2 id="california">California residents</h2>
    <p>
      Under the CCPA/CPRA, you have the right to know what personal information we hold about you and
      to request its deletion. Contact us at the address above to exercise these rights.
    </p>

    <h2 id="changes">Changes</h2>
    <p>We'll update the date at the top of this page if this policy changes.</p>

    <p style="margin-top:2rem;"><a href="/">← Back to home</a></p>
  `;

  return layout(
    "Privacy Policy — NursingHomeGrade",
    "How NursingHomeGrade collects, uses, and protects your personal information.",
    body,
    { canonicalPath: "/privacy", jsonLd },
  );
}
