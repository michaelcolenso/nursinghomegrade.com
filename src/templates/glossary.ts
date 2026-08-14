import { layout } from "./layout";

interface GlossaryEntry {
  term: string;
  definition: string;
}

const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    term: "CCN (CMS Certification Number)",
    definition: "The unique ID CMS assigns to each Medicare/Medicaid-certified nursing facility.",
  },
  {
    term: "Deficiency",
    definition: "A finding from a state health inspection that a facility didn't meet a federal requirement.",
  },
  {
    term: "Scope and severity code",
    definition:
      "CMS's A–L scale rating how widespread and serious a deficiency is; G and above indicate actual harm to residents.",
  },
  {
    term: "RN hours per resident day",
    definition:
      "Average registered-nurse staffing time per resident per day — one of the strongest predictors of care quality.",
  },
  {
    term: "Uncorrected deficiency",
    definition: "A deficiency the facility has not yet fixed, per its most recent survey.",
  },
  {
    term: "CMS 5-star rating",
    definition:
      "Medicare's own star system (separate from our A–F grade), covering health inspections, staffing, and quality measures.",
  },
];

export function glossaryPage(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      name: "NursingHomeGrade Glossary",
      url: "https://nursinghomegrade.com/glossary",
      hasDefinedTerm: GLOSSARY_ENTRIES.map((entry) => ({
        "@type": "DefinedTerm",
        name: entry.term,
        description: entry.definition,
      })),
    },
  ];

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Glossary</span>
    </nav>

    <h1>Glossary</h1>

    <dl style="max-width:800px;">
      ${GLOSSARY_ENTRIES.map(
        (entry) => `
        <dt style="font-weight:700;margin-top:var(--space-m);">${entry.term}</dt>
        <dd style="margin-left:0;color:var(--ink);">${entry.definition}</dd>
      `,
      ).join("")}
    </dl>

    <p style="margin-top:2rem;"><a href="/">← Back to home</a></p>
  `;

  return layout(
    "Glossary — NursingHomeGrade",
    "Definitions of the CMS and nursing home quality terms used across NursingHomeGrade: CCN, deficiency, scope and severity, RN hours per resident day, and more.",
    body,
    { canonicalPath: "/glossary", jsonLd },
  );
}
