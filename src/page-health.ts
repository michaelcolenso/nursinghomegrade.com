/** Stable pages are checked even when sitemap sampling misses their families. */
export const REPRESENTATIVE_PAGE_PROBES = [
  { path: "/", requireIndexable: true },
  { path: "/facility/505531-heron-s-key", requireIndexable: true },
  { path: "/state/washington", requireIndexable: true },
  // A city may intentionally be noindex after its facility count falls to 1–2.
  { path: "/state/washington/seattle", requireIndexable: false },
] as const;

export interface PageHealthResponse {
  status: number;
  text: string;
}

/** Check the response Googlebot sees; a thin error body must not pass as a 200. */
export function validatePageHealth(
  url: string,
  response: PageHealthResponse,
  options: { requireIndexable?: boolean } = {},
): string[] {
  if (response.status !== 200) {
    return [`${url} returned ${response.status} (expected 200)`];
  }

  const problems: string[] = [];
  const html = response.text;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical === undefined) {
    problems.push(`${url} has no canonical tag this checker can read`);
  } else if (canonical !== url) {
    problems.push(`${url} canonicalises to ${canonical}`);
  }

  const robotsMeta = html.match(/<meta name="robots" content="([^"]*)"/i)?.[1];
  if ((options.requireIndexable ?? true) && robotsMeta?.toLowerCase().includes("noindex")) {
    problems.push(`${url} is marked noindex but must be indexable`);
  }
  if (html.length < 2000) {
    problems.push(`${url} returned a suspiciously thin 200 (${html.length} bytes) — possible masked failure`);
  }
  return problems;
}
