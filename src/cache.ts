// Bumped for /about changes (named-operator line, removed unmonetized
// advertising/referral-fee claims) and the new /ask link on the homepage.
const HTML_CACHE_VERSION = "html:v25";

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
  return typeof caches === "undefined" ? null : caches.default;
}

export const pageCache = {
  async get(key: string): Promise<string | null> {
    const cache = edgeCache();
    if (!cache) return null;
    try {
      const hit = await cache.match(cacheRequest(key));
      return hit ? await hit.text() : null;
    } catch {
      return null;
    }
  },

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
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
  },

  async delete(key: string): Promise<void> {
    const cache = edgeCache();
    if (!cache) return;
    try {
      await cache.delete(cacheRequest(key));
    } catch {
      /* best-effort */
    }
  },
};
