// Load deficiency seed files into D1 in batches to minimize API round-trips.
// Usage: npx tsx scripts/load-deficiencies-batched.ts [--remote]

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const BATCH_SIZE_MB = 5; // Target batch size in megabytes (conservative for API reliability)
const BATCH_SIZE_BYTES = BATCH_SIZE_MB * 1024 * 1024;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithRetry(command: string, attempt = 1): Promise<void> {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`\n⚠️ Attempt ${attempt} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
      return executeWithRetry(command, attempt + 1);
    }
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const useRemote = args.includes("--remote");
  const remoteFlag = useRemote ? "--remote" : "";

  // Gather all deficiency seed files
  const { readdirSync } = await import("fs");
  const files = readdirSync("scripts")
    .filter((f) => f.startsWith("seed_deficiencies_") && f.endsWith(".sql"))
    .sort()
    .map((f) => join("scripts", f));

  console.log(`Found ${files.length} deficiency seed files.`);

  // Group files into batches by size
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentBatchSize = 0;

  for (const file of files) {
    const stat = readFileSync(file);
    if (currentBatchSize + stat.length > BATCH_SIZE_BYTES && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }
    currentBatch.push(file);
    currentBatchSize += stat.length;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  console.log(`Split into ${batches.length} batches (target ~${BATCH_SIZE_MB}MB each).`);

  const tmpDir = mkdtempSync(join(tmpdir(), "nhg-deficiencies-"));

  try {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchFile = join(tmpDir, `batch-${String(i + 1).padStart(3, "0")}.sql`);

      // Concatenate batch files
      let combined = "";
      for (const file of batch) {
        combined += readFileSync(file, "utf8") + "\n";
      }
      writeFileSync(batchFile, combined);

      const batchSizeMB = (combined.length / 1024 / 1024).toFixed(1);
      console.log(
        `\n[Batch ${i + 1}/${batches.length}] ${batch.length} files, ${batchSizeMB}MB → ${batchFile}`,
      );

      await executeWithRetry(
        `npx wrangler d1 execute nursinghomegrade ${remoteFlag} --file=${batchFile}`,
      );
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("\n✅ All deficiency seed files loaded successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
