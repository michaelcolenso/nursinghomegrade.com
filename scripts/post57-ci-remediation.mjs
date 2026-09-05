import { readFileSync, writeFileSync } from "node:fs";

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change made to ${path}`);
  writeFileSync(path, after);
}

update("src/templates/home.ts", (source) => {
  const lines = source.split("\n");
  const i = lines.findIndex((line) => line.includes("m.bindPopup") && line.includes("Not rated"));
  if (i < 0) throw new Error("NR map popup line not found");
  lines[i] = '              m.bindPopup(\\`<strong>\\${f.n}</strong><br>\\${f.g === "NR" || Number(f.s) < 0 ? "Not rated" : "Grade " + f.g + " (" + f.s + "/100)"}<br><a href="/facility/\\${f.id}-\\${f.sl}">View Details →</a>\\`);';
  return lines.join("\n");
});

update("test/scoring.test.ts", (source) =>
  source.replace(/(staffingRating:\s*[^,\n]+,\n)(\s*\})/g, "$1      inspectionEvidenceAvailable: true,\n$2"),
);

update("test/grade-penalties.test.ts", (source) => {
  let next = source.replace(
    "  staffingRating: 5,\n};",
    "  staffingRating: 5,\n  inspectionEvidenceAvailable: true,\n};",
  );
  next = next.replace(
    "      staffingRating: 1,\n    };",
    "      staffingRating: 1,\n      inspectionEvidenceAvailable: true,\n    };",
  );
  next = next.replace(
    "computeGrade({ rnHoursPerResidentDay: 0, totalDeficiencies: 99, qualityRating: 1, staffingRating: 1 }, many)",
    "computeGrade({ rnHoursPerResidentDay: 0, totalDeficiencies: 99, qualityRating: 1, staffingRating: 1, inspectionEvidenceAvailable: true }, many)",
  );
  return next;
});

update("test/ingest.test.ts", (source) => source.replace(
  '  rating_cycle_1_total_number_of_health_deficiencies: "7",\n',
  '  rating_cycle_1_total_number_of_health_deficiencies: "7",\n  rating_cycle_1_standard_survey_health_date: "2024-03-01",\n',
));

update("test/state.handler.test.ts", (source) => source.replace(
  'query.includes("grade_score, grade_letter, rn_hours_per_resident_day") && query.includes("FROM facilities WHERE state = ? ORDER BY grade_score DESC LIMIT ?")',
  'query.includes("grade_score, grade_letter, rn_hours_per_resident_day") && query.includes("FROM facilities WHERE state = ?") && query.includes("ORDER BY grade_score DESC LIMIT ?")',
));

update("scripts/stats-sql.ts", (source) => source.replace(
  "WHERE grade_letter != 'NR' AND grade_score >= 0), 0),",
  "WHERE grade_score >= 0), 0),",
));

console.log("Applied post-57 CI remediation.");
