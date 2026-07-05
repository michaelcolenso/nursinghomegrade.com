# NursingHomeGrade — Implementation Plan

## Why this replaces the ChatGPT plan

The ChatGPT conversation produced an 8-phase enterprise architecture document with UUID primary keys, graph traversal, fuzzy name matching, and 12-month roadmaps. It's technically coherent but disconnected from the actual codebase: a Cloudflare Worker with D1 (SQLite), KV cache, and a one-person team.

This plan is scoped to what ships — each phase is independently deployable, builds on existing schema, and delivers user-visible value before moving to the next.

---

## Current State Recap

**What exists:**
- `facilities` table — CMS provider data + computed grade (A–F, 0–100 score)
- `facility_deficiencies` table — individual F-tag citations with categories, severity, correction dates
- Proprietary scoring formula (`src/scoring.ts`): RN staffing (35%) + deficiencies (30%) + quality rating (20%) + staffing consistency (15%)
- Pages: home, facility detail, state, city, compare, about
- Ingest pipeline: `scripts/ingest.ts` pulls CMS API → transforms → UPSERTs to D1
- KV cache for expensive pages (`src/cache.ts`)

**What's missing** (by strategic priority):
- No historical snapshots — every ingest overwrites; no trends possible
- No ownership/operator data
- No ranked lists (best/worst)
- City pages are thin listings, not comparison tools
- Deficiency data exists but isn't synthesized (no category aggregation, no peer comparison)
- Homepage is descriptive, not claim-driven

---

## Phase 0 — Foundation: Snapshot Storage & Ingest Hardening

**Why first.** Every subsequent phase (trajectory, trends, "getting better or worse") depends on having data over time. Without snapshots, you can only describe the present. With snapshots, you can describe direction.

### Schema change

```sql
-- migration: 003_facility_snapshots.sql
CREATE TABLE IF NOT EXISTS facility_snapshots (
  cms_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,  -- ISO date YYYY-MM-DD
  overall_rating INTEGER,
  quality_rating INTEGER,
  staffing_rating INTEGER,
  inspection_rating INTEGER,
  rn_hours_per_resident_day REAL,
  total_deficiencies INTEGER,
  grade_score INTEGER NOT NULL,
  grade_letter TEXT NOT NULL,
  PRIMARY KEY (cms_id, snapshot_date)
);
```

### Ingest change (`scripts/ingest.ts`)

After the existing UPSERT to `facilities`, add an INSERT to `facility_snapshots`:

