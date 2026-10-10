# 여행 앱 배포 방식 비교

- 확인일: 2026-10-10
- 재확인 시점: 배포 이전 또는 서버 기능 도입을 결정하기 직전. 요금·한도는 도입 시 공식 문서에서 다시 확인한다.
- 상태: 비교 검토. 배포 이전 결정은 없으며 기존 GitHub Pages 운영을 유지한다.

## 현재 구현 확인

- `.github/workflows/pages.yml`은 main push 후 MkDocs strict 빌드 결과인 `site/`를 GitHub Pages로 배포한다.
- 앱 화면·지도·날짜 선택은 브라우저 JavaScript로 동작한다. `scripts/sw-template.js`는 일정·핵심 안내의 오프라인 캐시를 제공한다.
- 하단 메뉴의 화면별 차이는 앱 코드와 CSS에서 발생한 것으로, 호스팅의 기능 제한과 무관하다.

## 공식 사실과 출처

- GitHub Pages는 HTML·CSS·JavaScript 정적 호스팅이며 자체 서버 실행 기능을 제공하지 않는다. 사용자 도메인도 지원한다.
  - <https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages>
- GitHub Pages는 공개 사이트 1GB, 월 대역폭 100GB의 소프트 한도 등을 안내한다. 시간당 10회 빌드 소프트 한도는 사용자 정의 GitHub Actions 배포에는 적용되지 않는다.
  - <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>
- Cloudflare Pages Functions는 서버 코드로 인증·폼 처리 등 동적 기능을 구현할 수 있다. 기능 구현과 별도 데이터 저장소 연결은 추가 개발이 필요하다.
  - <https://developers.cloudflare.com/pages/functions/>
  - <https://developers.cloudflare.com/pages/functions/bindings/>
- Cloudflare Pages는 정적 응답의 HTTP 헤더를 `_headers`로 설정할 수 있다. Functions 응답에는 함수 코드에서 헤더를 설정해야 한다.
  - <https://developers.cloudflare.com/pages/configuration/headers/>
- Cloudflare Pages는 별도 미리보기 배포 URL을 지원한다. 현재 저장소는 main 직접 작업 규칙이 있으므로 브랜치·PR 기반 미리보기는 기존 작업 규칙 그대로에서는 활용도가 낮다.
  - <https://developers.cloudflare.com/pages/configuration/preview-deployments/>
- 조사일 기준 Cloudflare Pages의 Functions를 호출하지 않는 정적 자산 요청은 무료·무제한이다. Functions는 Workers 요금·한도를 따르며 무료 요청 한도는 Workers와 합산해 하루 100,000회다. 저장소 등 연결 서비스의 별도 한도·요금은 추가 확인이 필요하다.
  - <https://developers.cloudflare.com/pages/functions/pricing/>
  - <https://developers.cloudflare.com/pages/platform/limits/>

## 판단 및 추론

- 현 여행 앱 규모·기능에는 GitHub Pages를 유지하는 것이 적절하다. 화면 개선, 기기 안의 체크리스트·즐겨찾기 저장, 오프라인 안내 확장은 브라우저 기능으로 개발할 수 있다.
- 가족 기기 간 체크리스트 동기화·공동 메모·접근 제어·비밀 API 키를 사용하는 실시간 정보가 필요하면 서버와 저장소를 추가해야 한다. GitHub Pages 화면에 외부 서버 API를 연결하는 방식도 가능하므로 전체 배포 이전이 필수는 아니다.
- Cloudflare의 장점은 서버 기능과 배포 제어를 같은 플랫폼에서 연결하기 쉽다는 점이다. 현재 UI 문제가 이전만으로 해결되거나 체감 속도가 개선된다고 단정할 근거는 없다. 속도 비교는 미측정이다.
- 배포 주소가 바뀌면 기존 설치 앱과 브라우저 저장 데이터·오프라인 캐시의 이전을 별도로 확인해야 한다. 기존 주소 유지 또는 재설치 안내를 포함한 전환 계획이 필요하다.
- 서버를 도입하더라도 공개 저장소의 개인정보·예약 세부정보 금지 및 위치 추적·저장 금지 규칙은 유지한다.
