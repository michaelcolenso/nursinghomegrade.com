# Facility page: data-model audit and information hierarchy

An inventory of what a facility page can truthfully say, what it cannot, and
what has to happen at deploy time before the new fields carry values.

## 1. Field inventory

### Available before this change

| Field | Source | Stored as |
| --- | --- | --- |
| Facility name, address, city, state, ZIP | CMS Provider Information (`4pq5-n9py`) | `facilities.name`, `.address`, `.city`, `.state`, `.zip` |
| Provider number (CCN) | Provider Information | `facilities.cms_id` |
| CMS ratings — overall, health inspection, staffing, quality | Provider Information | `facilities.overall_rating`, `.inspection_rating`, `.staffing_rating`, `.quality_rating` |
| RN hours per resident day | Provider Information | `facilities.rn_hours_per_resident_day` |
| NursingHomeGrade score and letter | Computed (`src/scoring.ts`) | `facilities.grade_score`, `.grade_letter` |
| Deficiencies: date, category, F-tag, description, scope/severity, correction status, cycle | CMS Health Deficiencies (`r5ix-sfxw`) | `facility_deficiencies` |
| Complaint deficiency count (cycle 1) | Provider Information raw JSON | `facility_rawparse.raw_json` (best-effort; table is not created by any migration) |
| Owning/managing organisations | CMS Ownership (`y2hd-n93e`) | `facility_owners`, `operators` |
| Rating history / trajectory | Computed from snapshots | `facility_snapshots` (sparse — most facilities have <3 rows, so no trajectory renders) |
| Load date | Ingest | `facilities.updated_at` |
| Nearby facilities and their metrics | Same table | `getPeerFacilities`, `getBetterGradedNearby` |
| State RN median, national averages | Aggregates | `getStateRnMedian`, `getNationalAverages` |

### Added by migration `007_facility_profile_and_penalties.sql`

All from CMS Provider Information except the penalties table.

| Field | Column |
| --- | --- |
| Telephone | `facilities.phone` |
| Ownership type (for profit / non profit / government, and sub-type) | `facilities.ownership_type` |
| Legal business name | `facilities.legal_business_name` |
| Provider type (Medicare / Medicaid certification) | `facilities.provider_type` |
| County | `facilities.county` |
| Certified beds, average residents per day | `facilities.certified_beds`, `.avg_residents_per_day` |
| Date first certified | `facilities.certification_date` |
| Special Focus Facility status, abuse icon | `facilities.special_focus_status`, `.abuse_icon` |
| Fine count, total fine dollars, payment denials, total penalties | `facilities.number_of_fines`, `.total_fines_dollars`, `.number_of_payment_denials`, `.total_penalties` |
| Most recent standard health survey date | `facilities.latest_standard_survey_date` |
| RN and total nursing turnover | `facilities.rn_turnover_pct`, `.total_nursing_turnover_pct` |
| Source vintage (CMS processing date) | `facilities.cms_processing_date` |
| Individual fines and payment denials with dates | `facility_penalties` (CMS Penalties, `g6vv-u9sr`) |

### Not available — and therefore not rendered

| Field | Why | How the page behaves |
| --- | --- | --- |
| **Email address** | No federal nursing-home file publishes one. Constructing one from a domain would be fabrication. | The contact block states that the federal files publish no email and that we do not guess one. |
| **Official facility website** | Not in Provider Information, Ownership, Deficiencies or Penalties. | Not shown. The CMS Care Compare profile is linked instead as the authoritative external record. |
| **Consumer reviews, star counts, testimonials** | The site collects none. | No review count, no aggregate rating, no `Review`/`AggregateRating` schema. The reviews heading says explicitly that the analysis is of government records. |
| **County/state audit reports** (e.g. a 2023 audit of a county-owned home) | Not published in any CMS dataset; auditors publish them individually. | Government-owned facilities render "Audit and Inspection Reports" that names the federal records we hold and states we have not reviewed any separate auditor's report. |
| **Distance in miles to nearby facilities** | Peers are selected by city/state, not by computed distance. | Nearby cards compare grade, RN staffing and deficiency counts; they claim no distance. |
| **CMS release date per dataset** | CMS's API does not expose one; `data_releases.cms_release_date` is deliberately NULL. | Pages cite the CMS `processing_date` as the vintage and link `/data-sources` for load dates. |
| **Trajectory for most facilities** | `facility_snapshots` needs ≥3 rows. | The trend banner renders only where history exists. |