```ts
// After facility row is computed, also write a snapshot
await db.batch([
  db.prepare(`INSERT OR REPLACE INTO facilities (...) VALUES (...)`).bind(...),
  db.prepare(`INSERT OR IGNORE INTO facility_snapshots
    (cms_id, snapshot_date, overall_rating, quality_rating, staffing_rating,
     inspection_rating, rn_hours_per_resident_day, total_deficiencies,
     grade_score, grade_letter)
    VALUES (?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(cms_id, overall, quality, staffing, inspection, rn, deficiencies, score, grade)
]);
```

**Key decisions:**
- `INSERT OR IGNORE` — one snapshot per facility per day; safe to run ingest multiple times
- No backfill needed; trends begin accumulating from the first deploy
- The `facilities` table remains the "current state" authority; snapshots are append-only history

### Files touched
- `migrations/003_facility_snapshots.sql` (new)
- `scripts/ingest.ts` (modify)

### Ship criteria
- Ingest runs without error and produces snapshot rows
- Facility pages continue to render unchanged (no regression)
- `SELECT DISTINCT snapshot_date FROM facility_snapshots` returns at least one date

---

## Phase 1 — Best/Worst & Staffing-Failure Pages

**Why second.** These require zero schema changes — just queries against existing data. They address the GSC signal (city-level intent, "rating of nursing homes") and provide immediate SEO surface area. They also establish the "watchdog" voice before deeper data work begins.

### New routes

| Route | Content |
|---|---|
| `/best` | Top 100 facilities nationally by `grade_score DESC` |
| `/worst` | Bottom 100 facilities nationally by `grade_score ASC` |
| `/best/:state` | Top facilities in a state |
| `/worst/:state` | Worst facilities in a state |
| `/staffing-failures` | All facilities where `rn_hours_per_resident_day < 0.55` |
| `/staffing-failures/:state` | Staffing failures filtered by state |

### Handler pattern (example: `/best`)

```ts
// src/handlers/best.ts
export async function bestHandler(req: Request, env: Env): Promise<Response> {
  const state = /* extract from URL pattern */;
  const where = state ? `WHERE state = ?` : ``;
  const results = await env.DB.prepare(
    `SELECT name, city, state, grade_letter, grade_score, rn_hours_per_resident_day,
            total_deficiencies, slug
     FROM facilities
     ${where}
     ORDER BY grade_score DESC
     LIMIT 100`
  ).bind(...(state ? [state] : [])).all();
  return renderBestPage(results, state);
}
```

### Template design

Each listing row shows:
- Facility name (linked)
- City, State
- Grade letter (colored badge)
- RN hours vs. federal minimum (visual bar)
- Deficiency count

The `/staffing-failures` page adds a headline:
> **X facilities in [State] fail the federal RN staffing minimum of 0.55 hours per resident per day.**

### Files touched
- `src/handlers/best.ts` (new)
- `src/handlers/worst.ts` (new)
- `src/handlers/staffing-failures.ts` (new)
- `src/templates/best.ts` (new)
- `src/templates/staffing-failures.ts` (new)
- `src/index.ts` (add routes)

### Ship criteria
- Pages render with correct, sorted data
- State-filtered variants work
- Pages are cached via existing KV pattern
- Link added to homepage and navigation

---

## Phase 2 — City Page Enrichment

**Why third.** GSC data shows city-level queries testing the site ("nursing homes in Lancaster PA"). The current city pages likely render a facility list. This phase turns them into comparison dashboards — the single highest-leverage SEO improvement in the plan.

### What changes on each city page

**Before** (current):
- City name
- List of facilities with grades

**After**:
1. **City scorecard** (top of page):
   - Number of facilities
   - Average grade
   - % failing staffing minimum
   - Average RN hours
   - Average deficiencies

2. **Ranked facility table**:
   - Sortable by grade, staffing, deficiencies
   - City average row for each metric
   - State average row for each metric
   - National average row for each metric

3. **Best & Worst in city** (sidebar or top cards):
   - Top 3 facilities
   - Bottom 3 facilities

### Query pattern

```sql
-- City averages
SELECT
  COUNT(*) as facility_count,
  ROUND(AVG(grade_score), 1) as avg_grade,
  ROUND(AVG(rn_hours_per_resident_day), 2) as avg_rn_hours,
  ROUND(AVG(total_deficiencies), 1) as avg_deficiencies,
  SUM(CASE WHEN rn_hours_per_resident_day < 0.55 THEN 1 ELSE 0 END) as failing_staffing
FROM facilities
WHERE city = ? AND state = ?;

-- State averages (for comparison row)
SELECT ROUND(AVG(grade_score), 1) as state_avg_grade, ...
FROM facilities WHERE state = ?;

