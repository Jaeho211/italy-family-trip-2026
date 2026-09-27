# 식당 찾기 지도 데이터와 검증 범위

- 작성·확인일: 2026-09-27
- 재확인 시점: 실제 방문 전 각 식당의 영업일·시간·지점·가격·대기 및 예약 조건 확인
- 자료 성격: 사용자 제작 My Maps 후보 목록. 공식 식당 정보나 추천 순위가 아님

## 사용자 요청과 공개 범위

사용자가 보유한 맛집 목록을 지도에서 검색할 수 있도록 요청했다. 기존 관광 일정 지도 `docs/assets/map/places.geojson`과 별도 화면·데이터 `docs/assets/map/restaurants.json`을 사용한다. 여기에는 **미예약 공개 식당 후보**만 기록하며 실제 예약 식당, 가족 정보, 예약번호, 결제·객실·출입정보는 기록하지 않는다. 12월 25일 아말피 점심은 간편식 지참 결정 그대로다.

## 데이터와 위치

- **로마 99곳:** [`rome-mymaps-places.md`](rome-mymaps-places.md)의 맛집·카페·핫플 항목과 원본 좌표를 사용했다. 좌표는 표시용이며 실제 지점·입구를 방문 전에 Google Maps와 식당 공식 안내에서 확인한다. 원본 로마 지도: [체크인유럽 로마 My Maps](https://www.google.com/maps/d/u/0/viewer?mid=10PnmMiGYVNygnvRrBiU-sqK0jYFgFCdd).
- **나폴리 34곳:** [`naples-mymaps-places.md`](naples-mymaps-places.md)의 이름을 그대로 사용했다. 추출본에는 좌표가 없고 2026-09-27 원본 [나폴리 My Maps](https://www.google.com/maps/d/u/0/viewer?mid=1gEGfljCgQJs66VO-oX7aHGf-XjN4RGzY)의 위치 데이터를 가져오려 했으나 접근이 거부됐다. 따라서 나폴리 핀은 만들지 않고 Google Maps 이름 검색 링크를 제공한다. `Il Gelato Mennella`처럼 반복되는 이름은 지점 구분이 되지 않으므로 링크를 연 뒤 직접 지점을 확인한다.
- 두 목록 모두 식당 존속, 품질, 영업시간, 휴무, 가격, 예약 가능 여부를 검증하지 않았다. 화면의 `검토 중`은 이 상태를 뜻한다.

## 표시 구현

- 로마에서는 이름·종류 검색과 지도 핀을 함께 필터링하고 밀집 핀은 군집으로 표시한다. 나폴리에서는 이름·종류 검색과 링크만 제공한다.
- [MapLibre GL JS 공식 문서](https://maplibre.org/maplibre-gl-js/docs/)의 GeoJSON 소스와 군집 기능을 사용한다. 라이브러리는 기존과 같은 `5.24.0`, 배경 스타일은 기존의 `https://tiles.openfreemap.org/styles/positron`으로 고정한다.
- 지도 로딩이나 WebGL 사용이 실패해도 식당 목록과 Google Maps 링크를 표시한다. 저작자 표시는 MapLibre 기본 attribution 컨트롤을 유지한다.
- `scripts/build_restaurants.py`가 위 두 조사 목록에서 공개 데이터를 생성하며 99+34개를 검사한다.
