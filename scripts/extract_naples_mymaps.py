"""Snapshot public restaurant pin coordinates from the Naples My Maps viewer."""

import json
import re
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://www.google.com/maps/d/u/0/viewer?mid=1gEGfljCgQJs66VO-oX7aHGf-XjN4RGzY"
OUTPUT = ROOT / "research/naples-restaurant-pins.json"


def find_restaurant_layer(node):
    if isinstance(node, list):
        if len(node) > 4 and node[2] == "맛집/카페" and isinstance(node[4], list):
            return node[4]
        for child in node:
            found = find_restaurant_layer(child)
            if found is not None:
                return found
    return None


request = Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"})
with urlopen(request, timeout=30) as response:
    html = response.read().decode("utf-8")

match = re.search(r'var _pageData = ("(?:\\.|[^"\\])*");', html, re.S)
if not match:
    raise ValueError("My Maps page data was not found")
data = json.loads(json.loads(match.group(1)))
items = find_restaurant_layer(data)
if items is None or len(items) != 34:
    raise ValueError(f"Expected 34 restaurant pins, got {len(items) if items else 0}")

research_text = (ROOT / "research/naples-mymaps-places.md").read_text(encoding="utf-8")
section = research_text.split("## 맛집·카페 · 34개", 1)[1].split("\n## ", 1)[0]
expected = [m.group(1) for line in section.splitlines() if (m := re.match(r"\d+\. (.+)", line))]
if len(expected) != 34:
    raise ValueError("Research inventory does not contain 34 names")

pins = []
for index, item in enumerate(items):
    try:
        name = item[5][0][0]
    except (IndexError, TypeError) as error:
        raise ValueError(f"Unexpected structure for pin {index + 1}: {item!r}") from error
    lat, lng = item[4][4]
    if name != expected[index]:
        raise ValueError(f"Pin {index + 1} does not match research inventory: {name!r}")
    if not (40.5 < lat < 41.1 and 13.8 < lng < 14.8):
        raise ValueError(f"Unexpected Naples coordinate for {name}: {lat}, {lng}")
    pins.append({"sourceNumber": index + 1, "name": name, "coordinates": [lng, lat]})

snapshot = {"sourceUrl": SOURCE_URL, "checkedAt": date.today().isoformat(), "pins": pins}
OUTPUT.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(pins)} Naples restaurant pins to {OUTPUT}")