-- National averages (for comparison row)
SELECT ROUND(AVG(grade_score), 1) as national_avg_grade, ... FROM facilities;
```

### Files touched
- `src/templates/city.ts` (major rewrite)
- `src/handlers/city.ts` (add aggregation queries)

### Ship criteria
- City pages show averages and comparison context
- Every metric row has city/state/national reference points
- Best/worst cards are present and correct

---

## Phase 3 — Deficiency Synthesis

**Why fourth.** The deficiency detail pages are already strong (F-tags, categories, severity, correction dates). What's missing is interpretation: "What does 14 deficiencies mean? Is that normal for this state?" This phase adds aggregate intelligence to the existing raw data.

### Add to facility page (`src/templates/facility.ts`)

Below the existing deficiency list, add a **Deficiency Analysis** panel:

1. **Category breakdown** — GROUP BY `deficiency_category`, ordered by count DESC
2. **Severity distribution** — count by scope_severity_code (how many were immediate jeopardy vs. lower severity)
3. **Comparison** — "This facility's deficiency count is in the Xth percentile for [state]" — computed by counting facilities in the same state with fewer deficiencies
4. **Repeat citations** — flag any F-tag that appears in 2+ inspection cycles (pattern detection)

### Query: category breakdown

```sql
SELECT deficiency_category, COUNT(*) as count
FROM facility_deficiencies
WHERE cms_id = ?
GROUP BY deficiency_category
ORDER BY count DESC;
```

### Query: percentile

```sql
-- How many facilities in this state have FEWER deficiencies?
SELECT COUNT(*) FROM facilities
WHERE state = ? AND total_deficiencies < ?;
-- Then: percentile = (count_less / total_state_facilities) * 100
```

### Query: repeat F-tags

```sql
SELECT deficiency_tag_number, COUNT(DISTINCT inspection_cycle) as cycles
FROM facility_deficiencies
WHERE cms_id = ?
GROUP BY deficiency_tag_number
HAVING cycles > 1
ORDER BY cycles DESC;
```

### Files touched
- `src/templates/facility.ts` (add analysis section)
- `src/handlers/facility.ts` (add aggregation queries to handler)

### Ship criteria
- Category breakdown renders correctly
- Percentile comparison is accurate
- Repeat F-tags are identified and highlighted
- No regression on existing deficiency display

---

## Phase 4 — Ownership Data Ingest

**Why fifth.** This is the first phase that requires a new data source. Ownership data turns the site from "evaluate this building" to "evaluate the company running this building." It's the foundation for operator pages (Phase 5) and the highest-moat data layer.

### Schema change

```sql
-- migration: 004_ownership.sql
ALTER TABLE facilities ADD COLUMN owner_name TEXT;
ALTER TABLE facilities ADD COLUMN owner_type TEXT;
ALTER TABLE facilities ADD COLUMN owner_since TEXT;
```

Keep it simple: store ownership as facility attributes, not a separate normalized table. Graph databases and ownership edges are Phase 10 — not now. The goal is to answer "who runs this place?" not to model private equity holding structures.

### Data source

CMS publishes SNF ownership data via:
- **Provider Enrollment, Chain, and Ownership System (PECOS)**
- **SNF Ownership Files** — downloadable CSVs with CCN → owner name/type mapping

### Ingest approach

Add to `scripts/ingest.ts` (or a separate `scripts/ingest-ownership.ts`):

1. Download the CMS ownership CSV
2. For each row, extract CCN (maps to `cms_id`) and owner fields
3. `UPDATE facilities SET owner_name = ?, owner_type = ? WHERE cms_id = ?`

Start with the simplest possible mapping: facility → direct owner. Don't chase parent companies, holding LLCs, or PE funds yet.

### Files touched
- `migrations/004_ownership.sql` (new)
- `scripts/ingest-ownership.ts` (new)
- `scripts/ingest.ts` (optional — call ownership ingest after facility ingest)

### Ship criteria
- `owner_name` is populated for facilities where CMS data exists
- Facility page shows owner name (if available)
- Ingest handles missing/null ownership data gracefully

---

## Phase 5 — Operator Pages

**Why sixth.** Once ownership data exists, operator pages become a single query. This is the highest-leverage new page type: it addresses chain-level evaluation and creates a new SEO surface area distinct from facility and city pages.

### Route

`/operator/:slug` — where slug is derived from `owner_name` using the existing `toSlug()` function.

### Page content

```
Operator: Genesis Healthcare
Facilities: 327
States: 42
Average Grade: C+ (72.3)

Grade Distribution:
  A:  8%
  B: 22%
  C: 38%
  D: 24%
  F:  8%

Staffing:
  Average RN hours: 0.48
  Facilities failing federal minimum: 41%

Deficiencies:
  Average per facility: 12.4

Facility List (sortable by grade):
  [table of all facilities owned by this operator]
