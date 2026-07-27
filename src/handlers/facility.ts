import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import {
  getFacilityBySlugId,
  getFacilityInspectionDetails,
  getFacilityDeficiencies,
  getNearbyFacilities,
  getTopRatedByState,
  getFacilitySnapshots,
  getNationalAverages,
  getOperatorBySlug,
} from "../db";
import { computeTrajectory } from "../trajectory";
import { generateFacilityAssessment, generateFacilitySummary } from "../narrative";
import { summarizeDeficiencies } from "../templates/facility";
import { facilityPage } from "../templates/facility";
import { notFoundPage, errorPage } from "../templates/subscribe";
import { toOperatorSlug } from "../ownership";

export async function handleFacility(request: Request, env: Env, slugId: string): Promise<Response> {
  try {
    const facility = await getFacilityBySlugId(env, slugId);
    if (!facility) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const canonicalPath = `/facility/${facility.cms_id}-${facility.slug}`;
    const url = new URL(request.url);
    if (url.pathname !== canonicalPath) {
      url.pathname = canonicalPath;
      return Response.redirect(url.toString(), 308);
    }

    const cacheKey = htmlCacheKey(`facility:${facility.cms_id}-${facility.slug}`);
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=86400",
        },
      });

    const [inspectionDetails, deficiencies, nearby, stateTopRated, snapshots, nationalAvg] = await Promise.all([
      getFacilityInspectionDetails(env, facility.cms_id),
      getFacilityDeficiencies(env, facility.cms_id),
      getNearbyFacilities(env, facility.cms_id, facility.city, facility.state, 8),
      getTopRatedByState(env, facility.state, facility.cms_id, 5),
      getFacilitySnapshots(env, facility.cms_id),
      getNationalAverages(env),
    ]);

    const trajectory = snapshots.length >= 3 ? computeTrajectory(snapshots) : null;

    // Try to find operator for this facility
    let operator = null;
    try {
      const ownerRow = await env.DB.prepare(
        `SELECT normalized_name FROM facility_owners WHERE cms_id = ? AND owner_type = 'Organization' LIMIT 1`
      ).bind(facility.cms_id).first<{ normalized_name: string }>();
      if (ownerRow) {
        const opSlug = toOperatorSlug(ownerRow.normalized_name);
        operator = await getOperatorBySlug(env, opSlug);
      }
    } catch {
      operator = null;
    }

    // Same counts the page renders, so the assessment cannot contradict the table.
    const assessment = generateFacilityAssessment(
      facility,
      trajectory,
      operator,
      nationalAvg,
      summarizeDeficiencies(deficiencies),
    );
    const summary = generateFacilitySummary(facility, trajectory);

    const html = facilityPage(
      { ...facility, ...inspectionDetails },
      deficiencies,
      nearby,
      stateTopRated,
      trajectory,
      assessment,
      summary,
      operator,
    );
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
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
