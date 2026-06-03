import type { Env } from "../types";
import { htmlCacheKey } from "../cache";
import { getFacilityBySlugId, getFacilityInspectionDetails, getFacilityDeficiencies, getNearbyFacilities, getTopRatedByState } from "../db";
import { facilityPage } from "../templates/facility";
import { notFoundPage, errorPage } from "../templates/subscribe";

export async function handleFacility(request: Request, env: Env, slugId: string): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey(`facility:${slugId}`);
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=86400",
        },
      });

    const facility = await getFacilityBySlugId(env, slugId);
    if (!facility) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const [inspectionDetails, deficiencies, nearby, stateTopRated] = await Promise.all([
      getFacilityInspectionDetails(env, facility.cms_id),
      getFacilityDeficiencies(env, facility.cms_id),
      getNearbyFacilities(env, facility.cms_id, facility.city, facility.state, 8),
      getTopRatedByState(env, facility.state, facility.cms_id, 5),
    ]);

    const html = facilityPage({ ...facility, ...inspectionDetails }, deficiencies, nearby, stateTopRated);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("handleFacility error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
