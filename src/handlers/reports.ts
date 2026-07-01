import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import { getStateAbbreviation, getStateInfo } from "../states";
import { getOperatorsRanked, getNationalAverages } from "../db";
import { staffingFailuresPage, highDeficiencyPage, staffingFailuresStatePage, chainsReportPage } from "../templates/reports";
import { notFoundPage, errorPage } from "../templates/subscribe";

interface FacilityRow {
  cms_id: string;
  name: string;
  city: string;
  state: string;
  rn_hours_per_resident_day: number | null;
  grade_score: number;
  grade_letter: string;
  slug: string;
}

export async function handleStaffingFailures(request: Request, env: Env, stateSlug?: string): Promise<Response> {
  try {
    let stateAbbr: string | undefined;
    let stateName: string | undefined;

    if (stateSlug) {
      stateAbbr = getStateAbbreviation(stateSlug);
      if (!stateAbbr) {
        const html = notFoundPage(new URL(request.url).pathname);
        return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
      }
      const info = getStateInfo(stateAbbr);
      stateName = info?.name ?? stateAbbr;
    }

    const cacheSuffix = stateAbbr ? `report:staffing-failures:${stateAbbr}` : "report:staffing-failures";
    const cacheKey = htmlCacheKey(cacheSuffix);
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    let query: string;
    let bindings: string[];

    if (stateAbbr) {
      query = `SELECT cms_id, name, city, state, rn_hours_per_resident_day, grade_score, grade_letter, slug
        FROM facilities
        WHERE rn_hours_per_resident_day < 0.55 AND state = ?
        ORDER BY grade_score ASC`;
      bindings = [stateAbbr];
    } else {
      query = `SELECT cms_id, name, city, state, rn_hours_per_resident_day, grade_score, grade_letter, slug
        FROM facilities
        WHERE rn_hours_per_resident_day < 0.55
        ORDER BY state ASC, grade_score ASC`;
      bindings = [];
    }

    const stmt = env.DB.prepare(query);
    for (const b of bindings) stmt.bind(b);
    const results = await stmt.all<FacilityRow>();

    const html = stateAbbr
      ? staffingFailuresStatePage(stateName!, results.results ?? [])
      : staffingFailuresPage(results.results ?? []);

    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleStaffingFailures error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleHighDeficiency(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("report:high-deficiency");
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const results = await env.DB.prepare(
      `SELECT cms_id, name, city, state, total_deficiencies, grade_score, grade_letter, slug
       FROM facilities
       WHERE total_deficiencies IS NOT NULL
       ORDER BY total_deficiencies DESC
       LIMIT 200`
    ).all<{ cms_id: string; name: string; city: string; state: string; total_deficiencies: number | null; grade_score: number; grade_letter: string; slug: string }>();

    const html = highDeficiencyPage(results.results ?? []);
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleHighDeficiency error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleChainsReport(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("report:chains");
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const [bestChains, worstChains, nationalAvg] = await Promise.all([
      getOperatorsRanked(env, 25, "DESC"),
      getOperatorsRanked(env, 25, "ASC"),
      getNationalAverages(env),
    ]);

    const html = chainsReportPage(bestChains, worstChains, nationalAvg);
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleChainsReport error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
