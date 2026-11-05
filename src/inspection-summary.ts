import type { Deficiency, Facility } from "./types";

/** Inspection evidence only: deliberately accepts no composite score or letter. */
export function buildInspectionSummary(
  facility: Pick<Facility, "inspection_rating">,
  deficiencies: Deficiency[] | null,
): string {
  const rating = facility.inspection_rating;
  const sentences = [rating !== null && Number.isInteger(rating) && rating >= 1 && rating <= 5
    ? `CMS health inspection rating: ${rating} out of 5 stars.`
    : "CMS health inspection rating is not available."];

  if (deficiencies === null) {
    sentences.push("Inspection records could not be loaded; deficiency counts, severity, and correction status are unknown. This does not mean there were no deficiencies.");
    return sentences.join(" ");
  }

  const total = deficiencies.length;
  const harm = deficiencies.filter((d) => /^[G-L]$/.test(d.scope_severity_code ?? "")).length;
  const jeopardy = deficiencies.filter((d) => /^[J-L]$/.test(d.scope_severity_code ?? "")).length;
  const severityUnknown = deficiencies.filter((d) => !/^[A-L]$/.test(d.scope_severity_code ?? "")).length;
  const outstanding = deficiencies.filter((d) =>
    d.deficiency_corrected === "Deficient, Provider has no plan of correction"
    || d.deficiency_corrected === "Deficient, Provider has plan of correction",
  ).length;
  // A missing or unrecognised status is not evidence of correction. An open
  // status remains outstanding even if an inconsistent row has a date.
  const corrected = deficiencies.filter((d) =>
    d.deficiency_corrected === "Deficient, Provider has date of correction",
  ).length;
  const correctionUnknown = total - outstanding - corrected;

  sentences.push(`${total} ${total === 1 ? "deficiency" : "deficiencies"} in the available inspection records; ${harm} involved actual harm or worse (G–L), including ${jeopardy} at immediate jeopardy level (J–L).`);
  if (severityUnknown > 0) sentences.push(`${severityUnknown} with unknown severity.`);
  sentences.push(`Correction status in these records: ${outstanding} outstanding, ${corrected} recorded as corrected, ${correctionUnknown} unknown.`);
  sentences.push("These records describe the covered inspection period, not current conditions or a guarantee of safety.");
  return sentences.join(" ");
}
