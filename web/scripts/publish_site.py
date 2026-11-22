#!/usr/bin/env python3
"""Promote the React travel guide to Pages root, keeping MkDocs under /legacy/.

Run only after a successful MkDocs build, photo preparation, and Vite build.
The source docs/ tree and build outputs used for content generation are unchanged.
"""
from __future__ import annotations

import hashlib
import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MKDOCS = ROOT / "site"
REACT = ROOT / "web/dist"
STAGE = ROOT / ".pages-stage"


def redirect_html(destination: str) -> str:
    """Use both a JS redirect preserving query/hash and a no-JS fallback."""
    safe_target = html.escape(destination, quote=True)
    literal = json.dumps(destination)
    return (
        "<!doctype html>\n"
        '<html lang="ko"><head><meta charset="utf-8">\n'
        f'<meta http-equiv="refresh" content="0; url={safe_target}">\n'
        '<meta name="robots" content="noindex">\n'
        f"<script>location.replace({literal} + location.search + location.hash)</script>\n"
        '</head><body><p>이 페이지는 기존 여행 수첩으로 이동했습니다. '
        f'<a href="{safe_target}">기존 페이지 열기</a>.</p></body></html>\n'
    )


def check_before_publish() -> None:
    for required in (
        MKDOCS / "index.html",
        MKDOCS / "assets/trip-data.json",
        MKDOCS / "assets/map/map.html",
        MKDOCS / "sw.js",
        REACT / "index.html",
        REACT / "data/trip-data.json",
        REACT / "data/reservations.json",
        REACT / "photos/positano.jpg",
        REACT / "sw.js",
        REACT / "manifest.webmanifest",
        MKDOCS / "assets/journey/icon-192.png",
        MKDOCS / "assets/journey/icon-512.png",
    ):
        if not required.is_file() or required.stat().st_size == 0:
            raise SystemExit(f"Pages promotion blocked: missing build output {required}")

    source = json.loads((MKDOCS / "assets/trip-data.json").read_text(encoding="utf-8"))
    published = json.loads((REACT / "data/trip-data.json").read_text(encoding="utf-8"))
    if source != published or len(source.get("days", [])) != 11:
        raise SystemExit("Pages promotion blocked: React and MkDocs itinerary data differ")

    reservation_data = json.loads((REACT / "data/reservations.json").read_text(encoding="utf-8"))
    if not reservation_data.get("intro") or not reservation_data.get("sections"):
        raise SystemExit("Pages promotion blocked: reservation data missing")

    html_text = (REACT / "index.html").read_text(encoding="utf-8")
    if '/italy-family-trip-2026/assets/' not in html_text:
        raise SystemExit("Pages promotion blocked: Vite bundle base does not target the project root")


def render_pwa_worker() -> None:
    """Generate an offline shell cache from the exact Vite build output.

    Hashed JS/CSS must be precached on the first installation, because the app
    loads them before service worker registration. The old MkDocs worker is
    retained separately under /legacy/, with a different cache namespace.
    """
    files = sorted(
        p for p in REACT.rglob("*")
        if p.is_file() and p.name != "sw.js"
    )
    required_icons = [
        STAGE / "assets/journey/icon-192.png",
        STAGE / "assets/journey/icon-512.png",
    ]
    for path in required_icons:
        if not path.is_file() or path.stat().st_size == 0:
            raise SystemExit(f"Pages promotion blocked: missing PWA icon {path}")

    paths = ["./"] + [p.relative_to(REACT).as_posix() for p in files]
    paths += ["assets/journey/icon-192.png", "assets/journey/icon-512.png"]
    digest = hashlib.sha256()
    for path in [*files, *required_icons]:
        relative = path.relative_to(REACT) if path.is_relative_to(REACT) else path.relative_to(STAGE)
        digest.update(relative.as_posix().encode("utf-8"))
        digest.update(path.read_bytes())
    version = digest.hexdigest()[:16]

    source = (REACT / "sw.js").read_text(encoding="utf-8")
    if source.count("__VERSION__") != 1 or source.count("__PRECACHE__") != 1:
        raise SystemExit("Pages promotion blocked: malformed service-worker template")
    worker = source.replace("__VERSION__", version).replace(
        "__PRECACHE__", json.dumps(paths, ensure_ascii=False, separators=(",", ":"))
    )
    (STAGE / "sw.js").write_text(worker, encoding="utf-8")
    print(f"PWA shell: {len(paths)} URLs cached; build version {version}")


def publish() -> None:
    check_before_publish()
    if STAGE.exists():
        shutil.rmtree(STAGE)
    STAGE.mkdir(parents=True)

    # Archive ALL former pages, PWA assets, and maps with their original relative paths.
    shutil.copytree(MKDOCS, STAGE / "legacy")
    # Vite's index.html and hashed assets are now the canonical site.
    shutil.copytree(REACT, STAGE, dirs_exist_ok=True)

    # Old deep links to /assets/map/map.html remain valid.
    legacy_assets = MKDOCS / "assets"
    for source in legacy_assets.rglob("*"):
        if not source.is_file():
            continue
        relative = source.relative_to(legacy_assets)
        target = STAGE / "assets" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if source.read_bytes() != target.read_bytes():
                raise SystemExit(f"Pages promotion blocked: asset collision {relative}")
        else:
            shutil.copy2(source, target)

    # Compile the offline worker only after all root icons and assets exist.
    render_pwa_worker()

    # Redirect old bookmarks for MkDocs content pages to their archived location.
    redirect_count = 0
    for child in MKDOCS.iterdir():
        if not child.is_dir() or not (child / "index.html").exists():
            continue
        if child.name in {"assets", "legacy", "preview"}:
            continue
        target = STAGE / child.name / "index.html"
        if target.exists():
            raise SystemExit(f"Pages promotion blocked: redirect collision {target}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(redirect_html(f"../legacy/{child.name}/"), encoding="utf-8")
        redirect_count += 1

    preview = STAGE / "preview"
    preview.mkdir(exist_ok=True)
    (preview / "index.html").write_text(redirect_html("../"), encoding="utf-8")

    for required in (
        STAGE / "index.html",
        STAGE / "data/trip-data.json",
        STAGE / "data/reservations.json",
        STAGE / "photos/positano.jpg",
        STAGE / "assets/map/map.html",
        STAGE / "legacy/index.html",
        STAGE / "legacy/reservations/index.html",
        STAGE / "legacy/assets/trip-data.json",
        STAGE / "sw.js",
        STAGE / "manifest.webmanifest",
        STAGE / "assets/journey/icon-192.png",
        STAGE / "assets/journey/icon-512.png",
        STAGE / "preview/index.html",
    ):
        if not required.is_file():
            raise SystemExit(f"Pages promotion blocked: output missing {required}")

    shutil.rmtree(MKDOCS)
    STAGE.rename(MKDOCS)
    print(f"Pages root: React; MkDocs: /legacy/; redirects: {redirect_count}; old /preview/ redirects to root")


if __name__ == "__main__":
    publish()
