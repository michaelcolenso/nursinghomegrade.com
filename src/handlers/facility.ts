import type { Env } from "../types";
import { htmlCacheKey, pageCache, staleHtmlResponse, htmlResponseCacheControl } from "../cache";
import { logPageRenderError } from "../page-errors";
import {
  getFacilityBySlugId,
  getFacilityInspectionDetails,
  getFacilityDeficiencies,
  getPeerFacilities,
  getBetterGradedNearby,
  getFacilitySnapshots,
  getNationalAverages,
  getStateRnMedian,
  getOperatorBySlug,
  getFacilityPenalties,
  getFacilityCmsNotes,
} from "../db";
import { computeTrajectory } from "../trajectory";
import { generateFacilityAssessment } from "../narrative";
import { generateMetaDescription, deriveDescriptionFacts } from "../meta-description";
import { summarizeDeficiencies } from "../templates/facility";
import { facilityPage } from "../templates/facility";
import { notFoundPage, errorPage } from "../templates/subscribe";
import { toOperatorSlug } from "../ownership";

export async function handleFacility(request: Request, env: Env, slugId: string): Promise<Response> {
  // Only validated canonical renders are stored under this exact route key.
  // Checking it before D1 keeps a cached facility available during an outage;
  // another slug for the same CMS id must still take the redirect/404 path.
  const cacheKey = htmlCacheKey(`facility:${slugId}`);
  try {
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": htmlResponseCacheControl(),
        },
      });

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

    const [inspectionDetails, deficiencies, nearby, betterNearby, snapshots, nationalAvg, stateRnMedian, penalties, cmsNotes] = await Promise.all([
      getFacilityInspectionDetails(env, facility.cms_id),
      getFacilityDeficiencies(env, facility.cms_id),
      // Peers for THIS facility, widening past the city when the city is small,
      // rather than the same statewide top-5 on every page in the state.
      getPeerFacilities(env, facility, 8),
      getBetterGradedNearby(env, facility, 2),
      getFacilitySnapshots(env, facility.cms_id),
      getNationalAverages(env),
      getStateRnMedian(env, facility.state),
      getFacilityPenalties(env, facility.cms_id),
      // Never throws: null until the first ingest after deploy creates the table.
      getFacilityCmsNotes(env, facility.cms_id),
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
      // Omit rather than pass zeros when the lookup failed: an assessment that
      // says nothing is better than one implying a clean record we cannot verify.
      deficiencies === null ? undefined : summarizeDeficiencies(deficiencies),
    );
    // Meta description built from whichever fact is most decision-relevant for
    // THIS facility, rather than one template repeated across ~15,000 pages.
    const summary = generateMetaDescription(
      facility,
      deriveDescriptionFacts(deficiencies, stateRnMedian),
    );

    const html = facilityPage(
      { ...facility, ...inspectionDetails },
      deficiencies,
      nearby,
      betterNearby,
      trajectory,
      assessment,
      summary,
      operator,
      {
        // null here means the penalties lookup failed. The template renders
        // that as an explicit gap, never as "no penalties".
        penalties,
        stateRnMedian,
        nationalAvgRn: nationalAvg.avgRnHours || null,
        cmsNotes,
      },
    );
    await pageCache.putWithStale(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": htmlResponseCacheControl(),
      },
    });
  } catch (err) {
    const providerId = slugId.split("-")[0] ?? "";
    logPageRenderError("/facility/:id", err, /^[A-Za-z0-9]{6}$/.test(providerId) ? providerId : null);
    const stale = await staleHtmlResponse(cacheKey);
    if (stale) return stale;
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
