import json, sys, urllib.request, urllib.parse, time
ds, prop, val, out = sys.argv[1:5]
rows, off = [], 0
while True:
    q = urllib.parse.urlencode({"conditions[0][property]": prop, "conditions[0][value]": val, "conditions[0][operator]": "=", "limit": 1500, "offset": off, "count": "true", "schema": "false"})
    url = f"https://data.cms.gov/provider-data/api/1/datastore/query/{ds}/0?{q}"
    for a in range(4):
        try:
            d = json.load(urllib.request.urlopen(url, timeout=120)); break
        except Exception:
            time.sleep(2**a)
    else:
        raise SystemExit("fail")
    rows += d["results"]; off += 1500
    if off >= d["count"]: break
json.dump(rows, open(out, "w")); print(ds, val, len(rows))
