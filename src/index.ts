import type { Env } from "./types";
import { htmlCacheKey } from "./cache";
import { handleFacility } from "./handlers/facility";
import { handleHome, handleSearch } from "./handlers/home";
import { handleAbout } from "./handlers/about";
import { handleState, handleStatesHub } from "./handlers/state";
import { handleCity } from "./handlers/city";
import { handleCompare, handleCompareApi } from "./handlers/comparison";
import { handleExplore, handleMapApi } from "./handlers/map";
import { subscribePage, notFoundPage, errorPage } from "./templates/subscribe";
import { maybeMarkdown } from "./markdown";
import {
  apiCatalogResponse,
  openidConfigurationResponse,
  oauthAuthorizationServerResponse,
  oauthProtectedResourceResponse,
  mcpServerCardResponse,
  agentSkillsIndexResponse,
  agentSkillResponse,
  openapiSpecResponse,
  healthResponse,
  robotsTxt,
} from "./agent-readiness";

const SITEMAP_KEYS: Record<string, string> = {
  "/sitemap.xml": "sitemap",
  "/sitemap-core.xml": "sitemap:core",
  "/sitemap-cities.xml": "sitemap:cities",
  "/sitemap-facilities.xml": "sitemap:facilities",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await handleFetch(request, env);
    return maybeMarkdown(response, request);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Weekly: invalidate cached pages so stats refresh
    await env.CACHE.delete(htmlCacheKey("page:home"));
    await env.CACHE.delete(htmlCacheKey("page:states"));
    console.log("Scheduled: home and states cache cleared");
  },
} satisfies ExportedHandler<Env>;

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/") return handleHome(request, env);
  if (path === "/about") return handleAbout(request, env);
  if (path === "/states") return handleStatesHub(request, env);
  if (path === "/compare") return handleCompare(request, env);
  if (path === "/search") return handleSearch(request, env);
  if (path === "/explore") return handleExplore(request, env);
  if (path === "/api/compare") return handleCompareApi(request, env);
  if (path === "/api/map/facilities") return handleMapApi(request, env);
  if (path === "/api/openapi.json") return openapiSpecResponse();
  if (path === "/api/health") return healthResponse();

  if (path === "/.well-known/api-catalog") return apiCatalogResponse();
  if (path === "/.well-known/openid-configuration") return openidConfigurationResponse();
  if (path === "/.well-known/oauth-authorization-server") return oauthAuthorizationServerResponse();
  if (path === "/.well-known/oauth-protected-resource") return oauthProtectedResourceResponse();
  if (path === "/.well-known/mcp/server-card.json") return mcpServerCardResponse();
  if (path === "/.well-known/agent-skills/index.json") return agentSkillsIndexResponse();

  if (path.startsWith("/.well-known/agent-skills/") && path.endsWith(".json")) {
    const skillName = path.slice("/.well-known/agent-skills/".length, -".json".length);
    const skillResponse = agentSkillResponse(skillName);
    if (skillResponse) return skillResponse;
  }

  if (path === "/subscribe" && request.method === "POST") {
    try {
      const form = await request.formData();
      const facilityName = form.get("facility_name")?.toString() ?? "this facility";
      const returnPath = form.get("return_path")?.toString();
      const html = subscribePage(facilityName, returnPath);
      return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    } catch {
      const html = errorPage(
        "Invalid submission",
        "We couldn't process your subscription. Please try again.",
        "If the problem persists, you can search for a facility and try subscribing again.",
      );
      return new Response(html, { status: 400, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
  }

  const sitemapKey = SITEMAP_KEYS[path];
  if (sitemapKey) {
    const sitemap = await env.CACHE.get(sitemapKey);
    if (sitemap)
      return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
      });
    const html = errorPage("Sitemap not found", "The sitemap could not be found. It may still be generating.");
    return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }

  if (path === "/robots.txt")
    return new Response(robotsTxt(), {
      headers: { "Content-Type": "text/plain" },
    });

  if (path === "/og.svg") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B1D33"/>
  <rect x="80" y="200" width="70" height="200" rx="6" fill="#E6EBEF"/>
  <rect x="200" y="200" width="70" height="200" rx="6" fill="#E6EBEF"/>
  <line x1="80" y1="400" x2="270" y2="200" stroke="#16897A" stroke-width="22" stroke-linecap="round"/>
  <line x1="110" y1="400" x2="300" y2="200" stroke="#16897A" stroke-width="22" stroke-linecap="round"/>
  <text x="360" y="310" font-family="Georgia,serif" font-size="96" fill="#F7F9FA" font-weight="700">NursingHomeGrade</text>
  <text x="362" y="390" font-family="Georgia,serif" font-size="32" fill="#16897A">Independent ratings · CMS data · No conflicts of interest</text>
</svg>`;
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=604800",
      },
    });
  }

  const facilityMatch = path.match(/^\/facility\/([A-Za-z0-9-]+)$/);
  if (facilityMatch?.[1]) return handleFacility(request, env, facilityMatch[1]);

  const cityMatch = path.match(/^\/state\/([a-z-]+)\/([a-z-]+)$/);
  if (cityMatch?.[1] && cityMatch?.[2]) return handleCity(request, env, cityMatch[1], cityMatch[2]);

  const stateMatch = path.match(/^\/state\/([a-z-]+)$/);
  if (stateMatch?.[1]) return handleState(request, env, stateMatch[1]);

  const html = notFoundPage(path);
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
}
