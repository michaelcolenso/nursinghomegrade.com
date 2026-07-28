# CI workflow

`ci-workflow.yml` belongs at `.github/workflows/ci.yml`. It is parked here
because the token used to push this branch lacks GitHub's `workflow` scope and
cannot create files under `.github/workflows/`. Move it into place with:

    mkdir -p .github/workflows && git mv docs/ci-workflow.yml .github/workflows/ci.yml

It runs two jobs:

- **test** — `npm test` on every pull request and push to `primary`.
- **link-coverage** — `scripts/check-orphans.ts`, the internal-link coverage
  assertion from spec 3.4. It needs `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` secrets to read D1, and skips itself when they are
  absent so forks do not fail.

The `--max` threshold is set to the measured orphan residue rather than to
zero, so the check fails on regression instead of sitting permanently red.
Ratchet it down as the residue is closed.
