import { describe, expect, it } from "vitest";
import app from "../src/index";
import { htmlToMarkdown } from "../src/markdown";
import type { Env } from "../src/types";

function createHomeEnv(): Env {
  const db = {
    prepare(_query: string) {
      return {
        bind(..._args: unknown[]) {
          return {
            async first<T>() {
              return { pct: 42 } as T;
            },
            async all<T>() {
              return { results: [] as T[] };
            },
          };
        },
        async first<T>() {
          return { pct: 42 } as T;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
      };
    },
  };

  const cache = {
    async get() {
      return null;
    },
    async put() {
      return;
    },
  };

  return {
    DB: db as unknown as D1Database,
    CACHE: cache as unknown as KVNamespace,
  };
}

function createEmptyEnv(): Env {
  return {
    DB: {} as D1Database,
    CACHE: {
      async get() {
        return null;
      },
      async put() {
        return;
      },
    } as unknown as KVNamespace,
  };
}

describe("Link headers (RFC 8288)", () => {
  it("returns Link headers on the homepage", async () => {
    const response = await app.fetch(new Request("http://127.0.0.1:8787/"), createHomeEnv());
    expect(response.status).toBe(200);
    const linkHeader = response.headers.get("Link") || "";
    expect(linkHeader).toContain('rel="api-catalog"');
    expect(linkHeader).toContain('rel="service-doc"');
    expect(linkHeader).toContain('rel="skills"');
    expect(linkHeader).toContain('rel="mcp-server-card"');
    expect(linkHeader).toContain('rel="search"');
    expect(linkHeader).toContain('rel="collection"');
  });
});

describe("Markdown negotiation", () => {
  it("returns markdown when Accept: text/markdown is requested", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/", { headers: { Accept: "text/markdown" } }),
      createHomeEnv(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    const body = await response.text();
    expect(body).toContain("NursingHomeGrade");
    expect(body).not.toContain("<html");
  });

  it("returns HTML by default when no Accept header is set", async () => {
    const response = await app.fetch(new Request("http://127.0.0.1:8787/"), createHomeEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });
});

describe("robots.txt Content Signals", () => {
  it("includes Content-Signal directives", async () => {
    const response = await app.fetch(new Request("http://127.0.0.1:8787/robots.txt"), createEmptyEnv());
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Content-Signal:");
    expect(body).toContain("ai-train=no");
    expect(body).toContain("search=yes");
    expect(body).toContain("ai-input=yes");
  });
});

describe("API catalog (RFC 9727)", () => {
  it("returns application/linkset+json at /.well-known/api-catalog", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/api-catalog"),
      createEmptyEnv(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/linkset+json");
    const body = (await response.json()) as { linkset: Array<Record<string, unknown>> };
    expect(body.linkset).toBeDefined();
    expect(body.linkset.length).toBeGreaterThan(0);
    expect(body.linkset[0]).toHaveProperty("anchor");
    expect(body.linkset[0]).toHaveProperty("service-desc");
    expect(body.linkset[0]).toHaveProperty("service-doc");
    expect(body.linkset[0]).toHaveProperty("status");
  });
});

describe("OpenAPI spec", () => {
  it("serves /api/openapi.json", async () => {
    const response = await app.fetch(new Request("http://127.0.0.1:8787/api/openapi.json"), createEmptyEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const body = (await response.json()) as { openapi: string };
    expect(body.openapi).toMatch(/^3\.0\./);
  });
});

describe("Health endpoint", () => {
  it("returns ok at /api/health", async () => {
    const response = await app.fetch(new Request("http://127.0.0.1:8787/api/health"), createEmptyEnv());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});

describe("OAuth/OIDC discovery", () => {
  it("serves /.well-known/openid-configuration", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/openid-configuration"),
      createEmptyEnv(),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { issuer: string };
    expect(body.issuer).toBe("https://nursinghomegrade.com");
  });

  it("serves /.well-known/oauth-authorization-server", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/oauth-authorization-server"),
      createEmptyEnv(),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { issuer: string };
    expect(body.issuer).toBe("https://nursinghomegrade.com");
  });
});

describe("OAuth Protected Resource Metadata", () => {
  it("serves /.well-known/oauth-protected-resource", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/oauth-protected-resource"),
      createEmptyEnv(),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { resource: string };
    expect(body.resource).toBe("https://nursinghomegrade.com/api");
  });
});

describe("MCP Server Card", () => {
  it("serves /.well-known/mcp/server-card.json", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/mcp/server-card.json"),
      createEmptyEnv(),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { serverInfo: { name: string } };
    expect(body.serverInfo.name).toBe("NursingHomeGrade");
  });
});

describe("Agent Skills Discovery Index", () => {
  it("serves /.well-known/agent-skills/index.json", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/agent-skills/index.json"),
      createEmptyEnv(),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { $schema: string; skills: Array<Record<string, unknown>> };
    expect(body.$schema).toContain("agentskills.io");
    expect(Array.isArray(body.skills)).toBe(true);
    expect(body.skills.length).toBeGreaterThan(0);
    expect(body.skills[0]).toHaveProperty("name");
    expect(body.skills[0]).toHaveProperty("url");
    expect(body.skills[0]).toHaveProperty("sha256");
  });

  it("serves individual skill definitions", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/agent-skills/search-facilities.json"),
      createEmptyEnv(),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { name: string; inputSchema: object };
    expect(body.name).toBe("search-facilities");
    expect(body.inputSchema).toBeDefined();
  });
});

describe("htmlToMarkdown converter", () => {
  it("converts headings to markdown", () => {
    const md = htmlToMarkdown("<h1>Title</h1><h2>Subtitle</h2>");
    expect(md).toContain("# Title");
    expect(md).toContain("## Subtitle");
  });

  it("converts links to markdown", () => {
    const md = htmlToMarkdown('<a href="/about">About</a>');
    expect(md).toContain("[About](/about)");
  });

  it("converts bold and italic", () => {
    const md = htmlToMarkdown("<strong>bold</strong> <em>italic</em>");
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
  });

  it("removes script and style tags", () => {
    const md = htmlToMarkdown('<script>alert(1)</script><style>body{}</style><p>Hello</p>');
    expect(md).not.toContain("alert");
    expect(md).not.toContain("body{}");
    expect(md).toContain("Hello");
  });

  it("converts tables to markdown tables", () => {
    const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("| A | B |");
    expect(md).toContain("| 1 | 2 |");
  });
});
