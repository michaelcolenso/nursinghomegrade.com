import { readFileSync, writeFileSync, rmSync } from "node:fs";

function patch(path, before, after) {
  let source = readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Expected fragment missing in ${path}`);
  source = source.replace(before, after);
  writeFileSync(path, source);
}

patch(
  "src/db.ts",
  `FROM facilities WHERE state = ? ORDER BY grade_score DESC LIMIT ?`,
  `FROM facilities WHERE state = ? AND grade_letter != 'NR' AND grade_score >= 0 ORDER BY grade_score DESC LIMIT ?`,
);

patch(
  "src/templates/state.ts",
  `function renderGradeDistribution(dist: Record<string, number>, total: number): string {\n  const letters = ["A", "B", "C", "D", "F"];\n  return \``,
  `function renderGradeDistribution(dist: Record<string, number>, _total: number): string {\n  const letters = ["A", "B", "C", "D", "F"];\n  const ratedTotal = letters.reduce((sum, letter) => sum + (dist[letter] ?? 0), 0);\n  const notRated = dist.NR ?? 0;\n  return \``,
);
patch(
  "src/templates/state.ts",
  `        const pct = (count / total) * 100;`,
  `        const pct = ratedTotal > 0 ? (count / ratedTotal) * 100 : 0;`,
);
patch(
  "src/templates/state.ts",
  `    </div>\n  \`;\n}\n\nfunction renderFacilityItem`,
  `    </div>\n    \${notRated > 0 ? \`<p style="margin-top:var(--space-s);color:var(--muted);font-size:0.9rem;"><strong>\${notRated}</strong> \${notRated === 1 ? "facility is" : "facilities are"} not rated because current inspection evidence is insufficient. A–F percentages above use rated facilities only.</p>\` : ""}\n  \`;\n}\n\nfunction renderFacilityItem`,
);

patch(
  "src/templates/city.ts",
  `function renderCityGradeDistribution(dist: Record<string, number>, total: number): string {\n  const letters = ["A", "B", "C", "D", "F"];\n  return \``,
  `function renderCityGradeDistribution(dist: Record<string, number>, _total: number): string {\n  const letters = ["A", "B", "C", "D", "F"];\n  const ratedTotal = letters.reduce((sum, letter) => sum + (dist[letter] ?? 0), 0);\n  const notRated = dist.NR ?? 0;\n  return \``,
);
patch(
  "src/templates/city.ts",
  `        const pct = total > 0 ? (count / total) * 100 : 0;`,
  `        const pct = ratedTotal > 0 ? (count / ratedTotal) * 100 : 0;`,
);
patch(
  "src/templates/city.ts",
  `    </div>\n  \`;\n}\n\nfunction renderCityRelatedLinks`,
  `    </div>\n    \${notRated > 0 ? \`<p style="margin-top:var(--space-xs);color:var(--muted);font-size:0.85rem;"><strong>\${notRated}</strong> \${notRated === 1 ? "facility is" : "facilities are"} not rated because current inspection evidence is insufficient. A–F percentages above use rated facilities only.</p>\` : ""}\n  \`;\n}\n\nfunction renderCityRelatedLinks`,
);

rmSync("scripts/patch-nr-aggregates.mjs");
rmSync(".github/workflows/nr-aggregates-patch.yml");
console.log("Patched NR-aware rankings and grade distributions; removed one-shot files.");
