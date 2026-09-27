"""Build public restaurant candidates from the two My Maps research inventories."""

import json
import re
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs/assets/map/restaurants.json"


def broad_category(label):
    if label in {"피자", "튀긴피자"}:
        return "피자"
    if label in {"젤라또", "카페", "빵집", "티라미수", "초콜렛", "파브리", "기타", "전망"}:
        return "카페·디저트"
    if label in {"푸드코트", "수플리", "파니니", "간편식"}:
        return "간편식"
    return "식사"


rome_text = (ROOT / "research/rome-mymaps-places.md").read_text(encoding="utf-8")
rome_section = rome_text.split("## 맛집·카페·핫플 후보 · 99곳", 1)[1].split("\n## ", 1)[0]
entries = []
category = ""
for line in rome_section.splitlines():
    heading = re.match(r"### (.+?) · \d+곳", line)
    if heading:
        category = heading.group(1)
        continue
    match = re.match(r"- \[(.+?)\]\(https://www\.google\.com/maps/search/\?api=1&query=([\d.]+),([\d.]+)\)", line)
    if not match:
        continue
    label, lat, lng = match.groups()
    if " — " in label:
        source_category, name = label.split(" — ", 1)
    else:
        source_category, name = category, label
    if source_category != category:
        raise ValueError(f"Unexpected category: {line}")
    broad = broad_category(category)
    if category == "역사와전통" and any(word in name.lower() for word in ("커피", "caff", "café")):
        broad = "카페·디저트"
    entries.append({
        "city": "rome",
        "name": name,
        "category": broad,
        "sourceCategory": category,
        "coordinates": [float(lng), float(lat)],
        "googleUrl": f"https://www.google.com/maps/search/?api=1&query={lat},{lng}",
    })

if len(entries) != 99:
    raise ValueError(f"Expected 99 Rome candidates, got {len(entries)}")

naples_text = (ROOT / "research/naples-mymaps-places.md").read_text(encoding="utf-8")
naples_section = naples_text.split("## 맛집·카페 · 34개", 1)[1].split("\n## ", 1)[0]
for line in naples_section.splitlines():
    match = re.match(r"(\d+)\. (.+)", line)
    if not match:
        continue
    number, display_name = match.groups()
    latin_name = re.search(r"\(([^)]+)\)$", display_name)
    search_name = latin_name.group(1) if latin_name else display_name.split("👍")[-1]
    category = "식사"
    if any(term in display_name.lower() for term in ("pizza", "피자", "sorbillo", "브론디")):
        category = "피자"
    elif any(term in display_name.lower() for term in ("gelato", "mennella", "caff", "coffee", "casa infante", "scaturchio", "attanasio", "microtorrefazione")):
        category = "카페·디저트"
    elif any(term in display_name.lower() for term in ("street food", "passione di sofì", "all'antico vinaio")):
        category = "간편식"
    entries.append({
        "city": "naples",
        "name": display_name,
        "category": category,
        "sourceCategory": "맛집·카페",
        "coordinates": None,
        "googleUrl": "https://www.google.com/maps/search/?api=1&query=" + quote(search_name + " Napoli", safe=""),
        "sourceNumber": int(number),
    })

if len(entries) != 133:
    raise ValueError(f"Expected 133 candidates, got {len(entries)}")

OUTPUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(entries)} candidates to {OUTPUT}")
