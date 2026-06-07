import { describe, it, expect } from "vitest";
import { normalizeOwnerName, toOperatorSlug } from "../src/ownership";

describe("normalizeOwnerName", () => {
  it("removes punctuation and collapses whitespace", () => {
    expect(normalizeOwnerName("ABC Healthcare LLC")).toBe("ABC HEALTHCARE");
    expect(normalizeOwnerName("ABC Healthcare, LLC")).toBe("ABC HEALTHCARE");
    expect(normalizeOwnerName("A.B.C. Healthcare")).toBe("ABC HEALTHCARE");
  });

  it("removes common legal suffixes", () => {
    expect(normalizeOwnerName("Genesis Healthcare Inc")).toBe("GENESIS HEALTHCARE");
    expect(normalizeOwnerName("Prime Management, LLP")).toBe("PRIME MANAGEMENT");
    expect(normalizeOwnerName("Valley Care Corp")).toBe("VALLEY CARE");
  });

  it("handles empty and null inputs", () => {
    expect(normalizeOwnerName("")).toBe("");
    expect(normalizeOwnerName("   ")).toBe("");
  });

  it("uppercases everything", () => {
    expect(normalizeOwnerName("Sunrise Senior Living")).toBe("SUNRISE SENIOR LIVING");
  });
});

describe("toOperatorSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(toOperatorSlug("Genesis Healthcare")).toBe("genesis-healthcare");
  });

  it("strips special characters", () => {
    expect(toOperatorSlug("Beverly Hills Care & Rehab, LLC")).toBe("beverly-hills-care-rehab-llc");
  });

  it("collapses multiple hyphens", () => {
    expect(toOperatorSlug("A  B   C")).toBe("a-b-c");
  });
});