```

### Query

```sql
SELECT
  COUNT(*) as facility_count,
  COUNT(DISTINCT state) as state_count,
  ROUND(AVG(grade_score), 1) as avg_grade,
  ROUND(AVG(rn_hours_per_resident_day), 2) as avg_rn_hours,
  ROUND(AVG(total_deficiencies), 1) as avg_deficiencies,
  SUM(CASE WHEN rn_hours_per_resident_day < 0.55 THEN 1 ELSE 0 END) as failing_staffing
FROM facilities
WHERE owner_name = ?;
```

### List pages

- `/operators` — all operators, sorted by facility count
- `/operators/best` — operators sorted by avg_grade DESC
- `/operators/worst` — operators sorted by avg_grade ASC

### Files touched
- `src/handlers/operator.ts` (new)
- `src/templates/operator.ts` (new)
- `src/index.ts` (add routes)

### Ship criteria
- Operator pages render with correct aggregated data
- Facility list within operator page is sortable by grade/staffing/deficiencies
- Best/worst operator list pages work

---

## Phase 6 — Trajectory Engine

**Why seventh.** This is the phase that answers "is this facility getting better or worse?" It requires Phase 0 snapshots to have accumulated at least 2–3 data points (so: deploy Phase 0, wait 2–3 months of ingests, then build Phase 6).

### What it computes

For each facility, using the last 24 months of snapshots:

| Trend | Condition |
|---|---|
| Improving | `grade_score` increased by ≥5 points or `total_deficiencies` decreased by ≥30% |
| Stable | No significant change in either direction |
| Declining | `grade_score` decreased by ≥5 points or `total_deficiencies` increased by ≥30% |
| Volatile | Both improving and declining periods within the window |
| New | Fewer than 3 snapshot data points |

### Display on facility page

```
▲ Improving
   Grade: C → B over 18 months
   Staffing +22%
   Deficiencies -18%
```

Not: "Trajectory Score: 74.238"

The math stays hidden. The conclusion is public.

### Query

```sql
-- Get snapshots for last 24 months, ordered by date
SELECT snapshot_date, grade_score, rn_hours_per_resident_day, total_deficiencies
FROM facility_snapshots
WHERE cms_id = ?
  AND snapshot_date >= date('now', '-24 months')
ORDER BY snapshot_date ASC;
```

Compute trend client-side or in a simple TypeScript function — no need for a stored procedure.

### Files touched
- `src/trajectory.ts` (new — compute trend from snapshot array)
- `src/templates/facility.ts` (add trajectory indicator)
- `src/handlers/facility.ts` (fetch snapshots, compute trend)
- `test/trajectory.test.ts` (new)

### Ship criteria
- Trajectory label appears on facility pages with ≥3 snapshots
- "New" label appears for facilities with insufficient history
- Trend computation is deterministic and testable
- Visual indicator (▲/●/▼) renders correctly

---

## Phase 7 — Journalist-Layer Reports & State Scorecards

**Why last.** This phase creates the pages that journalists, researchers, and policy analysts cite. These are low-traffic but high-authority pages designed specifically to attract backlinks — directly addressing the "positions 40–90" authority problem identified in the GSC data.

### Report pages

| Route | Content |
|---|---|
| `/reports/staffing` | National staffing analysis — % failing, state rankings, worst states |
| `/reports/deficiencies` | National deficiency analysis — most common F-tags, state comparisons |
| `/reports/chains` | Chain comparison report — best/worst operators with methodology |
| `/state/:state/report` | State scorecard — ranking vs. other states, top issues, methodology |

### State scorecard content

```
Wisconsin Nursing Home Report Card — 2026

Rank: #18 of 50 states

Facilities: 398
Average Grade: B- (66.2)
National Average: C+ (63.8)

Staffing:
  42% fail federal minimum  (national: 44%)
  Average RN hours: 0.52   (national: 0.48)

Deficiencies:
  Average per facility: 8.4  (national: 10.2)
  Most common: Infection Control, Resident Rights

