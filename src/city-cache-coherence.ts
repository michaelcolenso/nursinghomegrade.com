import { isIndexableCity } from "./city-indexation";

/**
 * A cached city page is safe only if its robots directive agrees with the
 * current D1 facility count. Ingests can cross the three-home threshold
 * without changing the HTML cache key.
 */
export function cachedCityIndexabilityMatches(html: string, facilityCount: number): boolean {
  const noindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*\bnoindex\b/i.test(html);
  return noindex === !isIndexableCity(facilityCount);
}
