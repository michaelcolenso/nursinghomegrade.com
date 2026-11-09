import { layout, escHtml } from "./layout";

export function subscribePage(facilityName: string, returnPath?: string): string {
  const safeReturnPath = normalizeReturnPath(returnPath);
  const body = `
    <div class="centered">
      <div class="success-mark" aria-hidden="true">✓</div>
      <h1 class="display">You're subscribed</h1>
      <p class="lede">
        We'll email you when ${escHtml(facilityName)}'s staffing score or inspection grade changes.
      </p>
      <p class="muted-lg">
        This feature is new — if you don't receive an email within a month, check back here or contact us.
      </p>
      ${safeReturnPath ? `<p><a href="${escHtml(safeReturnPath)}" class="btn">← Return to ${escHtml(facilityName)}</a></p>` : ""}
      <p><a href="/" class="btn-secondary">Search another facility</a></p>
    </div>
  `;
  return layout(
    `Subscribed — ${facilityName} Alerts`,
    `You'll receive email alerts when ${facilityName}'s nursing home grade changes.`,
    body,
    { noindex: true },
  );
}

function normalizeReturnPath(returnPath?: string): string | undefined {
  if (!returnPath) return undefined;

  try {
    const parsed = new URL(returnPath, "https://nursinghomegrade.com");
    if (parsed.origin !== "https://nursinghomegrade.com") return undefined;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return undefined;
  }
}

export function notFoundPage(path: string): string {
  const body = `
    <h1 class="display">Page not found</h1>
    <p class="lede">
      We couldn't find <code class="code-chip">${escHtml(path)}</code>.
    </p>
    <p class="muted-lg">
      Try searching for a ZIP code or browsing from the home page.
    </p>
    <form action="/search" method="GET" class="search-bar">
      <input type="text" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code" inputmode="numeric">
      <button type="submit" data-loading-text="Searching…">Search</button>
    </form>
    <p><a href="/">← Back to home</a></p>
  `;
  return layout(
    "Page Not Found — NursingHomeGrade",
    "The page you requested could not be found.",
    body,
  );
}

export function errorPage(title: string, message: string, suggestion?: string): string {
  const body = `
    <h1 class="display">${escHtml(title)}</h1>
    <p class="lede">${escHtml(message)}</p>
    ${suggestion ? `<p class="muted-lg">${escHtml(suggestion)}</p>` : ""}
    <form action="/search" method="GET" class="search-bar">
      <input type="text" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code" inputmode="numeric">
      <button type="submit" data-loading-text="Searching…">Search</button>
    </form>
    <p><a href="/">← Back to home</a></p>
  `;
  return layout(
    `${escHtml(title)} — NursingHomeGrade`,
    escHtml(message),
    body,
  );
}
