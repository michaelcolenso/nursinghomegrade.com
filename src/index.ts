import type { Env } from "./types";
import { handleFacility } from "./handlers/facility";
import { handleHome, handleSearch } from "./handlers/home";
import { handleAbout } from "./handlers/about";
import { handleState, handleStatesHub } from "./handlers/state";
import { handleCity } from "./handlers/city";
import { handleCompare, handleCompareApi } from "./handlers/comparison";
import { handleExplore, handleMapApi } from "./handlers/map";
import { handleHowWeGrade } from "./handlers/how-we-grade";
import { handleOperator, handleOperatorsHub, handleOperatorsBest, handleOperatorsWorst } from "./handlers/operator";
import { handleStaffingFailures, handleHighDeficiency, handleChainsReport, handleUncorrectedDeficiencies, handleStaffingStandardRepeal } from "./handlers/reports";
import { handleBest, handleWorst } from "./handlers/best";
import { handleStateReport } from "./handlers/state-report";
import { handleWellKnown } from "./handlers/well-known";
import { subscribePage, notFoundPage, errorPage } from "./templates/subscribe";
import { htmlToMarkdown } from "./markdown";
import { OG_SVG } from "./og-svg";
import { OG_PNG_BASE64 } from "./og-png.generated";
import { methodologyPage } from "./templates/methodology";
import { contactPage } from "./templates/contact";
import { handleDataSources } from "./handlers/data-sources";

// ── Agent Discovery Link Headers (RFC 8288) ──────────────────────────────
const AGENT_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</.well-known/oauth-authorization-server>; rel="oauth-authorization-server"',
  '</.well-known/openid-configuration>; rel="http://openid.net/specs/connect/1.0/issuer"',
  '</.well-known/mcp/server-card.json>; rel="mcp-server-card"',
  '</.well-known/agent-skills/index.json>; rel="agent-skills"',
  '</.well-known/agent-card.json>; rel="agent-card"',
  '</openapi.json>; rel="service-desc"',
  '</about>; rel="service-doc"',
  '</auth.md>; rel="auth-md"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"',
].join(", ");

const SITEMAP_CACHE_KEYS: Record<string, string> = {
  "/sitemap.xml": "sitemap",
  "/sitemap-core.xml": "sitemap-core",
  "/sitemap-cities.xml": "sitemap-cities",
  "/sitemap-facilities.xml": "sitemap-facilities",
};

// ── Response wrapper: Link headers + markdown negotiation ───────────────
async function wrapResponse(
  original: Response,
  request: Request,
): Promise<Response> {
  const accept = request.headers.get("Accept") ?? "";

  // If agent requests markdown, and original is HTML, convert
  if (
    accept.includes("text/markdown") &&
    (original.headers.get("Content-Type") ?? "").includes("text/html")
  ) {
    const html = await original.clone().text();
    const md = htmlToMarkdown(html);
    const headers = new Headers();
    headers.set("Content-Type", "text/markdown;charset=UTF-8");
    headers.set("x-markdown-tokens", String(md.split(/\s+/).length));
    headers.set("Link", AGENT_LINKS);
    headers.set("Vary", "Accept");
    headers.set("Cache-Control", original.headers.get("Cache-Control") ?? "public, max-age=3600");
    return new Response(md, { status: original.status, headers });
  }

  // Every 5xx, whether from a handler's own catch or the top-level boundary,
  // must tell Googlebot the failure is transient. A 5xx without Retry-After is
  // read as the page being broken and gets demoted; with it, the crawler backs
  // off and returns. Also never cache a failure.
  if (original.status >= 500) {
    const headers = new Headers(original.headers);
    if (!headers.has("Retry-After")) headers.set("Retry-After", "120");
    headers.set("Cache-Control", "no-store");
    headers.set("Link", AGENT_LINKS);
    return new Response(original.body, {
      status: original.status,
      statusText: original.statusText,
      headers,
    });
  }

  // Add Link headers to HTML responses
  const contentType = original.headers.get("Content-Type") ?? "";
  if (contentType.includes("text/html")) {
    const headers = new Headers(original.headers);
    headers.set("Link", AGENT_LINKS);
    headers.set("Vary", "Accept");
    return new Response(original.body, {
      status: original.status,
      statusText: original.statusText,
      headers,
    });
  }

  // Non-HTML responses: add Link header if appropriate
  if (contentType.includes("application/") || contentType.includes("text/")) {
    const headers = new Headers(original.headers);
    const existingLink = headers.get("Link");
    if (!existingLink) {
      headers.set("Link", AGENT_LINKS);
    }
    return new Response(original.body, {
      status: original.status,
      statusText: original.statusText,
      headers,
    });
  }

  return original;
}

