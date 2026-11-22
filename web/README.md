# ITALIA — 이탈리아 가족여행 메인 사이트

Vite + React + TypeScript 앱을 GitHub Pages **기본 주소** `/italy-family-trip-2026/`에 배포합니다. 이전 MkDocs 여행 수첩과 상세 자료·지도는 **`/italy-family-trip-2026/legacy/`** 아래에 원형 보존합니다. 기존 `/preview/`는 새 기본 주소로 리다이렉트합니다.

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

## 메인 사이트 범위

- 홈 화면은 **여행 기간·여행 개요 → 전체 날짜별 일정 → 주요 방문지 사진 → 예약·준비 링크** 순서
- 날짜 상세 화면은 **날짜·지역·예약/재확인 상태 → 경로와 개요 → 준비·확인 → 관광지 사진이 포함된 이동·방문 순서 → 세부 근거** 순서
- 전체 11일 날짜 선택과 기존 일정 데이터의 실시간 반영
- 이동·방문 순서에는 사진이 확보된 관광지(포지타노·아말피·라벨로·폼페이·콜로세움)에만 본문 크기의 사진 섹션 표시. 교통·숙소 항목은 텍스트 유지
- 12월 25일 아말피 해안은 포지타노·아말피·라벨로(선택) 사진을 일정 항목에 배치하고, 중복된 하단 사진 카드 대신 기존 지도 링크를 활용
- 외부 이동/지도는 `/legacy/` 아래의 기존 MkDocs 지도 앱 링크로 연결
- 이전 MkDocs 페이지·지도·예약·가이드·오프라인 워커는 `/legacy/`로 이동하되 원본 소스는 유지
- 기존 `/itinerary/`, `/map/` 등 링크는 `/legacy/`로 리다이렉트하고, 이전 직접 지도 링크 `/assets/map/`도 유지
- React 메인 페이지는 현재 별도의 오프라인 캐시를 등록하지 않으며, 과거 루트 서비스 워커는 종료합니다

## 콘텐츠·타이포그래피 원칙

1. 제목은 장소·날짜·활동을 설명한다. 감성적인 문장, 시적인 카피, 영어 장식용 제목은 사용하지 않는다.
2. 당일 예약 상태와 재확인 사항, 이동 순서를 사진 소개보다 먼저 찾을 수 있어야 한다.
3. 제목 30~44px, 섹션 제목 23~28px, 본문 16px, 보조 정보 14~15px를 기본으로 한다. 모바일 최소 보조 글씨 13px를 유지한다.
4. 사진은 장소 확인과 방문 동기 제공을 위한 보조 정보다. 여행지와 다른 사진을 해당 날짜의 특정 명소처럼 사용하지 않는다.
5. 일정·예약·운영시간을 별도 프런트엔드 코드에 복제하지 않고 `trip-data.json`과 기존 문서에서 가져온다.

## 디자인 참고

- [Wildsam](https://www.wildsam.com/) — 여행 가이드의 콘텐츠 분류와 여행 정보 중심의 구성
- [ROADBOOK City Guides](https://roadbook.com/city-guide/) — 사진·타이포그래피·여백의 배치
- [Fernweh](https://www.framer.com/marketplace/templates/fernweh-travellers/) — 일정별 상세 페이지의 콘텐츠 흐름

레퍼런스 사이트의 소스 코드나 이미지를 복제하지 않고, 정보 계층과 사진 배치의 원칙을 기존 Vite + React 페이지에 맞게 구현합니다.

## 방문 순서 사진 구성

`web/src/place-photos.json`이 기존 장소 ID(`docs/assets/map/places.geojson`의 `sort`)와 `web/scripts/prepare_preview.py`에서 내려받는 사진 키를 연결합니다.

- 관광지 항목은 번호 → 장소명 → 원본 방문 계획 → **넓은 가로 사진** → 지도 링크 순서로 자연스럽게 연결합니다. 사진을 위한 별도 갤러리·썸네일·카드형 패널을 사용하지 않습니다.
- 렌터카 수령·기차 이동·숙소 체크인 등 사진이 필요 없는 단계는 기존의 번호형 목록을 유지합니다. 여러 장소가 섞인 항목에도 무관한 사진을 넣지 않습니다.
- PC에서는 방문 계획 아래에 **본문 폭 전체의 16:9 사진**(최대 높이 600px)을 표시하고, 모바일에서는 **16:10 사진**을 표시합니다. 본문 글자 크기는 16px로 유지합니다.
- 사진의 채도·대비·밝기를 CSS로 동일하게 조정하여 주변 정보 페이지의 차분한 색감과 조화되도록 합니다.
- **사진은 클릭할 수 없고 확대 기능도 없습니다.** 지도 링크는 기존대로 사용할 수 있습니다.
- 같은 장소가 여러 번 등장하면 **최종 단일 장소 방문 항목**에만 사진이 나옵니다(콜로세움 택시 이동과 실제 입장 중 실제 입장에만 표시).
- 날짜 개요에 이미 같은 사진이 표시되는 경우 사진을 생략하여 중복을 줄입니다.
- 빌드 준비 단계에서 장소 ID, 사진 키, 설명 텍스트, 방문 항목 존재 여부를 검사합니다.
- **새 사진을 추가할 때**는 출처·라이선스를 확인한 뒤 `PHOTO_CREDITS.md`, `prepare_preview.py`, `place-photos.json`을 함께 갱신합니다.

## 사진과 저작권

`scripts/prepare_preview.py`의 `PHOTOS`에 명시한 Wikimedia Commons 원본 파일만 내려받습니다. 2026-11-22 확인한 사진들은 각 파일 페이지에 CC0로 표시되어 있습니다. 출처와 사진별 원저작자는 앱 하단의 사진 출처와 `PHOTO_CREDITS.md`를 참고합니다. 사진은 실제 여행 시기의 날씨를 보장하지 않습니다.

## 배포 동작과 확인 절차

GitHub Actions는 `mkdocs build --strict`로 원본 여행 데이터와 기존 사이트를 만들고, `web/scripts/prepare_preview.py --photos`로 사진과 `trip-data.json`을 준비한 후 React를 빌드합니다. 마지막에 `web/scripts/publish_site.py`가 기존 MkDocs 사이트를 `site/legacy/`로 옮기고 React 빌드 결과를 `site/` 루트에 배치합니다.

배포 시 아래 경로를 확인해야 합니다.

- `/`: React 메인 페이지와 11일 일정 데이터
- `/#/day/2026-12-25`: 아말피 여행일 상세
- `/legacy/`: 이전 MkDocs 홈
- `/legacy/?view=map&date=2026-12-25`: 기존 지도 앱
- `/legacy/reservations/`: 원본 예약 현황
- `/map/`, `/itinerary/`, `/preview/`: 과거 주소 호환 리다이렉트

기존 여행 일정·예약·운영 정보의 정본은 계속 `docs/`입니다. 새 React 메인 페이지의 별도 오프라인 기능이나 기존 MkDocs 상세 도구의 완전 이전은 아직 진행되지 않았습니다.
