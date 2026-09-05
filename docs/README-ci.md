# CI workflow

The active workflow lives at `.github/workflows/ci.yml`.

It runs three jobs:

- **test** — `npm test` on every pull request and push to `primary`.
- **link-coverage** — `scripts/check-orphans.ts`, the internal-link coverage
  assertion from spec 3.4. It needs `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` secrets to read D1, and skips itself when they are
  absent so forks do not fail.
- **site-health** — `scripts/check-sitemap-live.ts` against the live site every
  6 hours, plus manual `workflow_dispatch`. It checks what is actually deployed,
  so it does not run as part of ordinary PR validation. It fails when a sampled
  sitemap URL does not return 200 with a self-referencing canonical; a sampled
  page is noindex despite being sitemapped; its body is suspiciously small; the
  `www` host serves duplicate content instead of redirecting to the canonical
  apex host; the sitemap contains an unknown URL family; an entire core/city/
  facility class disappears; or the URL/shard population drops unexpectedly
  against `scripts/sitemap-baseline.json`.

The link-coverage `--max` threshold is the measured orphan residue rather than
zero, so the check detects regressions instead of remaining permanently red.
Ratchet it down as the residue is closed. Update the sitemap baseline only after
an intentional, healthy coverage change with:

    npx tsx scripts/check-sitemap-live.ts --update-baseline
