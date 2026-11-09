# Stories the data already tells, and we don't

Source: the CMS *Nursing Home Data Dictionary* (updated October 2026), checked against what this repo ingests (`scripts/ingest*.ts`,
`migrations/`) and renders (`src/`). Every number below was computed from the live CMS Provider Data Catalog
(Provider Information processing date **2026-10-01**, 14,686 homes) with the scripts in `repro/`. Grade cross-tabs re-run the
production scoring path (`scripts/ingest.ts mapCMSFacility` → `src/scoring.ts computeGrade`) on that release; they were **not** read
from the live D1, so live pages may differ if D1 is on an older release.

Labels: **[In D1]** stored but never shown · **[Ingested]** fetched but dropped · **[New]** dataset not ingested.

---

## Verdict

The biggest gap is not a missing story. It is that **we hold CMS's two strongest warning signals and show neither**, while our grade
sometimes contradicts them.

- **177 of the 1,401 homes CMS flags for abuse get an A (29) or B (148) from us.** The abuse icon is stored in `facilities.abuse_icon` and rendered nowhere.
- **6 Special Focus *candidates* get an A (1) or B (5).** All 87 actual Special Focus Facilities grade D or F, but the status itself is never shown.

Build these five, in this order:

| # | Story | Headline number | Status | Effort |
|---|---|---|---|---|
| 1 | Abuse citations and Special Focus status on every facility page, plus state lists | 1,401 abuse-flagged; 87 SFF + 440 candidates | [In D1] | S |
| 2 | "Days without a registered nurse" and unverifiable staffing | 274 homes downgraded for many no-RN days; 255 with unsubmitted or unverifiable staffing | [Ingested] → store 2 footnote columns | S |
| 3 | Rehab outcomes for hospital-discharge families (short stay) | 1,160 homes "worse than national" at getting rehab patients home; 304 of them are 4–5 star | [New] SNF QRP | M |
| 4 | Inspections that are late | 37.3% of homes went more than 16 months between their last two standard inspections; 955 homes' newest inspection is over 2 years old | [Ingested] flag + [New] Inspection Dates | S–M |
| 5 | The resident-care measures we already store: antipsychotics, falls, pressure ulcers, hospitalizations, weekend staffing | 3,727 homes give 20%+ of long-stay residents antipsychotics; median weekend RN coverage is 69% of the all-days average | [In D1] grade2 tables, no reader in `src/` | M |

Why this order: 1 and 2 are safety facts families would want before anything else. They are near-zero effort, and leaving them off
is a credibility risk once someone notices an A-graded home with a CMS abuse icon. 3 serves the audience `.impeccable.md` names first
("recently discharged from hospital"), which the site currently answers only with long-stay data. 4 is a regulator-accountability story
with strong press and state-page value. 5 turns data we already pay to ingest into page depth.

---

## 1. Abuse and Special Focus: the warnings we hide **[In D1]**

**Data.** `Abuse Icon` (Y if cited for abuse or neglect at harm level G+ on cycle 1, or at D+ on both cycles 1 and 2) and
`Special Focus Status` (SFF, SFF Candidate). Both are written by `scripts/ingest.ts` (lines 119–120). `grep` finds them only in
`src/types.ts`; no template renders them.

| | Homes | Our grade A | B | C | D | F |
|---|---|---|---|---|---|---|
| Abuse icon | 1,401 (9.5%) | 29 | 148 | 238 | 314 | 671 |
| Special Focus Facility | 87 | 0 | 0 | 0 | 9 | 78 |
| SFF candidate | 440 | 1 | 5 | 31 | 70 | 333 |
| All homes | 14,686 | 2,482 | 3,454 | 3,556 | 2,680 | 2,475 |

(1 abuse-flagged home is NR.)

**What the citation file adds.** 31,736 citations sit in the "Freedom from Abuse, Neglect, and Exploitation" category. 4,219 of them
are at harm level G–L, and 2,079 are immediate jeopardy (J–L). 21,332 (67%) were found on complaint inspections, meaning someone reported it.

**Why our grade misses it.** `computeGrade` docks points for harm-level citations, but it counts all categories the same, and the
abuse icon's "D+ on two cycles" pattern is not a harm-level signal. Abuse-flagged homes still score 4–5 stars on CMS quality measures 48.9% of
the time (685 of 1,401), and those QM stars feed our grade.

**Build.** A red callout at the top of the facility page ("CMS has cited this home for abuse or neglect", with the definition), an
SFF / candidate banner, a filter on state, city and search pages, and `/reports/abuse-citations` plus a state version. **Separate
decision for you:** whether an abuse icon or SFF status should cap the grade (for example, no A or B). That is a scoring change, so
it is not part of this build.

