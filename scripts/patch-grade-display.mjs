import { readFileSync, writeFileSync } from "node:fs";

const path = "src/templates/facility.ts";
let source = readFileSync(path, "utf8");

const replacements = [
  [
    'import { scoreToSummary } from "../scoring";',
    'import { scoreToSummary, type ScoreInputKey } from "../scoring";',
  ],
  [
    '              <span><strong>${f.grade_score}/100</strong> score</span>',
    '              <span><strong>${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : `${f.grade_score}/100`}</strong> score</span>',
  ],
  [
    '      ${escHtml(scoreToSummary(f.grade_score, f.grade_letter, f.rn_hours_per_resident_day))}',
    '      ${escHtml(scoreToSummary(\n        f.grade_score < 0 ? null : f.grade_score,\n        f.grade_letter === "NR" ? null : f.grade_letter,\n        f.rn_hours_per_resident_day,\n        f.grade_completeness ?? (f.grade_letter === "NR" ? "insufficient" : "complete"),\n        (f.grade_missing_inputs ?? "").split(",").filter(Boolean) as ScoreInputKey[],\n      ))}',
  ],
  [
    '          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:\'Source Sans 3\',system-ui,sans-serif;font-size:2.5rem;text-align:right;">${f.grade_score}/100</td>',
    '          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:\'Source Sans 3\',system-ui,sans-serif;font-size:2.5rem;text-align:right;">${f.grade_letter === "NR" || f.grade_score < 0 ? "Not rated" : `${f.grade_score}/100`}</td>',
  ],
  [
    '  const additionalProperty: Array<Record<string, unknown>> = [\n    { "@type": "PropertyValue", "name": "NursingHomeGrade Score", "value": f.grade_score, "unitText": "out of 100" },\n    { "@type": "PropertyValue", "name": "NursingHomeGrade Letter Grade", "value": f.grade_letter },\n  ];',
    '  const additionalProperty: Array<Record<string, unknown>> = [];\n  if (f.grade_letter !== "NR" && f.grade_score >= 0) {\n    additionalProperty.push(\n      { "@type": "PropertyValue", "name": "NursingHomeGrade Score", "value": f.grade_score, "unitText": "out of 100" },\n      { "@type": "PropertyValue", "name": "NursingHomeGrade Letter Grade", "value": f.grade_letter },\n    );\n  }\n  additionalProperty.push({\n    "@type": "PropertyValue",\n    "name": "NursingHomeGrade Data Completeness",\n    "value": f.grade_completeness ?? (f.grade_letter === "NR" ? "insufficient" : "complete"),\n  });',
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Expected facility template fragment not found:\n${before.slice(0, 160)}`);
  }
  source = source.replace(before, after);
}

writeFileSync(path, source);
console.log(`Patched ${path} for explicit partial / not-rated display semantics.`);
