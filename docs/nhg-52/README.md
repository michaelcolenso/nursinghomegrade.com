# NHG-52: last-known-good HTML

Home, facility, state, city, and data-sources pages retain a separate successful
HTML copy for seven days in Cache API. Their normal fresh entries keep the
existing one-hour (home) or one-day TTL. On D1/render failure, the handler serves
that saved HTML with status 200, `X-NHG-Cache: stale`, and
`Cache-Control: public, max-age=60`. Serving stale does not renew its retention
or store an error body. Without a retained copy, the response remains 503 with
`Retry-After: 120` and `Cache-Control: no-store` from the existing response wrapper.

The extra key is `stale:${fullVersionedHtmlKey}`. Version `html:v32` isolates both
copies from earlier HTML, including earlier city indexability decisions. Cache
API eviction is best-effort and per-colo; this provides fallback where a prior
render survives, not durable availability. A successful stable render writes two
entries; a normal cache hit still needs one Cache API match. Generic cache users,
including 30-day ZIP geocoding, keep their existing get/put behavior. Search
results remain uncached and never use this fallback. Reports and the states hub
are outside this ticket's fallback scope.

Successful stable responses advertise `stale-while-revalidate=604800` to HTTP
clients. Cache API itself does not implement that directive: the explicit second
key supplies the Worker's failure fallback.

Facility cache lookup now precedes D1 for exact routes that previously rendered
canonically. Unknown or incorrect slugs still use D1 to resolve a redirect/404;
they cannot borrow a different slug's saved HTML. Genuine 404s do not serve stale.

Data-sources uses a strict metadata query so a query failure reaches its fallback
instead of being saved as an empty successful page. Other metadata consumers
retain their existing graceful missing-date behavior. Structured error logs
include route family, provider ID where applicable, and error name/message, even
when saved HTML is served. Existing security and agent headers remain applied.

The health checker always probes home, Heron's Key, Washington, and Seattle in
addition to sitemap samples. A representative city may intentionally be noindex;
sitemap-listed URLs must still be indexable. Both paths require HTTP 200, a
self-canonical, and a body of at least 2,000 characters. Baseline checks remain
unchanged.

## Rollout

This change needs no migration, ingest, scoring change, or sitemap upload.
Michael's approval is required before merging or deploying. Retained copies warm
on successful requests after rollout; a cold colo or an evicted entry still
returns the existing retryable error during an outage. No production data,
sitemaps, or baseline were changed while preparing this PR.

For rollback, revert the code and bump the HTML cache version again. Future
explicit page invalidation should use `pageCache.delete`, which removes both
fresh and retained copies.

## Validation

- `npm test`: 524 tests pass across 47 files, including expiry, stale fallback,
  cold failures, canonical redirects/removals, search exclusion, both-copy
  deletion, cache unavailability, and HTML/Markdown resilience headers.
- Local Wrangler/Cache API: five stable page families were rendered successfully,
  only their fresh entry was removed, and D1 failure was injected. All five
  returned their exact prior HTML with 200/stale/max-age60. A cold city remained
  503/Retry-After120/no-store. See [local runtime results](local-runtime-results.json).
  Fault injection used a disposable wrapper outside the repository; no test
  endpoint or fault switch is included in the production Worker.
- Chromium with JavaScript disabled verified the stale thin-city page retains
  its noindex, canonical title, and facility discovery link during D1 failure.
- `npx wrangler deploy --dry-run`: passes. No deployment was performed.
- `npx tsc --noEmit`: pre-existing diagnostics remain; no new diagnostic lines
  after normalizing baseline worktree paths and shifted line numbers. The
  touched health-check response annotation now includes its existing headers.
- Integration review found no blocking issues. No live checker, production
  query, migration, baseline update, or sitemap generation/upload was performed.
