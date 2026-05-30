const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "NursingHomeGrade API",
    version: "1.0.0",
    description:
      "Public API for accessing nursing home facility ratings, comparisons, and map data.",
  },
  servers: [{ url: "https://nursinghomegrade.com" }],
  paths: {
    "/api/compare": {
      get: {
        summary: "Compare facilities",
        description: "Retrieve detailed information for multiple facilities by CMS ID.",
        parameters: [
          {
            name: "ids",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Comma-separated list of CMS facility IDs",
          },
        ],
        responses: {
          "200": {
            description: "Array of facility objects",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Facility" },
                },
              },
            },
          },
          "400": { description: "Invalid or missing IDs" },
        },
      },
    },
    "/api/map/facilities": {
      get: {
        summary: "Map facilities",
        description: "Retrieve facilities within geographic bounds for map rendering.",
        parameters: [
          {
            name: "minLat",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "maxLat",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "minLng",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "maxLng",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "grades",
            in: "query",
            schema: { type: "string" },
            description: "Comma-separated grades to include (A,B,C,D,F)",
          },
        ],
        responses: {
          "200": {
            description: "Array of lightweight facility pins",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/MapPin" },
                },
              },
            },
          },
          "400": { description: "Invalid bounds" },
        },
      },
    },
    "/api/health": {
      get: {
        summary: "Health check",
        description: "Returns the health status of the API.",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Facility: {
        type: "object",
        properties: {
          cms_id: { type: "string" },
          name: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          zip: { type: "string" },
          rn_hours_per_resident_day: { type: "number", nullable: true },
          total_deficiencies: { type: "number", nullable: true },
          grade_score: { type: "number" },
          grade_letter: { type: "string" },
          grade_summary: { type: "string" },
          report_path: { type: "string" },
        },
      },
      MapPin: {
        type: "object",
        properties: {
          id: { type: "string" },
          n: { type: "string" },
          lt: { type: "number", nullable: true },
          lg: { type: "number", nullable: true },
          g: { type: "string" },
          s: { type: "number" },
          sl: { type: "string" },
        },
      },
    },
  },
};

