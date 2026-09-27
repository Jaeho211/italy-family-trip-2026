# 지도 현재 위치 표시 검토 · 2026-09-27

## 결론과 범위

- 사용자 명시 합의에 따라 여행 지도와 별도 식당 찾기 지도에 일회성 현재 위치 버튼을 둔다.
- 버튼을 누를 때에만 브라우저의 위치 권한을 요청한다. `trackUserLocation: false`로 연속 추적을 사용하지 않는다.
- 위치 좌표를 GeoJSON, 식당 후보 데이터, URL, 브라우저 저장소 또는 공개 저장소에 기록하지 않는다. 표시용 위치 점은 열린 화면에서만 유지된다.
- 권한 거부, 위치 확인 실패, WebGL 미지원 시 기존 장소 목록과 Google Maps 장소 링크를 계속 사용한다.

## 공식 근거

| 구분 | 확인 내용 | 출처 |
|---|---|---|
| MapLibre 공식 API | `GeolocateControl`은 브라우저 위치 API를 사용하는 버튼을 제공한다. `trackUserLocation` 기본값인 `false`는 버튼을 누른 시점의 위치로 지도를 옮기며, 이동에 따라 위치를 갱신하지 않는다. `showUserLocation`은 위치 점을 표시한다. | [MapLibre GeolocateControl](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/), [공식 옵션](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/GeolocateControlOptions/) |
| W3C 표준 | 위치 API는 사용자의 명시적 권한 확인을 거친다. 권한 기간과 화면은 브라우저가 결정한다. | [W3C Geolocation](https://www.w3.org/TR/geolocation/) |
| 브라우저 동작 | 위치 API에는 보안 컨텍스트가 필요하다. 같은 출처 iframe에는 기본적으로 위치 기능이 허용되지만, 이 사이트는 허용 의도를 iframe `allow="geolocation"`으로 명시한다. | [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition), [MDN geolocation Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/geolocation) |

## 구분과 재확인

- **공식 사실:** 위치 버튼과 일회성/추적 옵션은 MapLibre API에 문서화되어 있다.
- **구현 판단:** 공개 좌표 데이터에 위치를 섞지 않고, 지도 컨트롤의 화면 표시만 사용한다.
- **제약:** 위치 권한과 정확도는 휴대폰·브라우저·실내 수신 환경에 따라 달라진다. 위치로 화면을 옮길 때 지도 타일 제공자는 해당 화면 범위의 타일 요청을 받을 수 있으므로 위치가 외부에 전혀 드러나지 않는다고 단정하지 않는다.
- **재확인 시점:** 출발 전 실제 휴대폰의 HTTPS Pages 사이트에서 위치 권한·iframe·새 화면 지도 동작을 확인한다. MapLibre 버전을 바꿀 때 API 동작을 다시 확인한다.
