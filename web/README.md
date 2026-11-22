# ITALIA — Family Field Notes / 디자인 프리뷰

MkDocs를 즉시 제거하지 않고, 같은 저장소의 `web/` 디렉터리에 새 Vite + React + TypeScript 앱을 별도로 구현했습니다. GitHub Pages의 기존 루트는 그대로 유지하며 새 디자인은 `/italy-family-trip-2026/preview/`에서 시험합니다.

## 로컬 개발

저장소 루트에서 먼저:

```bash
python -m pip install -r requirements.txt
mkdocs build --strict
python web/scripts/prepare_preview.py --photos
cd web
npm install
npm run dev
```

`--photos`는 Wikimedia Commons의 **CC0로 공개된 원본 사진**을 빌드 시 내려받아 로컬 파일로 저장합니다. 웹사이트 방문자 브라우저에서 외부 사진을 핫링크하지 않습니다. 이미 준비된 사진은 재다운로드하지 않습니다.

`prepare_preview.py`는 기존 MkDocs 빌드 결과의 `site/assets/trip-data.json`을 복사하므로 방문 시각·예약 상태·일정 문구를 새 앱에 중복 하드코딩하지 않습니다. Vite 빌드 전에 반드시 실행합니다.

```bash
npm run build
npm run preview
```

## 제품 범위 (Phase 1)

- 사진 중심 에디토리얼 홈, 날짜별 랜딩, 12월 25일 아말피 상세 편집 페이지
- 전체 11일 날짜 선택과 기존 일정 데이터의 실시간 반영
- 실용 안내 영역에는 원문의 행동 순서, 준비사항, 선택 사항을 그대로 노출
- 외부 이동/지도는 기존 MkDocs 지도 앱 링크로 연결
- 기존 루트 사이트, 지도, 예약, 오프라인 동작은 변경하지 않음
- 디자인 승인 전에는 본 사이트 루트를 전환하지 않음

## 사진과 저작권

`scripts/prepare_preview.py`의 `PHOTOS`에 명시한 Wikimedia Commons 원본 파일만 내려받습니다. 2026-11-22 확인한 사진들은 각 파일 페이지에 CC0로 표시되어 있습니다. 출처와 사진별 원저작자는 앱 하단의 사진 출처와 `PHOTO_CREDITS.md`를 참고합니다. 사진은 실제 여행 시기의 날씨를 보장하지 않습니다.

## 다음 단계

미리보기 승인 후 원래 문서 링크와 기능을 하나씩 React로 옮기고, 기존 MkDocs 루트 배포 전환을 별도의 작업으로 진행합니다. 여행 일정과 예약 등 사실 데이터는 `docs/` 정본을 계속 사용합니다.
