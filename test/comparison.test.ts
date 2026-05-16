import { describe, expect, it } from "vitest";
import { handleCompareApi } from "../src/handlers/comparison";
import { comparePage } from "../src/templates/compare";
import type { Env, Facility } from "../src/types";

const facilities: Facility[] = [
  {
    cms_id: "055258",
    name: "Community Subacute and Transitional Care Center",
    address: "3003 N MARIPOSA",
    city: "FRESNO",
    state: "CA",
    zip: "93703",
    latitude: 36.7777,
    longitude: -119.78,
    overall_rating: 5,
    quality_rating: 5,
    staffing_rating: 5,
    inspection_rating: 5,
    rn_hours_per_resident_day: 1.07,
    total_deficiencies: 0,
    grade_score: 100,
    grade_letter: "A",
    grade_summary: "Exceeds federal staffing minimum.",
    slug: "community-subacute-and-transitional-care-center",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    cms_id: "05A269",
    name: "Meadowbrook Behavioral Health Center",
    address: "3951 E BLVD",
    city: "LOS ANGELES",
    state: "CA",
    zip: "90066",
    latitude: 34.0,
    longitude: -118.4,
    overall_rating: 1,
    quality_rating: 2,
    staffing_rating: 1,
    inspection_rating: 1,
    rn_hours_per_resident_day: 0.32,
    total_deficiencies: 21,
    grade_score: 18,
    grade_letter: "F",
    grade_summary: "Below federal staffing minimum.",
    slug: "meadowbrook-behavioral-health-center",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

function createEnv(): Env & { boundIds: string[] } {
  const boundIds: string[] = [];
  const db = {
    prepare() {
      return {
        bind(...ids: string[]) {
          boundIds.push(...ids);
          return {
            async all<T>() {
              return {
                results: facilities.filter((facility) => ids.includes(facility.cms_id)) as T[],
              };
            },
          };
        },
      };
    },
  };

  return {
    DB: db as unknown as D1Database,
    CACHE: {} as KVNamespace,
    boundIds,
  };
}

describe("handleCompareApi", () => {
  it("returns current facility records in requested saved order", async () => {
    const env = createEnv();
    const response = await handleCompareApi(
      new Request("http://127.0.0.1:8787/api/compare?ids=05A269,INVALID!,055258,055258"),
      env,
    );

    expect(response.status).toBe(200);
    expect(env.boundIds).toEqual(["05A269", "055258"]);

    const data = await response.json() as Array<{ cms_id: string; report_path: string }>;
    expect(data.map((facility) => facility.cms_id)).toEqual(["05A269", "055258"]);
    expect(data[0].report_path).toBe("/facility/05A269-meadowbrook-behavioral-health-center");
    expect(data[1].report_path).toBe("/facility/055258-community-subacute-and-transitional-care-center");
  });

  it("rejects requests with no valid ids", async () => {
    const response = await handleCompareApi(
      new Request("http://127.0.0.1:8787/api/compare?ids=INVALID!,"),
      createEnv(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "No valid facility ids provided" });
  });
});

describe("comparePage", () => {
  it("loads saved ids from the comparison API and renders real comparison fields", () => {
    const html = comparePage();

    expect(html).toContain("/api/compare?ids=");
    expect(html).toContain("new URLSearchParams(window.location.search).get('ids')");
    expect(html).toContain("RN Staffing");
    expect(html).toContain("Deficiencies");
    expect(html).toContain("View report");
    expect(html).not.toContain("Fetching facility data would happen here");
  });
});
