// Start a new generation of stable-page HTML with a separate stale copy.
// Earlier cache generations must not supply fallback HTML after a rollout.
// v37: design overhaul Phase 5 (editorial, report and utility pages).
const HTML_CACHE_VERSION = "html:v38";

export const HTML_STALE_TTL_SECONDS = 604800;

/** Outgoing response policy; Cache API retention is controlled separately. */
export function htmlResponseCacheControl(freshTtl = 86400): string {
  return `public, max-age=${freshTtl}, stale-while-revalidate=${HTML_STALE_TTL_SECONDS}`;
}

export function htmlCacheKey(key: string): string {
  return `${HTML_CACHE_VERSION}:${key}`;
}

// Rendered pages are cached via the Cache API (caches.default) rather than
// Workers KV: KV's free tier allows only 1,000 writes/day, and every cache
// miss across ~15k crawlable URLs costs a write. The Cache API is unmetered.
// Trade-off: entries are per-datacenter and may be evicted early, so misses
// fall through to D1 + re-render, which is cheap.
function cacheRequest(key: string): Request {
  return new Request(`https://nursinghomegrade.com/__cache/${encodeURIComponent(key)}`);
}

function edgeCache(): Cache | null {
  // `caches` is absent outside the Workers runtime (vitest, node scripts).
  try {
    return typeof caches === "undefined" ? null : caches.default;
  } catch {
    return null;
  }
}

function staleCacheKey(key: string): string {
  return `stale:${key}`;
}

async function readCachedText(key: string): Promise<string | null> {
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(cacheRequest(key));
    return hit ? await hit.text() : null;
  } catch {
    return null;
  }
}

async function writeCachedText(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  const ttl = opts?.expirationTtl ?? 86400;
  try {
    await cache.put(
      cacheRequest(key),
      new Response(value, {
        headers: { "Cache-Control": `public, max-age=${ttl}` },
      }),
    );
  } catch {
    // Caching is best-effort; serving the response matters more.
  }
}

async function deleteCachedEntry(key: string): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.delete(cacheRequest(key));
  } catch {
    /* best-effort */
  }
}

export const pageCache = {
  get: readCachedText,
  put: writeCachedText,

  async getStale(key: string): Promise<string | null> {
    return readCachedText(staleCacheKey(key));
  },

  async putWithStale(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    // Cache API put/match do not support stale-while-revalidate. Retain a
    // separate successful render for stable routes to use on an error only.
    await Promise.all([
      writeCachedText(key, value, opts),
      writeCachedText(staleCacheKey(key), value, { expirationTtl: HTML_STALE_TTL_SECONDS }),
    ]);
  },

  async delete(key: string): Promise<void> {
    await Promise.all([
      deleteCachedEntry(key),
      deleteCachedEntry(staleCacheKey(key)),
    ]);
  },
};

/** Only stable HTML handlers opt into fallback; reads never renew retention. */
export async function staleHtmlResponse(key: string): Promise<Response | null> {
  const html = await pageCache.getStale(key);
  if (html === null) return null;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=60",
      "X-NHG-Cache": "stale",
    },
  });
}
