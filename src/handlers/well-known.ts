/**
 * Handler for /.well-known/ discovery endpoints per:
 * - RFC 9727 (API Catalog)
 * - RFC 8414 (OAuth 2.0 Authorization Server Metadata)
 * - RFC 9728 (OAuth Protected Resource Metadata)
 * - SEP-1649 (MCP Server Card)
 * - Agent Skills Discovery RFC v0.2.0
 */

const BASE_URL = "https://nursinghomegrade.com";

// ── /.well-known/api-catalog ────────────────────────────────────────────────
function apiCatalog(): Response {
  const body = JSON.stringify({
    linkset: [
      {
        anchor: `${BASE_URL}/`,
        rel: "service-doc",
        href: `${BASE_URL}/about`,
        type: "text/html",
        title: "NursingHomeGrade Documentation",
      },
      {
        anchor: `${BASE_URL}/`,
        rel: "service-desc",
        href: `${BASE_URL}/openapi.json`,
        type: "application/openapi+json",
        title: "NursingHomeGrade OpenAPI Specification",
      },
      {
        anchor: `${BASE_URL}/`,
        rel: "status",
        href: `${BASE_URL}/api/health`,
        type: "application/json",
        title: "Health Check",
      },
      {
        anchor: `${BASE_URL}/`,
        rel: "api-catalog",
        href: `${BASE_URL}/.well-known/api-catalog`,
        type: "application/linkset+json",
        title: "API Catalog",
      },
      {
        anchor: `${BASE_URL}/`,
        rel: "describedby",
        href: `${BASE_URL}/.well-known/mcp/server-card.json`,
        type: "application/json",
        title: "MCP Server Card",
      },
    ],
  }, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── /.well-known/oauth-authorization-server ─────────────────────────────────
function oauthAuthorizationServer(): Response {
  const body = JSON.stringify({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/oauth/authorize`,
    token_endpoint: `${BASE_URL}/oauth/token`,
    jwks_uri: `${BASE_URL}/.well-known/jwks.json`,
    registration_endpoint: `${BASE_URL}/oauth/register`,
    scopes_supported: ["read", "write"],
    response_types_supported: ["code", "token"],
    grant_types_supported: ["authorization_code", "client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    // Auth.md agent registration extension
    agent_auth: {
      skill: "https://nursinghomegrade.com/auth.md",
      register_uri: `${BASE_URL}/oauth/agent/register`,
      identity_types_supported: ["anonymous"],
      anonymous: {
        credential_types_supported: ["api_key"],
        claim_uri: `${BASE_URL}/oauth/agent/claim`,
      },
    },
  }, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── /.well-known/oauth-protected-resource ──────────────────────────────────
function oauthProtectedResource(): Response {
  const body = JSON.stringify({
    resource: BASE_URL,
    authorization_servers: [`${BASE_URL}/.well-known/oauth-authorization-server`],
    scopes_supported: ["read", "write"],
    bearer_methods_supported: ["header"],
    resource_scopes_supported: {
      "https://nursinghomegrade.com/api/*": ["read"],
      "https://nursinghomegrade.com/oauth/*": ["write"],
    },
  }, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── /.well-known/mcp/server-card.json ──────────────────────────────────────
function mcpServerCard(): Response {
  const body = JSON.stringify({
    serverInfo: {
      name: "NursingHomeGrade MCP Server",
      version: "1.0.0",
    },
    transport: {
      type: "streamable-http",
      endpoint: `${BASE_URL}/mcp`,
    },
    capabilities: {
      tools: {
        search_facilities: {
          name: "search_facilities",
          description: "Search nursing homes by ZIP code and return grades, staffing, and deficiency data",
          inputSchema: {
            type: "object",
            properties: {
              zip: { type: "string", description: "5-digit US ZIP code" },
              sort: { type: "string", enum: ["grade", "distance", "name"], description: "Sort order" },
              min_grade: { type: "string", enum: ["A", "B", "C", "D", "F"], description: "Minimum grade filter" },
            },
            required: ["zip"],
          },
        },
        get_facility: {
          name: "get_facility",
          description: "Get detailed information about a specific nursing home facility",
          inputSchema: {
            type: "object",
            properties: {
              facility_id: { type: "string", description: "CMS certification number (CCN) of the facility" },
            },
            required: ["facility_id"],
          },
        },
        compare_facilities: {
          name: "compare_facilities",
          description: "Compare multiple nursing homes side by side",
          inputSchema: {
            type: "object",
            properties: {
              ids: { type: "array", items: { type: "string" }, description: "Array of facility CCNs to compare" },
            },
            required: ["ids"],
          },
        },
        find_nearby: {
          name: "find_nearby",
          description: "Find nursing homes near a geographic location",
          inputSchema: {
            type: "object",
            properties: {
              lat: { type: "number", description: "Latitude" },
              lng: { type: "number", description: "Longitude" },
              radius_miles: { type: "number", description: "Search radius in miles (default: 25)" },
            },
            required: ["lat", "lng"],
          },
        },
        get_state_rankings: {
          name: "get_state_rankings",
          description: "Get nursing home quality rankings and statistics for a state",
          inputSchema: {
            type: "object",
            properties: {
              state: { type: "string", description: "Two-letter US state abbreviation" },
            },
            required: ["state"],
          },
        },
      },
    },
  }, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── /.well-known/agent-skills/index.json ──────────────────────────────────
function agentSkillsIndex(): Response {
  const body = JSON.stringify({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "nursing-home-search",
        type: "skill-md",
        description: "Search for nursing homes by ZIP code with quality grades, staffing data, and deficiency reports",
        url: `${BASE_URL}/.well-known/agent-skills/nursing-home-search/SKILL.md`,
        digest: "sha256:placeholder",
      },
      {
        name: "nursing-home-compare",
        type: "skill-md",
        description: "Compare nursing home facilities side-by-side across grades, staffing, and inspection metrics",
        url: `${BASE_URL}/.well-known/agent-skills/nursing-home-compare/SKILL.md`,
        digest: "sha256:placeholder",
      },
      {
        name: "state-rankings",
        type: "skill-md",
        description: "Browse nursing home quality rankings by state with aggregate statistics",
        url: `${BASE_URL}/.well-known/agent-skills/state-rankings/SKILL.md`,
        digest: "sha256:placeholder",
      },
      {
        name: "operator-research",
        type: "skill-md",
        description: "Research nursing home operators and ownership structures across facilities",
        url: `${BASE_URL}/.well-known/agent-skills/operator-research/SKILL.md`,
        digest: "sha256:placeholder",
      },
    ],
  }, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── /.well-known/openid-configuration ──────────────────────────────────────
function openIdConfiguration(): Response {
  const body = JSON.stringify({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/oauth/authorize`,
    token_endpoint: `${BASE_URL}/oauth/token`,
    jwks_uri: `${BASE_URL}/.well-known/jwks.json`,
    userinfo_endpoint: `${BASE_URL}/oauth/userinfo`,
    registration_endpoint: `${BASE_URL}/oauth/register`,
    scopes_supported: ["openid", "profile", "email", "read", "write"],
    response_types_supported: ["code", "id_token", "token id_token"],
    grant_types_supported: ["authorization_code", "implicit", "client_credentials"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    claims_supported: ["sub", "iss", "name", "email", "picture"],
  }, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── API health endpoint ────────────────────────────────────────────────────
function apiHealth(): Response {
  const body = JSON.stringify({
    status: "ok",
    service: "NursingHomeGrade",
    timestamp: new Date().toISOString(),
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── OpenAPI spec stub ──────────────────────────────────────────────────────
function openApiSpec(): Response {
  const spec = JSON.stringify({
    openapi: "3.0.3",
    info: {
      title: "NursingHomeGrade API",
      description: "API for searching and comparing U.S. nursing home quality grades based on CMS data",
      version: "1.0.0",
    },
    servers: [{ url: BASE_URL }],
    paths: {
      "/search": {
        get: {
          summary: "Search nursing homes by ZIP code",
          parameters: [
            { name: "zip", in: "query", required: true, schema: { type: "string", pattern: "^[0-9]{5}$" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["grade", "distance", "name"] } },
            { name: "min_grade", in: "query", schema: { type: "string", enum: ["A", "B", "C", "D", "F"] } },
          ],
          responses: { "200": { description: "Search results as HTML" } },
        },
      },
      "/api/compare": {
        get: {
          summary: "Compare nursing home facilities",
          parameters: [
            { name: "ids", in: "query", required: true, schema: { type: "string" }, description: "Comma-separated CCNs" },
          ],
          responses: { "200": { description: "Comparison data" } },
        },
      },
      "/api/map/facilities": {
        get: {
          summary: "Get facility geo-data for map display",
          parameters: [
            { name: "state", in: "query", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "GeoJSON facility data" } },
        },
      },
      "/api/health": {
        get: {
          summary: "Health check endpoint",
          responses: { "200": { description: "Service status" } },
        },
      },
    },
  }, null, 2);

  return new Response(spec, {
    status: 200,
    headers: {
      "Content-Type": "application/openapi+json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── Router ─────────────────────────────────────────────────────────────────
export function handleWellKnown(path: string): Response | null {
  switch (path) {
    case "/.well-known/api-catalog":
      return apiCatalog();
    case "/.well-known/oauth-authorization-server":
      return oauthAuthorizationServer();
    case "/.well-known/oauth-protected-resource":
      return oauthProtectedResource();
    case "/.well-known/openid-configuration":
      return openIdConfiguration();
    case "/.well-known/mcp/server-card.json":
      return mcpServerCard();
    case "/.well-known/agent-skills/index.json":
      return agentSkillsIndex();
    case "/api/health":
      return apiHealth();
    case "/openapi.json":
      return openApiSpec();
    default:
      return null;
  }
}
