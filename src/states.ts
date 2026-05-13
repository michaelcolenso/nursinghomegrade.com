export const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district-of-columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new-hampshire": "NH",
  "new-jersey": "NJ",
  "new-mexico": "NM",
  "new-york": "NY",
  "north-carolina": "NC",
  "north-dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode-island": "RI",
  "south-carolina": "SC",
  "south-dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west-virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

export const STATE_NAMES: Record<string, { name: string; slug: string }> = {
  AL: { name: "Alabama", slug: "alabama" },
  AK: { name: "Alaska", slug: "alaska" },
  AZ: { name: "Arizona", slug: "arizona" },
  AR: { name: "Arkansas", slug: "arkansas" },
  CA: { name: "California", slug: "california" },
  CO: { name: "Colorado", slug: "colorado" },
  CT: { name: "Connecticut", slug: "connecticut" },
  DE: { name: "Delaware", slug: "delaware" },
  DC: { name: "District of Columbia", slug: "district-of-columbia" },
  FL: { name: "Florida", slug: "florida" },
  GA: { name: "Georgia", slug: "georgia" },
  HI: { name: "Hawaii", slug: "hawaii" },
  ID: { name: "Idaho", slug: "idaho" },
  IL: { name: "Illinois", slug: "illinois" },
  IN: { name: "Indiana", slug: "indiana" },
  IA: { name: "Iowa", slug: "iowa" },
  KS: { name: "Kansas", slug: "kansas" },
  KY: { name: "Kentucky", slug: "kentucky" },
  LA: { name: "Louisiana", slug: "louisiana" },
  ME: { name: "Maine", slug: "maine" },
  MD: { name: "Maryland", slug: "maryland" },
  MA: { name: "Massachusetts", slug: "massachusetts" },
  MI: { name: "Michigan", slug: "michigan" },
  MN: { name: "Minnesota", slug: "minnesota" },
  MS: { name: "Mississippi", slug: "mississippi" },
  MO: { name: "Missouri", slug: "missouri" },
  MT: { name: "Montana", slug: "montana" },
  NE: { name: "Nebraska", slug: "nebraska" },
  NV: { name: "Nevada", slug: "nevada" },
  NH: { name: "New Hampshire", slug: "new-hampshire" },
  NJ: { name: "New Jersey", slug: "new-jersey" },
  NM: { name: "New Mexico", slug: "new-mexico" },
  NY: { name: "New York", slug: "new-york" },
  NC: { name: "North Carolina", slug: "north-carolina" },
  ND: { name: "North Dakota", slug: "north-dakota" },
  OH: { name: "Ohio", slug: "ohio" },
  OK: { name: "Oklahoma", slug: "oklahoma" },
  OR: { name: "Oregon", slug: "oregon" },
  PA: { name: "Pennsylvania", slug: "pennsylvania" },
  RI: { name: "Rhode Island", slug: "rhode-island" },
  SC: { name: "South Carolina", slug: "south-carolina" },
  SD: { name: "South Dakota", slug: "south-dakota" },
  TN: { name: "Tennessee", slug: "tennessee" },
  TX: { name: "Texas", slug: "texas" },
  UT: { name: "Utah", slug: "utah" },
  VT: { name: "Vermont", slug: "vermont" },
  VA: { name: "Virginia", slug: "virginia" },
  WA: { name: "Washington", slug: "washington" },
  WV: { name: "West Virginia", slug: "west-virginia" },
  WI: { name: "Wisconsin", slug: "wisconsin" },
  WY: { name: "Wyoming", slug: "wyoming" },
};

export function getStateAbbreviation(slug: string): string | undefined {
  return STATE_ABBREVIATIONS[slug.toLowerCase()];
}

export function getStateInfo(abbreviation: string): { name: string; slug: string } | undefined {
  return STATE_NAMES[abbreviation.toUpperCase()];
}

export function getAllStateSlugs(): string[] {
  return Object.keys(STATE_ABBREVIATIONS);
}

export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function cityDisplayName(city: string): string {
  const normalizedSpacing = city.trim().replace(/\s+/g, " ");
  if (/[a-z]/.test(normalizedSpacing) || !/[A-Z]/.test(normalizedSpacing)) {
    return normalizedSpacing;
  }

  return normalizedSpacing
    .toLowerCase()
    .replace(/(^|[\s-'])[a-z]/g, (match) => match.toUpperCase());
}
