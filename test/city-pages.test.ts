import { describe, expect, it } from "vitest";
import { cityDisplayName, citySlug } from "../src/states";
import { cityPage } from "../src/templates/city";
import { statePage } from "../src/templates/state";

describe("citySlug", () => {
  it("normalizes spaces and punctuation into stable slugs", () => {
    expect(citySlug("Los Angeles")).toBe("los-angeles");
    expect(citySlug("St. Louis")).toBe("st-louis");
    expect(citySlug("Sault Ste. Marie")).toBe("sault-ste-marie");
    expect(citySlug("COEUR D'ALENE")).toBe("coeur-dalene");
  });
});

describe("cityDisplayName", () => {
  it("turns all-caps CMS city names into readable display copy", () => {
    expect(cityDisplayName("LOS ANGELES")).toBe("Los Angeles");
    expect(cityDisplayName("COEUR D'ALENE")).toBe("Coeur D'Alene");
    expect(cityDisplayName("St. Louis")).toBe("St. Louis");
  });
});

describe("statePage city links", () => {
  it("links city names to dedicated city pages", () => {
    const html = statePage({
      stateName: "California",
      stateSlug: "california",
      facilityCount: 2,
      pctFailing: 50,
      nationalPctFailing: 40,
      gradeDistribution: { A: 1, B: 0, C: 0, D: 0, F: 1 },
      cities: [
        { city: "Los Angeles", count: 1 },
        { city: "St. Louis", count: 1 },
      ],
      facilities: [],
    });

    expect(html).toContain('href="/state/california/los-angeles"');
    expect(html).toContain('href="/state/california/st-louis"');
  });

  it("keeps city pages linked beyond the first 30 entries", () => {
    const html = statePage({
      stateName: "California",
      stateSlug: "california",
      facilityCount: 31,
      pctFailing: 50,
      nationalPctFailing: 40,
      gradeDistribution: { A: 1, B: 0, C: 0, D: 0, F: 1 },
      cities: Array.from({ length: 31 }, (_, index) => ({
        city: index === 30 ? "Yuba City" : `City ${index + 1}`,
        count: 1,
      })),
      facilities: [],
    });

    expect(html).toContain('href="/state/california/yuba-city"');
    expect(html).toContain("Yuba City (1)");
  });
});

describe("cityPage", () => {
  it("renders the city-level heading, canonical URL, and state backlink", () => {
    const html = cityPage({
      cityName: "Los Angeles",
      citySlug: "los-angeles",
      stateName: "California",
      stateSlug: "california",
      facilityCount: 78,
      pctFailing: 71.8,
      nationalPctFailing: 58,
      gradeDistribution: { A: 5, B: 10, C: 20, D: 18, F: 25 },
      facilities: [],
      siblingCities: [],
    });

    expect(html).toContain("Nursing homes in Los Angeles, California");
    expect(html).toContain('href="/state/california"');
    expect(html).toContain("No facilities found in this city.");
  });

  it("renders JSON-LD ItemList and BreadcrumbList schema", () => {
    const html = cityPage({
      cityName: "Los Angeles",
      citySlug: "los-angeles",
      stateName: "California",
      stateSlug: "california",
      facilityCount: 78,
      pctFailing: 71.8,
      nationalPctFailing: 58,
      gradeDistribution: { A: 5, B: 10, C: 20, D: 18, F: 25 },
      facilities: [],
      siblingCities: [],
    });

    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"name":"Nursing Homes in Los Angeles, California"');
    expect(html).toContain('"name":"California"');
    expect(html).toContain('"name":"Los Angeles"');
    expect(html).toContain('"item":"https://nursinghomegrade.com/state/california"');
    expect(html).toContain('"item":"https://nursinghomegrade.com/state/california/los-angeles"');
  });

  it("renders local staffing context and grade distribution", () => {
    const html = cityPage({
      cityName: "Los Angeles",
      citySlug: "los-angeles",
      stateName: "California",
      stateSlug: "california",
      facilityCount: 78,
      pctFailing: 71.8,
      nationalPctFailing: 58,
      gradeDistribution: { A: 5, B: 10, C: 20, D: 18, F: 25 },
      facilities: [],
    });

    expect(html).toContain("71.8%");
    expect(html).toContain("58%");
    expect(html).toContain("Grade Distribution");
    expect(html).toContain("Grade F");
    expect(html).toContain("25");
    expect(html).toContain("background:var(--grade-A)");
  });
});
