import { describe, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/types";

describe("A2A Agent Card", () => {
  it("serves a valid Agent Card at the well-known path", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1:8787/.well-known/agent-card.json"),
      {} as Env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");

    const card = (await response.json()) as Record<string, unknown>;

    // Required AgentCard fields per the A2A Protocol Specification v1.0.0.
    expect(typeof card.name).toBe("string");
    expect(typeof card.description).toBe("string");
    expect(typeof card.version).toBe("string");
    expect(Array.isArray(card.defaultInputModes)).toBe(true);
    expect(Array.isArray(card.defaultOutputModes)).toBe(true);

    const interfaces = card.supportedInterfaces as Array<Record<string, unknown>>;
    expect(Array.isArray(interfaces)).toBe(true);
    expect(interfaces.length).toBeGreaterThan(0);
    for (const iface of interfaces) {
      expect(typeof iface.url).toBe("string");
      expect(typeof iface.protocolBinding).toBe("string");
    }

    const capabilities = card.capabilities as Record<string, unknown>;
    expect(typeof capabilities).toBe("object");

    const skills = card.skills as Array<Record<string, unknown>>;
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      expect(typeof skill.id).toBe("string");
      expect(typeof skill.name).toBe("string");
      expect(typeof skill.description).toBe("string");
    }
  });
});
