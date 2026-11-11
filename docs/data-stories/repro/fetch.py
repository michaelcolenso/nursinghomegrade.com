import json, sys, urllib.request, time
ds, out = sys.argv[1], sys.argv[2]
base = f"https://data.cms.gov/provider-data/api/1/datastore/query/{ds}/0"
rows, off = [], 0
while True:
    url = f"{base}?limit=1500&offset={off}&count=true&results=true&schema=false"
    for a in range(4):
        try:
            d = json.load(urllib.request.urlopen(url, timeout=120)); break
        except Exception as e:
            time.sleep(2**a)
    else:
        raise SystemExit(f"failed at {off}")
    rows += d["results"]; off += 1500
    if off >= d["count"]: break
json.dump(rows, open(out, "w"))
print(ds, len(rows), "of", d["count"])
