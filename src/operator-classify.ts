// Operator classification: separates genuine nursing home OPERATORS from the
// financial/legal entities that CMS ownership data lists alongside them.
//
// CMS ownership files mix real operators (chains, management companies, and
// individual operators) with lenders, REITs, investment funds, audit/accounting
// firms, and trusts that hold an interest in a facility but do not operate it.
// A role-based filter alone is not enough (audit firms appear as both
// "ADP OF THE SNF" and "OPERATIONAL/MANAGERIAL CONTROL"), so classification is
// name-driven: financial markers + a curated blocklist of known non-operators.
//
// The result feeds operator rankings: only classified operators are ranked,
// and each operator gets a composite score + size tier.

export type OperatorClass = "operator" | "financial" | "excluded";

// Whole-word markers that identify a financial, legal, or investment entity
// rather than a care operator. Matched against the NORMALIZED name (uppercase,
// legal suffixes like LLC/INC stripped).
const FINANCIAL_PATTERNS: RegExp[] = [
  /\bBANK\b/,
  /\bBANCO\b/,
  /\bCREDIT UNION\b/,
  /\bSAVINGS\b/,
  /\bTRUST\b/,
  /\bTR\b/,
  /\bIRRV\b/,
  /\bIRREVOCABLE\b/,
  /\bREIT\b/,
  /\bFUND\b/,
  /\bMUTUAL\b/,
  /\bSECURITIES\b/,
  /\bMORTGAGE\b/,
  /\bINSURANCE\b/,
  /\bASSURANCE\b/,
  /\bADVISORS?\b/,
  /\bADVISORY\b/,
  /\bACCOUNTING\b/,
  /\bACCOUNTANCY\b/,
  /\bAUDIT\b/,
  /\bINVESTMENT\b/,
  /\bFINANCIAL\b/,
  /\bWEALTH\b/,
  /\bASSET\b/,
  /\bEQUITY\b/,
  /\bPROPERTIES\b/,
  /\bREALTY\b/,
  /\bFOUNDATION\b/,
  /\bENDOWMENT\b/,
  /\bMANAGER\b/,
];

// Known non-operators whose normalized names carry no financial marker.
// Audit/accounting firms, asset managers, REITs, insurers, and one-off
// government/legal entities that appear in CMS ownership data.
const FINANCIAL_EXACT = new Set([
  "FORVIS MAZARS",
  "CLIFTONLARSONALLEN",
  "CLIFTON LARSON ALLEN",
  "WIPFLI",
  "BAKER TILLY US",
  "BAKER TILLY ADVISORY GROUP",
  "CITRIN COOPERMAN ADVISORS",
  "BLACKROCK",
  "VANGUARD GROUP",
  "WELLTOWER",
  "WELLTOWER OP",
  "WELLTOWER NNN GROUP",
  "MARSH AND MCLENNAN COMPANIES",
  "UNIVEST BANK AND TRUST",
  "CIBC BANK USA",
  "WELLS FARGO",
  "JPMORGAN CHASE",
  "BANK OF AMERICA",
  "STATE OF MICHIGAN OFFICE OF FINANCIAL MANAGEMENT",
  "GUGGENHEIM",
  "ATHENE",
  "PRUDENTIAL",
  "METLIFE",
  "GEODE CAPITAL",
  "STATE STREET",
  "INVESCO",
  "T ROWE PRICE",
  "FIDELITY",
]);

// Care-industry vocabulary. Used to keep holding companies that are part of a
// real care operation (e.g. "GENESIS HEALTHCARE") while dropping investment
// shells ("POLLAK HOLDINGS").
const HEALTHCARE_MARKERS =
  /\b(CARE|HEALTH|MEDICAL|REHAB|SENIOR|LIVING|MANOR|NURS|HOSPITAL|CLINIC|VILLAGE|COMMUNITY|HOME|CENTER|CENTRE|GROUP|MANAGEMENT|SERVICES|OPERATIONS|LIFE|RETIREMENT|ASSISTED|SKILLED|POST ACUTE|POST-ACUTE)\b/i;

export function classifyOperatorName(normalizedName: string): OperatorClass {
  const name = (normalizedName ?? "").trim().toUpperCase();
  if (!name) return "excluded";

  for (const pattern of FINANCIAL_PATTERNS) {
    if (pattern.test(name)) return "financial";
  }
  if (FINANCIAL_EXACT.has(name)) return "financial";

  // Holding/property shells: exclude unless the name reads like a care company.
  if (/\bHOLDINGS?\b/.test(name) && !HEALTHCARE_MARKERS.test(name)) return "financial";

  return "operator";
}

export type OperatorTier = "Mega" | "Large" | "Mid" | "Small";

export function operatorTier(facilityCount: number): OperatorTier {
  if (facilityCount >= 100) return "Mega";
  if (facilityCount >= 20) return "Large";
  if (facilityCount >= 5) return "Mid";
  return "Small";
}

// Composite operator score (0-100), computed from the operator's aggregate
// facility metrics. Transparent weighting, documented on the rankings page:
//   - 70% average facility grade (itself a 4-factor CMS composite)
//   - 15% staffing credit: RN hours/resident/day, 0.75+ hrs → 100
//   - 15% deficiency credit: inverse of avg deficiencies, 0 → 100, 15+ → 0
// Missing staffing/deficiency data scores a neutral 50 rather than 0, so
// operators with sparse reporting are not unfairly crushed.
export function computeOperatorScore(
  avgGrade: number,
  avgRnHours: number | null,
  avgDeficiencies: number | null,
): number {
  const staffingCredit =
    avgRnHours == null ? 50 : Math.min(100, Math.round((avgRnHours / 0.75) * 100));
  const deficiencyCredit =
    avgDeficiencies == null ? 50 : Math.max(0, Math.round(100 - (avgDeficiencies / 15) * 100));
  const score = Math.round(0.7 * avgGrade + 0.15 * staffingCredit + 0.15 * deficiencyCredit);
  return Math.max(0, Math.min(100, score));
}
