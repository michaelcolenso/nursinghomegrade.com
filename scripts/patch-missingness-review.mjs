import { readFileSync, writeFileSync, rmSync } from "node:fs";

function patch(path, before, after) {
  let source = readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    throw new Error(`Expected fragment missing in ${path}: ${before.slice(0, 180)}`);
  }
  source = source.replace(before, after);
  writeFileSync(path, source);
}

// Missing inspection evidence must be affirmatively present. Undefined is not proof.
patch(
  "src/scoring.ts",
  'if (inputs.totalDeficiencies === null || inputs.inspectionEvidenceAvailable === false) {',
  'if (inputs.totalDeficiencies === null || inputs.inspectionEvidenceAvailable !== true) {',
);

// Move missingness into the primary CMS mapping path so every derived table is
// built from the same grade semantics rather than repairing facilities afterward.
patch(
  "scripts/ingest.ts",
  `  const qualityRating = parseIntOrNull(raw.qm_rating);\n  const staffingRating = parseIntOrNull(raw.staffing_rating);\n\n  const graded = computeGrade(\n    {\n      rnHoursPerResidentDay: rnHours ?? 0,\n      totalDeficiencies: cycle1Deficiencies ?? 0,\n      qualityRating: qualityRating ?? 1,\n      staffingRating: staffingRating ?? 1,\n    },\n    deficiencies,\n  );\n  const safeScore = Number.isFinite(graded.score) ? graded.score : 0;\n  const grade_letter = graded.letter;\n  const grade_summary = scoreToSummary(safeScore, grade_letter, rnHours);`,
  `  const qualityRating = parseIntOrNull(raw.qm_rating);\n  const staffingRating = parseIntOrNull(raw.staffing_rating);\n  const surveyDate = textOrNull(raw.rating_cycle_1_standard_survey_health_date);\n\n  const graded = computeGrade(\n    {\n      rnHoursPerResidentDay: rnHours,\n      totalDeficiencies: cycle1Deficiencies,\n      qualityRating,\n      staffingRating,\n      inspectionEvidenceAvailable: cycle1Deficiencies !== null && surveyDate !== null,\n    },\n    deficiencies,\n  );\n  const safeScore = graded.score ?? -1;\n  const grade_letter = graded.letter ?? "NR";\n  const grade_summary = scoreToSummary(\n    graded.score,\n    graded.letter,\n    rnHours,\n    graded.completeness,\n    graded.missingInputs,\n  );`,
);
patch(
  "scripts/ingest.ts",
  `    grade_summary,\n    slug: toSlug(raw.provider_name ?? raw.cms_certification_number_ccn ?? "unknown"),`,
  `    grade_summary,\n    grade_completeness: graded.completeness,\n    grade_missing_inputs: graded.missingInputs.length > 0 ? graded.missingInputs.join(",") : null,\n    slug: toSlug(raw.provider_name ?? raw.cms_certification_number_ccn ?? "unknown"),`,
);
patch(
  "scripts/ingest.ts",
  `    latest_standard_survey_date: textOrNull(raw.rating_cycle_1_standard_survey_health_date),`,
  `    latest_standard_survey_date: surveyDate,`,
);
patch(
  "scripts/ingest.ts",
  `,${f.grade_score},'${'${esc(f.grade_letter)}'}','${'${esc(f.grade_summary)}'}','${'${esc(f.slug)}'}'`,
  `,${f.grade_score},'${'${esc(f.grade_letter)}'}','${'${esc(f.grade_summary)}'}','${'${esc(f.grade_completeness ?? "complete")}'}',${'${sqlText(f.grade_missing_inputs)}'},'${'${esc(f.slug)}'}'`,
);
patch(
  "scripts/ingest.ts",
  `grade_score,grade_letter,grade_summary,slug,updated_at`,
  `grade_score,grade_letter,grade_summary,grade_completeness,grade_missing_inputs,slug,updated_at`,
);
patch(
  "scripts/ingest.ts",
  `,${f.grade_score},'${'${esc(f.grade_letter)}'}',${'${nurseHours ?? "NULL"}'},${'${f.total_deficiencies ?? "NULL"}'})`,
  `,${f.grade_score},'${'${esc(f.grade_letter)}'}','${'${esc(f.grade_completeness ?? "complete")}'}',${'${sqlText(f.grade_missing_inputs)}'},${'${nurseHours ?? "NULL"}'},${'${f.total_deficiencies ?? "NULL"}'})`,
);
patch(
  "scripts/ingest.ts",
  `grade_score,grade_letter,nurse_hours_per_resident_day,deficiency_count) VALUES`,
  `grade_score,grade_letter,grade_completeness,grade_missing_inputs,nurse_hours_per_resident_day,deficiency_count) VALUES`,
);
patch(
  "scripts/ingest.ts",
  `        facilityGrades.push(facility.grade_score);`,
  `        if (facility.grade_letter !== "NR" && facility.grade_score >= 0) facilityGrades.push(facility.grade_score);`,
);

// State-report data should include all facilities for non-grade facts, while
// ranked/top-grade queries must exclude NR explicitly.
patch(
  "src/db.ts",
  `    "SELECT * FROM facilities WHERE state = ? AND grade_letter != 'NR' AND grade_score >= 0 ORDER BY grade_score DESC LIMIT ?"`,
  `    "SELECT * FROM facilities WHERE state = ? ORDER BY CASE WHEN grade_letter = 'NR' THEN 1 ELSE 0 END, grade_score DESC LIMIT ?"`,
);
patch(
  "src/db.ts",
  `     FROM facilities WHERE state = ? ORDER BY grade_score DESC LIMIT ?`,
  `     FROM facilities WHERE state = ? AND grade_letter != 'NR' AND grade_score >= 0 ORDER BY grade_score DESC LIMIT ?`,
);

// Staffing-failure reports are ranked by staffing condition, not by gradeability;
// retain NR facilities but sort them after actual grades when grade is a tiebreaker.
patch(
  "src/handlers/reports.ts",
  `     ORDER BY grade_score ASC\n     LIMIT ? OFFSET ?`,
  `     ORDER BY CASE WHEN grade_letter = 'NR' THEN 1 ELSE 0 END, grade_score ASC\n     LIMIT ? OFFSET ?`,
);

rmSync("scripts/patch-missingness-review.mjs");
rmSync(".github/workflows/missingness-review-patch.yml");
console.log("Applied upstream missingness and NR ranking fixes; removed one-shot patch files.");
