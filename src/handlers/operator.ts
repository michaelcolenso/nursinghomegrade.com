import type { Env } from "../types";
import { htmlCacheKey } from "../cache";
import {
  getOperatorBySlug,
  getOperatorFacilities,
  getOperatorGradeDistribution,
  getOperatorsRanked,
  getAllOperators,
  getNationalAverages,
} from "../db";
import {
  operatorPage,
  operatorsHubPage,
  operatorsBestPage,
  operatorsWorstPage,
} from "../templates/operator";
import { notFoundPage, errorPage } from "../templates/subscribe";
import { computeOperatorInsights, generateOperatorInsightsText } from "../narrative";

export async function handleOperator(request: Request, env: Env, slug: string): Promise<Response> {
  try {
    const operator = await getOperatorBySlug(env, slug);
    if (!operator) {
      const html = notFoundPage(new URL(request.url).pathname);
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    const cacheKey = htmlCacheKey(`operator:${slug}`);
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const [facilities, gradeDistribution, nationalAvg] = await Promise.all([
      getOperatorFacilities(env, operator.normalized_name),
      getOperatorGradeDistribution(env, operator.normalized_name),
      getNationalAverages(env),
    ]);

    const insights = computeOperatorInsights(operator, facilities, nationalAvg);
    const insightLines = generateOperatorInsightsText(insights, operator.normalized_name);

    const statesServed = new Set(facilities.map((f) => f.state)).size;

    const html = operatorPage({
      operator,
      facilities,
      gradeDistribution,
      statesServed,
      nationalAvg,
      insightLines,
    });

    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleOperator error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleOperatorsHub(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("page:operators");
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const operators = await getAllOperators(env);
    const html = operatorsHubPage(operators);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleOperatorsHub error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleOperatorsBest(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("page:operators-best");
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const operators = await getOperatorsRanked(env, 50, "DESC");
    const html = operatorsBestPage(operators);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleOperatorsBest error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

export async function handleOperatorsWorst(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("page:operators-worst");
    const cached = await env.CACHE.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const operators = await getOperatorsRanked(env, 50, "ASC");
    const html = operatorsWorstPage(operators);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleOperatorsWorst error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
