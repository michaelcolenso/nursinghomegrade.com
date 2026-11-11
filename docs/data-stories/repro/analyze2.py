import json, statistics as st, collections as C, datetime as D
import os
B = os.environ.get("CMS_DIR", "cms") + "/"
P = {p["cms_certification_number_ccn"]: p for p in json.load(open(B + "provider.json"))}
N = len(P)
def f(v):
    try: return float(str(v).replace(",", ""))
    except: return None
def pct(a, b): return f"{a:,} of {b:,} ({100*a/b:.1f}%)" if b else "n/a"
out = []
def say(*a): out.append(" ".join(str(x) for x in a))

# acuity baseline: share of ALL homes staffed below case-mix expected
allb = [(f(p["reported_total_nurse_staffing_hours_per_resident_per_day"]), f(p["casemix_total_nurse_staffing_hours_per_resident_per_day"]), f(p["nursing_casemix_index_ratio"])) for p in P.values()]
allb = [x for x in allb if all(v for v in x)]
say("ACUITY baseline: all homes below case-mix expected:", pct(sum(r < e for r, e, _ in allb), len(allb)))
lo = [x for x in allb if x[2] < 0.9]
say("  low-acuity (ratio<0.9) below expected:", pct(sum(r < e for r, e, _ in lo), len(lo)))

# MDS measures
for code, label in (("481", "LS antipsychotic"), ("410", "LS falls w/ major injury"), ("479", "LS pressure ulcers")):
    R = json.load(open(B + f"mds_{code}.json"))
    v = [(r["cms_certification_number_ccn"], f(r["four_quarter_average_score"])) for r in R if f(r["four_quarter_average_score"]) is not None]
    vals = sorted(x for _, x in v)
    q = lambda p: vals[int(p * (len(vals) - 1))]
    say(f"MDS {code} {label}: n {len(vals)} median {st.median(vals):.2f} p90 {q(.9):.2f} p99 {q(.99):.2f} max {vals[-1]:.2f}; footnoted/missing {len(R)-len(vals)}")
    if code == "481":
        hi = [c for c, x in v if x >= 20]
        say("  homes >=20% antipsychotic:", pct(len(hi), len(v)), " of those with QM rating 4-5:", sum(P[c]["qm_rating"] in ("4", "5") for c in hi if c in P))
        # long-stay antipsychotic by abuse icon
        ab = [x for c, x in v if P.get(c, {}).get("abuse_icon") == "Y"]; nab = [x for c, x in v if P.get(c, {}).get("abuse_icon") == "N"]
        say("  median antipsychotic: abuse-flagged", round(st.median(ab), 2), " not flagged", round(st.median(nab), 2))

# claims
for code, label in (("551", "LS hospitalizations /1000 days"), ("521", "SS rehospitalized %")):
    R = json.load(open(B + f"clm_{code}.json"))
    # Outliers are measured against the national median of the risk-adjusted score (what the report states),
    # not against each home's own expected_score.
    adj = sorted(f(r["adjusted_score"]) for r in R if f(r["adjusted_score"]) is not None)
    med = st.median(adj)
    say(f"CLAIMS {code} {label} ({R[0]['measure_period']}): n {len(adj)} national median adj {med:.2f}; "
        f"p90 {adj[9*len(adj)//10]:.2f}; adj >= 1.5x national median: {pct(sum(a >= 1.5*med for a in adj), len(adj))}")

# QRP comparative categories
for m in ("S_005_02_DTC_COMP_PERF", "S_039_01_HAI_COMP_PERF", "S_004_01_PPR_PD_COMP_PERF"):
    R = json.load(open(B + f"qrp_{m}.json"))
    say("QRP", m, dict(C.Counter(r["score"] for r in R)))
R = json.load(open(B + "qrp_S_005_02_DTC_RS_RATE.json"))
dtc = [f(r["score"]) for r in R if f(r["score"]) is not None]
say("QRP discharge-to-community risk-std rate: n", len(dtc), " median", round(st.median(dtc), 1), " p10", round(sorted(dtc)[len(dtc)//10], 1), " p90", round(sorted(dtc)[9*len(dtc)//10], 1))
# DTC worse vs overall stars
worse = [r["cms_certification_number_ccn"] for r in json.load(open(B + "qrp_S_005_02_DTC_COMP_PERF.json")) if r["score"].startswith("Worse")]
say("  DTC 'Worse than national' homes with 4-5 overall stars:", pct(sum(P.get(c, {}).get("overall_rating") in ("4", "5") for c in worse), len(worse)))

# ownership association dates
O = json.load(open(B + "ownership.json"))
def pdate(s):
    s = (s or "").replace("since", "").strip()
    try: return D.datetime.strptime(s, "%m/%d/%Y").date()
    except ValueError: return None
recent = set(); recent_any = set()
for o in O:
    d = pdate(o["association_date"])
    if not d: continue
    role = o["role_played_by_owner_or_manager_in_facility"]
    if d >= D.date(2025, 10, 1):
        recent_any.add(o["cms_certification_number_ccn"])
        if "OWNERSHIP INTEREST" in role: recent.add(o["cms_certification_number_ccn"])
say("OWNERSHIP: facilities with any new owner/manager since 2025-10-01:", pct(len(recent_any), N), "; new ownership-interest holder:", pct(len(recent), N))
mgmt = {o["cms_certification_number_ccn"] for o in O if o["role_played_by_owner_or_manager_in_facility"] in ("CONTRACTED MANAGING EMPLOYEE",)}
say("  facilities with a contracted managing employee:", pct(len(mgmt), N))
print("\n".join(out))
