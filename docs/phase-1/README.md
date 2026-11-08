# Phase 1 preview

These screenshots use synthetic local D1 fixtures, not production figures or
release dates. Chromium ran with JavaScript disabled and external browser
assets blocked (system fallback fonts).

- [Home, mobile](home-mobile.png)
- [Search results, desktop](search-desktop.png)
- [Scoring example](scoring-example.png)

## Validation

- `npm test`: 432 tests pass across 42 files.
- Browser checks: home, search form, populated search, empty search, and
  how-we-grade at 320, 390, and 1280 px. All 15 responses are 200 with no
  horizontal overflow; dates render on home and all three search states.
- `npx wrangler deploy --dry-run`: bundles successfully; nothing deployed.
- `npx tsc --noEmit`: existing diagnostics are identical to `primary` after
  normalizing the baseline worktree path; no new diagnostics.
- Local D1 migrations apply successfully. Only synthetic preview data was
  loaded locally; no schema, production data, seed scripts, or Wrangler
  configuration changed.

The locked Wrangler runtime supports compatibility dates through 2026-04-16,
while the existing config requests 2026-06-01. Preview used:

```sh
npm run dev -- --local --compatibility-date 2026-04-16
```

HTML keys advance from `html:v28` to `html:v29`. The home cache retains its
one-hour TTL; tests verify that the old key is bypassed and subsequent home
hits do not query D1. The new dates reuse the existing small `data_releases`
query. Shadow imports never stand in for public scoring source freshness.

For Phase 4, Cloudflare's Cache API does not support `stale-while-revalidate`
or `stale-if-error` in `cache.put` / `cache.match`; stale fallback needs the
separate longer-lived key proposed in the plan.
