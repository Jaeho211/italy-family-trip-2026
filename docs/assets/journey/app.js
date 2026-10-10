(() => {
  'use strict';
  const script = document.querySelector('script[src*="assets/journey/app.js"]');
  if (!script) return;
  const base = new URL('../../', script.src);
  const url = (path) => new URL(path, base).href;
  const views = ['today', 'map', 'places', 'more'];
  let installPrompt = null;
  let root = null;
  let state = null;
  let data = null;
  let events = null;
  let offlineReady = false;
  // Optional family observation prompts; no new operating or historical claims.
  const observations = {};
  Object.assign(observations, {
    10: '마음에 드는 작품을 하나 골라, 가족에게 눈에 띈 점을 이야기해보세요.',
    30: '들어가서 먼저 위를 올려다보세요. 가장 눈에 띄는 모양은 무엇인가요?',
    50: '분수에서 마음에 드는 조각을 하나 찾아보세요.',
    70: '마을을 바라보며 가장 기억하고 싶은 풍경을 골라보세요.',
    90: '내려갈 때와 올라올 때 보이는 풍경을 비교해보세요.',
    100: '마음에 드는 전시물을 하나 골라 폼페이에서 찾아보고 싶은 것을 이야기해보세요.',
    110: '집과 가게의 흔적을 찾아보고, 어떤 하루를 보냈을지 상상해보세요.',
    180: '산책하며 가장 마음에 드는 해안 풍경을 골라보세요.'
  });
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  function external(label, href, cls) {
    const link = el('a', label, cls);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    return link;
  }
  const directions = (place) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.properties.googleQuery || place.properties.name)}`;
  const currentDay = () => data.days.find((day) => day.date === state.date);
  const findPlace = (id) => data.places.find((place) => place.properties.sort === id);
  function italyDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  function defaultDate() {
    const today = italyDate();
    return data.days.some((day) => day.date === today) ? today : (today < data.days[0].date ? data.days[0].date : data.days.at(-1).date);
  }
  function readState() {
    const params = new URLSearchParams(location.search);
    return {date: data.days.some((day) => day.date === params.get('date')) ? params.get('date') : defaultDate(), view: views.includes(params.get('view')) ? params.get('view') : 'today'};
  }
  function navigate(change, replace = false) {
    state = {...state, ...change};
    const next = new URL(location.href);
    next.searchParams.set('date', state.date);
    next.searchParams.set('view', state.view);
    history[replace ? 'replaceState' : 'pushState']({}, '', next);
    render();
    window.scrollTo({top: 0, behavior: 'instant'});
    root.querySelector(`#view-${state.view} h1, #view-${state.view} h2`)?.focus({preventScroll:true});
  }
  function updateOfflineStatus() {
    const status = document.getElementById('offline-status');
    if (status && offlineReady) status.textContent = '일정과 핵심 안내를 이 기기에 저장했어요. 인터넷 없이도 다시 열 수 있어요.';
  }
  function foodUrl(day, place) {
    const link = new URL('assets/map/restaurants.html', base);
    const city = place && ['rome', 'naples'].includes(place.properties.region) ? place.properties.region : (['naples', 'pompeii', 'amalfi'].includes(day.region) ? 'naples' : 'rome');
    link.searchParams.set('city', city);
    // There are no Amalfi/Civita restaurant candidates in the source dataset.
    if (place && place.properties.region === city) {
      link.searchParams.set('near', place.geometry.coordinates.join(','));
      link.searchParams.set('label', place.properties.name);
    }
    return link.href;
  }
  function renderPlaces() {
    const day = currentDay();
    const grid = root.querySelector('#journey-places');
    const term = root.querySelector('#place-search').value.trim().toLocaleLowerCase();
    const all = root.querySelector('#place-scope').value === 'all';
    const ids = new Set([...day.places, day.lodging]);
    grid.replaceChildren();
    const places = data.places.filter((place) => (all || ids.has(place.properties.sort)) && place.properties.name.toLocaleLowerCase().includes(term));
    root.querySelector('#places-title').textContent = all ? '여행의 장소' : '오늘 만날 장소';
    if (!places.length) grid.append(el('p', '조건에 맞는 장소가 없어요. 다른 날짜나 여행 전체를 선택해보세요.'));
    places.forEach((place) => {
      const p = place.properties;
      const card = el('article', undefined, 'journey-place-card');
      card.append(el('span', p.group === 'lodging' ? '숙소' : ({rome:'로마', naples:'나폴리', pompeii:'폼페이', amalfi:'아말피', civita:'치비타 · 오르비에토'}[p.region]), 'eyebrow'));
      card.append(el('h2', p.name), el('p', p.note));
      card.append(el('p', p.dates.join(' · '), 'small-note'));
      if (observations[p.sort]) {
        const prompt = el('div', undefined, 'place-observation');
        prompt.append(el('strong', '함께 둘러보기'), el('p', observations[p.sort]));
        card.append(prompt);
      }
      const links = el('div', undefined, 'place-links');
      links.append(external('길찾기 ↗', directions(place), 'text-link'));
      if (p.region === 'rome' || p.region === 'naples') links.append(external('이 장소 주변 식당 ↗', foodUrl(day, place), 'text-link'));
      const dayWithPlace = data.days.find((d) => d.places.includes(p.sort) || d.lodging === p.sort);
      if (dayWithPlace) {
        const button = el('button', '방문일 안내 →', 'quiet-button');
        button.type = 'button';
        button.addEventListener('click', () => navigate({date: dayWithPlace.date, view:'today'}));
        links.append(button);
      }
      card.append(links);
      grid.append(card);
    });
  }
  function render() {
    if (!root?.isConnected) return;
    const day = currentDay();
    const today = italyDate();
    root.querySelectorAll('.journey-tool-grid a').forEach((link) => {
      const target = new URL(link.href);
      target.searchParams.set('date', state.date);
      link.href = target.href;
    });
    root.querySelector('#journey-date').value = state.date;
    root.querySelector('#journey-mode').textContent = state.date === today ? '이탈리아 현지 · 오늘' : (today > data.days.at(-1).date ? '여행 돌아보기' : '여행 미리보기');
    root.querySelector('#day-city').textContent = day.city;
    root.querySelector('#today-title').textContent = day.title;
    root.querySelector('#day-subtitle').textContent = day.subtitle;
    root.querySelector('#day-meta').textContent = day.meta;
    document.title = `${day.city} · ${day.date.slice(5).replace('-', '/')} | 우리의 이탈리아`;
    root.querySelector('#journey-message').textContent = navigator.onLine ? '' : '오프라인이에요. 저장된 일정과 장소 안내를 보고 있어요.';
    const timeline = root.querySelector('#day-timeline');
    timeline.replaceChildren();
    day.items.forEach((text, i) => {
      const row = el('li');
      row.append(el('span', String(i + 1).padStart(2, '0'), 'timeline-number'), el('p', text));
      timeline.append(row);
    });
    const statuses = root.querySelector('#day-statuses');
    statuses.replaceChildren(...day.statuses.map((s) => el('span', s.text, `status ${s.kind}`)));
    root.querySelector('#day-notes').replaceChildren(...day.notes.map((note) => el('p', note)));
    // This HTML is generated at build time only from the repository's itinerary details.
    root.querySelector('#day-details').innerHTML = day.details;
    const home = findPlace(day.lodging);
    const homeLink = root.querySelector('#home-link');
    homeLink.href = day.id === '0102' ? url('itinerary/#day-0102') : directions(home);
    homeLink.textContent = day.id === '0102' ? '짐 보관 안내 ↗' : '숙소로 ↗';
    homeLink.setAttribute('aria-label', day.id === '0102' ? '귀국일 짐 보관과 공항 이동 안내' : `숙소 ${home.properties.name} 길찾기`);
    const index = data.days.indexOf(day);
    root.querySelector('#previous-day').disabled = index === 0;
    root.querySelector('#next-day').disabled = index === data.days.length - 1;
    for (const view of views) root.querySelector(`#view-${view}`).hidden = state.view !== view;
    root.querySelectorAll('.journey-bottom-nav [data-view]').forEach((button) => {
      if (button.dataset.view === state.view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (state.view === 'map') {
      const mapUrl = new URL('assets/map/map.html', base);
      mapUrl.searchParams.set('region', day.region);
      mapUrl.searchParams.set('date', day.date);
      const iframe = root.querySelector('#journey-map');
      if (iframe.src !== mapUrl.href) iframe.src = mapUrl.href;
      root.querySelector('#full-map').href = mapUrl.href;
    }
    if (state.view === 'places') renderPlaces();
    updateOfflineStatus();
  }
  async function initialize() {
    const app = document.getElementById('journey-app');
    document.body.classList.toggle('journey-home', Boolean(app));
    if (!app) {
      events?.abort();
      if (!document.querySelector('.journey-document-nav')) {
        const nav = el('nav', undefined, 'journey-bottom-nav journey-document-nav');
        nav.setAttribute('aria-label', '여행 앱 메뉴');
        const date = new URLSearchParams(location.search).get('date');
        ['오늘', '지도', '장소', '더보기'].forEach((label, i) => {
          const target = new URL(base);
          target.searchParams.set('view', views[i]);
          if (/^202[67]-\d{2}-\d{2}$/.test(date || '')) target.searchParams.set('date', date);
          const link = el('a', label);
          link.href = target.href;
          nav.append(link);
        });
        document.body.append(nav);
      }
      document.body.classList.add('journey-document');
      return;
    }
    document.body.classList.remove('journey-document');
    document.querySelector('.journey-document-nav')?.remove();
    if (app.dataset.initialized) return;
    if (events) events.abort();
    events = new AbortController();
    root = app;
    root.dataset.initialized = 'true';
    root.querySelectorAll('.journey-view h1').forEach((heading) => heading.tabIndex = -1);
    try {
      const response = await fetch(url('assets/trip-data.json'));
      if (!response.ok) throw new Error('data');
      data = await response.json();
      state = readState();
      const select = root.querySelector('#journey-date');
      data.days.forEach((day) => {
        const option = el('option', `${Number(day.date.slice(5, 7))}/${Number(day.date.slice(8))} · ${day.city}`);
        option.value = day.date;
        select.append(option);
      });
      select.addEventListener('change', () => navigate({date: select.value}));
      root.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => navigate({view: button.dataset.view})));
      root.querySelector('#go-today').addEventListener('click', () => navigate({date: defaultDate(), view:'today'}));
      root.querySelector('#previous-day').addEventListener('click', () => navigate({date:data.days[data.days.indexOf(currentDay()) - 1].date}));
      root.querySelector('#next-day').addEventListener('click', () => navigate({date:data.days[data.days.indexOf(currentDay()) + 1].date}));
      root.querySelector('#open-day-places').addEventListener('click', () => navigate({view:'places'}));
      root.querySelector('#today-food').addEventListener('click', () => {
        const day = currentDay();
        const anchor = day.places.map(findPlace).find((place) => place && ['rome','naples'].includes(place.properties.region)) || findPlace(day.lodging);
        window.open(foodUrl(day, anchor), '_blank', 'noopener');
      });
      root.querySelector('#place-scope').addEventListener('change', renderPlaces);
      root.querySelector('#place-search').addEventListener('input', renderPlaces);
      root.querySelector('#install-app').addEventListener('click', async () => {
        if (installPrompt) {
          await installPrompt.prompt();
          installPrompt = null;
        } else {
          root.querySelector('#journey-message').textContent = window.matchMedia('(display-mode: standalone)').matches ? '이미 앱으로 열고 있어요.' : 'Android: 브라우저 메뉴에서 「앱 설치」 또는 「홈 화면에 추가」 · iPhone/iPad: Safari 공유 메뉴에서 「홈 화면에 추가」를 선택하세요.';
        }
      });
      window.addEventListener('popstate', () => {state = readState(); render();}, {signal:events.signal});
      window.addEventListener('online', render, {signal:events.signal});
      window.addEventListener('offline', render, {signal:events.signal});
      render();
    } catch {
      root.querySelector('#journey-message').textContent = '여행 화면을 불러오지 못했어요. 아래 전체 일정에서 계획을 확인할 수 있어요.';
      root.querySelector('#day-timeline').append(external('전체 일정 열기', url('itinerary/'), 'text-link'));
      // Keep the document links available when app data cannot be loaded.
      root.querySelector('#view-more').hidden = false;
    }
  }
  window.addEventListener('beforeinstallprompt', (event) => {event.preventDefault(); installPrompt = event;});
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest'; manifest.href = url('assets/journey/manifest.webmanifest'); document.head.append(manifest);
    const theme = document.createElement('meta'); theme.name = 'theme-color'; theme.content = '#8f3f35'; document.head.append(theme);
    const icon = document.createElement('link'); icon.rel = 'apple-touch-icon'; icon.href = url('assets/journey/icon-192.png'); document.head.append(icon);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(url('sw.js'), {scope:base.pathname}).then(() => navigator.serviceWorker.ready).then(() => {offlineReady = true; updateOfflineStatus();}).catch(() => {
      const status = document.getElementById('offline-status');
      if (status) status.textContent = '오프라인 저장을 완료하지 못했어요. 인터넷 연결 후 다시 열어주세요.';
    });
  }
  initialize();
  if (typeof document$ !== 'undefined') document$.subscribe(initialize);
})();
