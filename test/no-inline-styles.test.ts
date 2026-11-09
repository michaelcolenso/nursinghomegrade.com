import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// After a page is migrated to the component library its template may carry
// style="…" only for CSS custom properties that hold data (style="--pct:42%").
// UNMIGRATED shrinks with each phase of docs/design-overhaul/PLAN.md; it must be
// empty by Phase 5. Never add a file to it.
const UNMIGRATED = new Set([
  "about.ts", "ask.ts", "contact.ts", "data-sources.ts", "faq.ts", "glossary.ts",
  "how-we-grade.ts", "methodology.ts", "privacy.ts", "reports.ts", "staffing-repeal.ts",
  "state-report.ts", "subscribe.ts", "terms.ts",
]);

const dir = "src/templates";
const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));

describe("no static inline styles in migrated templates", () => {
  for (const file of files.filter((f) => !UNMIGRATED.has(f))) {
    it(`${file} uses only custom-property style attributes`, () => {
      const source = readFileSync(join(dir, file), "utf8");
      const offenders = [...source.matchAll(/style="(?!--)[^"]{0,60}/g)].map((m) => m[0]);
      expect(offenders).toEqual([]);
    });
  }

  it("the allowlist only names files that exist and still need migrating", () => {
    for (const file of UNMIGRATED) {
      expect(files, `${file} is allowlisted but missing`).toContain(file);
      const source = readFileSync(join(dir, file), "utf8");
      expect(/style="(?!--)/.test(source), `${file} is clean: remove it from UNMIGRATED`).toBe(true);
    }
  });
});
