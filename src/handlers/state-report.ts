import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import { getStateAbbreviation, getStateInfo } from "../states";
import {
  countFacilitiesByState,
  getStateGradeDistribution,
  getStatePctFailing,
  getNationalPctFailing,
  getNationalAverages,
} from "../db";
import { stateReportPage } from "../templates/state-report";
import { notFoundPage, errorPage } from "../templates/subscribe";

interface StateAverages {
  avg_grade: number | null;
  avg_rn_hours: number | null;
  avg_deficiencies: number | null;
}

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
      totalCount,
      gradeDistribution,
      pctFailing,
      nationalPctFailing,
      nationalAvg,
      stateAverages,
    ] = await Promise.all([
      countFacilitiesByState(env, stateAbbr),
      getStateGradeDistribution(env, stateAbbr),
      getStatePctFailing(env, stateAbbr),
      getNationalPctFailing(env),
      getNationalAverages(env),
      env.DB.prepare(
        `SELECT
           ROUND(AVG(CASE WHEN grade_letter != 'NR' AND grade_score >= 0 THEN grade_score END), 1) AS avg_grade,
           ROUND(AVG(rn_hours_per_resident_day), 2) AS avg_rn_hours,
           ROUND(AVG(total_deficiencies), 1) AS avg_deficiencies
         FROM facilities
         WHERE state = ?`,
      ).bind(stateAbbr).first<StateAverages>(),
    ]);

    // Grade averages use only facilities with an actual grade. Staffing and
    // deficiency averages use every facility that reports those measures,
    // including NR facilities, because gradeability must not erase valid CMS evidence.
    const avgGrade = stateAverages?.avg_grade ?? 0;
    const avgRnHours = stateAverages?.avg_rn_hours ?? null;
    const avgDeficiencies = stateAverages?.avg_deficiencies ?? null;

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

    // Compute state rank by the average of actual grades only. States with no
    // currently gradeable facilities do not enter the ranking.
    const allStateAvgs = await env.DB.prepare(
      `SELECT state, ROUND(AVG(grade_score), 1) as avg_grade
       FROM facilities
       WHERE grade_letter != 'NR' AND grade_score >= 0
       GROUP BY state
       ORDER BY avg_grade DESC`
    ).all<{ state: string; avg_grade: number }>();

    const stateIndex = (allStateAvgs.results ?? []).findIndex((r) => r.state === stateAbbr);
    const stateRank = stateIndex >= 0 ? stateIndex + 1 : 0;
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
