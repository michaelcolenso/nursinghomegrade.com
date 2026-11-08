# NHG-50: thin city indexation

Cities with one or two facilities remain 200 pages with their canonical URL,
facility links, and state discovery links. They emit `noindex, follow` and are
excluded from the generated city sitemap. Cities with at least three facilities
remain indexable. The threshold uses the full city count, before the 200-card
display cap.

The generator counts by state and `citySlug`, matching the city handler. It
reuses the facility rows it already loads, removing a separate D1 city query.
Filtering SQL groups before merging slugs would incorrectly omit some cities:
two `ST. LOUIS` facilities plus one `ST LOUIS` facility form a single indexable
three-facility page.

## Production measurement (2026-11-08 UTC)

Read-only queries through the authenticated Cloudflare MCP connection returned
`rows_written: 0` and `changed_db: false`.

```sql
SELECT
  SUM(CASE WHEN c <= 2 THEN 1 ELSE 0 END) AS thin_cities,
  SUM(CASE WHEN c >= 3 THEN 1 ELSE 0 END) AS indexable_cities,
  COUNT(*) AS all_cities
FROM (
  SELECT state, LOWER(city) AS city, COUNT(*) AS c
  FROM facilities
  GROUP BY state, LOWER(city)
);
```

| Grouping | Thin | Indexable | Total |
| --- | ---: | ---: | ---: |
| Requested SQL: state + LOWER(city), all territories | 5,564 | 1,358 | 6,922 |
| State + citySlug, all territories | 5,559 | 1,357 | 6,916 |
| Supported state + citySlug, matching sitemap URLs | 5,552 | 1,356 | 6,908 |

The canonical figures come from `SELECT state, city, COUNT(*) AS facility_count
FROM facilities GROUP BY state, city`, followed by the existing slug normalization
and supported-state filter. Eight canonical cities in GU/PR are excluded by the
existing state filter. A read-only fetch of the live `sitemap-cities.xml`
confirmed 6,908 URLs. With this data, the intended city sitemap reduction is
5,552 URLs (80.4%). Recheck if CMS data changes before rollout.

## Approved rollout only

No merge, deployment, remote migration, sitemap generation/upload, or production
baseline update was performed while preparing this PR. Schema, seed scripts,
Wrangler configuration, and Grade 1.x scoring are unchanged.

**Record a class-aware baseline before merging/deploying if merging triggers an
automatic Worker deployment.** The checked-in legacy baseline has only overall
URL/shard counts, so it cannot prove that a large reduction came only from
cities. On Michael's approved rollout, from a checkout containing this change:

1. While the old site and old sitemaps are still healthy, run:

   ```sh
   npx tsx scripts/check-sitemap-live.ts --update-baseline
   ```

   Review and commit the resulting `scripts/sitemap-baseline.json` with
   `pageClasses` before the Worker rollout. Resolve existing health failures
   first; this command will not overwrite a baseline after a failed check.

2. Deploy the approved Worker with HTML cache version `html:v30`, then
   immediately regenerate/upload the sitemaps from the matching code:

   ```sh
   npx tsx scripts/sitemap.ts --remote
   ```

   Old sitemaps temporarily list the newly noindexed pages until this upload;
   a scheduled site-health check can fail during that window.

3. Check the served sitemap and acknowledge only the reviewed city reduction:

   ```sh
   npx tsx scripts/check-sitemap-live.ts --update-baseline --accept-city-reduction 1356
   ```

   The explicit count must match exactly and be lower than the class-aware
   baseline. Any core/facility URL loss, lost shard, unknown route, invalid XML,
   listed-noindex page, non-200 response, thin body, or canonical mismatch still
   blocks the update. No blanket force option is provided. Ordinary checks
   retain their existing regression limits.

4. Review and commit the post-rollout baseline, then run the ordinary checker
   without the acknowledgement flag.

Wrangler authentication is separate from MCP authentication; run these approved
operational commands from a Wrangler-authenticated environment.

To roll back after an approved rollout, revert the Worker/generator together,
bump the cache version again, regenerate the sitemaps, and restore the reviewed
pre-rollout baseline.

## Validation

- `npm test`: 476 passing tests in 44 files. Coverage includes 1/2/3-facility
  boundaries, canonical/link preservation, slug collisions, old-v29-cache bypass,
  cache hits without D1 reads, and guarded rebaseline rejection cases.
- Chromium with JavaScript disabled: thin and thick city pages plus state
  discovery links at 390 and 1280 px; all six checks pass. Thin pages are 200
  with `noindex, follow`; thick pages remain indexable. Both retain canonicals
  and facility/state links, with no city-page horizontal overflow.
- `npx wrangler deploy --dry-run`: bundle passes; nothing deployed.
- `npx tsc --noEmit`: no new diagnostic lines after normalizing worktree paths
  and line shifts. An existing missing field in the touched state-page test
  fixture is corrected; other pre-existing diagnostics remain.
- Local preview uses the existing compatibility-date workaround:
  `npm run dev -- --local --compatibility-date 2026-04-16`.
- The sitemap generator was not executed. Selection is tested through its pure
  helper and existing XML validation tests; no KV data was written.

[Thin city preview](thin-city-desktop.png) uses synthetic local D1 fixtures,
JavaScript disabled, and system fallback fonts. Seattle is intentionally a
one-facility fixture here; this screenshot does not describe production Seattle.