// ── /auth.md handler ────────────────────────────────────────────────────
function handleAuthMd(): Response {
  const md = `# auth.md — Agent Registration for NursingHomeGrade

## Overview

NursingHomeGrade provides machine-accessible APIs for searching and comparing
U.S. nursing home quality data. This document describes how AI agents can
discover and authenticate with our services.

## Agent Audience

AI agents, automated tools, and programmatic clients that wish to access
NursingHomeGrade data programmatically.

## Registration

NursingHomeGrade APIs are currently open and do not require authentication.
Rate limits may apply. For programmatic access, no registration is required —
simply use the endpoints documented in our API catalog.

### Anonymous Access

- **Identity type**: anonymous
- **Credential**: none required
- **Claim URI**: Not applicable (public data)

## API Discovery

- **API Catalog**: [/.well-known/api-catalog](/.well-known/api-catalog)
- **OpenAPI Spec**: [/openapi.json](/openapi.json)
- **Health Check**: [/api/health](/api/health)
- **MCP Server Card**: [/.well-known/mcp/server-card.json](/.well-known/mcp/server-card.json)
- **A2A Agent Card**: [/.well-known/agent-card.json](/.well-known/agent-card.json)

## Resource Metadata

- **Protected Resource Metadata**: [/.well-known/oauth-protected-resource](/.well-known/oauth-protected-resource)
- **Authorization Server**: [/.well-known/oauth-authorization-server](/.well-known/oauth-authorization-server)

## Supported Methods

- **HTTP GET**: All read endpoints
- **Accept: text/markdown**: All HTML pages return markdown when requested

## Documentation

See our [About page](/about) for methodology and data sources.
`;

  return new Response(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown;charset=UTF-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// ── /a2a — stub A2A interface ───────────────────────────────────────────
//
// The Agent Card at /.well-known/agent-card.json advertises this URL as its
// supportedInterfaces[0] (HTTP+JSON binding). A discovering A2A client would
// otherwise POST to /a2a/message:send (or the other REST paths the A2A
// Protocol Specification v1.0.0 HTTP+JSON binding defines relative to the
// interface URL — /message:stream, /tasks, /tasks/{id}, /tasks/{id}:cancel,
// /tasks/{id}:subscribe) per spec/a2a.proto's google.api.http annotations,
// and get a bare 404 rather than a protocol-shaped response. This site has
// no task/message execution to offer — it's a read-only data site, not a
// conversational agent — so every path under /a2a returns the same
// UNIMPLEMENTED status (google.rpc.Code 12) instead of silently 404ing,
// and points the caller at the endpoints that are actually live.
function handleA2A(): Response {
  const body = JSON.stringify({
    error: {
      code: 12,
      status: "UNIMPLEMENTED",
      message:
        "This A2A interface is published for discovery only; message and task execution are not implemented. " +
        "For live machine-readable access to NursingHomeGrade data, use the MCP server " +
        "(/.well-known/mcp/server-card.json) or the REST API (/openapi.json) instead.",
    },
  }, null, 2);

  return new Response(body, {
    status: 501,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function handleSitemap(env: Env, cacheKey: string): Promise<Response> {
  const sitemap = await env.CACHE.get(cacheKey);
  if (sitemap)
    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Link": AGENT_LINKS,
      },
    });

  const html = errorPage("Sitemap not found", "The sitemap could not be found. It may still be generating.");
  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Link": AGENT_LINKS,
    },
  });
}

