import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import { getDataReleases } from "../db";
import { dataSourcesPage } from "../templates/data-sources";
import { errorPage } from "../templates/subscribe";

export async function handleDataSources(_request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("page:data-sources");
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const html = dataSourcesPage(await getDataReleases(env));
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleDataSources error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
