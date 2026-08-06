import type { Env } from "../types";
import { htmlCacheKey, pageCache } from "../cache";
import {
  getOperatorBySlug,
  getOperatorFacilities,
  getOperatorGradeDistribution,
  getOperatorsByTier,
  getOperatorTierCounts,
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
    const cached = await pageCache.get(cacheKey);
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

    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
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
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const [mega, large, mid, small, tierCounts] = await Promise.all([
      getOperatorsByTier(env, "Mega", 25),
      getOperatorsByTier(env, "Large", 25),
      getOperatorsByTier(env, "Mid", 25),
      getOperatorsByTier(env, "Small", 25),
      getOperatorTierCounts(env),
    ]);
    const html = operatorsHubPage({ mega, large, mid, small, tierCounts });
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
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
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const [mega, large, mid, small, tierCounts] = await Promise.all([
      getOperatorsByTier(env, "Mega", 10, "DESC"),
      getOperatorsByTier(env, "Large", 10, "DESC"),
      getOperatorsByTier(env, "Mid", 10, "DESC"),
      getOperatorsByTier(env, "Small", 10, "DESC"),
      getOperatorTierCounts(env),
    ]);
    const html = operatorsBestPage({ mega, large, mid, small, tierCounts });
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
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
    const cached = await pageCache.get(cacheKey);
    if (cached)
      return new Response(cached, {
        headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
      });

    const [mega, large, mid, small, tierCounts] = await Promise.all([
      getOperatorsByTier(env, "Mega", 10, "ASC"),
      getOperatorsByTier(env, "Large", 10, "ASC"),
      getOperatorsByTier(env, "Mid", 10, "ASC"),
      getOperatorsByTier(env, "Small", 10, "ASC"),
      getOperatorTierCounts(env),
    ]);
    const html = operatorsWorstPage({ mega, large, mid, small, tierCounts });
    await pageCache.put(cacheKey, html, { expirationTtl: 86400 });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    console.error("handleOperatorsWorst error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
