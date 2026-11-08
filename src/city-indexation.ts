import { citySlug } from "./states";

export function isIndexableCity(facilityCount: number): boolean {
  return facilityCount >= 3;
}

export interface IndexableCity {
  state: string;
  slug: string;
  facilityCount: number;
}

/** Count the same canonical city groups that getCitySnapshot renders. */
export function getIndexableCities(
  facilities: readonly { state: string; city: string }[],
): IndexableCity[] {
  const cities = new Map<string, IndexableCity>();
  for (const facility of facilities) {
    const state = facility.state.toUpperCase();
    const slug = citySlug(facility.city);
    const key = `${state}|${slug}`;
    const city = cities.get(key);
    if (city) {
      city.facilityCount += 1;
    } else {
      cities.set(key, { state, slug, facilityCount: 1 });
    }
  }

  return [...cities.values()]
    .filter((city) => isIndexableCity(city.facilityCount))
    .sort((a, b) => a.state.localeCompare(b.state) || a.slug.localeCompare(b.slug));
}
