const LEGAL_SUFFIXES = [
  "LLC", "INC", "LP", "LLP", "LTD", "CORP", "CORPORATION", "COMPANY", "CO",
];

export function normalizeOwnerName(raw: string): string {
  if (!raw) return "";
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(new RegExp(`\\b(${LEGAL_SUFFIXES.join("|")})\\b`, "g"), "")
    .trim();
}

export function toOperatorSlug(name: string): string {
  return (name ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
