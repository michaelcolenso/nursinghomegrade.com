import json, statistics as st, collections as C, datetime as D, sys
import os
B = os.environ.get("CMS_DIR", "cms") + "/"
P = json.load(open(B + "provider.json"))
N = len(P)
def f(v):
    try: return float(str(v).replace(",", ""))
    except: return None
def pct(a, b): return f"{a:,} of {b:,} ({100*a/b:.1f}%)" if b else "n/a"
out = []
def say(*a): out.append(" ".join(str(x) for x in a))

say("PROCESSING DATE", C.Counter(p["processing_date"] for p in P).most_common(2))
say("TOTAL providers", N)

# 1 abuse icon
ab = [p for p in P if p["abuse_icon"] == "Y"]
say("ABUSE icon Y:", pct(len(ab), N))
r = C.Counter(p["overall_rating"] or "none" for p in ab)
say("  abuse-flagged by overall stars:", dict(sorted(r.items())))
say("  abuse-flagged with 4-5 overall stars:", pct(sum(1 for p in ab if p["overall_rating"] in ("4", "5")), len(ab)))
say("  abuse-flagged with staffing 4-5:", pct(sum(1 for p in ab if p["staffing_rating"] in ("4", "5")), len(ab)))
say("  abuse-flagged with QM 4-5:", pct(sum(1 for p in ab if p["qm_rating"] in ("4", "5")), len(ab)))

# 2 SFF
sff = C.Counter(p["special_focus_status"] or "" for p in P)
say("SPECIAL FOCUS:", dict(sff))

# 3 high performing
say("HIGH PERFORMING icon Y:", pct(sum(1 for p in P if p["high_performing_icon"] == "Y"), N))
hp_ab = sum(1 for p in P if p["high_performing_icon"] == "Y" and p["abuse_icon"] == "Y")
say("  high-performing AND abuse icon:", hp_ab)

# 4 stale inspection
old = [p for p in P if p["most_recent_health_inspection_more_than_2_years_ago"] == "Y"]
say("INSPECTION > 2 yrs old:", pct(len(old), N))
say("  by state top:", C.Counter(p["state"] for p in old).most_common(8))

# 5 ownership change
chg = [p for p in P if p["provider_changed_ownership_in_last_12_months"] == "Y"]
say("CHANGED OWNERSHIP last 12 mo:", pct(len(chg), N))
say("  their overall stars:", dict(sorted(C.Counter(p["overall_rating"] or "none" for p in chg).items())))

# 6 council / sprinklers / ccrc / hospital / urban
say("RESIDENT/FAMILY COUNCIL:", dict(C.Counter(p["with_a_resident_and_family_council"] for p in P)))
say("SPRINKLERS:", dict(C.Counter(p["automatic_sprinkler_systems_in_all_required_areas"] for p in P)))
say("CCRC Y:", sum(p["continuing_care_retirement_community"] == "Y" for p in P), " in hospital Y:", sum(p["provider_resides_in_hospital"] == "Y" for p in P), " urban:", dict(C.Counter(p["urban"] for p in P)))

# 7 weekend staffing gap
gaps, rngaps = [], []
for p in P:
    wk, tot = f(p["total_number_of_nurse_staff_hours_per_resident_per_day_on_t_4a14"]), f(p["reported_total_nurse_staffing_hours_per_resident_per_day"])
    if wk and tot: gaps.append(wk / tot)
    rw, rt = f(p["registered_nurse_hours_per_resident_per_day_on_the_weekend"]), f(p["reported_rn_staffing_hours_per_resident_per_day"])
    if rw is not None and rt: rngaps.append(rw / rt)
say("WEEKEND total nurse / overall reported: n", len(gaps), "median", round(st.median(gaps), 3))
say("  share with weekend < 85% of average:", pct(sum(g < 0.85 for g in gaps), len(gaps)), " <75%:", pct(sum(g < 0.75 for g in gaps), len(gaps)))
say("WEEKEND RN / overall RN: n", len(rngaps), "median", round(st.median(rngaps), 3), " <50%:", pct(sum(g < 0.5 for g in rngaps), len(rngaps)))

# 8 turnover
tt = [f(p["total_nursing_staff_turnover"]) for p in P if f(p["total_nursing_staff_turnover"]) is not None]
say("TOTAL NURSING TURNOVER: n", len(tt), "median", st.median(tt), " >=60%:", pct(sum(t >= 60 for t in tt), len(tt)), " >=75%:", pct(sum(t >= 75 for t in tt), len(tt)))
adm = [int(f(p["number_of_administrators_who_have_left_the_nursing_home"])) for p in P if f(p["number_of_administrators_who_have_left_the_nursing_home"]) is not None]
say("ADMINISTRATORS LEFT: n", len(adm), dict(sorted(C.Counter(min(a, 4) for a in adm).items())), "(4 = 4+)")

