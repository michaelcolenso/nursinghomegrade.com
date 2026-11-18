import { describe, expect, it } from "vitest";
import { cachedCityIndexabilityMatches } from "./city-cache-coherence";

const indexed = '<meta name="robots" content="max-snippet:-1, max-image-preview:large">';
const excluded = '<meta name="robots" content="noindex, follow">';

describe("city HTML cache coherence after a CMS ingest", () => {
  it("accepts matching indexability on both sides of the threshold", () => {
    expect(cachedCityIndexabilityMatches(excluded, 2)).toBe(true);
    expect(cachedCityIndexabilityMatches(indexed, 3)).toBe(true);
  });
  it("rejects a cached noindex page when a city gains its third facility", () => {
    expect(cachedCityIndexabilityMatches(excluded, 3)).toBe(false);
  });
  it("rejects cached indexable HTML when a city drops below three facilities", () => {
    expect(cachedCityIndexabilityMatches(indexed, 2)).toBe(false);
  });
  it("rejects missing robots metadata for an unindexable city", () => {
    expect(cachedCityIndexabilityMatches("<html></html>", 1)).toBe(false);
  });
});
