# 식당 찾기 지도 데이터와 검증 범위

- 작성·확인일: 2026-09-27
- 재확인 시점: 실제 방문 전 각 식당의 영업일·시간·지점·가격·대기 및 예약 조건 확인
- 자료 성격: 사용자 제작 My Maps 후보 목록. 공식 식당 정보나 추천 순위가 아님

## 사용자 요청과 공개 범위

사용자가 보유한 맛집 목록을 지도에서 검색할 수 있도록 요청했다. 기존 관광 일정 지도 `docs/assets/map/places.geojson`과 별도 화면·데이터 `docs/assets/map/restaurants.json`을 사용한다. 여기에는 **미예약 공개 식당 후보**만 기록하며 실제 예약 식당, 가족 정보, 예약번호, 결제·객실·출입정보는 기록하지 않는다. 12월 25일 아말피 점심은 간편식 지참 결정 그대로다.

## 데이터와 위치

- **로마 99곳:** [`rome-mymaps-places.md`](rome-mymaps-places.md)의 맛집·카페·핫플 항목과 원본 좌표를 사용했다. 좌표는 표시용이며 실제 지점·입구를 방문 전에 Google Maps와 식당 공식 안내에서 확인한다. 원본 로마 지도: [체크인유럽 로마 My Maps](https://www.google.com/maps/d/u/0/viewer?mid=10PnmMiGYVNygnvRrBiU-sqK0jYFgFCdd).
- **나폴리 34곳:** [`naples-mymaps-places.md`](naples-mymaps-places.md)의 이름과 공개 [나폴리 My Maps 뷰어](https://www.google.com/maps/d/u/0/viewer?mid=1gEGfljCgQJs66VO-oX7aHGf-XjN4RGzY)의 `맛집/카페` 레이어 좌표를 사용했다. 원본 뷰어의 34개 핀과 추출 목록의 이름·순서를 전부 대조해 [`naples-restaurant-pins.json`](naples-restaurant-pins.json)에 저장했다. 최초에는 KML 다운로드 403 응답을 원본 위치 데이터의 부재로 잘못 해석했으며, 사용자 지적 후 2026-09-27 뷰어 내 공개 데이터를 재확인해 정정했다. `Il Gelato Mennella`처럼 이름이 반복되는 후보도 각각의 원본 핀 좌표를 보존한다. 실제 영업 지점은 방문 전에 확인한다.
- 두 목록 모두 식당 존속, 품질, 영업시간, 휴무, 가격, 예약 가능 여부를 검증하지 않았다. 화면의 `검토 중`은 이 상태를 뜻한다.

## 표시 구현

- 두 도시 모두 이름·종류 검색과 지도 핀을 함께 필터링하고 밀집 핀은 군집으로 표시한다.
- [MapLibre GL JS 공식 문서](https://maplibre.org/maplibre-gl-js/docs/)의 GeoJSON 소스와 군집 기능을 사용한다. 라이브러리는 기존과 같은 `5.24.0`, 배경 스타일은 기존의 `https://tiles.openfreemap.org/styles/positron`으로 고정한다.
- 지도 로딩이나 WebGL 사용이 실패해도 식당 목록과 Google Maps 링크를 표시한다. 저작자 표시는 MapLibre 기본 attribution 컨트롤을 유지한다.
- `scripts/extract_naples_mymaps.py`가 공개 뷰어 데이터를 읽어 나폴리 핀 34개의 이름·좌표를 원본 목록과 대조해 스냅샷을 만든다. `scripts/build_restaurants.py`가 조사 목록과 좌표 스냅샷에서 공개 지도를 생성하며 99+34개를 검사한다.