# 9 occupancy
occ = []
for p in P:
    b, r_ = f(p["number_of_certified_beds"]), f(p["average_number_of_residents_per_day"])
    if b and r_ is not None: occ.append(r_ / b)
say("OCCUPANCY: n", len(occ), "median", round(st.median(occ), 3), " <60%:", pct(sum(o < 0.6 for o in occ), len(occ)))

# 10 acuity vs staffing: sicker than average residents but below case-mix expected staffing
mis = 0; hi = 0
for p in P:
    ratio = f(p["nursing_casemix_index_ratio"]); rep = f(p["reported_total_nurse_staffing_hours_per_resident_per_day"]); exp_ = f(p["casemix_total_nurse_staffing_hours_per_resident_per_day"])
    if ratio and rep and exp_:
        if ratio >= 1.1:
            hi += 1
            if rep < exp_: mis += 1
say("ACUITY: residents >=10% sicker than national (CMI ratio>=1.1):", hi, "; of those staffed below their case-mix expected total hours:", pct(mis, hi))

# 11 footnotes on staffing/survey
say("STAFFING RATING footnote:", dict(C.Counter(p["staffing_rating_footnote"] for p in P)))
say("REPORTED STAFFING footnote:", dict(C.Counter(p["reported_staffing_footnote"] for p in P)))
say("CYCLE1 SURVEY footnote:", dict(C.Counter(p["rating_cycle_1_standard_survey_footnote"] for p in P)))
say("OVERALL RATING footnote:", dict(C.Counter(p["overall_rating_footnote"] for p in P)))

# 12 complaints & revisits
c1 = sum(f(p["rating_cycle_1_number_of_complaint_health_deficiencies"]) or 0 for p in P)
t1 = sum(f(p["rating_cycle_1_total_number_of_health_deficiencies"]) or 0 for p in P)
say("CYCLE1 complaint deficiencies share:", f"{int(c1):,} of {int(t1):,} ({100*c1/t1:.1f}%)")
rv = [f(p["rating_cycle_1_number_of_health_revisits"]) for p in P if f(p["rating_cycle_1_number_of_health_revisits"]) is not None]
say("CYCLE1 revisits:", dict(sorted(C.Counter(int(x) for x in rv).items())))
ic = [f(p["number_of_citations_from_infection_control_inspections"]) for p in P if f(p["number_of_citations_from_infection_control_inspections"]) is not None]
say("INFECTION-CONTROL inspection citations >0:", pct(sum(x > 0 for x in ic), len(ic)))

# 13 chains
inch = [p for p in P if p["chain_id"]]
say("IN A CMS CHAIN:", pct(len(inch), N), " distinct chains:", len({p["chain_id"] for p in inch}))
chs = {}
for p in inch:
    chs.setdefault(p["chain_id"], (p["chain_name"], int(f(p["number_of_facilities_in_chain"]) or 0), f(p["chain_average_overall_5star_rating"])))
big = sorted(chs.values(), key=lambda x: -x[1])[:10]
say("  largest chains (name, size, avg overall):", big)
big20 = [c for c in chs.values() if c[1] >= 20 and c[2] is not None]
say("  chains >=20 homes:", len(big20), " avg-overall range:", min(c[2] for c in big20), "-", max(c[2] for c in big20))
say("  chains>=20 with avg overall <=2.0:", sorted([c for c in big20 if c[2] <= 2.0], key=lambda c: c[2])[:12])

# 14 ownership type vs stars (descriptive)
own = C.defaultdict(list)
for p in P:
    o = p["ownership_type"].split(" - ")[0]
    if p["overall_rating"]: own[o].append(int(p["overall_rating"]))
say("OWNERSHIP type -> n, mean overall, % 1-star:", {k: (len(v), round(st.mean(v), 2), round(100 * sum(x == 1 for x in v) / len(v), 1)) for k, v in own.items()})

# 15 fines
pen = json.load(open(B + "penalties.json"))
fines = [p for p in pen if p["penalty_type"] == "Fine"]
amt = [f(p["fine_amount"]) for p in fines if f(p["fine_amount"])]
say("PENALTIES rows", len(pen), " fines", len(fines), " total $", f"{sum(amt):,.0f}", " median $", st.median(amt), " max $", f"{max(amt):,.0f}")
say("  fines >= $100k:", sum(a >= 100000 for a in amt), " >= $250k:", sum(a >= 250000 for a in amt))
den = [p for p in pen if p["penalty_type"] == "Payment Denial"]
say("  payment denials", len(den), " median days", st.median([f(p["payment_denial_length_in_days"]) for p in den if f(p["payment_denial_length_in_days"]) is not None]))
perfac = C.Counter(p["cms_certification_number_ccn"] for p in pen)
say("  facilities with >=3 penalties in 3 yrs:", sum(v >= 3 for v in perfac.values()), " >=5:", sum(v >= 5 for v in perfac.values()))

