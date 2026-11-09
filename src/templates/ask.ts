import { layout, escHtml } from "./layout";
import { breadcrumb } from "./components";

const DISCLAIMER =
  "Answers are generated from our published content and may be incomplete or wrong. This is not medical, legal, or placement advice — verify anything important on the linked pages, and see our full grades before choosing a facility.";

export function askFormPage(): string {
  const body = `
    ${breadcrumb([{ label: "Home", href: "/" }, { label: "Ask" }])}

    <div class="results-header">
      <h1>Ask about nursing home care</h1>
      <p class="muted-lg">
        Ask a question in plain English — about how grades are calculated, what a term means, or how
        to research a facility — and we'll answer from our own published pages.
        Looking for a specific facility? <a href="/search">Search by ZIP code</a> instead.
      </p>
      <form action="/ask" method="GET" class="search-bar search-bar--medium">
        <label for="ask-q" class="visually-hidden">Your question</label>
        <input type="text" id="ask-q" name="q" placeholder="e.g. What does scope and severity mean?" autocomplete="off" required>
        <button type="submit" class="btn" data-loading-text="Asking…">Ask</button>
      </form>
      <p class="disclaimer">${DISCLAIMER}</p>
    </div>
  `;
  return layout(
    "Ask About Nursing Home Care — NursingHomeGrade",
    "Ask a plain-English question about nursing home grades, CMS data, and how to research a facility.",
    body,
    { canonicalPath: "/ask" },
  );
}

interface AskChunk {
  text?: string;
  item?: { key?: string; metadata?: Record<string, unknown> };
}

// Crawled <title> text arrives already HTML-entity-encoded (it's extracted
// from raw page source); decode before escHtml() so output doesn't double-encode.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'");
}

export function askResultsPage(question: string, answer: string, chunks: AskChunk[]): string {
  const seenUrls = new Set<string>();
  const sources = chunks
    .map((c) => {
      const url = c.item?.key;
      if (!url || seenUrls.has(url)) return null;
      const rawTitle = typeof c.item?.metadata?.["title"] === "string" ? (c.item.metadata["title"] as string) : url;
      const title = decodeHtmlEntities(rawTitle);
      seenUrls.add(url);
      return `<li><a href="${escHtml(url)}">${escHtml(title)}</a></li>`;
    })
    .filter((s): s is string => s !== null);

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/ask">Ask</a>
    </nav>

    <div class="results-header">
      <h1>${escHtml(question)}</h1>
      ${
        answer
          ? `<div class="ask-answer">${escHtml(answer)}</div>`
          : `<p class="lede">We couldn't find an answer to that in our published content. Try rephrasing, or
             <a href="/contact">contact us</a> if you think we should cover it.</p>`
      }
      ${sources.length > 0 ? `<h2 class="h2-eyebrow">Sources</h2><ul>${sources.join("")}</ul>` : ""}
      <p class="disclaimer">${DISCLAIMER}</p>

      <form action="/ask" method="GET" class="search-bar search-bar--medium">
        <input type="text" name="q" placeholder="Ask another question" autocomplete="off" required>
        <button type="submit" class="btn" data-loading-text="Asking…">Ask</button>
      </form>
    </div>
    <p class="back-link"><a class="link-arrow" href="/">← Back to home</a></p>
  `;

  return layout(
    `${question} — NursingHomeGrade`,
    `Answer to "${question}" from NursingHomeGrade's published content.`,
    body,
    { noindex: true },
  );
}
