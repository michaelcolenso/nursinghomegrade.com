import { layout, escHtml } from "./layout";

export function subscribePage(facilityName: string, returnPath?: string): string {
  const safeReturnPath = normalizeReturnPath(returnPath);
  const body = `
    <div style="text-align:center;padding:2rem 0;">
      <div style="width:64px;height:64px;border-radius:50%;background:#2d5a3d;color:#fff;font-size:2rem;line-height:64px;margin:0 auto 1.5rem;font-weight:700;">✓</div>
      <h1 class="display" style="margin-bottom:1rem;">You're subscribed</h1>
      <p class="lede" style="margin:0 auto 1.5rem;max-width:520px;">
        We'll email you when ${escHtml(facilityName)}'s staffing score or inspection grade changes.
      </p>
      <p style="color:var(--muted);margin-bottom:2rem;max-width:480px;margin-left:auto;margin-right:auto;">
        This feature is new — if you don't receive an email within a month, check back here or contact us.
      </p>
      ${safeReturnPath ? `<p style="margin-bottom:0.75rem;"><a href="${escHtml(safeReturnPath)}" class="btn">← Return to ${escHtml(facilityName)}</a></p>` : ""}
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
      We couldn't find <code style="background:#fff;padding:0.15rem 0.4rem;font-size:0.9rem;">${escHtml(path)}</code>.
    </p>
    <p style="color:var(--muted);margin-bottom:2rem;">
      Try searching for a ZIP code or browsing from the home page.
    </p>
    <form action="/search" method="GET" class="search-bar" style="margin-bottom:2rem;">
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
    ${suggestion ? `<p style="color:var(--muted);margin-bottom:2rem;">${escHtml(suggestion)}</p>` : ""}
    <form action="/search" method="GET" class="search-bar" style="margin-bottom:2rem;">
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
