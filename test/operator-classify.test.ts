import { describe, expect, it } from "vitest";
import {
  classifyOperatorName,
  computeOperatorScore,
  operatorTier,
} from "../src/operator-classify";

describe("classifyOperatorName", () => {
  it("keeps genuine care operators", () => {
    for (const name of [
      "ENSIGN SERVICES",
      "GENESIS HEALTHCARE",
      "LIFE CARE CENTERS OF AMERICA",
      "TRILOGY MANAGEMENT SERVICES",
      "SABER HEALTHCARE GROUP",
      "PRESTON AUBREY",
      "THE EVANGELICAL LUTHERAN GOOD SAMARITAN SOCIETY",
      "AMERICAN SENIOR COMMUNITIES",
      "NEW YORK CITY HEALTH AND HOSPITALS",
    ]) {
      expect(classifyOperatorName(name), name).toBe("operator");
    }
  });

  it("drops financial institutions", () => {
    for (const name of [
      "UNIVEST BANK AND TRUST",
      "CIBC BANK USA",
      "WELLS FARGO",
      "JPMORGAN CHASE BANK",
    ]) {
      expect(classifyOperatorName(name), name).toBe("financial");
    }
  });

  it("drops REITs and investment funds", () => {
    for (const name of [
      "WELLTOWER",
      "WELLTOWER OP",
      "WELLTOWER NNN GROUP",
      "BLACKROCK",
      "VANGUARD GROUP",
      "CARETRUST REIT",
      "AMERICAN HEALTHCARE REIT",
    ]) {
      expect(classifyOperatorName(name), name).toBe("financial");
    }
  });

  it("drops audit and accounting firms", () => {
    for (const name of [
      "FORVIS MAZARS",
      "CLIFTONLARSONALLEN",
      "WIPFLI",
      "BAKER TILLY US",
      "CITRIN COOPERMAN ADVISORS",
      "MARSH AND MCLENNAN COMPANIES",
    ]) {
      expect(classifyOperatorName(name), name).toBe("financial");
    }
  });

  it("drops trusts and foundations", () => {
    for (const name of [
      "BILLY SCHINDELE 2020 IRRV TR",
      "P G DANIEL TRUST",
      "CRAIG FLASHNER 2007 TRUST",
      "MARGOT AND TOM PRITZKER FOUNDATION",
      "DOROS GENERATION TRUST UAD 1312",
    ]) {
      expect(classifyOperatorName(name), name).toBe("financial");
    }
  });

  it("drops property and holding shells without care vocabulary", () => {
    for (const name of ["RC TIER PROPERTIES", "POLLAK HOLDINGS", "RKS HOLDINGS", "EU SNF HOLDINGS"]) {
      expect(classifyOperatorName(name), name).toBe("financial");
    }
  });

  it("keeps empty-name handling safe", () => {
    expect(classifyOperatorName("")).toBe("excluded");
    expect(classifyOperatorName("   ")).toBe("excluded");
  });
});

describe("operatorTier", () => {
  it("assigns tiers by facility count", () => {
    expect(operatorTier(2)).toBe("Small");
    expect(operatorTier(4)).toBe("Small");
    expect(operatorTier(5)).toBe("Mid");
    expect(operatorTier(19)).toBe("Mid");
    expect(operatorTier(20)).toBe("Large");
    expect(operatorTier(99)).toBe("Large");
    expect(operatorTier(100)).toBe("Mega");
    expect(operatorTier(297)).toBe("Mega");
  });
});

describe("computeOperatorScore", () => {
  it("weights grade at 70%", () => {
    // Perfect staffing + deficiencies, grade 50 → score should lean on grade.
    const score = computeOperatorScore(50, 0.75, 0);
    expect(score).toBe(65); // 0.7*50 + 0.15*100 + 0.15*100
  });

  it("credits strong staffing", () => {
    const lowStaff = computeOperatorScore(80, 0.3, 5);
    const highStaff = computeOperatorScore(80, 1.2, 5);
    expect(highStaff).toBeGreaterThan(lowStaff);
  });

  it("penalizes deficiencies", () => {
    const clean = computeOperatorScore(80, 0.6, 0);
    const dirty = computeOperatorScore(80, 0.6, 20);
    expect(clean).toBeGreaterThan(dirty);
  });

  it("uses neutral 50 for missing data", () => {
    const score = computeOperatorScore(80, null, null);
    expect(score).toBe(71); // 0.7*80 + 0.15*50 + 0.15*50
  });

  it("clamps to 0-100", () => {
    expect(computeOperatorScore(100, 1.5, 0)).toBeLessThanOrEqual(100);
    expect(computeOperatorScore(0, 0, 100)).toBeGreaterThanOrEqual(0);
  });
});
