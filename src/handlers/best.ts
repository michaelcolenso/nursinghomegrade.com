import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import { getStateAbbreviation, getStateInfo } from "../states";
import { bestPage, worstPage } from "../templates/best";
import { notFoundPage, errorPage } from "../templates/subscribe";

interface FacilityRow {
  cms_id: string;
  name: string;
  city: string;
  state: string;
  rn_hours_per_resident_day: number | null;
  total_deficiencies: number | null;
  grade_score: number;
  grade_letter: string;
  slug: string;
}

async function fetchBest(env: Env, state?: string): Promise<FacilityRow[]> {
  if (state) {
    const results = await env.DB.prepare(
      `SELECT cms_id, name, city, state, rn_hours_per_resident_day, total_deficiencies, grade_score, grade_letter, slug
       FROM facilities
       WHERE state = ?
       ORDER BY grade_score DESC
       LIMIT 100`
    ).bind(state).all<FacilityRow>();
    return results.results ?? [];
  }
  const results = await env.DB.prepare(
    `SELECT cms_id, name, city, state, rn_hours_per_resident_day, total_deficiencies, grade_score, grade_letter, slug
     FROM facilities
     ORDER BY grade_score DESC
     LIMIT 100`
  ).all<FacilityRow>();
  return results.results ?? [];
}

async function fetchWorst(env: Env, state?: string): Promise<FacilityRow[]> {
  if (state) {
    const results = await env.DB.prepare(
      `SELECT cms_id, name, city, state, rn_hours_per_resident_day, total_deficiencies, grade_score, grade_letter, slug
       FROM facilities
       WHERE state = ?
       ORDER BY grade_score ASC
       LIMIT 100`
    ).bind(state).all<FacilityRow>();
    return results.results ?? [];
  }
  const results = await env.DB.prepare(
    `SELECT cms_id, name, city, state, rn_hours_per_resident_day, total_deficiencies, grade_score, grade_letter, slug
     FROM facilities
     ORDER BY grade_score ASC
     LIMIT 100`
  ).all<FacilityRow>();
  return results.results ?? [];
}

export async function handleBest(request: Request, env: Env, stateSlug?: string): Promise<Response> {
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

    const cacheSuffix = stateAbbr ? `best:${stateAbbr}` : "best:national";
    const cacheKey = htmlCacheKey(cacheSuffix);
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const facilities = await fetchBest(env, stateAbbr);

    const html = bestPage(facilities, stateName);
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleBest error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleWorst(request: Request, env: Env, stateSlug?: string): Promise<Response> {
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

    const cacheSuffix = stateAbbr ? `worst:${stateAbbr}` : "worst:national";
    const cacheKey = htmlCacheKey(cacheSuffix);
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const facilities = await fetchWorst(env, stateAbbr);

    const html = worstPage(facilities, stateName);
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleWorst error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
