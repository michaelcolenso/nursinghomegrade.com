import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import { getStateAbbreviation, getStateInfo } from "../states";
import { getOperatorsRanked, getNationalAverages, getFacilitiesWithUncorrectedDeficiencies, getBenchmarkShortfall } from "../db";
import { staffingFailuresPage, highDeficiencyPage, staffingFailuresStatePage, chainsReportPage, uncorrectedDeficienciesPage } from "../templates/reports";
import { staffingStandardRepealPage } from "../templates/staffing-repeal";
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

interface StaffingFailureStateCount {
  stateName: string;
  slug: string;
  count: number;
}

// Cap the table at 200 rows so a report page stays small (fast FCP/LCP, low
// DOM count) even for the largest states.
const STAFFING_FAILURES_PAGE_SIZE = 200;

function staffingFailuresCacheResponse(html: string): Response {
  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
  });
}

function staffingFailuresPageNumber(raw: string | null): number {
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

async function handleStaffingFailuresNational(request: Request, env: Env): Promise<Response> {
  const cacheKey = htmlCacheKey("report:staffing-failures");
  const cached = await pageCache.get(cacheKey);
  if (cached) return staffingFailuresCacheResponse(cached);

  const result = await env.DB.prepare(
    `SELECT state, COUNT(*) AS count
     FROM facilities
     WHERE rn_hours_per_resident_day < 0.55
     GROUP BY state
     ORDER BY count DESC, state ASC`
  ).all<{ state: string; count: number }>();

  const states = (result.results ?? [])
    .map((row) => {
      const info = getStateInfo(row.state);
      return info ? { stateName: info.name, slug: info.slug, count: row.count } : null;
    })
    .filter((row): row is StaffingFailureStateCount => row !== null);
  const total = states.reduce((sum, row) => sum + row.count, 0);

  const html = staffingFailuresPage(states, total);
  await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
  return staffingFailuresCacheResponse(html);
}

async function handleStaffingFailuresState(request: Request, env: Env, stateSlug: string): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const stateAbbr = getStateAbbreviation(stateSlug);
  if (!stateAbbr) {
    const html = notFoundPage(pathname);
    return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
  const info = getStateInfo(stateAbbr);
  const stateName = info?.name ?? stateAbbr;
  const page = staffingFailuresPageNumber(new URL(request.url).searchParams.get("page"));

  const cacheKey = htmlCacheKey(`report:staffing-failures:${stateAbbr}:p${page}`);
  const cached = await pageCache.get(cacheKey);
  if (cached) return staffingFailuresCacheResponse(cached);

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM facilities WHERE rn_hours_per_resident_day < 0.55 AND state = ?`
  ).bind(stateAbbr).first<{ count: number }>();
  const total = countResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / STAFFING_FAILURES_PAGE_SIZE));

  if (page > totalPages) {
    const html = notFoundPage(pathname);
    return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }

  const offset = (page - 1) * STAFFING_FAILURES_PAGE_SIZE;
  const result = await env.DB.prepare(
    `SELECT cms_id, name, city, state, rn_hours_per_resident_day, grade_score, grade_letter, slug
     FROM facilities
     WHERE rn_hours_per_resident_day < 0.55 AND state = ?
     ORDER BY CASE WHEN grade_letter = 'NR' THEN 1 ELSE 0 END, grade_score ASC
     LIMIT ? OFFSET ?`
  ).bind(stateAbbr, STAFFING_FAILURES_PAGE_SIZE, offset).all<FacilityRow>();

  const html = staffingFailuresStatePage(stateName, result.results ?? [], { total, page, totalPages });
  await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
  return staffingFailuresCacheResponse(html);
}

export async function handleStaffingFailures(request: Request, env: Env, stateSlug?: string): Promise<Response> {
  try {
    return stateSlug
      ? await handleStaffingFailuresState(request, env, stateSlug)
      : await handleStaffingFailuresNational(request, env);
  } catch (err) {
    console.error("handleStaffingFailures error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleStaffingStandardRepeal(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("report:staffing-standard-repeal");
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    // Live counts, cached for a day alongside the rendered page — never hardcoded.
    const shortfall = await getBenchmarkShortfall(env);
    const html = staffingStandardRepealPage(shortfall);

    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleStaffingStandardRepeal error", err);
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

export async function handleUncorrectedDeficiencies(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("report:uncorrected-deficiencies");
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const facilities = await getFacilitiesWithUncorrectedDeficiencies(env);

    const html = uncorrectedDeficienciesPage(facilities);
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleUncorrectedDeficiencies error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