## 2. Information hierarchy rendered by `src/templates/facility.ts`

1. **Identity** — H1, address, operator, then a facts grid: provider number, certification, ownership, certified beds, phone, CMS data date.
2. **Verdict** — "What the records show": 2–3 deterministic sentences from `buildVerdict`, built only from published ratings, deficiency counts and enforcement records.
3. **Reviews context** — H2 "Reviews, Ratings and Official Records", with an explicit statement that no testimonials are collected or hosted.
4. **Ratings and grade breakdown** — RN staffing vs. the repealed benchmark, three-cycle deficiency counts, all four CMS star ratings, our score, plus a plain-language explanation of both scales and a methodology link.
5. **Staffing comparison** — facility vs. state median vs. national average, turnover, and the measurement period.
6. **Inspection records covered** (or, for government-owned facilities, **Audit and Inspection Reports**) — survey dates, cycle coverage, source links.
7. **Inspection deficiencies** — the existing per-citation timeline: severity, F-tag, status, dates.
8. **Fines and enforcement** — per-action table when rows exist; an affirmative empty state when CMS aggregates are present and zero; an explicit gap disclosure when we hold neither.
9. **Ownership and contact** — official name, legal name, address, phone, CCN, ownership type, operator, certification date, CMS record link, verification date, and the no-email statement.
10. **Nearby alternatives** — existing cards, compared on grade, staffing and deficiencies.
11. **Sources and methodology** — each dataset by name and ID, with vintage and links.

Every section is server-rendered. Nothing above depends on JavaScript.

## 3. Structured data

Emitted: `NursingHome` (address, CCN identifier, geo, telephone when parseable,
legal name, and `additionalProperty` mirroring the visible metrics) and
`BreadcrumbList` matching the visible breadcrumb.

Deliberately **not** emitted:

- `Review` / `reviewRating` — removed in this change. The previous markup
  published the NursingHomeGrade score as a `Review` with a `reviewRating`. It
  is a computed score over federal records, not a review, and search engines
  read that markup as consumer sentiment.
- `aggregateRating` — never present, and must not be added for CMS stars.
- `FAQPage` — the page has no visible, non-duplicative Q&A block, and FAQ rich
  results are no longer shown for non-government sites; adding markup without
  visible questions would be markup for markup's sake.

## 4. Deployment and migration requirements

The template degrades gracefully, so the code can ship before the data. Full
value requires all three steps:

1. **Migrate.**
   `npx wrangler d1 execute nursinghomegrade --remote --file=migrations/007_facility_profile_and_penalties.sql`
   Adds the profile columns (NULL for every existing row) and `facility_penalties`.
2. **Re-ingest.** `npm run ingest` — now also pulls the CMS Penalties dataset
   (~16k rows) and writes the profile columns and penalty inserts into
   `scripts/seed.sql`.
3. **Load.** `bash scripts/load-remote.sh`.
4. **Purge the HTML cache.** Facility pages are cached in KV for 24h; existing
   entries render the old template until they expire.
5. **Regenerate sitemaps.** `npm run sitemap` — writes per-child `lastmod` into
   the index and deletes the retired `sitemap-facilities` KV key.

Between steps 1 and 3 the new sections simply do not render: no placeholders,
no zeros, no "N/A".

## 5. Sitemap warnings

`scripts/check-sitemap-live.ts` validates the sitemaps as served. Run against
production on 2026-08-06 it found 21,662 URLs across three child sitemaps —
matching the Search Console total exactly — and exactly three issues, one per
child: **no `<lastmod>` on any child sitemap in the index**. No other defect
exists: every sampled URL returns 200 on the canonical host with a
self-referencing canonical, there are no duplicates within or across children,
every `lastmod` is a valid non-future W3C date, the namespace and declaration
are correct, and every file is far inside the 50,000-URL / 50MB limits.

The fix is in `src/sitemap-xml.ts` + `scripts/sitemap.ts`: each child now
carries the newest `lastmod` among the URLs inside it, and the generator refuses
to publish anything that fails validation. Search Console does not expose its
warning text through any API available here, so the identification is by count
and structure rather than by quoting Google's own string; re-run
`npx tsx scripts/check-sitemap-live.ts` after deploying to confirm the count
drops to zero.
