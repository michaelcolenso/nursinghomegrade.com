import type { Env } from "../types";
import { htmlCacheKey } from "../cache";
import { getFacilitiesByState } from "../db";
import { notFoundPage, errorPage } from "../templates/subscribe";
import { staffingFailuresPage, highDeficiencyPage } from "../templates/reports";

export async function handleStaffingFailures(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("report:staffing-failures");
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const results = await env.DB.prepare(
      `SELECT f.* FROM facilities f
       WHERE f.rn_hours_per_resident_day < 0.55
       ORDER BY f.state ASC, f.grade_score ASC`
    ).all<{ cms_id: string; name: string; city: string; state: string; rn_hours_per_resident_day: number | null; grade_score: number; grade_letter: string; slug: string }>();

    const html = staffingFailuresPage(results.results ?? []);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
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
    const cached = await env.CACHE.get(cacheKey);
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
    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleHighDeficiency error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