export function openapiSpecResponse(): Response {
  return Response.json(OPENAPI_SPEC, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export function healthResponse(): Response {
  return Response.json(
    { status: "ok" },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}

export const HOME_LINK_HEADERS = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</about>; rel="service-doc"',
  '</.well-known/agent-skills/index.json>; rel="skills"',
  '</.well-known/mcp/server-card.json>; rel="mcp-server-card"',
  '</search>; rel="search"',
  '</explore>; rel="collection"',
];

export function apiCatalogResponse(): Response {
  const catalog = {
    linkset: [
      {
        anchor: "https://nursinghomegrade.com/api/compare",
        "service-desc": ["https://nursinghomegrade.com/api/openapi.json"],
        "service-doc": ["https://nursinghomegrade.com/about"],
        status: ["https://nursinghomegrade.com/api/health"],
      },
      {
        anchor: "https://nursinghomegrade.com/api/map/facilities",
        "service-desc": ["https://nursinghomegrade.com/api/openapi.json"],
        "service-doc": ["https://nursinghomegrade.com/about"],
        status: ["https://nursinghomegrade.com/api/health"],
      },
    ],
  };
  return new Response(JSON.stringify(catalog), {
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export function openidConfigurationResponse(): Response {
  const config = {
    issuer: "https://nursinghomegrade.com",
    authorization_endpoint: "https://nursinghomegrade.com/oauth/authorize",
    token_endpoint: "https://nursinghomegrade.com/oauth/token",
    jwks_uri: "https://nursinghomegrade.com/.well-known/jwks.json",
    grant_types_supported: [],
    response_types_supported: [],
    scopes_supported: [],
  };
  return Response.json(config, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}

export function oauthAuthorizationServerResponse(): Response {
  const config = {
    issuer: "https://nursinghomegrade.com",
    authorization_endpoint: "https://nursinghomegrade.com/oauth/authorize",
    token_endpoint: "https://nursinghomegrade.com/oauth/token",
    jwks_uri: "https://nursinghomegrade.com/.well-known/jwks.json",
    grant_types_supported: [],
    response_types_supported: [],
    scopes_supported: [],
  };
  return Response.json(config, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}

export function oauthProtectedResourceResponse(): Response {
  const metadata = {
    resource: "https://nursinghomegrade.com/api",
    authorization_servers: [],
    scopes_supported: [],
  };
  return Response.json(metadata, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}

export function mcpServerCardResponse(): Response {
  const card = {
    serverInfo: {
      name: "NursingHomeGrade",
      version: "1.0.0",
    },
    transport: {
      type: "http",
      endpoint: "https://nursinghomegrade.com/api",
    },
    capabilities: {
      tools: {
        listChanged: false,
      },
      resources: {
        listChanged: false,
      },
    },
  };
  return Response.json(card, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}

const SKILL_DEFINITIONS: Record<string, object> = {
  "search-facilities": {
    name: "search-facilities",
    type: "tool",
    description: "Search nursing homes by ZIP code and filter by grade",
    inputSchema: {
      type: "object",
      properties: {
        zip: {
          type: "string",
          description: "5-digit US ZIP code",
        },
        sort: {
          type: "string",
          enum: ["grade", "distance", "name"],
          default: "grade",
          description: "Sort order for results",
        },
        min_grade: {
          type: "string",
          enum: ["A", "B", "C", "D", "F"],
          description: "Minimum grade to include",
        },
      },
      required: ["zip"],
    },
  },
  "compare-facilities": {
    name: "compare-facilities",
    type: "tool",
    description: "Compare multiple nursing home facilities side by side",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of CMS facility IDs to compare",
        },
      },
      required: ["ids"],
    },
  },
  "get-facility": {
    name: "get-facility",
    type: "tool",
    description: "Get detailed information about a specific nursing home facility",
    inputSchema: {
      type: "object",
      properties: {
        cms_id: {
          type: "string",
          description: "CMS certification number (e.g., 015001)",
        },
      },
      required: ["cms_id"],
    },
  },
  "explore-map": {
    name: "explore-map",
    type: "tool",
    description: "Explore nursing home facilities on an interactive map by geographic bounds",
    inputSchema: {
      type: "object",
      properties: {
        minLat: { type: "number", description: "Minimum latitude" },
        maxLat: { type: "number", description: "Maximum latitude" },
        minLng: { type: "number", description: "Minimum longitude" },
        maxLng: { type: "number", description: "Maximum longitude" },
        grades: {
          type: "string",
          description: "Comma-separated grades to include (A,B,C,D,F)",
        },
      },
      required: ["minLat", "maxLat", "minLng", "maxLng"],
    },
  },
};

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function agentSkillsIndexResponse(): Promise<Response> {
  const skills: Array<{ name: string; type: string; description: string; url: string; sha256: string }> = [];

  for (const [key, definition] of Object.entries(SKILL_DEFINITIONS)) {
    const json = JSON.stringify(definition);
    const hash = await sha256Hex(json);
    skills.push({
      name: key,
      type: (definition as Record<string, unknown>).type as string,
      description: (definition as Record<string, unknown>).description as string,
      url: `https://nursinghomegrade.com/.well-known/agent-skills/${key}.json`,
      sha256: hash,
    });
  }

  const index = {
    $schema: "https://agentskills.io/schemas/skills-index/v0.2.0.json",
    skills,
  };

  return Response.json(index, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}

export function agentSkillResponse(name: string): Response | null {
  const definition = SKILL_DEFINITIONS[name];
  if (!definition) return null;

  return Response.json(definition, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}

export function robotsTxt(): string {
  return (
    "User-agent: *\n" +
    "Allow: /\n" +
    "Sitemap: https://nursinghomegrade.com/sitemap.xml\n" +
    "Content-Signal: ai-train=no, search=yes, ai-input=yes\n"
  );
}
