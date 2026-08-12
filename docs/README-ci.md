# CI workflow

`ci-workflow.yml` belongs at `.github/workflows/ci.yml`. It is parked here
because the token used to push this branch lacks GitHub's `workflow` scope and
cannot create files under `.github/workflows/`. Move it into place with:

    mkdir -p .github/workflows && git mv docs/ci-workflow.yml .github/workflows/ci.yml

It runs three jobs:

- **test** — `npm test` on every pull request and push to `primary`.
- **link-coverage** — `scripts/check-orphans.ts`, the internal-link coverage
  assertion from spec 3.4. It needs `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` secrets to read D1, and skips itself when they are
  absent so forks do not fail.
- **site-health** — `scripts/check-sitemap-live.ts` against the live site,
  every 6 hours (schedule trigger only — it checks whatever is currently
  deployed, so running it per-PR would validate the wrong code). Fails when:
  a sampled sitemap URL doesn't return 200 with a self-referencing canonical;
  a sampled page is noindex despite being sitemapped, or its body is
  suspiciously small (a masked failure — a D1/subrequest error degrading to a
  thin 200 instead of the retryable 5xx the error boundary is supposed to
  produce); `www.nursinghomegrade.com` serves content instead of redirecting
  to the apex host every canonical tag points to; or the total URL / shard
  count drops more than 10% from `scripts/sitemap-baseline.json`. Update the
  baseline after an intentional coverage change with
  `npx tsx scripts/check-sitemap-live.ts --update-baseline`.

The `--max` threshold on link-coverage is set to the measured orphan residue
rather than to zero, so the check fails on regression instead of sitting
permanently red. Ratchet it down as the residue is closed.
