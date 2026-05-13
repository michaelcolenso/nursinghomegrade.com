import { describe, expect, it } from "vitest";
import { handleSearch } from "../src/handlers/home";
import { subscribePage } from "../src/templates/subscribe";
import type { Env } from "../src/types";

describe("search routing safety", () => {
  it("redirects invalid ZIP input without throwing", async () => {
    const response = await handleSearch(
      new Request("http://127.0.0.1:8787/search?zip=abcde"),
      {} as Env,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:8787/");
  });
});

describe("subscribe page safety", () => {
  it("escapes facility names and drops unsafe return URLs", () => {
    const html = subscribePage("<img src=x onerror=alert(1)>", "javascript:alert(1)");

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain('href="javascript:alert(1)"');
  });

  it("keeps same-origin return paths as relative links", () => {
    const html = subscribePage(
      "Sunrise Care Center",
      "https://nursinghomegrade.com/facility/015001-sunrise-care-center?from=search",
    );

    expect(html).toContain('href="/facility/015001-sunrise-care-center?from=search"');
  });
});