## 2. Days without an RN, and staffing CMS couldn't verify **[Ingested → store footnotes]**

**Data.** Staffing-rating footnotes in Provider Information (dictionary Table 15):

- **24**, "reported a high number of days without a registered nurse onsite": **274 homes**. Our grade: A 2, B 18, C 38, D 64, F 152.
- **23**, did not submit staffing data: 119 homes. **25**, staffing accuracy could not be validated: 136 homes.

Ingest reads the staffing rating but drops the footnote, so a home downgraded for no-RN days looks like any other 1-star staffing home.

**Build.** Store `staffing_rating_footnote` and `reported_staffing_footnote`, then show plain-language notes in the staffing section.
This also fixes a quiet integrity issue: homes whose staffing CMS could not verify are graded on that data with no warning.

## 3. Short-stay rehab outcomes **[New: SNF QRP `fykj-qjee`, ~15k homes × ~60 rows]**

The site grades on long-stay signals. But the family "recently discharged from hospital" is choosing a **rehab** stay, and CMS publishes
risk-standardized rehab outcomes with confidence intervals and a three-way comparison to the national rate:

| Measure | Worse than national | Better | No different | Not available |
|---|---|---|---|---|
| Discharge to community (S_005_02) | **1,160** | 2,613 | 7,625 | 3,288 |
| Preventable readmissions within 30 days (S_004_01) | 256 | 93 | 12,334 | 2,003 |
| Infections requiring hospitalization (S_039_01) | 211 | 124 | 10,476 | 3,875 |

Risk-standardized discharge-to-community rate (n = 11,398): median **51.8%**, 10th percentile 38.0%, 90th 64.7%. Of the 1,160 "worse"
homes, **304 (26.2%) hold 4–5 overall stars**. The star a family sees says little about whether rehab patients get home.

**Build.** A "If you're coming from the hospital" panel on facility pages showing CMS's own better / worse / no-different category
(defensible, with no thresholds of our own), plus a "best rehab outcomes in [city]" list. The data refreshes quarterly or annually per
measure (dictionary Table 23). Show the period on every number.

## 4. Late inspections **[Ingested flag + New: Inspection Dates `svdt-c123`]**

- Between each home's last two standard health inspections (Inspection Dates file, n = 14,647): median **14.7 months**. **5,468 (37.3%)**
  exceeded 16 months, and **1,981 (13.5%)** exceeded 24 months.
- CMS's own flag `Most Recent Health Inspection More Than 2 Years Ago`: **955 homes** (AL 191, VA 165, NY 113, FL 92, IL 88).
  Our grade still gives 139 of them an A and 247 a B, based on old inspections.
- Federal law sets a maximum interval of 15 months between standard surveys (Social Security Act §1819(g)(2)(A)(iii)).
  **Unverified: confirm the citation before publishing.**

**Build.** A "data age" warning on facility pages when the newest inspection is more than 15 months old. Then a state-level report
ranking states by overdue share, which is a story about state survey agencies (the regulator), not homes, and strong for press and
links. Related: **129 homes'** latest standard survey was a *risk-based* survey (footnote 29, added September 2026). That is a shorter visit
given to high performers, and it likely finds fewer citations, which our deficiency-count input rewards. Label it on the page.

## 5. The measures we store but never show **[In D1]**

Migration 012 created `facility_mds_quality_measures`, `facility_claims_quality_measures`, `facility_staffing_features` and
`facility_survey_summaries`. Nothing in `src/` reads them.

| Signal | National picture (2026-10 release) |
|---|---|
| Long-stay antipsychotic use (481) | median 13.4%; 90th percentile 28.4%; **3,727 homes ≥ 20%**, 1,374 of them still 4–5 QM stars; abuse-flagged homes median 17.2% vs 13.0% |
| Falls with major injury (410) | median 2.8%; 90th percentile 6.3% |
| Pressure ulcers, long stay (479) | median 4.1%; 90th percentile 8.1% |
| Hospitalizations per 1,000 long-stay days (551) | median 1.73; **1,757 homes (15.9%) at 1.5× the median or more** |
| Short-stay rehospitalization (521) | median 23.4%; 574 homes at 1.5× or more |
| Weekend staffing | median weekend total nurse hours = 88% of the all-days average; median weekend RN = **69%**; **1,799 homes (12.6%) staff RNs on weekends at under half their average** |
| Administrator churn | 1,494 homes lost 2+ administrators in the turnover window |
| Acuity vs staffing | of 2,668 homes whose residents are ≥10% sicker than the national average, **89.8%** staff below CMS's case-mix expected hours (all homes: 53.2%; low-acuity homes: 17.6%). Partly mechanical: expected hours scale with acuity and actual hours don't. Frame it as "staffing doesn't rise with need", not as misconduct. |

