import { readFileSync, writeFileSync, rmSync } from "node:fs";

const path = "scripts/ingest-grade2-phase-a.ts";
let source = readFileSync(path, "utf8");

function replaceFunction(name, nextName, replacement) {
  const start = source.indexOf(`async function ${name}(`) >= 0
    ? source.indexOf(`async function ${name}(`)
    : source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Could not find ${name}`);
  const nextAsync = source.indexOf(`async function ${nextName}(`, start + 1);
  const nextSync = source.indexOf(`function ${nextName}(`, start + 1);
  const candidates = [nextAsync, nextSync].filter((v) => v >= 0);
  if (candidates.length === 0) throw new Error(`Could not find next function ${nextName}`);
  const end = Math.min(...candidates);
  source = source.slice(0, start) + replacement.trimEnd() + "\n\n" + source.slice(end);
}

replaceFunction("fetchAll", "removeOldShards", `async function fetchAll(datasetId: string, label: string): Promise<CmsRow[]> {
  const first = await fetchPage(datasetId, 0, label);
  if (first.length === 0) throw new Error(\`${'${label}'} returned an empty first page; refusing destructive refresh\`);

  const rows = [...first];
  let page = first;
  let offset = PAGE_SIZE;
  while (page.length === PAGE_SIZE) {
    page = await fetchPage(datasetId, offset, label);
    if (page.length === 0) break;
    rows.push(...page);
    if (rows.length % 15000 < PAGE_SIZE) console.log(\`${'${label}'}: ${'${rows.length.toLocaleString()}'} rows\`);
    offset += PAGE_SIZE;
  }
  console.log(\`${'${label}'}: fetched ${'${rows.length.toLocaleString()}'} rows\`);
  return rows;
}`);

replaceFunction("writeShards", "staffingRows", `function writeShards(
  prefix: string,
  table: string,
  columns: string[],
  values: string[],
  rowsPerInsert = 200,
  insertsPerFile = 40,
): string[] {
  removeOldShards(prefix);
  if (values.length === 0) {
    throw new Error(\`${'${table}'} transform produced zero rows; refusing to replace existing shadow evidence\`);
  }

  const files: string[] = [];
  const rowsPerFile = rowsPerInsert * insertsPerFile;
  const staging = \`${'${table}'}__next\`;

  for (let start = 0, fileIndex = 1; start < values.length; start += rowsPerFile, fileIndex++) {
    const slice = values.slice(start, start + rowsPerFile);
    const sql: string[] = [];
    if (start === 0) {
      // Populate an unconstrained staging copy first. The live table remains
      // untouched if any network/SQL shard fails before the finalizer runs.
      sql.push(\`DROP TABLE IF EXISTS ${'${staging}'};\`);
      sql.push(\`CREATE TABLE ${'${staging}'} AS SELECT * FROM ${'${table}'} WHERE 0;\`);
    }

    for (let i = 0; i < slice.length; i += rowsPerInsert) {
      sql.push(
        \`INSERT INTO ${'${staging}'} (${'${columns.join(",")}'} ) VALUES\\n${'${slice.slice(i, i + rowsPerInsert).join(",\\n")}'};\`,
      );
    }

    const file = \`scripts/${'${prefix}'}_${'${String(fileIndex).padStart(3, "0")}'} .sql\`.replace(" .sql", ".sql");
    writeFileSync(file, \`${'${sql.join("\\n\\n")}'}\\n\`);
    files.push(file);
  }

  const finalizer = \`scripts/${'${prefix}'}_finalize.sql\`;
  writeFileSync(
    finalizer,
    [
      "BEGIN TRANSACTION;",
      \`DELETE FROM ${'${table}'};\`,
      \`INSERT INTO ${'${table}'} (${'${columns.join(",")}'} ) SELECT ${'${columns.join(",")}'} FROM ${'${staging}'};\`,
      "COMMIT;",
      \`DROP TABLE IF EXISTS ${'${staging}'};\`,
      "",
    ].join("\\n"),
  );
  files.push(finalizer);

  console.log(\`${'${table}'}: wrote ${'${values.length.toLocaleString()}'} staged rows across ${'${files.length - 1}'} shard(s) + finalizer\`);
  return files;
}`);

writeFileSync(path, source);
rmSync("scripts/patch-grade2-loader-safety.mjs");
rmSync(".github/workflows/grade2-loader-safety-patch.yml");
console.log("Hardened Grade 2 Phase A loader with fail-closed transforms and staged table swaps.");
