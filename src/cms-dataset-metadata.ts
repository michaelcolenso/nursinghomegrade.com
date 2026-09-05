export const CMS_METASTORE_BASE = "https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items";
export const CMS_DATASET_PAGE_BASE = "https://data.cms.gov/provider-data/dataset";

export interface CmsDatasetMetadata {
  identifier: string;
  title: string;
  /** Date the underlying dataset was last modified / data period advanced. */
  modified: string;
  /** Date CMS released this copy publicly. */
  released: string;
  /** CMS's planned next public update, when published. */
  nextUpdateDate: string | null;
  sourceUrl: string;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/**
 * CMS metadata normally uses ISO dates, but the parser accepts full timestamps
 * as well. Returning date-only values prevents timezone conversion from changing
 * the meaning of a release date.
 */
export function normalizeCmsDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const trimmed = value.trim();
  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)?.[1];
  if (isoDate) return isoDate;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object") return first as Record<string, unknown>;
  }
  if (value && typeof value === "object") return value as Record<string, unknown>;
  throw new Error("CMS metastore returned an unexpected payload shape");
}

function stringValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

export function parseCmsDatasetMetadata(payload: unknown, expectedIdentifier: string): CmsDatasetMetadata {
  const record = asRecord(payload);
  const identifier = stringValue(record, "identifier", "id") ?? expectedIdentifier;
  if (identifier !== expectedIdentifier) {
    throw new Error(`CMS metadata identifier mismatch: expected ${expectedIdentifier}, got ${identifier}`);
  }

  const modified = normalizeCmsDate(record.modified ?? record.lastModified ?? record.last_modified);
  const released = normalizeCmsDate(record.released ?? record.releaseDate ?? record.release_date);
  const nextUpdateDate = normalizeCmsDate(record.nextUpdateDate ?? record.next_update_date ?? record.plannedUpdate);

  if (!modified) throw new Error(`CMS metadata for ${expectedIdentifier} is missing a valid modified date`);
  if (!released) throw new Error(`CMS metadata for ${expectedIdentifier} is missing a valid released date`);

  return {
    identifier,
    title: stringValue(record, "title", "name") ?? expectedIdentifier,
    modified,
    released,
    nextUpdateDate,
    sourceUrl: `${CMS_DATASET_PAGE_BASE}/${encodeURIComponent(identifier)}`,
  };
}

export async function fetchCmsDatasetMetadata(
  identifier: string,
  fetchImpl: FetchLike = fetch,
): Promise<CmsDatasetMetadata> {
  const url = `${CMS_METASTORE_BASE}/${encodeURIComponent(identifier)}?show-reference-ids=true`;
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`CMS metastore error ${response.status} for dataset ${identifier}`);
  }
  return parseCmsDatasetMetadata(await response.json(), identifier);
}

function sqlString(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

export interface DataReleaseRecord {
  sourceKey: string;
  label: string;
  metadata: CmsDatasetMetadata;
}

/**
 * Appended to the generated seed after the legacy ingest SQL. It is deliberately
 * the final writer so authoritative CMS metadata wins over the old NULL release
 * placeholders until that older code path is removed.
 */
export function buildDataReleaseUpsert(records: DataReleaseRecord[], ingestedAt: string): string {
  if (records.length === 0) throw new Error("Cannot build data release metadata SQL with no records");
  const values = records
    .map(({ sourceKey, label, metadata }) =>
      `(${sqlString(sourceKey)},${sqlString(label)},${sqlString(metadata.modified)},${sqlString(metadata.released)},${sqlString(metadata.nextUpdateDate)},${sqlString(ingestedAt)},${sqlString(metadata.sourceUrl)})`,
    )
    .join(",\n  ");

  return `INSERT INTO data_releases
  (source_key,label,cms_modified_date,cms_release_date,next_update_date,ingested_at,source_url)
VALUES
  ${values}
ON CONFLICT(source_key) DO UPDATE SET
  label=excluded.label,
  cms_modified_date=excluded.cms_modified_date,
  cms_release_date=excluded.cms_release_date,
  next_update_date=excluded.next_update_date,
  ingested_at=excluded.ingested_at,
  source_url=excluded.source_url;`;
}
