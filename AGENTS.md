# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the Cloudflare Worker app. `src/index.ts` is the entrypoint; route handlers live in `src/handlers/`, HTML renderers in `src/templates/`, and shared types, scoring, state metadata, and D1 access helpers sit alongside them. `test/` holds Vitest coverage for scoring, templates, and ingest helpers. `migrations/` defines the D1 schema, while `scripts/` contains one-off operational code such as `ingest.ts`, `sitemap.ts`, `load-local.sh`, `load-remote.sh`, and the generated `seed_deficiencies_*.sql` batches.

## Build, Test, and Development Commands
Run `npm install` once to install the TypeScript, Wrangler, and Vitest toolchain.

- `npm run dev` starts the Worker locally with Wrangler.
- `npm run test` runs the Vitest suite once.
- `npm run ingest` executes `scripts/ingest.ts` to transform CMS data into repository formats.
- `npm run sitemap` regenerates sitemap output through `scripts/sitemap.ts`.
- `npm run deploy` publishes the Worker via Wrangler.

For D1 data loads, use the checked-in shell scripts rather than ad hoc SQL loops: `scripts/load-local.sh` for local D1 and `scripts/load-remote.sh` for the remote database.

## Coding Style & Naming Conventions
This repo uses strict TypeScript with ES modules and Cloudflare Worker types. Follow the existing style: double quotes, semicolons, concise helpers, and 2-space indentation in TypeScript. Prefer `camelCase` for variables/functions, `PascalCase` for types, and kebab-case route slugs such as `/facility/015001-sunrise-care-center`. Keep request handlers thin and push formatting logic into templates or dedicated helpers.

## Testing Guidelines
Tests live in `test/*.test.ts` and use Vitest. Add or update tests whenever you change scoring rules, slug generation, rendering, or ingest mapping. Keep tests deterministic and focused on pure logic where possible. Run `npm run test` before opening a PR.

## Commit & Pull Request Guidelines
The Git history is minimal (`initial`), so use short imperative commit messages such as `Add facility deficiency rendering`. Keep PRs small and describe user-visible changes, schema or seed impacts, and local verification steps. Include screenshots for template changes and call out any `wrangler.toml`, migration, or seed-script updates explicitly.

## Security & Configuration Tips
Treat `wrangler.toml` bindings and D1 identifiers as deployment configuration, not application logic. Do not commit secrets. When changing schema or ingest behavior, keep migrations, loader scripts, and tests in sync.
