#!/usr/bin/env python3
"""Prepare a standalone React preview from the MkDocs authoritative build.

Photos are copied locally from verified CC0 or CC BY 4.0 Wikimedia Commons file pages.
The runtime never hotlinks external photographs.
"""
import argparse
import hashlib
import json
import markdown
import re
import shutil
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
PHOTOS = {
    "rome": "Colosseum, Rome.jpg",
    "pantheon": "Façade of the Pantheon, Rome, Italy.jpg",
    "vatican": "Saint Peter Basilica Rome.jpg",
    "civita": "Civita di Bagnoregio aerial panorama. June 2024.jpg",
    "trevi": "Trevi Fountain (Unsplash).jpg",
    "plebiscito": "San Francesco di Paola, Naples, 18 Feb 2018.jpg",
    "toledo": "Toledo (Metropolitana di Napoli L1).jpg",
    "trastevere": "Piazza di Santa Maria - Trastevere - Rome, Italy - DSC00438.jpg",
    "positano": "Positano, Italy (Unsplash).jpg",
    "amalfi": "Amalfi Coast, Amalfi, Italy (Unsplash a2-FEzCN84Q).jpg",
    "pompeii": "Composition ruins Pompeii.jpg",
    "ravello": "Villa Rufolo - 01.jpg",
}

USER_AGENT = "ItalyFamilyFieldNotes/0.2 (https://github.com/Jaeho211/italy-family-trip-2026)"


