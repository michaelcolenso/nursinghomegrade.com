import type { Env } from "../types";
import { getStateAbbreviation, getStateInfo, getAllStateSlugs } from "../states";
import { getFacilitiesByState, getStateGradeDistribution, getStateCityList, getStatePctFailing, getNationalPctFailing, getStatesWithCounts } from "../db";
import { statePage, statesHubPage } from "../templates/state";
import { notFoundPage, errorPage } from "../templates/subscribe";

export async function handleState(request: Request, env: Env, stateSlug: string): Promise<Response> {
  try {
    const stateAbbr = getStateAbbreviation(stateSlug);
    if (!stateAbbr) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const cacheKey = `state:${stateSlug}`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=86400",
        },
      });

    const stateInfo = getStateInfo(stateAbbr);
    if (!stateInfo) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const [facilities, totalFacilityCount, gradeDistribution, cities, pctFailing, nationalPctFailing] = await Promise.all([
      getFacilitiesByState(env, stateAbbr, 200),
      countFacilitiesByState(env, stateAbbr),
      getStateGradeDistribution(env, stateAbbr),
      getStateCityList(env, stateAbbr),
      getStatePctFailing(env, stateAbbr),
      getNationalPctFailing(env),
    ]);

    const html = statePage({
      stateName: stateInfo.name,
      stateSlug: stateInfo.slug,
      facilityCount: facilities.length,
      totalFacilityCount,
      pctFailing,
      nationalPctFailing,
      gradeDistribution,
      cities,
      facilities,
    });

    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("handleState error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleStatesHub(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = "page:states";
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=86400",
        },
      });

    const dbStates = await getStatesWithCounts(env);
    const states = dbStates
      .map((s) => {
        const info = getStateInfo(s.state);
        return info ? { state: info.name, count: s.count, slug: info.slug } : null;
      })
      .filter((s): s is { state: string; count: number; slug: string } => s !== null);

    const html = statesHubPage(states);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("handleStatesHub error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
