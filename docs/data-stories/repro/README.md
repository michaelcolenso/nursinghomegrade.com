# Reproducing the numbers in `../UNTOLD-STORIES.md`

Every figure in the report comes from these scripts run against the CMS Provider Data Catalog
(Provider Information processing date 2026-10-01). Downloads are not committed (about 1 GB).

```
cd docs/data-stories/repro && mkdir -p cms
python3 fetch.py 4pq5-n9py cms/provider.json      # Provider Information
python3 fetch.py g6vv-u9sr cms/penalties.json     # Penalties
python3 fetch.py 284v-j9fz cms/vbp.json           # FY 2026 SNF VBP facility-level
python3 fetch.py hicp-9999 cms/cutpoints.json     # State health-inspection cut points
python3 fetch.py svdt-c123 cms/surveydates.json   # Inspection Dates
python3 fetch.py y2hd-n93e cms/ownership.json     # Ownership
python3 fetch.py r5ix-sfxw cms/healthdef.json     # Health Deficiencies (~10 min)
for m in 481 410 479; do python3 fetchc.py djen-97ju measure_code $m cms/mds_$m.json; done
for m in 551 521; do python3 fetchc.py ijh5-nb2v measure_code $m cms/clm_$m.json; done
for m in S_005_02_DTC_COMP_PERF S_039_01_HAI_COMP_PERF S_004_01_PPR_PD_COMP_PERF S_005_02_DTC_RS_RATE; do
  python3 fetchc.py fykj-qjee measure_code $m cms/qrp_$m.json; done
python3 analyze.py && python3 analyze2.py
python3 reduce_defs.py && npx tsx grades.ts        # site grade via scripts/ingest.ts mapCMSFacility
```

`grades.ts` imports the production `mapCMSFacility` (which calls `src/scoring.ts computeGrade`), so the grade
cross-tabs use the same code path as ingest. They are computed from the CMS release, **not** read from the live D1.
