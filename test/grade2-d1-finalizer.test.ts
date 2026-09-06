import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { buildShadowTableFinalizer } from "../scripts/ingest-grade2-phase-a";

describe("Grade 2 finalization in D1", () => {
  let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
  let directory: string;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), "grade2-d1-test-"));
    const configPath = join(directory, "wrangler.json");
    writeFileSync(configPath, JSON.stringify({
      name: "grade2-finalizer-test",
      compatibility_date: "2026-06-01",
      d1_databases: [{ binding: "DB", database_name: "test", database_id: "test" }],
    }));
    platform = await getPlatformProxy<{ DB: D1Database }>({ configPath, persist: false });
  }, 30000);

  afterAll(async () => {
    await platform?.dispose();
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  async function prepare(staged: string) {
    const db = platform.env.DB;
    await db.exec("DROP TABLE IF EXISTS evidence; DROP TABLE IF EXISTS evidence__next;");
    await db.exec("CREATE TABLE evidence (id TEXT PRIMARY KEY, value INTEGER NOT NULL); INSERT INTO evidence VALUES ('old', 7); CREATE TABLE evidence__next AS SELECT * FROM evidence WHERE 0;");
    await db.exec(staged);
    return db;
  }

  function finalizer(db: D1Database) {
    // Remote Wrangler --file imports are atomic. D1 batch supplies that boundary
    // in this local binding test and rejects the same unsupported SQL controls.
    return db.batch(buildShadowTableFinalizer("evidence", ["id", "value"])
      .split(";").map((sql) => sql.trim()).filter(Boolean).map((sql) => db.prepare(sql)));
  }

  it("replaces evidence and removes staging without unsupported transaction SQL", async () => {
    const db = await prepare("INSERT INTO evidence__next VALUES ('new', 9);");
    await finalizer(db);
    expect((await db.prepare("SELECT * FROM evidence").all()).results).toEqual([{ id: "new", value: 9 }]);
    expect(await db.prepare("SELECT name FROM sqlite_master WHERE name='evidence__next'").first()).toBeNull();
  });

  it("rolls back deletion and retains staging when new evidence violates constraints", async () => {
    const db = await prepare("INSERT INTO evidence__next VALUES ('bad', NULL);");
    await expect(finalizer(db)).rejects.toThrow();
    expect((await db.prepare("SELECT * FROM evidence").all()).results).toEqual([{ id: "old", value: 7 }]);
    expect((await db.prepare("SELECT * FROM evidence__next").all()).results).toEqual([{ id: "bad", value: null }]);
  });
});
