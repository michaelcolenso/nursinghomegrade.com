import { layout } from "./layout";

interface FaqEntry {
  question: string;
  answerHtml: string;
  answerText: string;
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "How are grades calculated?",
    answerHtml: `See our full <a href="/methodology">Methodology</a> page. In short: a base score
      adjusted by penalties for uncorrected deficiencies, actual-harm findings, and understaffing
      relative to the (repealed but still tracked) federal RN benchmark.`,
    answerText:
      "See our full Methodology page. In short: a base score adjusted by penalties for uncorrected deficiencies, actual-harm findings, and understaffing relative to the (repealed but still tracked) federal RN benchmark.",
  },
  {
    question: "Do you take money from nursing homes?",
    answerHtml: `No. We don't accept payment for placement, ranking, or removal. See <a href="/about">About</a>.`,
    answerText: "No. We don't accept payment for placement, ranking, or removal. See About.",
  },
  {
    question: "Why do you still grade against a repealed staffing rule?",
    answerHtml: `See <a href="/reports/staffing-standard-repeal">our explanation</a>.`,
    answerText: "See our explanation of the repealed staffing standard.",
  },
  {
    question: "How often is data updated?",
    answerHtml: `CMS publishes Nursing Home Compare data monthly, and we re-ingest and recompute all
      grades on each monthly release. See the <a href="/methodology#cadence">update cadence
      section</a> of our methodology.`,
    answerText:
      "CMS publishes Nursing Home Compare data monthly, and we re-ingest and recompute all grades on each monthly release.",
  },
  {
    question: "I found an error on a facility page. How do I report it?",
    answerHtml: `Use <a href="/contact">Contact and Corrections</a>.`,
    answerText: "Use the Contact and Corrections page.",
  },
  {
    question: "How do I file a complaint about a nursing home?",
    answerHtml: `Contact your state's Long-Term Care Ombudsman program, which investigates complaints
      on behalf of residents independent of the facility.`,
    answerText:
      "Contact your state's Long-Term Care Ombudsman program, which investigates complaints on behalf of residents independent of the facility.",
  },
];

export function faqPage(): string {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ENTRIES.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: entry.answerText,
        },
      })),
    },
  ];

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">FAQ</span>
    </nav>

    <h1>Frequently Asked Questions</h1>

    <div style="max-width:800px;">
      ${FAQ_ENTRIES.map(
        (entry) => `
        <h2>${entry.question}</h2>
        <p>${entry.answerHtml}</p>
      `,
      ).join("")}
    </div>

    <p style="margin-top:2rem;"><a href="/">← Back to home</a></p>
  `;

  return layout(
    "Frequently Asked Questions — NursingHomeGrade",
    "Answers to common questions about how NursingHomeGrade calculates grades, our independence from nursing facilities, data update cadence, and how to report an error or file a complaint.",
    body,
    { canonicalPath: "/faq", jsonLd },
  );
}
