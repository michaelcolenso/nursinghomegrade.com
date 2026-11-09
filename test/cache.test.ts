import { afterEach, describe, expect, it, vi } from "vitest";
import { HTML_STALE_TTL_SECONDS, htmlCacheKey, htmlResponseCacheControl, pageCache, staleHtmlResponse } from "../src/cache";

function requestKey(request: Request): string {
  return decodeURIComponent(new URL(request.url).pathname.slice("/__cache/".length));
}

function mockEdgeCache() {
  let now = 0;
  const entries = new Map<string, { body: string; headers: Headers; expiresAt: number }>();
  const cache = {
    match: vi.fn(async (request: Request) => {
      const entry = entries.get(requestKey(request));
      if (!entry || now >= entry.expiresAt) return undefined;
      return new Response(entry.body, { headers: entry.headers });
    }),
    put: vi.fn(async (request: Request, response: Response) => {
      const ttl = Number(response.headers.get("Cache-Control")?.match(/max-age=(\d+)/)?.[1] ?? 0);
      entries.set(requestKey(request), {
        body: await response.text(), headers: new Headers(response.headers), expiresAt: now + ttl,
      });
    }),
    delete: vi.fn(async (request: Request) => entries.delete(requestKey(request))),
  };
  vi.stubGlobal("caches", { default: cache });
  return { cache, entries, setTime: (seconds: number) => { now = seconds; } };
}

afterEach(() => vi.unstubAllGlobals());

describe("htmlCacheKey", () => {
  it("versions rendered HTML cache keys", () => {
    expect(htmlCacheKey("facility:055258-community-subacute-and-transitional-care-center")).toBe(
      "html:v36:facility:055258-community-subacute-and-transitional-care-center",
    );
  });
});

