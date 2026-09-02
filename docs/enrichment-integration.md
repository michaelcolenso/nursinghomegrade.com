# Enrichment-core integration

This repo is the first consumer of
[`enrichment-core`](https://github.com/michaelcolenso/enrichment-core) —
the shared plain-English layer for bureaucratic data.

## Flow

```
facility_deficiencies (existing)
  │  npm run export-archetypes -- --top 20
  ▼
data/nhg.archetypes.json  ──►  enrichment-core/scripts/enrich-local.ts
                                  (gpt-5.6-terra + linter)
  │  npm run import-enrichments -- out/nhg.enrichments.jsonl
  ▼
archetype_enrichment (migration 009)  ──►  facility pages + /glossary/:ftag
```

## Rules

- `data/` and `out/` are gitignored — exports, not source.
- Only linter-clean rows import; everything lands as `review_status='draft'`
  until human signoff flips it to `approved`.
- F-tag keys are normalized to CMS form (`F0689`) at export.
- The model never sees facility-level data. Archetypes only.
