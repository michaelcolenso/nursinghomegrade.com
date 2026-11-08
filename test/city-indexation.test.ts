import { describe, expect, it } from "vitest";
import { getIndexableCities, isIndexableCity } from "../src/city-indexation";

const facilities = (state: string, city: string, count: number) =>
  Array.from({ length: count }, () => ({ state, city }));

describe("city indexation", () => {
  it.each([[0, false], [1, false], [2, false], [3, true], [78, true]] as const)(
    "makes a city with %i facilities indexable=%s", (count, expected) => {
      expect(isIndexableCity(count)).toBe(expected);
    },
  );

  it("excludes one- and two-facility cities while retaining three-facility cities", () => {
    expect(getIndexableCities([
      ...facilities("WA", "One", 1),
      ...facilities("WA", "Two", 2),
      ...facilities("WA", "Three", 3),
    ])).toEqual([{ state: "WA", slug: "three", facilityCount: 3 }]);
  });

  it("merges punctuation, spacing, and case variants before applying the threshold", () => {
    expect(getIndexableCities([
      { state: "MO", city: "ST. LOUIS" },
      { state: "MO", city: "St Louis" },
      { state: "mo", city: "  st.  louis  " },
    ])).toEqual([{ state: "MO", slug: "st-louis", facilityCount: 3 }]);
  });

  it("keeps identically named cities in different states separate", () => {
    expect(getIndexableCities([
      ...facilities("WA", "Springfield", 2),
      ...facilities("OR", "Springfield", 3),
    ])).toEqual([{ state: "OR", slug: "springfield", facilityCount: 3 }]);
  });

  it("returns one entry per canonical city in stable state and slug order", () => {
    const rows = [
      ...facilities("WA", "Seattle", 3),
      ...facilities("CA", "St. Helena", 3),
      ...facilities("CA", "ST HELENA", 2),
      ...facilities("CA", "Anaheim", 3),
    ];
    const expected = [
      { state: "CA", slug: "anaheim", facilityCount: 3 },
      { state: "CA", slug: "st-helena", facilityCount: 5 },
      { state: "WA", slug: "seattle", facilityCount: 3 },
    ];
    expect(getIndexableCities(rows)).toEqual(expected);
    expect(getIndexableCities([...rows].reverse())).toEqual(expected);
  });

  it("returns no cities for an empty facility corpus", () => {
    expect(getIndexableCities([])).toEqual([]);
  });
});
