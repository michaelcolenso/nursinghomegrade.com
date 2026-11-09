#!/usr/bin/env python3
"""Fetch Playfair Display + Inter (SIL OFL 1.1) and cut the static instances the
brand-asset generator needs. Output goes to data/fonts/ (gitignored).

  pip install fonttools
  python3 scripts/brand/instance-fonts.py
  npm run brand-assets

Sources: https://github.com/google/fonts (ofl/playfairdisplay, ofl/inter).
"""
import pathlib
import urllib.parse
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl"
OUT = pathlib.Path(__file__).resolve().parents[2] / "data" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "PlayfairDisplay[wght].ttf": f"{BASE}/playfairdisplay/" + urllib.parse.quote("PlayfairDisplay[wght].ttf"),
    "Inter[opsz,wght].ttf": f"{BASE}/inter/" + urllib.parse.quote("Inter[opsz,wght].ttf"),
}
INSTANCES = [
    ("PlayfairDisplay[wght].ttf", "PlayfairDisplay-SemiBold.ttf", {"wght": 600}),
    ("PlayfairDisplay[wght].ttf", "PlayfairDisplay-Regular.ttf", {"wght": 400}),
    ("Inter[opsz,wght].ttf", "Inter-ExtraBold.ttf", {"wght": 800, "opsz": 32}),
]

for name, url in SOURCES.items():
    dest = OUT / name
    if not dest.exists():
        print("download", url)
        urllib.request.urlretrieve(url, dest)

for src, out, axes in INSTANCES:
    font = TTFont(OUT / src)
    instancer.instantiateVariableFont(font, axes, inplace=False).save(OUT / out)
    print("wrote", OUT / out)
