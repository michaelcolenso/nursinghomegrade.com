/**
 * Export top F-tag archetypes for enrichment-core.
 *
 * Aggregates facility_deficiencies by tag, picks the top N by citation
 * volume (coverage-ranked, matching the smoke-test design), normalizes
 * tag keys to CMS form ('F0689'), and writes enrichment-core's
 * ArchetypeInput shape to data/nhg.archetypes.json.
 *
 *   npx tsx scripts/export-ftag-archetypes.ts [--top 20] [--remote]
 *
 * Output is gitignored — it's an export, not source.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const top = Number(flag('top') ?? '20');
const remote = args.includes('--remote');

// Discover the D1 database name from wrangler.toml so this repo stays
// the single source of truth for its own config.
const wranglerToml = readFileSync('wrangler.toml', 'utf8');
const dbName = wranglerToml.match(/database_name\s*=\s*"([^"]+)"/)?.[1];
if (!dbName) throw new Error('database_name not found in wrangler.toml');

const sql = `
  SELECT
    deficiency_tag_number AS tag,
    deficiency_description AS description,
    COUNT(*) AS citations,
    COUNT(DISTINCT cms_id) AS facilities
  FROM facility_deficiencies
  WHERE deficiency_tag_number IS NOT NULL AND deficiency_tag_number != ''
  GROUP BY deficiency_tag_number
  ORDER BY citations DESC
  LIMIT ${top};
`;

const raw = execSync(
  `npx wrangler d1 execute ${dbName} ${remote ? '--remote' : '--local'} --json --command ${JSON.stringify(sql)}`,
  { maxBuffer: 64 * 1024 * 1024 },
).toString();

interface Row { tag: string; description: string | null; citations: number; facilities: number }
const rows = (JSON.parse(raw) as Array<{ results: Row[] }>)[0].results;

/** Normalize to CMS F-tag form: '689', 'F689', 'F0689' -> 'F0689' */
function normalizeTag(tag: string): string {
  const digits = tag.replace(/[^0-9]/g, '').padStart(4, '0');
  return `F${digits}`;
}

const archetypes = rows.map((r) => ({
  archetype_key: normalizeTag(r.tag),
  domain: 'nhg' as const,
  official_name: (r.description ?? '').trim(),
  official_text: (r.description ?? '').trim(),
  context: {
    citations: String(r.citations),
    facilities: String(r.facilities),
  },
}));

mkdirSync('data', { recursive: true });
writeFileSync('data/nhg.archetypes.json', JSON.stringify(archetypes, null, 2));
console.log(`Wrote ${archetypes.length} archetypes to data/nhg.archetypes.json (db: ${dbName}, ${remote ? 'remote' : 'local'})`);
console.log('Copy into enrichment-core/data/ and run: npm run enrich -- --domain nhg --top 20 --dry-run');
