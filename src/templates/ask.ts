import { layout, escHtml } from "./layout";

const DISCLAIMER =
  "Answers are generated from our published content and may be incomplete or wrong. This is not medical, legal, or placement advice — verify anything important on the linked pages, and see our full grades before choosing a facility.";

export function askFormPage(): string {
  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Ask</span>
    </nav>

    <div class="results-header">
      <h1 style="margin-bottom:0.5rem;">Ask about nursing home care</h1>
      <p style="color:var(--muted);margin-bottom:1.5rem;max-width:640px;">
        Ask a question in plain English — about how grades are calculated, what a term means, or how
        to research a facility — and we'll answer from our own published pages.
        Looking for a specific facility? <a href="/search">Search by ZIP code</a> instead.
      </p>
      <form action="/ask" method="GET" class="search-bar" style="max-width:560px;">
        <label for="ask-q" class="visually-hidden">Your question</label>
        <input type="text" id="ask-q" name="q" placeholder="e.g. What does scope and severity mean?" autocomplete="off" required>
        <button type="submit" class="btn" data-loading-text="Asking…">Ask</button>
      </form>
      <p style="color:var(--muted);font-size:0.8rem;margin-top:var(--space-s);max-width:560px;">${DISCLAIMER}</p>
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

export function askResultsPage(question: string, answer: string, chunks: AskChunk[]): string {
  const sources = chunks
    .map((c) => {
      const title = typeof c.item?.metadata?.["title"] === "string" ? (c.item.metadata["title"] as string) : c.item?.key;
      const url = typeof c.item?.metadata?.["url"] === "string" ? (c.item.metadata["url"] as string) : undefined;
      if (!title) return null;
      return url
        ? `<li><a href="${escHtml(url)}">${escHtml(title)}</a></li>`
        : `<li>${escHtml(title)}</li>`;
    })
    .filter((s): s is string => s !== null);

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/ask">Ask</a>
    </nav>

    <div class="results-header">
      <h1 style="margin-bottom:1rem;">${escHtml(question)}</h1>
      ${
        answer
          ? `<div class="lede" style="font-size:1.05rem;line-height:1.6;max-width:720px;white-space:pre-wrap;">${escHtml(answer)}</div>`
          : `<p class="lede">We couldn't find an answer to that in our published content. Try rephrasing, or
             <a href="/contact">contact us</a> if you think we should cover it.</p>`
      }
      ${sources.length > 0 ? `<h2 style="margin-top:2rem;font-size:1rem;">Sources</h2><ul>${sources.join("")}</ul>` : ""}
      <p style="color:var(--muted);font-size:0.8rem;margin-top:2rem;max-width:720px;">${DISCLAIMER}</p>

      <form action="/ask" method="GET" class="search-bar" style="max-width:560px;margin-top:2rem;">
        <input type="text" name="q" placeholder="Ask another question" autocomplete="off" required>
        <button type="submit" class="btn" data-loading-text="Asking…">Ask</button>
      </form>
    </div>
    <p style="margin-top:1.5rem;"><a href="/">← Back to home</a></p>
  `;

  return layout(
    `${question} — NursingHomeGrade`,
    `Answer to "${question}" from NursingHomeGrade's published content.`,
    body,
    { noindex: true },
  );
}