describe("stable HTML cache", () => {
  const key = htmlCacheKey("page:home");
  const html = "<main>Previously successful HTML</main>";

  it("advertises outgoing freshness separately from Cache API retention", () => {
    expect(HTML_STALE_TTL_SECONDS).toBe(604800);
    expect(htmlResponseCacheControl()).toBe("public, max-age=86400, stale-while-revalidate=604800");
    expect(htmlResponseCacheControl(3600)).toBe("public, max-age=3600, stale-while-revalidate=604800");
  });

  it("stores independent fresh and stale TTLs and expires both without renewing them", async () => {
    const { cache, entries, setTime } = mockEdgeCache();
    await pageCache.putWithStale(key, html, { expirationTtl: 3600 });
    expect(entries.get(key)?.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(entries.get(`stale:${key}`)?.headers.get("Cache-Control")).toBe("public, max-age=604800");
    expect(entries.get(key)?.headers.get("Cache-Control")).not.toContain("stale-while-revalidate");
    expect(cache.put).toHaveBeenCalledTimes(2);

    setTime(3601);
    expect(await pageCache.get(key)).toBeNull();
    expect(await pageCache.getStale(key)).toBe(html);
    const response = await staleHtmlResponse(key);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toBe("text/html;charset=UTF-8");
    expect(response?.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(response?.headers.get("X-NHG-Cache")).toBe("stale");
    expect(await response?.text()).toBe(html);

    setTime(HTML_STALE_TTL_SECONDS - 1);
    expect(await pageCache.getStale(key)).toBe(html);
    expect(await staleHtmlResponse(key)).not.toBeNull();
    expect(cache.put).toHaveBeenCalledTimes(2);
    expect(entries.get(`stale:${key}`)?.expiresAt).toBe(HTML_STALE_TTL_SECONDS);

    setTime(HTML_STALE_TTL_SECONDS);
    expect(await pageCache.getStale(key)).toBeNull();
    expect(await staleHtmlResponse(key)).toBeNull();
    expect(cache.put).toHaveBeenCalledTimes(2);
  });

  it("retains the default fresh TTL for opted-in pages", async () => {
    const { entries } = mockEdgeCache();
    await pageCache.putWithStale(key, html);
    expect(entries.get(key)?.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(await pageCache.get(key)).toBe(html);
  });

  it("keeps generic ZIP geocoding writes at 30 days without a stale copy", async () => {
    const { entries, cache, setTime } = mockEdgeCache();
    const zipKey = "zip:latlng:98101";
    const geo = JSON.stringify({ lat: 47.6, lng: -122.3, state: "WA" });
    await pageCache.put(zipKey, geo, { expirationTtl: 86400 * 30 });
    expect(entries.get(zipKey)?.headers.get("Cache-Control")).toBe("public, max-age=2592000");
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(await pageCache.getStale(zipKey)).toBeNull();
    setTime(HTML_STALE_TTL_SECONDS + 1);
    expect(await pageCache.get(zipKey)).toBe(geo);
    setTime(86400 * 30);
    expect(await pageCache.get(zipKey)).toBeNull();
  });

  it("does not reuse stale HTML from another cache generation or route", async () => {
    mockEdgeCache();
    await pageCache.putWithStale("html:v30:page:home", "old HTML");
    expect(await pageCache.getStale(key)).toBeNull();
    expect(await staleHtmlResponse(key)).toBeNull();
    await pageCache.putWithStale(key, html);
    expect(await pageCache.getStale(key)).toBe(html);
    expect(await pageCache.getStale(htmlCacheKey("page:data-sources"))).toBeNull();
  });

  it("starts both writes without waiting for the first to finish", async () => {
    const { cache } = mockEdgeCache();
    let finishFresh!: () => void;
    cache.put.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFresh = resolve; }));
    const write = pageCache.putWithStale(key, html);
    expect(cache.put).toHaveBeenCalledTimes(2);
    finishFresh();
    await expect(write).resolves.toBeUndefined();
  });

  it.each(["fresh", "stale"])("keeps the other copy when the %s write fails", async (failed) => {
    const { cache } = mockEdgeCache();
    const store = cache.put.getMockImplementation()!;
    cache.put.mockImplementation(async (request, response) => {
      const stale = requestKey(request).startsWith("stale:");
      if (stale === (failed === "stale")) throw new Error("Cache write failure");
      return store(request, response);
    });
    await expect(pageCache.putWithStale(key, html)).resolves.toBeUndefined();
    expect(await pageCache.get(key)).toBe(failed === "fresh" ? null : html);
    expect(await pageCache.getStale(key)).toBe(failed === "stale" ? null : html);
  });

  it("invalidates both copies on delete", async () => {
    const { cache } = mockEdgeCache();
    await pageCache.putWithStale(key, html);
    await pageCache.delete(key);
    expect(cache.delete).toHaveBeenCalledTimes(2);
    expect(await pageCache.get(key)).toBeNull();
    expect(await pageCache.getStale(key)).toBeNull();
  });

  it("still attempts stale deletion if deleting the fresh copy fails", async () => {
    const { cache } = mockEdgeCache();
    await pageCache.putWithStale(key, html);
    cache.delete.mockRejectedValueOnce(new Error("Cache deletion failure"));
    await expect(pageCache.delete(key)).resolves.toBeUndefined();
    expect(cache.delete).toHaveBeenCalledTimes(2);
    expect(await pageCache.getStale(key)).toBeNull();
  });

  it("treats cache operation failures as misses or best-effort writes", async () => {
    const { cache } = mockEdgeCache();
    cache.match.mockRejectedValue(new Error("Cache read failure"));
    cache.put.mockRejectedValue(new Error("Cache write failure"));
    cache.delete.mockRejectedValue(new Error("Cache deletion failure"));
    expect(await pageCache.get(key)).toBeNull();
    expect(await pageCache.getStale(key)).toBeNull();
    expect(await staleHtmlResponse(key)).toBeNull();
    await expect(pageCache.put(key, html)).resolves.toBeUndefined();
    await expect(pageCache.putWithStale(key, html)).resolves.toBeUndefined();
    await expect(pageCache.delete(key)).resolves.toBeUndefined();
  });

  it.each(["absent", "unavailable"])("works when Cache API is %s", async (state) => {
    vi.stubGlobal("caches", state === "absent" ? undefined : {
      get default(): never { throw new Error("Cache API unavailable"); },
    });
    expect(await pageCache.get(key)).toBeNull();
    expect(await pageCache.getStale(key)).toBeNull();
    expect(await staleHtmlResponse(key)).toBeNull();
    await expect(pageCache.put(key, html)).resolves.toBeUndefined();
    await expect(pageCache.putWithStale(key, html)).resolves.toBeUndefined();
    await expect(pageCache.delete(key)).resolves.toBeUndefined();
  });
});
