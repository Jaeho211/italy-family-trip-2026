---
hide:
  - navigation
  - toc
  - footer
---

<div id="journey-app" class="journey-app">
  <header class="journey-header">
    <a class="journey-brand" href="./" aria-label="이탈리아 여행 홈"><span class="brand-mark" aria-hidden="true">i.</span><span>이탈리아 여행수첩<small>2026.12.23 — 2027.01.02</small></span></a>
    <button id="install-app" class="quiet-button" type="button">앱 설치</button>
  </header>
  <div class="journey-date-bar">
    <div><span id="journey-mode" class="eyebrow">여행 미리보기</span><label class="date-label" for="journey-date">여행 날짜 <select id="journey-date" aria-label="여행 날짜"></select></label></div>
    <button id="go-today" class="quiet-button" type="button">오늘</button>
  </div>
  <p id="journey-message" class="journey-message" role="status" aria-live="polite">여행을 불러오고 있어요.</p>
  <section id="view-today" class="journey-view" aria-labelledby="today-title">
    <div class="journey-hero">
      <div class="hero-arch" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="hero-copy"><p id="day-city" class="eyebrow"></p><h1 id="today-title">이탈리아 여행수첩</h1><p id="day-subtitle"></p><span id="day-meta" class="hero-meta"></span></div>
    </div>
    <div class="journey-actions"><button type="button" data-view="map">오늘 지도 <span aria-hidden="true">→</span></button><button type="button" id="today-food">주변 식당 <span aria-hidden="true">→</span></button><a id="home-link" target="_blank" rel="noopener">숙소로 <span aria-hidden="true">↗</span></a></div>
    <div class="section-heading"><h2>오늘의 흐름</h2><button class="quiet-button" id="open-day-places" type="button">장소 보기 →</button></div>
    <p class="small-note">계획한 순서예요. 목표·잠정 시각은 현장에서 조정하세요.</p>
    <ol id="day-timeline" class="journey-timeline"></ol>
    <div class="section-heading"><h2>오늘 챙길 것</h2></div>
    <div id="day-statuses" class="journey-statuses"></div><div id="day-notes" class="journey-notes"></div><div id="day-details" class="journey-details"></div>
    <div class="day-navigation"><button type="button" id="previous-day">← 이전 날</button><button type="button" id="next-day">다음 날 →</button></div>
  </section>
  <section id="view-map" class="journey-view" aria-labelledby="map-view-title" hidden>
    <div class="section-heading"><h1 id="map-view-title">오늘 지도</h1><button class="quiet-button" type="button" data-view="today">일정 보기 →</button></div>
    <p class="small-note">선택한 날짜의 등록된 관광지와 같은 권역의 숙소를 표시해요. 길찾기는 장소를 눌러 열어주세요.</p>
    <iframe id="journey-map" title="선택한 날짜의 여행 지도" allow="geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    <a id="full-map" class="text-link">지도 크게 열기 →</a>
    <p class="small-note">배경지도와 길찾기는 인터넷 연결이 필요해요. 오프라인에서도 장소 목록은 볼 수 있어요.</p>
  </section>
  <section id="view-places" class="journey-view" aria-labelledby="places-title" hidden>
    <div class="section-heading"><h1 id="places-title">장소 안내</h1></div>
    <p id="places-context" class="small-note"></p>
    <div class="place-tools"><label for="place-search" class="sr-only">선택한 날짜의 장소 검색</label><input id="place-search" type="search" placeholder="이 날짜의 장소 검색"></div>
    <p class="small-note">관광지와 숙소의 방문 안내·길찾기·주변 식당을 확인하세요.</p>
    <div id="journey-places" class="journey-place-grid"></div>
  </section>
  <section id="view-more" class="journey-view" aria-labelledby="more-title" hidden>
    <div class="section-heading"><h1 id="more-title">여행 도구</h1></div>
    <div class="journey-tool-grid"><a href="itinerary/"><strong>전체 일정</strong><span>여정을 한눈에</span></a><a href="restaurants/"><strong>식당 찾기</strong><span>로마 · 나폴리 후보</span></a><a href="reservations/"><strong>예약 현황</strong><span>완료 · 준비 · 재확인</span></a><a href="accommodation/"><strong>숙소 안내</strong><span>위치와 이동</span></a><a href="checklist/"><strong>체크리스트</strong><span>출발 전 준비</span></a><a href="map/"><strong>권역별 지도</strong><span>지역별 전체 장소</span></a><a href="rome/"><strong>로마</strong><span>도시별 안내</span></a><a href="naples/"><strong>나폴리 · 폼페이</strong><span>도시별 안내</span></a><a href="day-trips/"><strong>근교 여행</strong><span>해안과 소도시</span></a><a href="decisions/"><strong>결정 기록</strong><span>계획의 배경</span></a></div>
    <div class="offline-card"><strong>여행 중에도 바로 열기</strong><p id="offline-status">인터넷에 연결해서 한 번 열면 일정과 핵심 안내를 오프라인에서도 볼 수 있어요.</p><p class="small-note">지도 배경·외부 길찾기·공식 예매처는 인터넷 연결이 필요해요.</p></div>
  </section>
  <dialog id="place-dialog" class="place-dialog" aria-labelledby="place-dialog-title">
    <div class="place-dialog-header"><span id="place-dialog-priority" class="priority-badge"></span><button id="close-place-dialog" type="button" class="quiet-button" aria-label="장소 안내 닫기">닫기 ×</button></div>
    <h2 id="place-dialog-title"></h2><p id="place-dialog-visit" class="small-note"></p>
    <div id="place-dialog-content"></div><div id="place-dialog-actions" class="dialog-actions"></div>
  </dialog>
  <nav class="journey-bottom-nav" aria-label="여행 앱 메뉴"><button type="button" data-view="today" aria-current="page"><span aria-hidden="true">◷</span>오늘</button><button type="button" data-view="map"><span aria-hidden="true">⌖</span>지도</button><button type="button" data-view="places"><span aria-hidden="true">▤</span>장소</button><button type="button" data-view="more"><span aria-hidden="true">•••</span>더보기</button></nav>
</div>

<noscript>날짜별 여행 앱을 사용하려면 JavaScript를 켜주세요. [전체 일정](itinerary.md), [여행 지도](map.md), [식당 찾기](restaurants.md)는 계속 읽을 수 있습니다.</noscript>