// ── Main Worker ─────────────────────────────────────────────────────────

// ── Error boundary ──────────────────────────────────────────────────────
//
// Without this, any unhandled throw — a D1 timeout, a subrequest limit hit
// under a Googlebot burst, an unexpected null on a facility with sparse CMS
// data — propagates to the Workers runtime and becomes a bare 500. Googlebot
// treats a 500 as the page being broken and demotes it; it treats a 503 with
// Retry-After as temporary and comes back. Search Console showed 2,196 URLs in
// the server-error bucket, a quarter of the not-indexed deficit, suppressing
// crawl budget for everything else.
//
// Individual handlers already catch their own failures and return 503. This is
// the net beneath them, for anything thrown outside a handler's own try block.

/** Coarse route pattern for log grouping — never the raw path, which is unbounded. */
export function routePattern(path: string): string {
  if (path === "/") return "/";
  if (/^\/facility\//.test(path)) return "/facility/:id";
  if (/^\/state\/[^/]+\/report$/.test(path)) return "/state/:state/report";
  if (/^\/state\/[^/]+\/[^/]+$/.test(path)) return "/state/:state/:city";
  if (/^\/state\//.test(path)) return "/state/:state";
  if (/^\/operator\//.test(path)) return "/operator/:slug";
  if (/^\/reports\//.test(path)) return path;
  if (/^\/(best|worst)\//.test(path)) return path.startsWith("/best") ? "/best/:state" : "/worst/:state";
  return path;
}

/** CMS provider ID from a facility path, for correlating failures to a facility. */
export function providerIdFromPath(path: string): string | null {
  const m = path.match(/^\/facility\/([0-9A-Za-z]+)-/);
  return m?.[1] ?? null;
}

function handleUnexpectedError(err: unknown, request: Request): Response {
  const path = new URL(request.url).pathname;
  // Structured so failures can be grouped by route and traced to a facility.
  console.error(
    JSON.stringify({
      level: "error",
      msg: "unhandled_request_error",
      route: routePattern(path),
      path,
      provider_id: providerIdFromPath(path),
      user_agent: request.headers.get("User-Agent"),
      error: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );

  const html = errorPage(
    "Temporarily unavailable",
    "We could not load this page right now. Please try again in a few minutes.",
  );
  return new Response(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      // Tells Googlebot this is transient and worth retrying, rather than a
      // broken page to drop from the index.
      "Retry-After": "120",
      "Cache-Control": "no-store",
      "Link": AGENT_LINKS,
    },
  });
}

// nursinghomegrade.com is the only canonical host: every rendered page's
// <link rel="canonical"> and OG tags are hardcoded to it (see
// src/templates/layout.ts). But www.nursinghomegrade.com is a proxied CNAME to
// the same Worker, so without this it serves a full byte-for-byte duplicate at
// 200 instead of deferring to the canonical tag — doubling crawlable surface
// and splitting whatever signal the apex host has. Redirect before routing so
// no handler runs twice for the same request.
const CANONICAL_HOST = "nursinghomegrade.com";
const REDIRECTABLE_HOSTS = new Set(["www.nursinghomegrade.com"]);

async function route(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (REDIRECTABLE_HOSTS.has(url.hostname)) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    // ── Well-known discovery endpoints ─────────────────────────────────
    const wk = handleWellKnown(path);
    if (wk) return await wrapResponse(wk, request);

    // ── Auth.md ────────────────────────────────────────────────────────
    if (path === "/auth.md") return await wrapResponse(handleAuthMd(), request);

    // ── A2A interface stub (see handleA2A) ───────────────────────────────
    if (path === "/a2a" || path.startsWith("/a2a/")) return await wrapResponse(handleA2A(), request);

    // ── Primary page routes ────────────────────────────────────────────
    if (path === "/") return handleHome(request, env).then(r => wrapResponse(r, request));
    if (path === "/about") return handleAbout(request, env).then(r => wrapResponse(r, request));
    if (path === "/states") return handleStatesHub(request, env).then(r => wrapResponse(r, request));
    if (path === "/compare") return handleCompare(request, env).then(r => wrapResponse(r, request));
    if (path === "/search") return handleSearch(request, env).then(r => wrapResponse(r, request));
    if (path === "/explore") return handleExplore(request, env).then(r => wrapResponse(r, request));
    if (path === "/methodology") return wrapResponse(new Response(methodologyPage(), { headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" } }), request);
    if (path === "/data-sources") return handleDataSources(request, env).then(r => wrapResponse(r, request));
    if (path === "/contact") return wrapResponse(new Response(contactPage(), { headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=86400" } }), request);
    if (path === "/how-we-grade") return handleHowWeGrade(request, env).then(r => wrapResponse(r, request));
    if (path === "/api/compare") return handleCompareApi(request, env).then(r => wrapResponse(r, request));
    if (path === "/api/map/facilities") return handleMapApi(request, env).then(r => wrapResponse(r, request));

    if (path === "/operators") return handleOperatorsHub(request, env).then(r => wrapResponse(r, request));
    if (path === "/operators/best") return handleOperatorsBest(request, env).then(r => wrapResponse(r, request));
    if (path === "/operators/worst") return handleOperatorsWorst(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/staffing-standard-repeal") return handleStaffingStandardRepeal(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/staffing-failures") return handleStaffingFailures(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/high-deficiency-facilities") return handleHighDeficiency(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/chains") return handleChainsReport(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/uncorrected-deficiencies") return handleUncorrectedDeficiencies(request, env).then(r => wrapResponse(r, request));

    if (path === "/best") return handleBest(request, env).then(r => wrapResponse(r, request));
    if (path === "/worst") return handleWorst(request, env).then(r => wrapResponse(r, request));

    // ── Subscribe ──────────────────────────────────────────────────────
    if (path === "/subscribe" && request.method === "POST") {
      try {
        const form = await request.formData();
        const facilityName = form.get("facility_name")?.toString() ?? "this facility";
        const returnPath = form.get("return_path")?.toString();
        const html = subscribePage(facilityName, returnPath);
        return new Response(html, {
          headers: {
            "Content-Type": "text/html;charset=UTF-8",
            "Link": AGENT_LINKS,
          },
        });
      } catch {
        const html = errorPage(
          "Invalid submission",
          "We couldn't process your subscription. Please try again.",
          "If the problem persists, you can search for a facility and try subscribing again.",
        );
        return new Response(html, {
          status: 400,
          headers: {
            "Content-Type": "text/html;charset=UTF-8",
            "Link": AGENT_LINKS,
          },
        });
      }
    }

    // ── Sitemap ────────────────────────────────────────────────────────
    const sitemapCacheKey = SITEMAP_CACHE_KEYS[path];
    if (sitemapCacheKey) return handleSitemap(env, sitemapCacheKey);

    // Per-state facility shards, e.g. /sitemap-facilities-washington.xml.
    // Generated by scripts/sitemap.ts and stored in KV under the same name.
    const shardMatch = path.match(/^\/(sitemap-facilities-[a-z0-9-]+)\.xml$/);
    if (shardMatch?.[1]) return handleSitemap(env, shardMatch[1]);

    // ── Domain verification ────────────────────────────────────────────
    if (path === "/9a151ecdcc4348238501f41bfc227d26.txt") {
      return new Response("9a151ecdcc4348238501f41bfc227d26", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // ── robots.txt with Content Signals ────────────────────────────────
    if (path === "/robots.txt") {
      const robots = [
        "User-agent: *",
        "Allow: /",
        // Combinatorial comparison URLs — see handleCompare.
        "Disallow: /compare?",
        "Sitemap: https://nursinghomegrade.com/sitemap.xml",
        "",
        "# Content Signals — AI content usage preferences",
        "# https://contentsignals.org/",
        "Content-Signal: ai-train=no, search=yes, ai-input=yes",
        "",
        "# AI crawlers: allow search indexing, restrict training",
        "User-agent: GPTBot",
        "Allow: /",
        "Content-Signal: ai-train=no, search=yes, ai-input=yes",
        "",
        "User-agent: CCBot",
        "Allow: /",
        "Content-Signal: ai-train=no, search=yes, ai-input=no",
        "",
        "User-agent: Claude-Web",
        "Allow: /",
        "Content-Signal: ai-train=no, search=yes, ai-input=yes",
        "",
        "User-agent: Applebot-Extended",
        "Disallow: /",
        "Content-Signal: ai-train=no, search=no, ai-input=no",
        "",
        "User-agent: PerplexityBot",
        "Allow: /",
        "Content-Signal: ai-train=no, search=yes, ai-input=no",
      ].join("\n") + "\n";

      return new Response(robots, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=86400",
          "Link": AGENT_LINKS,
        },
      });
    }

    // ── OG image ───────────────────────────────────────────────────────
    // Twitter/X, Facebook, and LinkedIn don't render SVG preview images, so
    // /og.png (a pre-rendered raster of the same design, built by
    // scripts/generate-og-image.ts) is what meta tags reference by default.
    // /og.svg is kept for direct linking/debugging.
    if (path === "/og.png") {
      const bytes = Uint8Array.from(atob(OG_PNG_BASE64), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=604800",
        },
      });
    }

    if (path === "/og.svg") {
      return new Response(OG_SVG, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=604800",
        },
      });
    }

    // ── Dynamic path routes ────────────────────────────────────────────
    const operatorMatch = path.match(/^\/operator\/([a-z0-9-]+)$/);
    if (operatorMatch?.[1]) return handleOperator(request, env, operatorMatch[1]).then(r => wrapResponse(r, request));

    const staffingFailuresStateMatch = path.match(/^\/reports\/staffing-failures\/([a-z-]+)$/);
    if (staffingFailuresStateMatch?.[1]) return handleStaffingFailures(request, env, staffingFailuresStateMatch[1]).then(r => wrapResponse(r, request));

    const bestStateMatch = path.match(/^\/best\/([a-z-]+)$/);
    if (bestStateMatch?.[1]) return handleBest(request, env, bestStateMatch[1]).then(r => wrapResponse(r, request));

    const worstStateMatch = path.match(/^\/worst\/([a-z-]+)$/);
    if (worstStateMatch?.[1]) return handleWorst(request, env, worstStateMatch[1]).then(r => wrapResponse(r, request));

    const facilityMatch = path.match(/^\/facility\/([A-Za-z0-9-]+)$/);
    if (facilityMatch?.[1]) return handleFacility(request, env, facilityMatch[1]).then(r => wrapResponse(r, request));

    // Must be checked before cityMatch below: /^\/state\/([a-z-]+)\/([a-z-]+)$/
    // also matches "report" as a city slug, which sent every /state/:state/report
    // request to handleCity("report") instead of handleStateReport — a soft 404
    // (handleCity finds no facility in a nonexistent city) on every state report page.
    const stateReportMatch = path.match(/^\/state\/([a-z-]+)\/report$/);
    if (stateReportMatch?.[1]) return handleStateReport(request, env, stateReportMatch[1]).then(r => wrapResponse(r, request));

    const cityMatch = path.match(/^\/state\/([a-z-]+)\/([a-z-]+)$/);
    if (cityMatch?.[1] && cityMatch?.[2]) return handleCity(request, env, cityMatch[1], cityMatch[2]).then(r => wrapResponse(r, request));

    const stateMatch = path.match(/^\/state\/([a-z-]+)$/);
    if (stateMatch?.[1]) return handleState(request, env, stateMatch[1]).then(r => wrapResponse(r, request));

    // ── 404 ────────────────────────────────────────────────────────────
    const html = notFoundPage(path);
    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Link": AGENT_LINKS,
      },
    });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (err) {
      return handleUnexpectedError(err, request);
    }
  },
} satisfies ExportedHandler<Env>;
