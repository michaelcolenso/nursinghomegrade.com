import { readFileSync, writeFileSync, rmSync } from "node:fs";

function replaceOnce(path, before, after) {
  let source = readFileSync(path, "utf8");
  if (!source.includes(before)) {
    if (source.includes(after)) return;
    throw new Error(`Expected fragment missing in ${path}: ${before.slice(0, 120)}`);
  }
  source = source.replace(before, after);
  writeFileSync(path, source);
}

// Search results: never render the storage sentinel as a score, and pass the
// persisted completeness state through to the explanatory copy.
replaceOnce(
  "src/templates/home.ts",
  'import { scoreToSummary } from "../scoring";',
  'import { scoreToSummary, type ScoreInputKey } from "../scoring";',
);
replaceOnce(
  "src/templates/home.ts",
  '<span class="grade-${f.grade_letter} result-grade-letter">${escHtml(f.grade_letter)}</span>\n              <span class="result-grade-score">${f.grade_score}/100</span>',
  '<span class="grade-${f.grade_letter} result-grade-letter">${f.grade_letter === "NR" ? "NR" : escHtml(f.grade_letter)}</span>\n              <span class="result-grade-score">${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : `${f.grade_score}/100`}</span>',
);
replaceOnce(
  "src/templates/home.ts",
  '${escHtml(scoreToSummary(f.grade_score, f.grade_letter, f.rn_hours_per_resident_day))}',
  '${escHtml(scoreToSummary(\n                f.grade_score < 0 ? null : f.grade_score,\n                f.grade_letter === "NR" ? null : f.grade_letter,\n                f.rn_hours_per_resident_day,\n                f.grade_completeness ?? (f.grade_letter === "NR" ? "insufficient" : "complete"),\n                (f.grade_missing_inputs ?? "").split(",").filter(Boolean) as ScoreInputKey[],\n              ))}',
);
replaceOnce(
  "src/templates/home.ts",
  'm.bindPopup(\\`<strong>\\${f.n}</strong><br>Grade \\${f.g} (\\${f.s}/100)<br><a href="/facility/\\${f.id}-\\${f.sl}">View Details →</a>\\`);',
  'm.bindPopup(\\`<strong>\\${f.n}</strong><br>\\${f.g === "NR" || Number(f.s) < 0 ? "Not rated" : `Grade ${f.g} (${f.s}/100)`}<br><a href="/facility/\\${f.id}-\\${f.sl}">View Details →</a>\\`);',
);

// City discovery cards and cross-city links.
replaceOnce(
  "src/templates/city.ts",
  '${escHtml(f.name)} — ${escHtml(f.city)} (Grade ${escHtml(f.grade_letter)})',
  '${escHtml(f.name)} — ${escHtml(f.city)} (${f.grade_letter === "NR" ? "Not rated" : `Grade ${escHtml(f.grade_letter)}`})',
);
replaceOnce(
  "src/templates/city.ts",
  '<div class="grade-badge-letter" style="font-size:2.5rem;font-weight:900;line-height:1;">${f.grade_letter}</div>\n              <div class="grade-badge-score" style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${f.grade_score}/100</div>',
  '<div class="grade-badge-letter" style="font-size:2.5rem;font-weight:900;line-height:1;">${f.grade_letter === "NR" ? "NR" : f.grade_letter}</div>\n              <div class="grade-badge-score" style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : `${f.grade_score}/100`}</div>',
);

// State cards.
replaceOnce(
  "src/templates/state.ts",
  '<div class="grade-badge-letter" style="font-size: 1.75rem;">${f.grade_letter}</div>\n          <div class="grade-badge-score" style="font-size: 0.6rem;">${f.grade_score}</div>',
  '<div class="grade-badge-letter" style="font-size: 1.75rem;">${f.grade_letter === "NR" ? "NR" : f.grade_letter}</div>\n          <div class="grade-badge-score" style="font-size: 0.6rem;">${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : f.grade_score}</div>',
);

// Client-side comparison table.
replaceOnce(
  "src/templates/compare.ts",
  '\\${facilities.map(function(f) { return \\`<td style="padding: 1rem;"><strong class="grade-\\${esc(f.grade_letter)}">\\${esc(f.grade_letter)}</strong> (\\${esc(f.grade_score)}/100)</td>\\`; }).join(\'\')}',
  '\\${facilities.map(function(f) { return f.grade_letter === "NR" || Number(f.grade_score) < 0 ? \\`<td style="padding: 1rem;"><strong>Not rated</strong></td>\\` : \\`<td style="padding: 1rem;"><strong class="grade-\\${esc(f.grade_letter)}">\\${esc(f.grade_letter)}</strong> (\\${esc(f.grade_score)}/100)</td>\\`; }).join(\'\')}',
);

// National explore map popup.
replaceOnce(
  "src/templates/explore.ts",
  '<div style="font-weight:800;text-transform:uppercase;font-size:0.7rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:0.25rem;">Grade \\${f.g} (\\${f.s}/100)</div>',
  '<div style="font-weight:800;text-transform:uppercase;font-size:0.7rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:0.25rem;">\\${f.g === "NR" || Number(f.s) < 0 ? "Not rated" : `Grade ${f.g} (${f.s}/100)`}</div>',
);

// This is deliberately one-shot. The workflow commits the real source changes
// and deletes both the patcher and itself in the same commit.
rmSync("scripts/patch-nr-surfaces.mjs");
rmSync(".github/workflows/nr-surfaces-patch.yml");
console.log("Patched public NR surfaces and removed one-shot patch files.");
