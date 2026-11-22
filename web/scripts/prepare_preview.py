#!/usr/bin/env python3
"""Prepare a standalone React preview from the MkDocs authoritative build.

Photos are copied locally from verified CC0 Wikimedia Commons file pages.
The runtime never hotlinks external photographs.
"""
import argparse
import hashlib
import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
PHOTOS = {
    "rome": "Colosseum, Rome.jpg",
    "positano": "Positano, Italy (Unsplash).jpg",
    "amalfi": "Amalfi Coast, Amalfi, Italy (Unsplash a2-FEzCN84Q).jpg",
    "coast": "Amalfi Coast (247891351).jpeg",
    "pompeii": "Composition ruins Pompeii.jpg",
    "naples": "Naples Vesuvius.JPG",
    "ravello": "Villa Rufolo - 01.jpg",
}

USER_AGENT = "ItalyFamilyFieldNotes/0.1 (Wikimedia Commons CC0 attribution; github.com/Jaeho211/italy-family-trip-2026)"


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
    except Exception as exc:
        print(f"{key}: Wikimedia API unavailable ({exc}), trying direct Commons paths")
    candidates += [f"{thumb_base}/{width}px-{quoted}" for width in (1440, 1024, 720)]
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
        except Exception as exc:
            errors.append(str(exc)[:100])
    raise RuntimeError(f"All Wikimedia image URLs failed for {title}: {errors}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--photos", action="store_true", help="Download CC0 images to web/public/photos")
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
                except Exception as exc:
                    error = exc
                    time.sleep(attempt + 1)
            if error is not None:
                raise SystemExit(f"Photo preparation failed for {key}: {error}")


if __name__ == "__main__":
    main()
