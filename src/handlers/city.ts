import type { Env } from "../types";
import { htmlCacheKey, pageCache, staleHtmlResponse, htmlResponseCacheControl } from "../cache";
import { logPageRenderError } from "../page-errors";
import { isIndexableCity } from "../city-indexation";
import { getStateAbbreviation, getStateInfo } from "../states";
import {
  getCitySnapshot,
  getNationalPctFailing,
  getStateCityList,
  getPeerFacilities,
} from "../db";
import { cityPage } from "../templates/city";
import { notFoundPage, errorPage } from "../templates/subscribe";

export async function handleCity(request: Request, env: Env, stateSlug: string, citySlugParam: string): Promise<Response> {
  const cacheKey = htmlCacheKey(`city:${stateSlug}:${citySlugParam}`);
  try {
    const stateAbbr = getStateAbbreviation(stateSlug);
    if (!stateAbbr) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const stateInfo = getStateInfo(stateAbbr);
    if (!stateInfo) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": htmlResponseCacheControl(),
        },
      });

    const [snapshot, nationalPctFailing, allCities] = await Promise.all([
      getCitySnapshot(env, stateAbbr, citySlugParam, 200),
      getNationalPctFailing(env),
      getStateCityList(env, stateAbbr),
    ]);

    // Facilities just outside this city, anchored on a facility in it. Gives
    // small towns inbound links from neighbouring city pages.
    const anchor = snapshot?.facilities?.[0];
    const nearbyOutsideCity = anchor
      ? (await getPeerFacilities(env, anchor, 12)).filter((f) => f.city !== anchor.city).slice(0, 6)
      : [];

    if (!snapshot) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const html = cityPage({
      cityName: snapshot.cityName,
      citySlug: citySlugParam,
      stateName: stateInfo.name,
      stateSlug: stateInfo.slug,
      facilityCount: snapshot.facilityCount,
      noindex: !isIndexableCity(snapshot.facilityCount),
      pctFailing: snapshot.pctFailing,
      nationalPctFailing,
      gradeDistribution: snapshot.gradeDistribution,
      facilities: snapshot.facilities,
      nearbyOutsideCity,
      siblingCities: allCities,
    });

    await pageCache.putWithStale(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": htmlResponseCacheControl(),
      },
    });
  } catch (err) {
    logPageRenderError("/state/:state/:city", err);
    const stale = await staleHtmlResponse(cacheKey);
    if (stale) return stale;
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
