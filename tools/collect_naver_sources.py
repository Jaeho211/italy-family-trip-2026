"""네이버 카페 글을 로컬 참고자료로 저장한다.

수집한 원문은 .local-sources/ 아래에만 저장하며 Git에 커밋하지 않는다.
로그인 정보가 담긴 Chrome 프로필은 저장소 밖 LOCALAPPDATA에 보관한다.
"""

from __future__ import annotations

import hashlib
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional, Tuple

from playwright.sync_api import Frame, TimeoutError, sync_playwright


DEFAULT_URLS = [
    "https://naver.me/x9VOFTXy",
    "https://cafe.naver.com/momsolleh/457317?tc=shared_link",
    "https://cafe.naver.com/momsolleh/372100?tc=shared_link",
    "https://cafe.naver.com/momsolleh/611713?tc=shared_link",
    "https://cafe.naver.com/momsolleh/632948?tc=shared_link",
]

ARTICLE_SELECTORS = (
    ".se-main-container",
    ".article_viewer",
    "#postViewArea",
    ".ContentRenderer",
    ".se_component_wrap",
)


def extract_frame_text(frame: Frame) -> Optional[Tuple[int, str]]:
    """본문 후보의 우선순위와 텍스트를 반환한다."""
    article_frame = "articleread" in frame.url.lower()

    for selector in ARTICLE_SELECTORS:
        try:
            locator = frame.locator(selector)
            if locator.count() == 0:
                continue
            text = locator.first.inner_text(timeout=5_000).strip()
            if len(text) >= 200:
                return (2_000_000 if article_frame else 1_000_000) + len(text), text
        except TimeoutError:
            continue

    try:
        text = frame.locator("body").inner_text(timeout=5_000).strip()
    except TimeoutError:
        return None

    if len(text) < 500:
        return None

    # 카페 메뉴가 긴 최상위 페이지보다 ArticleRead 프레임을 우선한다.
    return (100_000 if article_frame else 0) + len(text), text


def source_id(urls: Iterable[str]) -> str:
    joined = "\n".join(urls)
    match = re.search(r"(?:articleid=|/)(\d{4,})(?:\D|$)", joined, re.I)
    if match:
        return match.group(1)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:12]


def main() -> int:
    urls = sys.argv[1:] or DEFAULT_URLS
    repo_root = Path(__file__).resolve().parents[1]
    output_dir = repo_root / ".local-sources" / "naver"

    local_app_data = os.environ.get("LOCALAPPDATA")
    if not local_app_data:
        raise RuntimeError("LOCALAPPDATA 환경변수를 찾을 수 없습니다.")
    profile_dir = Path(local_app_data) / "italy-family-trip-2026" / "naver-profile"

    output_dir.mkdir(parents=True, exist_ok=True)
    profile_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            channel="chrome",
            headless=False,
        )
        page = context.pages[0] if context.pages else context.new_page()

        try:
            for index, original_url in enumerate(urls, start=1):
                print(f"\n[{index}/{len(urls)}] {original_url}")
                page.goto(original_url, wait_until="domcontentloaded", timeout=60_000)

                action = input(
                    "로그인 후 본문이 보이면 Enter, 건너뛰기는 s, 종료는 q: "
                ).strip().lower()
                if action == "q":
                    break
                if action == "s":
                    continue

                candidates = []
                for frame in page.frames:
                    result = extract_frame_text(frame)
                    if result:
                        score, text = result
                        candidates.append((score, text, frame.url))

                if not candidates:
                    print("본문을 찾지 못했습니다. 로그인과 카페 가입 상태를 확인하세요.")
                    continue

                _, text, frame_url = max(candidates, key=lambda item: item[0])
                final_url = page.url
                article_id = source_id((final_url, frame_url, original_url))
                title = page.title()
                captured_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

                out = output_dir / f"{article_id}.txt"
                out.write_text(
                    "\n".join(
                        (
                            f"원본 URL: {original_url}",
                            f"최종 URL: {final_url}",
                            f"본문 프레임: {frame_url}",
                            f"제목: {title}",
                            f"수집 시각: {captured_at}",
                            "",
                            text,
                        )
                    ),
                    encoding="utf-8",
                )
                print(f"저장 완료: {out}")
        finally:
            context.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
