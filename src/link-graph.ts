// Internal-link coverage.
//
// The spec's requirement: every facility URL in the sitemap must be reachable by
// at least 3 internal links from other facility or city pages. Before the peer
// rework, a state's facility pages all linked the same handful of statewide
// winners, so most facilities had only their city-page listing pointing at them.
//
// This models the link graph the site actually renders so the orphan count can
// be asserted in CI rather than discovered in Search Console months later.

export interface LinkNode {
  cms_id: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  grade_letter: string;
  grade_score: number;
}

/** Mirrors NEARBY_CARD_COUNT + related-links depth on a facility page. */
export const PEERS_PER_PAGE = 8;
export const BETTER_PER_PAGE = 2;
/** The spec's threshold. */
export const MIN_INBOUND_LINKS = 3;

const GRADE_BANDS = ["A", "B", "C", "D", "F"];

function bandIndex(letter: string): number {
  const i = GRADE_BANDS.indexOf(letter);
  return i === -1 ? GRADE_BANDS.length : i;
}

/**
 * Squared distance with longitude scaled by cos(latitude) — the same
 * approximation the SQL peer queries use, so the modelled ordering matches what
 * the site renders.
 */
function approxDistance(a: LinkNode, b: LinkNode): number {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) {
    return Number.POSITIVE_INFINITY;
  }
  const cosLat = Math.cos((a.latitude * Math.PI) / 180);
  const dLat = a.latitude - b.latitude;
  const dLng = (a.longitude - b.longitude) * cosLat;
  return dLat * dLat + dLng * dLng;
}

/** Peers a facility page links, mirroring getPeerFacilities. */
export function peersFor(node: LinkNode, all: LinkNode[], limit = PEERS_PER_PAGE, minimum = 3): LinkNode[] {
  const candidates = all.filter((f) => f.cms_id !== node.cms_id && f.state === node.state);

  // Ordered by proximity, NOT by grade. Ordering a city's peers by grade means
  // only the top few in that city are ever anyone's peer, and the long tail
  // stays orphaned — the same concentration the statewide block caused, just at
  // city scale. Proximity varies per page, so links spread across the tail.
  const sameCity = candidates
    .filter((f) => f.city === node.city)
    .sort((a, b) => approxDistance(node, a) - approxDistance(node, b))
    .slice(0, limit);

  if (sameCity.length >= minimum) return sameCity;

  const picked = [...sameCity];
  const seen = new Set(picked.map((f) => f.cms_id));

  const byDistance = candidates
    .filter((f) => !seen.has(f.cms_id))
    .sort((a, b) => approxDistance(node, a) - approxDistance(node, b));

  for (const f of byDistance) {
    if (picked.length >= limit) break;
    picked.push(f);
    seen.add(f.cms_id);
  }
  return picked;
}

/** Better-graded nearby links, mirroring getBetterGradedNearby. */
export function betterGradedFor(node: LinkNode, all: LinkNode[], limit = BETTER_PER_PAGE): LinkNode[] {
  const currentBand = bandIndex(node.grade_letter);
  if (currentBand === 0) return [];

  return all
    .filter(
      (f) => f.cms_id !== node.cms_id && f.state === node.state && bandIndex(f.grade_letter) < currentBand,
    )
    .sort((a, b) => {
      const bandDiff = bandIndex(b.grade_letter) - bandIndex(a.grade_letter);
      if (bandDiff !== 0) return bandDiff;
      return approxDistance(node, a) - approxDistance(node, b);
    })
    .slice(0, limit);
}

export interface CoverageReport {
  totalFacilities: number;
  /** Facilities with fewer than MIN_INBOUND_LINKS inbound internal links. */
  orphanCount: number;
  orphans: Array<{ cms_id: string; city: string; state: string; inbound: number }>;
  minInbound: number;
  medianInbound: number;
}

/**
 * Inbound internal links per facility.
 *
 * Counts links from other facility pages (peer and better-graded blocks) plus
 * the one guaranteed link from the facility's own city listing page. State hub
 * pages are excluded: they list only the top handful, so counting them would
 * mask exactly the concentration this check exists to detect.
 */
export function computeCoverage(all: LinkNode[], minInbound = MIN_INBOUND_LINKS): CoverageReport {
  const inbound = new Map<string, number>();
  for (const f of all) inbound.set(f.cms_id, 1); // city listing page

  for (const node of all) {
    for (const p of peersFor(node, all)) {
      inbound.set(p.cms_id, (inbound.get(p.cms_id) ?? 0) + 1);
    }
    for (const b of betterGradedFor(node, all)) {
      inbound.set(b.cms_id, (inbound.get(b.cms_id) ?? 0) + 1);
    }
  }

  const orphans = all
    .map((f) => ({ cms_id: f.cms_id, city: f.city, state: f.state, inbound: inbound.get(f.cms_id) ?? 0 }))
    .filter((f) => f.inbound < minInbound)
    .sort((a, b) => a.inbound - b.inbound);

  const counts = [...inbound.values()].sort((a, b) => a - b);
  const median = counts.length > 0 ? counts[Math.floor(counts.length / 2)]! : 0;

  return {
    totalFacilities: all.length,
    orphanCount: orphans.length,
    orphans: orphans.slice(0, 50),
    minInbound: counts[0] ?? 0,
    medianInbound: median,
  };
}
