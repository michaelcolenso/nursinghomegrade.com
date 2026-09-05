import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  buildDataReleaseUpsert,
  fetchCmsDatasetMetadata,
  type DataReleaseRecord,
} from "../src/cms-dataset-metadata";

export const INGEST_SOURCES = [
  { sourceKey: "provider_info", label: "Provider Information", datasetId: "4pq5-n9py" },
  { sourceKey: "health_deficiencies", label: "Health Deficiencies", datasetId: "r5ix-sfxw" },
  { sourceKey: "ownership", label: "Ownership", datasetId: "y2hd-n93e" },
  { sourceKey: "penalties", label: "Penalties", datasetId: "g6vv-u9sr" },
] as const;

export async function main(): Promise<void> {
  console.log("Reading authoritative CMS dataset metadata...");
  const records: DataReleaseRecord[] = await Promise.all(
    INGEST_SOURCES.map(async (source) => ({
      sourceKey: source.sourceKey,
      label: source.label,
      metadata: await fetchCmsDatasetMetadata(source.datasetId),
    })),
  );

  for (const record of records) {
    const next = record.metadata.nextUpdateDate ? `; next ${record.metadata.nextUpdateDate}` : "";
    console.log(
      `${record.label}: modified ${record.metadata.modified}; released ${record.metadata.released}${next}`,
    );
  }

  // Keep the existing, well-tested dataset fetch and seed generator intact. This
  // wrapper becomes the normal npm ingest entry point and appends metadata as the
  // final writer in seed.sql so the old NULL placeholders cannot win.
  execFileSync("npx", ["tsx", "scripts/ingest.ts"], { stdio: "inherit" });

  const seedPath = "scripts/seed.sql";
  if (!existsSync(seedPath) || statSync(seedPath).size === 0) {
    throw new Error("scripts/ingest.ts completed without producing a non-empty scripts/seed.sql");
  }

  const ingestedAt = new Date().toISOString();
  const releaseSql = buildDataReleaseUpsert(records, ingestedAt);
  appendFileSync(seedPath, `\n\n-- Authoritative CMS release metadata\n${releaseSql}\n`);
  console.log(`Appended CMS release metadata to ${seedPath} at ${ingestedAt}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