Methodology:
  Data sourced from CMS Nursing Home Compare, Payroll-Based Journal,
  and inspection deficiency records. Grades computed using a weighted
  composite of RN staffing compliance (35%), deficiency count (30%),
  quality measures (20%), and staffing consistency (15%).
```

### Design principle

Every report page must prominently display:
1. **The finding** (headline claim)
2. **The data** (supporting numbers)
3. **The methodology** (how it was computed)
4. **The source** (CMS dataset name and date)
5. **The date** (when the analysis was run)

This makes every page citable. A journalist should be able to write:
> "According to NursingHomeGrade's analysis of CMS data..."

### Files touched
- `src/handlers/reports.ts` (new)
- `src/templates/reports.ts` (new)
- `src/templates/state-report.ts` (new)
- `src/index.ts` (add routes)

### Ship criteria
- Report pages render with accurate data
- Methodology section is present on every report
- State scorecard shows ranking vs. other states
- Reports are cacheable via KV

---

## Summary: Phases at a Glance

| Phase | Time (approx) | Schema Change? | Depends On |
|---|---|---|---|
| 0 — Snapshots | 2–3 days | Yes (new table) | Nothing |
| 1 — Best/Worst pages | 2–3 days | No | Nothing |
| 2 — City enrichment | 2–3 days | No | Nothing |
| 3 — Deficiency synthesis | 2–3 days | No | Nothing |
| 4 — Ownership ingest | 3–5 days | Yes (ALTER TABLE) | Nothing |
| 5 — Operator pages | 2–3 days | No | Phase 4 |
| 6 — Trajectory | 2–3 days | No | Phase 0 + 2–3 months of snapshots |
| 7 — Reports | 3–5 days | No | Phases 4, 5 for chain reports |

Phases 0–3 can be built in parallel or any order — they touch different files and no schema conflicts.
Phases 4–5 are sequential.
Phase 6 requires Phase 0 to have accumulated data.
Phase 7 benefits from Phases 4–5 but can start earlier for state scorecards.

---

## What This Plan Intentionally Defers

- **Graph ownership edges** (parent/child company relationships). Start with direct owner. Add nesting later.
- **AI-generated narrative summaries**. The `grade_summary` in `scoring.ts` already provides deterministic, rules-based interpretation. LLM-generated text adds latency, cost, and correctness risk without proportional user value.
- **Lawsuit/PACER integration**. High operational complexity. Revisit when ownership data is mature.
- **News monitoring / whistleblower systems**. Content moderation liability. Defer until the platform has traffic and legal review.
- **Financial distress indicators**. Requires a new data source with unclear availability. Investigate after Phase 7.
- **Staffing turnover from PBJ detail data**. The PBJ employee-detail dataset exists but is large and complex. Start with snapshot-based RN hours trends; add turnover later.
- **API access / downloadable datasets**. Monetization question. Defer until the consumer product is differentiated.

---

## ChatGPT's Plan vs. This Plan

| Aspect | ChatGPT Plan | This Plan |
|---|---|---|
| Database design | UUIDs, graph edges, normalized operators table, fuzzy matching engine | D1-friendly: ALTER TABLE, INSERT OR IGNORE, simple joins |
| Starting point | Build everything from scratch | Extend existing `facilities` and `facility_deficiencies` tables |
| Ownership model | Full graph with parent/child edges and confidence scores | Single `owner_name` column; graph deferred indefinitely |
| Trajectory display | Public label only, "hide the math" | Same principle, but simpler computation (linear trend from snapshots) |
| AI narratives | LLM-generated summaries for every page | Deferred — existing `grade_summary` is deterministic and sufficient |
| Sequencing | 8 phases, no dependency tracking | Explicit dependencies; Phases 0–3 are parallelizable |
| Platform awareness | None (UUIDs, complex JOINs, stored procedures) | Respects D1 SQLite dialect, KV caching, Wrangler deploy workflow |
| Testability | Not mentioned | Each phase identifies test files; trajectory computation is unit-testable |

This plan is shorter, uglier, and more likely to ship.
