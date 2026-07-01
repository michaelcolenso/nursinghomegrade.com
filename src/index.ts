import type { Env } from "./types";
import { handleFacility } from "./handlers/facility";
import { handleHome, handleSearch } from "./handlers/home";
import { handleAbout } from "./handlers/about";
import { handleState, handleStatesHub } from "./handlers/state";
import { handleCity } from "./handlers/city";
import { handleCompare, handleCompareApi } from "./handlers/comparison";
import { handleExplore, handleMapApi } from "./handlers/map";
import { handleOperator, handleOperatorsHub, handleOperatorsBest, handleOperatorsWorst } from "./handlers/operator";
import { handleStaffingFailures, handleHighDeficiency, handleChainsReport } from "./handlers/reports";
import { handleBest, handleWorst } from "./handlers/best";
import { handleStateReport } from "./handlers/state-report";
import { handleWellKnown } from "./handlers/well-known";
import { subscribePage, notFoundPage, errorPage } from "./templates/subscribe";
import { htmlToMarkdown } from "./markdown";

// ── Agent Discovery Link Headers (RFC 8288) ──────────────────────────────
const AGENT_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</.well-known/oauth-authorization-server>; rel="oauth-authorization-server"',
  '</.well-known/openid-configuration>; rel="http://openid.net/specs/connect/1.0/issuer"',
  '</.well-known/mcp/server-card.json>; rel="mcp-server-card"',
  '</.well-known/agent-skills/index.json>; rel="agent-skills"',
  '</openapi.json>; rel="service-desc"',
  '</about>; rel="service-doc"',
  '</auth.md>; rel="auth-md"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"',
].join(", ");

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

// ── Main Worker ─────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Well-known discovery endpoints ─────────────────────────────────
    const wk = handleWellKnown(path);
    if (wk) return await wrapResponse(wk, request);

    // ── Auth.md ────────────────────────────────────────────────────────
    if (path === "/auth.md") return await wrapResponse(handleAuthMd(), request);

    // ── Primary page routes ────────────────────────────────────────────
    if (path === "/") return handleHome(request, env).then(r => wrapResponse(r, request));
    if (path === "/about") return handleAbout(request, env).then(r => wrapResponse(r, request));
    if (path === "/states") return handleStatesHub(request, env).then(r => wrapResponse(r, request));
    if (path === "/compare") return handleCompare(request, env).then(r => wrapResponse(r, request));
    if (path === "/search") return handleSearch(request, env).then(r => wrapResponse(r, request));
    if (path === "/explore") return handleExplore(request, env).then(r => wrapResponse(r, request));
    if (path === "/api/compare") return handleCompareApi(request, env).then(r => wrapResponse(r, request));
    if (path === "/api/map/facilities") return handleMapApi(request, env).then(r => wrapResponse(r, request));

    if (path === "/operators") return handleOperatorsHub(request, env).then(r => wrapResponse(r, request));
    if (path === "/operators/best") return handleOperatorsBest(request, env).then(r => wrapResponse(r, request));
    if (path === "/operators/worst") return handleOperatorsWorst(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/staffing-failures") return handleStaffingFailures(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/high-deficiency-facilities") return handleHighDeficiency(request, env).then(r => wrapResponse(r, request));
    if (path === "/reports/chains") return handleChainsReport(request, env).then(r => wrapResponse(r, request));

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
    if (path === "/sitemap.xml") {
      const sitemap = await env.CACHE.get("sitemap");
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
    if (path === "/og.svg") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B1D33"/>
  <rect x="80" y="200" width="70" height="200" rx="6" fill="#E6EBEF"/>
  <rect x="200" y="200" width="70" height="200" rx="6" fill="#E6EBEF"/>
  <line x1="80" y1="400" x2="270" y2="200" stroke="#16897A" stroke-width="22" stroke-linecap="round"/>
  <line x1="110" y1="400" x2="300" y2="200" stroke="#16897A" stroke-width="22" stroke-linecap="round"/>
  <text x="360" y="310" font-family="Playfair Display,Georgia,serif" font-size="96" fill="#F7F9FA" font-weight="700">NursingHomeGrade</text>
  <text x="362" y="390" font-family="Playfair Display,Georgia,serif" font-size="32" fill="#16897A">Independent ratings · CMS data · No conflicts of interest</text>
</svg>`;
      return new Response(svg, {
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

    const cityMatch = path.match(/^\/state\/([a-z-]+)\/([a-z-]+)$/);
    if (cityMatch?.[1] && cityMatch?.[2]) return handleCity(request, env, cityMatch[1], cityMatch[2]).then(r => wrapResponse(r, request));

    const stateReportMatch = path.match(/^\/state\/([a-z-]+)\/report$/);
    if (stateReportMatch?.[1]) return handleStateReport(request, env, stateReportMatch[1]).then(r => wrapResponse(r, request));

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
  },
} satisfies ExportedHandler<Env>;
