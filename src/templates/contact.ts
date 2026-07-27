import { layout } from "./layout";

// Corrections policy and dispute route. This exists specifically because the
// Phase 2 grade change lowers roughly a quarter of all letter grades, and a
// facility that believes its grade is wrong needs somewhere to go that is not a
// support address that discards the message.

export function contactPage(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact and Corrections — NursingHomeGrade",
      url: "https://nursinghomegrade.com/contact",
      mainEntity: {
        "@type": "Organization",
        name: "NursingHomeGrade",
        url: "https://nursinghomegrade.com/",
        email: "corrections@nursinghomegrade.com",
      },
    },
  ];

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Contact &amp; Corrections</span>
    </nav>

    <h1>Contact and corrections</h1>
    <p class="lede" style="max-width:800px;">
      We publish numbers about facilities where people live. Getting one wrong has consequences, so
      we would rather hear about an error than not.
    </p>

    <h2 id="corrections">Corrections policy</h2>
    <p>
      If we have published something inaccurate, we will correct it. When a correction changes a
      facility's grade or a factual claim on its page, we note what changed and when on the
      <a href="/methodology#changelog">methodology changelog</a> rather than editing silently.
    </p>
    <p>
      There are two different problems and they have different fixes, so it helps to know which one
      you are reporting:
    </p>
    <ul>
      <li>
        <strong>We computed something incorrectly.</strong> Our grade does not match what the CMS data
        we cite would produce — a miscount, a mislabel, a page showing figures that contradict each
        other. This is ours to fix, and we will.
      </li>
      <li>
        <strong>The underlying CMS record is wrong.</strong> Our grade correctly reflects what CMS
        published, but the CMS record itself is inaccurate or out of date. We cannot overwrite federal
        data, and we will not hand-adjust a single facility's grade — doing so for one facility and
        not another is exactly the discretion this site exists to avoid. The fix is with CMS or your
        state survey agency, and their correction flows to us on the next ingest. Tell us anyway: we
        will note the dispute on the facility page while it is pending.
      </li>
    </ul>

    <h2 id="disputes">If you operate a facility and believe its grade is wrong</h2>
    <p>
      Write to <a href="mailto:corrections@nursinghomegrade.com">corrections@nursinghomegrade.com</a>
      with the facility's CMS provider number (the six-digit CCN), the specific figure you are
      disputing, and what you believe the correct value is. Attaching the CMS record or survey
      document you are relying on will make this much faster.
    </p>
    <p>
      Every grade is produced by the published formula from public data. We do not accept payment to
      change, remove, or suppress a grade, and we do not remove facility pages on request. If we made
      an arithmetic or data-handling error, we will fix it and say so.
    </p>

    <h2 id="general">Everything else</h2>
    <p>
      General questions, data requests, press:
      <a href="mailto:info@nursinghomegrade.com">info@nursinghomegrade.com</a>.
    </p>
    <p>
      For questions about what a grade means or how it is built, the
      <a href="/methodology">methodology page</a> documents the full formula, including the penalty
      terms and grade band cutoffs.
    </p>

    <div class="cta-box" style="margin-top:var(--space-2xl);">
      <h3>Before you write</h3>
      <p>These pages answer most questions about how a grade was produced.</p>
      <a class="btn" href="/methodology">Methodology →</a>
      <a href="/data-sources" class="btn-secondary">Data sources →</a>
    </div>
  `;

  return layout(
    "Contact and Corrections — NursingHomeGrade",
    "How to report an error, dispute a facility grade, or reach NursingHomeGrade. Our corrections policy and the difference between a computation error and an inaccurate CMS record.",
    body,
    { canonicalPath: "/contact", jsonLd },
  );
}
