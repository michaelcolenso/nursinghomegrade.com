import { describe, expect, it } from "vitest";
import { TOKENS_CSS } from "../src/styles/tokens";

// Parse the real token values so the test cannot drift from the stylesheet.
const tokens = new Map<string, string>();
for (const m of TOKENS_CSS.matchAll(/(--[A-Za-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) {
  tokens.set(m[1] as string, (m[2] as string).toUpperCase());
}
const hex = (name: string): string => {
  const v = tokens.get(name);
  if (!v) throw new Error(`token ${name} not found as a hex value in tokens.ts`);
  return v;
};

function luminance(color: string): number {
  const channel = (i: number) => {
    const c = parseInt(color.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const ratio = (fg: string, bg: string) => contrast(hex(fg), hex(bg));

const GRADES = ["A", "B", "C", "D", "F", "NR"] as const;

describe("design tokens: text contrast (WCAG 1.4.3, >= 4.5:1)", () => {
  const textTokens = ["--navy-900", "--slate-600", "--teal-700", "--teal-800", ...GRADES.map((g) => `--grade-${g}-ink`)];
  for (const bg of ["--surface", "--bg"]) {
    for (const fg of textTokens) {
      it(`${fg} on ${bg}`, () => {
        expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  for (const bg of ["--navy-900", "--navy-800", "--teal-700", "--teal-800", "--grade-F-ink"]) {
    it(`--surface (white) on ${bg}`, () => {
      expect(ratio("--surface", bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it("teal link text on the teal tint panel", () => {
    expect(ratio("--teal-700", "--teal-50")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("design tokens: non-text UI contrast (WCAG 1.4.11, >= 3:1)", () => {
  it("--teal-600 brand teal on white is large-text/UI only", () => {
    expect(ratio("--teal-600", "--surface")).toBeGreaterThanOrEqual(3);
    // Documented limitation: it must NOT be used for small text.
    expect(ratio("--teal-600", "--surface")).toBeLessThan(4.5);
  });
  for (const bg of ["--surface", "--bg"]) {
    it(`--line-strong (input and secondary-button borders) vs ${bg}`, () => {
      expect(ratio("--line-strong", bg)).toBeGreaterThanOrEqual(3);
    });
  }
  it("--line is decorative only: it is intentionally below 3:1", () => {
    expect(ratio("--line", "--surface")).toBeLessThan(3);
  });
});

describe("design tokens: grade ramp", () => {
  it("defines fill, ink and tint for every grade", () => {
    for (const g of GRADES) {
      for (const kind of ["fill", "ink", "tint"]) expect(tokens.has(`--grade-${g}-${kind}`)).toBe(true);
    }
  });
  it("keeps burgundy retired", () => {
    expect(TOKENS_CSS.toLowerCase()).not.toContain("#9f1239");
  });
});
