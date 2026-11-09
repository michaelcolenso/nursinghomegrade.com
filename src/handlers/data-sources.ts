import type { Env } from "../types";
import { htmlCacheKey, pageCache, staleHtmlResponse, htmlResponseCacheControl } from "../cache";
import { logPageRenderError } from "../page-errors";
import { getDataReleases } from "../db";
import { dataSourcesPage } from "../templates/data-sources";
import { errorPage } from "../templates/subscribe";

export async function handleDataSources(_request: Request, env: Env): Promise<Response> {
  const cacheKey = htmlCacheKey("page:data-sources");
  try {
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": htmlResponseCacheControl() },
      });

    const html = dataSourcesPage(await getDataReleases(env, { strict: true }));
    await pageCache.putWithStale(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": htmlResponseCacheControl() },
    });
  } catch (err) {
    logPageRenderError("/data-sources", err);
    const stale = await staleHtmlResponse(cacheKey);
    if (stale) return stale;
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
