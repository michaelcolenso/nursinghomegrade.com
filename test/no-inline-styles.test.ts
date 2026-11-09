import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Templates may carry style="…" only for CSS custom properties that hold data
// (style="--pct:42%"). The Phase 5 migration is complete: every template is covered.
// Do not reintroduce static inline styles; add a class to src/styles instead.
const dir = "src/templates";
const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));

describe("no static inline styles in any template", () => {
  for (const file of files) {
    it(`${file} uses only custom-property style attributes`, () => {
      const source = readFileSync(join(dir, file), "utf8");
      const offenders = [...source.matchAll(/style="(?!--)[^"]{0,60}/g)].map((m) => m[0]);
      expect(offenders).toEqual([]);
    });
  }

  it("covers every template file", () => {
    expect(files.length).toBeGreaterThanOrEqual(25);
  });
});
