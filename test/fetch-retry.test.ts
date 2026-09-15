import { afterEach, describe, expect, it } from "vitest";
import { fetchAndRead, fetchWithRetry, isTransientNetworkError, isTransientStatus } from "../src/fetch-retry";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function resetError(): TypeError {
  const err = new TypeError("fetch failed");
  (err as Error & { cause: NodeJS.ErrnoException }).cause = Object.assign(new Error("read ECONNRESET"), {
    code: "ECONNRESET",
    errno: -104,
    syscall: "read",
  });
  return err;
}

describe("isTransientNetworkError", () => {
  it("recognizes undici ECONNRESET wrapped as fetch failed", () => {
    expect(isTransientNetworkError(resetError())).toBe(true);
  });

  it("does not treat a generic TypeError as transient", () => {
    expect(isTransientNetworkError(new TypeError("boom"))).toBe(false);
  });
});

describe("isTransientStatus", () => {
  it("retries edge / rate-limit statuses only", () => {
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(404)).toBe(false);
    expect(isTransientStatus(200)).toBe(false);
  });
});

describe("fetchWithRetry", () => {
  it("retries ECONNRESET then returns the successful response", async () => {
    let n = 0;
    globalThis.fetch = async () => {
      n += 1;
      if (n < 3) throw resetError();
      return new Response("ok", { status: 200 });
    };
    const res = await fetchWithRetry("https://nursinghomegrade.com/sitemap.xml", undefined, {
      retries: 4,
      backoffMs: 1,
    });
    expect(res.status).toBe(200);
    expect(n).toBe(3);
  });

  it("retries 503 then returns the later 200", async () => {
    let n = 0;
    globalThis.fetch = async () => {
      n += 1;
      return new Response("", { status: n < 2 ? 503 : 200 });
    };
    const res = await fetchWithRetry("https://nursinghomegrade.com/sitemap-cities.xml", undefined, {
      retries: 3,
      backoffMs: 1,
    });
    expect(res.status).toBe(200);
    expect(n).toBe(2);
  });

  it("does not retry a 404", async () => {
    let n = 0;
    globalThis.fetch = async () => {
      n += 1;
      return new Response("missing", { status: 404 });
    };
    const res = await fetchWithRetry("https://nursinghomegrade.com/missing", undefined, {
      retries: 3,
      backoffMs: 1,
    });
    expect(res.status).toBe(404);
    expect(n).toBe(1);
  });

  it("rethrows after retries are exhausted", async () => {
    let n = 0;
    globalThis.fetch = async () => {
      n += 1;
      throw resetError();
    };
    await expect(
      fetchWithRetry("https://nursinghomegrade.com/sitemap.xml", undefined, { retries: 2, backoffMs: 1 }),
    ).rejects.toThrow("fetch failed");
    expect(n).toBe(3);
  });
});

function socketError(): Error {
  return Object.assign(new Error("terminated"), { code: "UND_ERR_SOCKET" });
}

describe("fetchAndRead", () => {
  it("retries when headers succeed but the body stream resets", async () => {
    let n = 0;
    globalThis.fetch = async () => {
      n += 1;
      if (n === 1) {
        return {
          status: 200,
          ok: true,
          headers: new Headers(),
          text: async () => {
            throw socketError();
          },
          arrayBuffer: async () => new ArrayBuffer(0),
        } as unknown as Response;
      }
      return new Response("<urlset></urlset>", { status: 200 });
    };
    const res = await fetchAndRead("https://nursinghomegrade.com/sitemap-facilities-florida.xml", undefined, {
      retries: 3,
      backoffMs: 1,
    });
    expect(res.status).toBe(200);
    expect(res.text).toContain("urlset");
    expect(n).toBe(2);
  });
});
