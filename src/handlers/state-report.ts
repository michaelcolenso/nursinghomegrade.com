import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import { getStateAbbreviation, getStateInfo } from "../states";
import {
  getFacilitiesByState,
  countFacilitiesByState,
  getStateGradeDistribution,
  getStatePctFailing,
  getNationalPctFailing,
  getNationalAverages,
} from "../db";
import { stateReportPage } from "../templates/state-report";
import { notFoundPage, errorPage } from "../templates/subscribe";

export async function handleStateReport(request: Request, env: Env, stateSlug: string): Promise<Response> {
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

    const cacheKey = htmlCacheKey(`state-report:${stateSlug}`);
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const [
      facilities,
      totalCount,
      gradeDistribution,
      pctFailing,
      nationalPctFailing,
      nationalAvg,
    ] = await Promise.all([
      getFacilitiesByState(env, stateAbbr, 200),
      countFacilitiesByState(env, stateAbbr),
      getStateGradeDistribution(env, stateAbbr),
      getStatePctFailing(env, stateAbbr),
      getNationalPctFailing(env),
      getNationalAverages(env),
    ]);

    // Compute state averages
    const avgGrade = facilities.length > 0
      ? Math.round(facilities.reduce((sum, f) => sum + f.grade_score, 0) / facilities.length * 10) / 10
      : 0;
    const avgRnHours = facilities.length > 0
      ? Math.round(facilities
          .filter((f) => f.rn_hours_per_resident_day !== null)
          .reduce((sum, f) => sum + (f.rn_hours_per_resident_day as number), 0) / facilities.length * 100) / 100
      : null;
    const avgDeficiencies = facilities.length > 0
      ? Math.round(facilities
          .filter((f) => f.total_deficiencies !== null)
          .reduce((sum, f) => sum + (f.total_deficiencies as number), 0) / facilities.length * 10) / 10
      : null;

    // Most common deficiency categories in the state
    const deficiencyCats = await env.DB.prepare(
      `SELECT fd.deficiency_category, COUNT(*) as count
       FROM facility_deficiencies fd
       INNER JOIN facilities f ON f.cms_id = fd.cms_id
       WHERE f.state = ?
       GROUP BY fd.deficiency_category
       ORDER BY count DESC
       LIMIT 5`
    ).bind(stateAbbr).all<{ deficiency_category: string; count: number }>();

    // Compute state rank (by average grade)
    const allStateAvgs = await env.DB.prepare(
      `SELECT state, ROUND(AVG(grade_score), 1) as avg_grade
       FROM facilities
       GROUP BY state
       ORDER BY avg_grade DESC`
    ).all<{ state: string; avg_grade: number }>();

    const stateRank = (allStateAvgs.results ?? []).findIndex((r) => r.state === stateAbbr) + 1;
    const totalStates = (allStateAvgs.results ?? []).length;

    // Most recent snapshot date
    const latestSnapshot = await env.DB.prepare(
      "SELECT MAX(snapshot_date) as latest FROM facility_snapshots"
    ).first<{ latest: string }>();
    const datasetDate = (latestSnapshot?.latest as string) ?? new Date().toISOString().split("T")[0];

    const html = stateReportPage({
      stateName: stateInfo.name,
      stateAbbr,
      stateSlug: stateInfo.slug,
      facilityCount: totalCount,
      avgGrade,
      avgRnHours,
      avgDeficiencies,
      pctFailing,
      nationalPctFailing,
      nationalAvg,
      gradeDistribution,
      deficiencyCats: deficiencyCats.results ?? [],
      stateRank,
      totalStates,
      datasetDate,
    });

    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleStateReport error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
