const TRANSIENT_STATUS = new Set([429, 502, 503, 504]);
const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

export function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUS.has(status);
}

export function isTransientNetworkError(err: unknown): boolean {
  let current: unknown = err;
  for (let i = 0; i < 6 && current; i++) {
    if (typeof current === "object" && current !== null) {
      const rec = current as { code?: unknown; cause?: unknown; message?: unknown };
      if (typeof rec.code === "string") {
        if (TRANSIENT_CODES.has(rec.code)) return true;
        if (rec.code.startsWith("HTTP_")) {
          const status = Number(rec.code.slice(5));
          if (Number.isInteger(status) && isTransientStatus(status)) return true;
        }
      }
      if (typeof rec.message === "string") {
        const msg = rec.message;
        if (TRANSIENT_CODES.has(msg)) return true;
        if (/\b(ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|UND_ERR_SOCKET)\b/.test(msg)) return true;
        if (msg === "fetch failed" && rec.cause) {
          current = rec.cause;
          continue;
        }
      }
      current = rec.cause;
      continue;
    }
    break;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FetchRetryOpts = { retries?: number; backoffMs?: number };

async function withRetries<T>(run: () => Promise<T>, opts?: FetchRetryOpts): Promise<T> {
  const retries = opts?.retries ?? 4;
  const backoffMs = opts?.backoffMs ?? 400;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await run();
    } catch (err) {
      lastError = err;
      if (!isTransientNetworkError(err) || attempt === retries) throw err;
      await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function transientHttpError(url: string, status: number): Error {
  return Object.assign(new Error(`${url} returned ${status}`), { code: `HTTP_${status}` });
}

/** Headers-only. Prefer fetchAndRead when the caller will consume the body. */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: FetchRetryOpts,
): Promise<Response> {
  return withRetries(async () => {
    const res = await fetch(url, init);
    if (isTransientStatus(res.status)) {
      throw transientHttpError(url, res.status);
    }
    return res;
  }, opts);
}

export type FetchedText = { status: number; headers: Headers; text: string };

/**
 * Retry boundary includes the body. fetch() resolves on headers; a reset
 * while streaming XML/HTML throws from res.text() (often UND_ERR_SOCKET).
 */
export async function fetchAndRead(
  url: string,
  init?: RequestInit,
  opts?: FetchRetryOpts,
): Promise<FetchedText> {
  return withRetries(async () => {
    const res = await fetch(url, init);
    if (isTransientStatus(res.status)) {
      await res.arrayBuffer().catch(() => undefined);
      throw transientHttpError(url, res.status);
    }
    const text = await res.text();
    return { status: res.status, headers: res.headers, text };
  }, opts);
}