# 16 state cut points
cp = json.load(open(B + "cutpoints.json"))
def upper(s):
    return float(s.split("-")[1]) if "-" in s else None
fives = sorted((upper(c["5_stars"]), c["state"]) for c in cp)
ones = sorted((float(c["1_star"].lstrip(">")), c["state"]) for c in cp)
say("CUT POINTS 5-star max score: lowest", fives[:3], " highest", fives[-3:])
say("CUT POINTS 1-star threshold: lowest", ones[:3], " highest", ones[-3:])

# 17 VBP
V = json.load(open(B + "vbp.json"))
mult = [f(v["incentive_payment_multiplier"]) for v in V if f(v["incentive_payment_multiplier"]) is not None]
say("VBP rows", len(V), " with multiplier", len(mult), " <1 (net cut):", pct(sum(m < 1 for m in mult), len(mult)), " min", min(mult), " max", max(mult), " median", st.median(mult))
pmap = {p["cms_certification_number_ccn"]: p for p in P}
cut5 = sum(1 for v in V if f(v["incentive_payment_multiplier"]) is not None and f(v["incentive_payment_multiplier"]) < 1 and pmap.get(v["cms_certification_number_ccn"], {}).get("overall_rating") == "5")
bonus1 = sum(1 for v in V if f(v["incentive_payment_multiplier"]) is not None and f(v["incentive_payment_multiplier"]) > 1 and pmap.get(v["cms_certification_number_ccn"], {}).get("overall_rating") == "1")
say("  Medicare pay cut but 5-star overall:", cut5, "; pay bonus but 1-star overall:", bonus1)
bonus_abuse = sum(1 for v in V if f(v["incentive_payment_multiplier"]) is not None and f(v["incentive_payment_multiplier"]) > 1 and pmap.get(v["cms_certification_number_ccn"], {}).get("abuse_icon") == "Y")
say("  Medicare pay bonus AND abuse icon:", bonus_abuse)

# 18 survey dates: interval between last two standard health surveys
S = json.load(open(B + "surveydates.json"))
say("SURVEY TYPES:", dict(C.Counter(s["type_of_survey"] for s in S)))
std = C.defaultdict(dict)
for s in S:
    if s["type_of_survey"] == "Health Standard":
        std[s["cms_certification_number_ccn"]][s["survey_cycle"]] = s["survey_date"]
iv = []
for k, d in std.items():
    if "1" in d and "2" in d:
        a, b = D.date.fromisoformat(d["1"]), D.date.fromisoformat(d["2"])
        iv.append((a - b).days / 30.44)
say("STANDARD SURVEY interval months: n", len(iv), " median", round(st.median(iv), 1), " >15.9 mo:", pct(sum(x > 15.9 for x in iv), len(iv)), " >24 mo:", pct(sum(x > 24 for x in iv), len(iv)))
say("SURVEY footnotes:", dict(C.Counter(s["survey_footnote"] for s in S)))
comp = C.Counter(s["cms_certification_number_ccn"] for s in S if s["type_of_survey"] == "Health Complaint")
say("COMPLAINT inspections w/ citations (3 yrs): facilities", len(comp), " with >=5:", sum(v >= 5 for v in comp.values()), " >=10:", sum(v >= 10 for v in comp.values()))

# 19 ownership file
O = json.load(open(B + "ownership.json"))
say("OWNERSHIP rows", len(O), " roles:", C.Counter(o["role_played_by_owner_or_manager_in_facility"] for o in O).most_common(20))
mort = {o["cms_certification_number_ccn"] for o in O if "MORTGAGE" in o["role_played_by_owner_or_manager_in_facility"] or "SECURITY" in o["role_played_by_owner_or_manager_in_facility"]}
say("  facilities listing a 5%+ mortgage/security-interest holder:", pct(len(mort), N))
# New-owner counts live in analyze2.py (association_date is 'since MM/DD/YYYY').
per = C.Counter(o["cms_certification_number_ccn"] for o in O)
say("  ownership/management entries per facility: median", st.median(per.values()), " >=25:", sum(v >= 25 for v in per.values()))

print("\n".join(out))
