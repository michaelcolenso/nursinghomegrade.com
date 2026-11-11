# Shrinks the Health Deficiencies download to what scripts/ingest.ts feeds the grade:
# {ccn: [[scope_severity_code, deficiency_corrected, inspection_cycle], ...]}
import json, os, collections as C
B = os.environ.get("CMS_DIR", "cms") + "/"
red = C.defaultdict(list)
for h in json.load(open(B + "healthdef.json")):
    red[h["cms_certification_number_ccn"]].append([h["scope_severity_code"], h["deficiency_corrected"], h["inspection_cycle"]])
json.dump(red, open(B + "def_reduced.json", "w"))
print("facilities with citations:", len(red))
