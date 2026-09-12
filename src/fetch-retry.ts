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
      if (typeof rec.code === "string" && TRANSIENT_CODES.has(rec.code)) return true;
      if (typeof rec.message === "string") {
        const msg = rec.message;
        if (TRANSIENT_CODES.has(msg)) return true;
        if (/\b(ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN)\b/.test(msg)) return true;
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

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: { retries?: number; backoffMs?: number },
): Promise<Response> {
  const retries = opts?.retries ?? 4;
  const backoffMs = opts?.backoffMs ?? 400;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (isTransientStatus(res.status) && attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (!isTransientNetworkError(err) || attempt === retries) throw err;
      await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
