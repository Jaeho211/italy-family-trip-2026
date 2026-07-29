# 이탈리아 가족여행 2026–2027

2026년 12월 23일부터 2027년 1월 3일까지, 가족 4명의 로마·나폴리 중심 여행 계획을 함께 관리하는 공개 가능한 정적 문서 사이트입니다. Markdown 문서를 기준 데이터로 사용하고 [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)로 빌드합니다.

> 이 저장소의 일정과 숙박 배치는 잠정안입니다. 영업시간, 휴관일, 교통편과 예약 가능 여부는 예약 전에 공식 출처에서 다시 확인하세요.

## 로컬 설치와 미리보기

Python 3.11 이상을 권장합니다.

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
mkdocs serve
```

브라우저에서 `http://127.0.0.1:8000`을 엽니다. 배포와 같은 엄격한 빌드는 다음 명령으로 확인합니다.

```bash
mkdocs build --strict
```

## 콘텐츠 수정

- 가족이 실제로 읽는 여행 내용은 `docs/*.md`에서 수정합니다.
- 상세 조사, 공식 출처, 과거 사례와 추론은 `research/*.md`에 기록합니다.
- 메뉴 구성은 `mkdocs.yml`의 `nav`에서 관리합니다.
- 상태 표시는 문서에 정의된 배지 HTML(`status confirmed`, `tentative`, `weather`, `booking`, `review`, `verified`, `waiting`, `recheck`)을 재사용합니다.
- 일정 변경 시 `docs/itinerary.md`와 `docs/reservations.md`가 서로 모순되지 않는지 확인합니다.
- 합의된 결론을 바꾸면 이유와 날짜를 `docs/decisions.md`에 기록합니다.
- 외부 조사로 결론을 바꾸면 관련 `research/` 문서와 `docs/` 문서를 함께 갱신합니다.
- 변동 가능한 정보에는 확인일, 재확인 시점과 공식 출처 링크를 함께 남깁니다.

## GitHub Pages 배포

`.github/workflows/pages.yml`이 `main` 브랜치 push 또는 수동 실행 시 사이트를 빌드하고 공식 GitHub Pages Actions로 배포합니다. 의존성 캐시를 사용하며, 배포 전 `mkdocs build --strict`를 실행합니다.

저장소에서 한 번만 다음 설정이 필요합니다.

1. GitHub 저장소의 **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. 변경사항을 `main` 브랜치에 push합니다.
4. **Actions** 탭의 `Deploy MkDocs site to Pages`가 성공했는지 확인합니다.
5. 실행 결과의 `deploy` 작업 또는 **Settings → Pages**에 표시된 공개 URL을 엽니다.

커스텀 도메인은 사용하지 않으며 저장소의 기본 Pages URL을 기준으로 합니다. 프로젝트 사이트의 하위 경로는 MkDocs가 자동 처리하므로 `site_url`을 고정하지 않았습니다.

## 공개 저장소 보안

다음 정보는 어떤 문서, 이슈, 커밋에도 넣지 않습니다.

- 가족의 실명·생년월일·연락처·이메일·여권정보
- 항공권·숙소 예약번호와 결제정보
- 실제 숙소명, 정확한 주소, 출입 비밀번호
- 집 주소나 이동 중 보안을 해칠 수 있는 개인 정보

공개 문서에는 숙소 후보 **지역**과 일반적인 예약 상태만 기록합니다. 민감한 예약 세부정보는 별도의 비공개 저장소나 개인 Drive에서 관리하세요.

`research/`는 Pages에는 표시되지 않지만 공개 GitHub 저장소에서는 누구나 볼 수 있습니다. 따라서 개인정보와 예약 세부정보는 `docs/`와 `research/` 어느 디렉터리에도 저장하지 않습니다.

## 구조와 구현 결정

```text
docs/                       GitHub Pages에 표시되는 간결한 여행 콘텐츠
research/                   상세 조사·출처·추론·재확인 자료
docs/assets/stylesheets/    모바일·상태 배지 스타일
.github/workflows/pages.yml GitHub Pages 배포
mkdocs.yml                  사이트와 메뉴 설정
requirements.txt            Python 의존성
AGENTS.md                   저장소 수정 규칙
```

`docs/`는 가족이 휴대전화로 실제로 읽고 실행할 간결한 일정, 예약 상태와 다음 행동을 담습니다. `research/`는 일정 결론의 상세 근거, 공식 출처, 과거 사례, 추론과 미확인 내용을 보존합니다. `research/`는 `mkdocs.yml` navigation에 넣지 않으며 정적 사이트 빌드 대상이 아닙니다.

초기 버전은 외부 이미지, 지도 SDK, JavaScript 프레임워크 없이 구성했습니다. 장소 링크는 가벼운 Google Maps 검색 링크이며, 카드형 일정과 반응형 표는 CSS만 사용합니다. 이렇게 하면 Markdown 중심으로 유지보수하기 쉽고 공개 Pages에서도 개인정보 노출 범위를 단순하게 통제할 수 있습니다.
