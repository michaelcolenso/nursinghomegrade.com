import { describe, expect, it } from "vitest";
import {
  buildDataReleaseUpsert,
  normalizeCmsDate,
  parseCmsDatasetMetadata,
} from "../src/cms-dataset-metadata";

describe("CMS dataset metadata", () => {
  it("keeps modified, public release and next-update dates separate", () => {
    const metadata = parseCmsDatasetMetadata(
      {
        identifier: "4pq5-n9py",
        title: "Provider Information",
        modified: "2026-08-01",
        released: "2026-08-26",
        nextUpdateDate: "2026-09-30",
      },
      "4pq5-n9py",
    );

    expect(metadata.modified).toBe("2026-08-01");
    expect(metadata.released).toBe("2026-08-26");
    expect(metadata.nextUpdateDate).toBe("2026-09-30");
    expect(metadata.sourceUrl).toBe("https://data.cms.gov/provider-data/dataset/4pq5-n9py");
  });

  it("normalizes full timestamps without changing the calendar date", () => {
    expect(normalizeCmsDate("2026-08-26T23:15:00Z")).toBe("2026-08-26");
  });

  it("fails closed when CMS does not supply a real modified or release date", () => {
    expect(() =>
      parseCmsDatasetMetadata({ identifier: "4pq5-n9py", title: "Provider Information" }, "4pq5-n9py"),
    ).toThrow(/modified date/);
  });

  it("builds an upsert that preserves all three freshness concepts", () => {
    const metadata = parseCmsDatasetMetadata(
      {
        identifier: "4pq5-n9py",
        title: "Provider Information",
        modified: "2026-08-01",
        released: "2026-08-26",
        nextUpdateDate: "2026-09-30",
      },
      "4pq5-n9py",
    );
    const sql = buildDataReleaseUpsert(
      [{ sourceKey: "provider_info", label: "Provider Information", metadata }],
      "2026-09-04T20:30:00.000Z",
    );

    expect(sql).toContain("cms_modified_date");
    expect(sql).toContain("cms_release_date");
    expect(sql).toContain("next_update_date");
    expect(sql).toContain("ingested_at");
    expect(sql).toContain("'2026-08-01'");
    expect(sql).toContain("'2026-08-26'");
    expect(sql).toContain("'2026-09-04T20:30:00.000Z'");
  });
});