def get_bytes(url, limit=10_000_000):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json,image/jpeg,*/*"})
    with urllib.request.urlopen(request, timeout=40) as response:
        payload = response.read(limit + 1)
        if len(payload) > limit:
            raise RuntimeError(f"Remote photo exceeds size limit: {url}")
        return payload


def fetch_photo(key, filename, dst):
    title = "File:" + filename
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "imageinfo", "iiprop": "url|mime",
        "iiurlwidth": "1440", "titles": title,
    })
    endpoint = "https://commons.wikimedia.org/w/api.php?" + query
    normalized = filename.replace(" ", "_")
    digest = hashlib.md5(normalized.encode("utf-8")).hexdigest()
    quoted = urllib.parse.quote(normalized)
    original = f"https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{quoted}"
    thumb_base = f"https://upload.wikimedia.org/wikipedia/commons/thumb/{digest[0]}/{digest[:2]}/{quoted}"
    candidates = []
    try:
        payload = json.loads(get_bytes(endpoint))
        pages = payload.get("query", {}).get("pages", [])
        if pages and pages[0].get("imageinfo"):
            info = pages[0]["imageinfo"][0]
            if info.get("mime") == "image/jpeg":
                candidates.append(info.get("thumburl") or info["url"])
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            raise  # Respect rate limiting; do not try more paths immediately.
        print(f"{key}: Wikimedia API error ({exc}), trying direct Commons paths")
    except Exception as exc:
        print(f"{key}: Wikimedia API unavailable ({exc}), trying direct Commons paths")
    candidates += [f"{thumb_base}/{width}px-{quoted}" for width in (1280, 960, 500)]
    candidates.append(original)
    errors = []
    for photo_url in dict.fromkeys(candidates):
        try:
            photo = get_bytes(photo_url, limit=20_000_000)
            if not photo.startswith(b"\xff\xd8") or len(photo) < 8000:
                raise RuntimeError("non-JPEG/empty response")
            dst.write_bytes(photo)
            print(f"{key}: {len(photo) // 1024} KiB / {filename}")
            return
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                raise  # Retry later without probing more Wikimedia endpoints.
            errors.append(str(exc)[:100])
        except Exception as exc:
            errors.append(str(exc)[:100])
    raise RuntimeError(f"All Wikimedia image URLs failed for {title}: {errors}")


def validate_place_photos(data):
    """Keep the curated step thumbnails aligned with real travel places and build assets."""
    index = json.loads((WEB / "src/place-photos.json").read_text(encoding="utf-8"))
    places = {str(p["properties"]["sort"]): p["properties"] for p in data["places"]}
    for place_id, entry in index.items():
        place = places.get(place_id)
        if place is None:
            raise SystemExit(f"Photo registry references unknown place ID: {place_id}")
        if place.get("group") == "lodging":
            raise SystemExit(f"Photo registry must not attach a tourist photo to lodging: {place_id}")
        if entry.get("file") not in PHOTOS:
            raise SystemExit(f"Photo registry references missing local photo: {entry}")
        if not isinstance(entry.get("alt"), str) or not entry["alt"].strip():
            raise SystemExit(f"Photo registry missing alt text for place: {place_id}")
        visits = [step for day in data["days"] for step in day["steps"]
                  if step["places"] == [int(place_id)]]
        if not visits:
            raise SystemExit(f"Photo registry place ID has no standalone visit step: {place_id}")
    print(f"Validated {len(index)} itinerary photo mappings")


def validate_day_photos(data):
    """Verify date-specific overview photos match the actual day and local assets."""
    index = json.loads((WEB / "src/day-photos.json").read_text(encoding="utf-8"))
    days = {day["date"]: day for day in data["days"]}
    for date, entry in index.items():
        day = days.get(date)
        if day is None:
            raise SystemExit(f"Overview photo references unknown itinerary date: {date}")
        if entry.get("file") not in PHOTOS:
            raise SystemExit(f"Overview photo references missing local photo: {date}")
        if not all(isinstance(entry.get(field), str) and entry[field].strip()
                   for field in ("alt", "caption")):
            raise SystemExit(f"Overview photo lacks alt/caption: {date}")
        place_id = entry.get("placeId")
        if place_id is not None and not any(place_id in step["places"] for step in day["steps"]):
            raise SystemExit(f"Overview photo place {place_id} is not visited on {date}")
    print(f"Validated {len(index)} date-specific overview photo mappings")


def render_reservation_markdown(value):
    """Render authoritative, repository-maintained Markdown (not user input)."""
    return markdown.markdown(value.strip(), extensions=["attr_list"]).strip()


def build_reservations():
    """Project the four reservation sections into React without duplicating copy."""
    source = (ROOT / "docs/reservations.md").read_text(encoding="utf-8")
    parts = re.split(r"(?m)^##[ \t]+(.+?)\s*$", source)
    if len(parts) < 3 or (len(parts) - 1) % 2:
        raise SystemExit("Cannot parse reservation sections from docs/reservations.md")
    intro = re.sub(r"^# .+\n", "", parts[0], count=1).strip()
    sections = []
    for index in range(1, len(parts), 2):
        title = parts[index].strip()
        raw_section = parts[index + 1]
        items = []
        notes = []
        current = []
        for line in raw_section.splitlines():
            if line.startswith("- "):
                if current:
                    items.append(render_reservation_markdown(" ".join(current)))
                current = [line[2:].strip()]
            elif not line.strip():
                if current:
                    items.append(render_reservation_markdown(" ".join(current)))
                    current = []
            elif current:
                current.append(line.strip())
            else:
                notes.append(line.strip())
        if current:
            items.append(render_reservation_markdown(" ".join(current)))
        if not items:
            raise SystemExit(f"Reservation section has no items: {title}")
        sections.append({
            "id": f"reservation-section-{len(sections) + 1}",
            "title": title,
            "items": items,
            "notes": [render_reservation_markdown(note) for note in notes if note],
        })
    return {"intro": render_reservation_markdown(intro), "sections": sections}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--photos", action="store_true", help="Download licensed images to web/public/photos")
    args = parser.parse_args()
    source = ROOT / "site/assets/trip-data.json"
    if not source.is_file():
        raise SystemExit("First run: mkdocs build --strict (to generate site/assets/trip-data.json)")
    target = WEB / "public/data/trip-data.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    data = json.loads(target.read_text(encoding="utf-8"))
    if len(data.get("days", [])) != 11:
        raise SystemExit("Unexpected day count in source data")
    print(f"Trip data: {len(data['days'])} days; {len(data.get('places', []))} locations")
    validate_place_photos(data)
    validate_day_photos(data)
    reservations = build_reservations()
    reservations_target = WEB / "public/data/reservations.json"
    reservations_target.write_text(
        json.dumps(reservations, ensure_ascii=False, indent=2) + "
",
        encoding="utf-8",
    )
    print(f"Reservation data: {sum(len(s['items']) for s in reservations['sections'])} items")
    if args.photos:
        out = WEB / "public/photos"
        out.mkdir(parents=True, exist_ok=True)
        for key, filename in PHOTOS.items():
            dst = out / (key + ".jpg")
            if dst.is_file() and dst.stat().st_size > 8000:
                print(f"{key}: cached")
                continue
            error = None
            for attempt in range(3):
                try:
                    fetch_photo(key, filename, dst)
                    error = None
                    break
                except urllib.error.HTTPError as exc:
                    error = exc
                    if exc.code == 429:
                        retry_after = exc.headers.get("Retry-After", "60")
                        delay = int(retry_after) if retry_after.isdigit() else 60
                        print(f"{key}: Wikimedia rate limit; retrying after {delay}s", flush=True)
                        if attempt < 2:
                            time.sleep(max(60, min(delay, 180)))
                    elif attempt < 2:
                        time.sleep(attempt + 1)
                except Exception as exc:
                    error = exc
                    if attempt < 2:
                        time.sleep(attempt + 1)
            if error is not None:
                raise SystemExit(f"Photo preparation failed for {key}: {error}")
            time.sleep(3)  # Avoid rapid-fire independent download requests on fresh builds.


if __name__ == "__main__":
    main()