**Build.** A "resident care" section with each measure as this home vs state vs US (the uploaded design system's MetricRow dot plot
was made for exactly this), and a weekend line in the staffing section.

---

## Second tier: real, but after the five above

| Story | Number | Status | Note |
|---|---|---|---|
| Same score, different stars by state | 5-star inspection cut-off: ≤2.0 weighted points in KY vs ≤59.0 in NM; 1-star starts above 40 in NH vs above 432 in DC | [New] cut points (53 rows) | Our grade uses absolute deficiency counts (`scoring.ts:72`), so this explains why NHG differs from CMS stars. It is positioning content for `/how-we-grade`. |
| Repeat penalties | $445.7M in fines over 3 years (12,638 fines, median $16,350, max $713,795, 82 ≥ $250k); 664 homes with 5+ penalties | [In D1] `facility_penalties` | Per-facility totals are shown, but no repeat-offender ranking exists. |
| Complaint-driven citations | 30.9% of cycle-1 citations came from complaint inspections; 1,475 homes had 10+ complaint inspections with citations in 3 years | [In D1] `complaint_deficiency` | Says "residents and families reported problems here, and inspectors confirmed them". |
| Didn't fix it the first time | 460 homes needed 2+ revisits to clear cycle-1 citations | [Ingested] revisit columns | Small, clear signal. |
| Two federal scorecards disagree | VBP: 1,702 five-star homes get a Medicare pay cut; 201 one-star homes and 186 abuse-flagged homes get a bonus | [New] VBP `284v-j9fz` | 78.6% of homes have a multiplier below 1 *by program design* (withhold and redistribute). Never present a cut alone as a penalty for bad care. Press angle, not a family signal. |
| CMS official chains | 69.6% of homes in 612 CMS chains; 127 chains with 20+ homes, average overall stars 1.3–4.9 | [Ingested] chain columns dropped | `/operators` is built from our own ownership-name normalization. Reconcile with CMS `chain_id` before publishing chain rankings. |
| Ownership churn | CMS "changed ownership in 12 months": 60 homes; but 328 homes list a new 5%+ ownership-interest holder since 2025-10-01 | [In D1] owners + [Ingested] flag | Definitions differ (change of ownership vs entity changes). Investigate before claiming either. |
| Lender interests | 2,107 homes (14.3%) list a 5%+ mortgage or security-interest holder | [In D1] | Descriptive only. Don't infer private equity from names. |
| Disputed citations | 631 citations under IDR, 131 under IIDR | [Ingested] | Label disputed citations on the page. This is fairness to operators. |
| Small facility facts | 759 homes without a resident council; 1,650 under 60% occupancy; 1,712 carry CMS's new High Performing icon (none abuse-flagged) | [Ingested] | Cheap additions to the facts grid. |

## Don't build

- **COVID-19 vaccination measures** (S_040_02, S_045_01): CMS removes them from Medicare.gov in January 2027 (dictionary Table 23).
- **For-profit vs nonprofit as cause.** Mean overall stars are 2.87 for-profit vs 3.62 nonprofit (1-star share 21.8% vs 9.9%), but that is descriptive. Don't claim ownership type causes quality.
- **Sprinklers.** 14,599 of 14,686 report "Yes". There is no story there.
- **Fire safety citations** (`ifjz-ge4w`). Real data, but low family salience. Do it after everything above.

## Smallest credible validation

Ship #1 (abuse + SFF on facility pages, two state lists) and #2 (no-RN footnote). Watch Search Console for 6–8 weeks for impressions
and clicks on facility pages for queries containing "abuse", "neglect", "special focus" or "violations", and for the new list URLs.
**Continue** to #3–#5 if those pages gain impressions and facility-page engagement holds. **Stop** expanding story pages (keep the
on-page flags regardless, since they are safety facts) if the lists earn no impressions after 8 weeks.

## Things this surfaced that you didn't ask about

- **Grade credibility.** See the verdict. The flags can ship without touching scoring; whether to cap grades is your call.
- **The uploaded design system conflicts with what just shipped.** The zip ("The Record": Newsreader, Schibsted Grotesk and IBM Plex Mono,
  ink and highlighter, record blue for links, square corners) and the new wordmark (Noto Serif Display, with a highlight) differ from
  the Playfair, Inter and teal system merged in PRs #74–#81. Its patterns (VerdictBlock, Findings, MetricRow, PullStat, SourceStamp) are the
  right vehicles for these stories. Decide which system is canonical before building story pages, or we build them twice.
- **Dictionary errata.** Table 1 describes the Medicare Claims file with the MDS text. CMS labels the weekend-hours column with a
  truncated key (`..._on_t_4a14`), so ingest must keep matching it by normalized header, as `ingest-grade2-phase-a.ts` already does.
