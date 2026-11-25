import { useEffect, useMemo, useRef, useState } from 'react';
import placePhotos from './place-photos.json';
import dayPhotos from './day-photos.json';
import PwaControls from './PwaControls';
import MapPage from './MapPage';
import ReservationsPage from './ReservationsPage';
import Icon from './Icon';
import type { Walk } from './MapPage';
import './styles.css';

type TripStep = { text: string; places: number[]; priority: string };
type TripDay = {
  id: string; date: string; title: string; subtitle: string; city: string;
  region: string; meta: string; route: string; steps: TripStep[];
  lodging?: number; places?: number[];
  reminders: string[]; details: string;
  statuses: { kind: string; text: string }[];
};
type Place = {
  properties: { sort: number; name: string; region: string; group: string;
    note?: string; dates?: string[]; googleQuery?: string };
  geometry: { type: 'Point'; coordinates: [number, number] };
};
type TripData = { days: TripDay[]; places: Place[]; walks?: Walk[] };
type Tab = 'home' | 'schedule' | 'map' | 'reservations';

const base = import.meta.env.BASE_URL;
const image = (filename: string, small = false) => base + 'photos/' + (small ? 'sm/' : '') + filename + '.jpg';
const photosByPlaceId = placePhotos as Record<string, {file: string; alt: string; heading?: string}>;
const photosByDate = dayPhotos as Record<string, {file: string; alt: string; caption: string}>;
// Archived MkDocs pages remain accessible from the new home page.
const original = base + 'legacy/';
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const TRIP_START = '2026-12-23';

const regionNames: Record<string, string> = {
  rome: '로마', naples: '나폴리', amalfi: '아말피 해안', pompeii: '폼페이', civita: '치비타·오르비에토',
};
const statusIcons: Record<string, string> = {
  confirmed: 'check', verified: 'check', recheck: 'recheck', weather: 'weather',
  tentative: 'tentative', review: 'review', booking: 'booking', waiting: 'waiting',
};

function dateLabel(value: string) {
  const date = new Date(value + 'T12:00:00Z');
  return (date.getUTCMonth() + 1) + '월 ' + date.getUTCDate() + '일 (' + weekdays[date.getUTCDay()] + ')';
}
function shortDate(value: string) {
  return Number(value.slice(5, 7)) + '.' + Number(value.slice(8));
}
function weekday(value: string) {
  return weekdays[new Date(value + 'T12:00:00Z').getUTCDay()];
}
function localToday() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}
function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
}
function routeDate() {
  const match = window.location.hash.match(/^#\/day\/(\d{4}-\d{2}-\d{2})$/);
  return match ? match[1] : null;
}
function mapUrl(date?: string) {
  return '#/map' + (date ? '/' + encodeURIComponent(date) : '');
}
function routeMapDate() {
  const match = window.location.hash.match(/^#\/map(?:\/(\d{4}-\d{2}-\d{2})(?:\/walk\/[A-Za-z-]+)?)?$/);
  return match ? (match[1] || '') : null;
}
function mapsSearch(query: string) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}
function Photo({ filename, alt, priority = false, small = false }: {filename: string; alt: string; priority?: boolean; small?: boolean}) {
  const [loaded, setLoaded] = useState(false);
  return <img src={image(filename, small)} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async"
    className={'photo' + (loaded ? ' is-loaded' : '')} onLoad={() => setLoaded(true)}
    ref={node => { if (node?.complete && node.naturalWidth) setLoaded(true); }} />;
}
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** First main sightseeing photo of the day, otherwise the date's own overview
 * photo, otherwise any photographed stop (optional or backup). */
function dayThumbnail(day: TripDay) {
  const single = (main: boolean) => day.steps
    .filter(step => step.places.length === 1 && (!main || step.priority === 'main'))
    .map(step => photosByPlaceId[String(step.places[0])]).find(Boolean);
  return single(true) ?? photosByDate[day.date] ?? single(false);
}
/** Classify a step for its timeline icon from its own wording. */
function stepKind(step: TripStep, lodgingId?: number) {
  const t = step.text;
  if (/FCO|공항|항공|탑승|기내|귀국/.test(t)) return 'plane';
  if (/Uber|택시|Taxi/i.test(t)) return 'taxi';
  if (/Noleggiare|렌터카|차량|드라이브|운전/.test(t)) return 'car';
  if (/기차|열차|Trenitalia|Italo|Frecciarossa|Circumvesuviana|Linea|지하철|Metro|역으로|역에서|Centrale|Termini/i.test(t)) return 'train';
  if (/산책|도보|걸어/.test(t)) return 'walk';
  if (lodgingId !== undefined && step.places.includes(lodgingId)) return 'bed';
  if (/^[^·]*(점심|저녁|식사)/.test(t)) return 'food';
  if (/숙소|체크인|체크아웃|짐 보관/.test(t)) return 'bed';
  if (/점심|저녁|식사|피자|젤라토|카페|간편식/.test(t)) return 'food';
  return 'pin';
}
function splitTime(text: string) {
  // Keep qualifiers such as "전후"/"이후" with the time so the sentence reads naturally.
  const match = text.match(/^(\d{1,2}:\d{2}(?:\s*[~–-]\s*\d{1,2}:\d{2})?)(\s*(?:전후|이후|까지|경))?\s*(?:·\s*)?(.*)$/);
  return match
    ? { time: match[1].replace(/\s/g, '') + (match[2] ? ' ' + match[2].trim() : ''), rest: match[3] }
    : { time: '', rest: text };
}
function useTripPhase(days: TripDay[]) {
  const today = localToday();
  const todayDay = days.find(day => day.date === today);
  if (today < TRIP_START) return { phase: 'before' as const, countdown: daysBetween(today, TRIP_START), focus: days[0] };
  if (todayDay) return { phase: 'during' as const, countdown: 0, focus: todayDay };
  return { phase: 'after' as const, countdown: 0, focus: days[days.length - 1] };
}

function Header({ tab }: {tab: Tab}) {
  return <header className="site-header">
    <div className="site-header-inner">
      <a className="brand" href="#/" aria-label="여행 수첩 홈">
        <span className="brand-mark">Italia</span>
        <span className="brand-sub">가족여행 2026–27</span>
      </a>
      <nav aria-label="주요 메뉴" className="top-nav">
        <a href="#/schedule" aria-current={tab === 'schedule' ? 'page' : undefined}>전체 일정</a>
        <a href={mapUrl()} aria-current={tab === 'map' ? 'page' : undefined}>여행 지도</a>
        <a href="#/reservations" aria-current={tab === 'reservations' ? 'page' : undefined}>예약 현황</a>
      </nav>
      <PwaControls />
    </div>
  </header>;
}
function TabBar({ tab }: {tab: Tab}) {
  const items: {key: Tab; href: string; label: string; icon: string}[] = [
    {key: 'home', href: '#/', label: '홈', icon: 'home'},
    {key: 'schedule', href: '#/schedule', label: '일정', icon: 'calendar'},
    {key: 'map', href: mapUrl(), label: '지도', icon: 'map'},
    {key: 'reservations', href: '#/reservations', label: '예약', icon: 'ticket'},
  ];
  return <nav className="tab-bar" aria-label="하단 메뉴">
    {items.map(item => <a key={item.key} href={item.href}
      aria-current={tab === item.key ? 'page' : undefined}>
      <Icon name={item.icon} size={22} /><span>{item.label}</span>
    </a>)}
  </nav>;
}
function StatusBadges({ statuses, limit }: {statuses: TripDay['statuses']; limit?: number}) {
  const list = limit ? statuses.slice(0, limit) : statuses;
  return <ul className="status-badges">
    {list.map((status, i) => <li key={i} className={'badge badge-' + status.kind}>
      <Icon name={statusIcons[status.kind] ?? 'tentative'} size={14} />{status.text}
    </li>)}
  </ul>;
}
function SectionHeading({ titleId, overline, title, help, action }: {
  titleId?: string; overline?: string; title: string; help?: string; action?: React.ReactNode
}) {
  return <div className="section-heading">
    <div>
      {overline && <p className="section-overline">{overline}</p>}
      <h2 id={titleId}>{title}</h2>
      {help && <p className="section-help">{help}</p>}
    </div>
    {action}
  </div>;
}

/** Lodging segments, derived from the itinerary's own "N/M박" meta. */
function routeSegments(days: TripDay[]) {
  const segments: {label: string; nights: number; region: string; first: string}[] = [];
  days.forEach(day => {
    const part = day.meta.split('·')[1]?.trim() ?? '';
    const match = part.match(/^(.*?)\s*\d+\/(\d+)박$/);
    const label = match ? match[1] : part;
    const last = segments[segments.length - 1];
    if (last && last.label === label) return;
    segments.push({ label, nights: match ? Number(match[2]) : 0, region: day.region, first: day.date });
  });
  return segments;
}

function Home({ data, goDay }: {data: TripData; goDay: (date: string) => void}) {
  const { phase, countdown, focus } = useTripPhase(data.days);
  const focusIndex = data.days.indexOf(focus);
  const focusPhoto = dayThumbnail(focus);
  const segments = routeSegments(data.days);
  const totalNights = segments.reduce((sum, s) => sum + s.nights, 0);
  const featured = useMemo(() => {
    const wanted = ['positano', 'rome', 'pompeii', 'vatican', 'civita', 'trevi', 'plebiscito', 'pantheon'];
    const found = new Map<string, {file: string; name: string; date: string; region: string}>();
    data.days.forEach(day => day.steps.forEach(step => {
      if (step.places.length !== 1) return;
      const photo = photosByPlaceId[String(step.places[0])];
      const place = data.places.find(p => p.properties.sort === step.places[0]);
      if (photo && wanted.includes(photo.file) && !found.has(photo.file)) {
        found.set(photo.file, { file: photo.file, name: photo.heading ?? place?.properties.name ?? '', date: day.date, region: day.region });
      }
    }));
    return wanted.map(key => found.get(key)).filter(Boolean) as {file: string; name: string; date: string; region: string}[];
  }, [data]);

  return <main className="home">
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-media"><Photo filename="positano" alt="아말피 해안 포지타노 마을 전경" priority /></div>
      <div className="hero-shade" aria-hidden="true" />
      <div className="hero-content wrap">
        <p className="hero-dates">2026.12.23 — 2027.01.02 · {data.days.length}일 · {totalNights}박</p>
        <h1 id="hero-title">이탈리아<br />가족여행</h1>
        <p className="hero-cities">로마 · 나폴리 · 아말피 해안 · 폼페이</p>
        <div className="hero-chips">
          {phase === 'before' && <span className="hero-chip strong">출발까지 {countdown}일</span>}
          {phase === 'during' && <span className="hero-chip strong">여행 {focusIndex + 1}일차</span>}
          {phase === 'after' && <span className="hero-chip strong">여행 완료</span>}
          <span className="hero-chip">가족 4명 · 성인 2 · 어린이 2</span>
        </div>
      </div>
      <p className="hero-credit">포지타노</p>
    </section>

    <section className="wrap focus-wrap" aria-label={phase === 'during' ? '오늘 일정' : '첫날 일정'}>
      <button type="button" className={'focus-card region-' + focus.region} onClick={() => goDay(focus.date)}>
        {focusPhoto && <span className="focus-photo"><Photo filename={focusPhoto.file} alt="" small /></span>}
        <span className="focus-body">
          <span className="focus-label">{phase === 'during' ? '오늘' : phase === 'before' ? '첫날' : '마지막 날'} · DAY {focusIndex + 1} · {dateLabel(focus.date)}</span>
          <strong>{focus.title}</strong>
          <span className="focus-sub">{focus.subtitle}</span>
          <StatusBadges statuses={focus.statuses} limit={3} />
        </span>
        <span className="focus-go" aria-hidden="true"><Icon name="arrow" size={22} /></span>
      </button>
    </section>

    <section className="wrap route-section" aria-labelledby="route-title">
      <SectionHeading titleId="route-title" overline="ROUTE" title="여정 한눈에" />
      <ol className="route-bar">
        {segments.map(segment => <li key={segment.first} className={'region-' + segment.region}
          style={{flexGrow: Math.max(segment.nights, 0.6)}}>
          <button type="button" onClick={() => goDay(segment.first)}>
            <span className="route-name">{segment.label}</span>
            <span className="route-nights">{segment.nights ? segment.nights + '박' : '귀국'}</span>
          </button>
        </li>)}
      </ol>
      <ul className="region-legend">
        {Object.entries(regionNames).map(([key, name]) => <li key={key} className={'region-' + key}>{name}</li>)}
      </ul>
    </section>

    <section className="wrap itinerary-section" aria-labelledby="schedule-title">
      <div id="schedule" className="anchor" />
      <SectionHeading titleId="schedule-title" overline="ITINERARY" title="날짜별 일정"
        help="항공편·숙소·일부 고속열차는 예약 완료, 관광 일정은 잠정안입니다." />
      <ol className="day-cards">
        {data.days.map((day, index) => {
          const photo = dayThumbnail(day);
          const rechecks = day.statuses.filter(s => s.kind === 'recheck' || s.kind === 'weather' || s.kind === 'booking' || s.kind === 'waiting').length;
          const isToday = phase === 'during' && day.id === focus.id;
          return <li key={day.id}>
            <button type="button" className={'day-card region-' + day.region + (isToday ? ' is-today' : '')}
              onClick={() => goDay(day.date)}>
              <span className="day-card-photo">
                {photo && <Photo filename={photo.file} alt="" small />}
                <span className="day-card-num"><small>DAY</small>{String(index + 1).padStart(2, '0')}</span>
                {isToday && <span className="today-flag">오늘</span>}
              </span>
              <span className="day-card-body">
                <span className="day-card-date">{shortDate(day.date)} <em>{weekday(day.date)}</em><span className="region-pill">{regionNames[day.region] ?? day.city}</span></span>
                <strong>{day.title}</strong>
                <span className="day-card-meta">{day.meta.split('·').slice(1).join('·').trim()}</span>
                {rechecks > 0 && <span className="day-card-alert"><Icon name="recheck" size={13} />확인 {rechecks}건</span>}
              </span>
            </button>
          </li>;
        })}
      </ol>
    </section>

    <section className="place-section" aria-labelledby="places-title">
      <div className="wrap"><SectionHeading titleId="places-title" overline="HIGHLIGHTS" title="주요 방문지" help="누르면 방문하는 날짜의 일정이 열립니다." /></div>
      <div className="place-rail">
        {featured.map(place => <button key={place.file} type="button"
          className={'place-tile region-' + place.region} onClick={() => goDay(place.date)}>
          <Photo filename={place.file} alt={place.name + ' 풍경'} small />
          <span className="place-tile-text"><small>{dateLabel(place.date)}</small><strong>{place.name}</strong></span>
        </button>)}
      </div>
    </section>

    <section className="wrap preparation-section" aria-labelledby="prep-title">
      <SectionHeading titleId="prep-title" overline="PREPARE" title="여행 준비" />
      <div className="resource-links">
        <a href="#/reservations"><Icon name="ticket" size={26} /><strong>예약 현황</strong><span>완료·예매 예정·재확인 항목</span></a>
        <a href={original + 'checklist/'}><Icon name="list" size={26} /><strong>출발 전 체크리스트</strong><span>준비물과 출발 전 점검</span></a>
        <a href={mapUrl()}><Icon name="map" size={26} /><strong>여행 지도</strong><span>권역·날짜별 장소</span></a>
        <a href={original + 'itinerary/'}><Icon name="doc" size={26} /><strong>상세 일정 문서</strong><span>전체 계획과 공식 출처</span></a>
      </div>
    </section>
  </main>;
}

function DayNav({ days, current, goDay }: {
  days: TripDay[]; current: TripDay; goDay: (date: string) => void
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const selected = ref.current?.querySelector<HTMLElement>('[aria-current="date"]');
    if (selected && ref.current) {
      ref.current.scrollTo({ left: selected.offsetLeft - ref.current.clientWidth / 2 + selected.clientWidth / 2, behavior: 'smooth' });
    }
  }, [current]);
  return <div className="day-nav-shell">
    <nav ref={ref} className="day-nav" aria-label="날짜 이동">
      {days.map((day, index) => <button key={day.id} type="button"
        aria-current={day.id === current.id ? 'date' : undefined}
        className={'day-nav-item region-' + day.region + (day.id === current.id ? ' selected' : '')}
        onClick={() => goDay(day.date)}>
        <span>{index + 1}일차 · {weekday(day.date)}</span><strong>{shortDate(day.date)}</strong>
      </button>)}
    </nav>
  </div>;
}
function Checks({ reminders }: {reminders: string[]}) {
  return <section className="checks-card" aria-labelledby="checks-title">
    <div id="checks" className="anchor" />
    <h2 id="checks-title"><Icon name="check" size={20} />출발 전·당일 확인</h2>
    <ul className="checks-list">
      {(reminders.length > 0 ? reminders : ['추가 준비사항은 기존 상세 일정에서 확인하세요.']).map((note, index) => {
        const [lead, ...rest] = note.split(' · ');
        return <li key={index}>
          {rest.length > 0 ? <><b>{lead}</b><span>{rest.join(' · ')}</span></> : <span>{note}</span>}
        </li>;
      })}
    </ul>
  </section>;
}
function WalkCandidates({ day, data }: {day: TripDay; data: TripData}) {
  const walks = (data.walks || []).filter(walk => walk.properties.date === day.date && !walk.properties.parent)
    .sort((a, b) => a.properties.order - b.properties.order);
  if (!walks.length) return null;
  return <section className="walks-card" aria-labelledby="walks-title">
    <div className="walks-card-head">
      <h2 id="walks-title"><Icon name="walk" size={20} />산책 코스 후보</h2>
      <a href={'#/map/' + day.date}>지도에서 보기 <Icon name="arrow" size={15} /></a>
    </div>
    <ul className="walks-list">
      {walks.map(walk => <li key={walk.properties.id}>
        <a href={'#/map/' + day.date + '/walk/' + walk.properties.id}
          style={{'--walk': walk.properties.color} as React.CSSProperties}>
          <span className="walk-swatch" aria-hidden="true" />
          <span className="walks-list-name">{walk.properties.name}{walk.properties.recommended && <em>추천</em>}</span>
          <span className="walks-list-meta">{walk.properties.distanceKm}km · {walk.properties.minutes}분</span>
        </a>
      </li>)}
    </ul>
    <p className="walks-note">거리는 OpenStreetMap 기반, 시간은 아이 걸음 기준 추정이에요.</p>
  </section>;
}
function Steps({ day, data }: {day: TripDay; data: TripData}) {
  const lookup = new Map(data.places.map(place => [place.properties.sort, place.properties]));

  // Feature photography belongs to the actual sightseeing stop, not a preceding
  // transfer. Only verified, single-place steps receive a photograph.
  const lastPhotoStep = new Map<number, number>();
  day.steps.forEach((step, index) => {
    if (step.places.length === 1 && photosByPlaceId[String(step.places[0])]) {
      lastPhotoStep.set(step.places[0], index);
    }
  });

  // Places that have no feature card today get a small photo the first time a
  // step mentions them, so every named sight can be recognised at a glance.
  const stripPhotos = new Map<number, number[]>();
  const shown = new Set<number>(lastPhotoStep.keys());
  day.steps.forEach((step, index) => {
    if (step.places.length === 1 && lastPhotoStep.get(step.places[0]) === index) return;
    const ids = step.places.filter(id => photosByPlaceId[String(id)] && !shown.has(id));
    ids.forEach(id => shown.add(id));
    if (ids.length) stripPhotos.set(index, ids);
  });

  const placeLinks = (ids: number[]) => ids.length ? <div className="step-links">
    {ids.map(id => {
      const place = lookup.get(id);
      return place ? <a key={id} href={mapsSearch(place.googleQuery || place.name)}
        target="_blank" rel="noopener noreferrer"><Icon name="pin" size={14} />{place.name}</a> : null;
    })}
  </div> : null;

  const photoStrip = (ids: number[]) => <ul className="step-photos">
    {ids.map(id => {
      const place = lookup.get(id);
      const photo = photosByPlaceId[String(id)];
      return <li key={id}>
        <a href={mapsSearch(place?.googleQuery || place?.name || photo.heading || '')} target="_blank" rel="noopener noreferrer">
          <span className="step-photo-img"><Photo filename={photo.file} alt={photo.alt} small /></span>
          <span className="step-photo-name"><Icon name="pin" size={13} />{photo.heading ?? place?.name}</span>
        </a>
      </li>;
    })}
  </ul>;

  return <section className="steps-section" aria-labelledby="steps-title">
    <div id="steps" className="anchor" />
    <SectionHeading titleId="steps-title" overline="TIMELINE" title="이동·방문 순서" help="목표·잠정 시각은 현장 상황에 맞게 조정하세요." />
    <ol className="timeline">
      {day.steps.map((step, index) => {
        const placeId = step.places.length === 1 ? step.places[0] : null;
        const preview = placeId !== null && lastPhotoStep.get(placeId) === index
          ? photosByPlaceId[String(placeId)] : undefined;
        const optional = step.priority !== 'main';
        const { time, rest } = splitTime(step.text);
        const kind = preview ? 'pin' : stepKind(step, day.lodging);

        if (preview) {
          const place = lookup.get(placeId!);
          return <li key={index} className="timeline-item is-feature">
            <span className="timeline-node"><Icon name="pin" size={18} /></span>
            <article className="feature-card">
              <figure className="feature-photo"><Photo filename={preview.file} alt={preview.alt} /></figure>
              <div className="feature-body">
                <p className="step-index">{String(index + 1).padStart(2, '0')}{time && <span className="time-chip">{time}</span>}{optional && <span className="optional-chip">선택 방문</span>}</p>
                <h3>{preview.heading ?? place?.name ?? '관광지'}</h3>
                <p>{rest}</p>
                {placeLinks(step.places)}
              </div>
            </article>
          </li>;
        }

        return <li key={index} className={'timeline-item kind-' + kind}>
          <span className="timeline-node"><Icon name={kind} size={18} /></span>
          <div className="step-card">
            <p className="step-index">{String(index + 1).padStart(2, '0')}{time && <span className="time-chip">{time}</span>}{optional && <span className="optional-chip">선택·대안</span>}</p>
            <p className="step-text">{rest}</p>
            {stripPhotos.has(index) && photoStrip(stripPhotos.get(index)!)}
            {placeLinks(step.places.filter(id => !stripPhotos.get(index)?.includes(id)))}
          </div>
        </li>;
      })}
    </ol>
  </section>;
}
function DayView({ day, data, goDay }: {day: TripDay; data: TripData; goDay: (date: string) => void}) {
  // Date covers depict a *different* visited place from the step photographs
  // (enforced by the photo registry validator). Without one, the hero uses the
  // region colour instead of repeating a landmark.
  const overviewPhoto = photosByDate[day.date];
  const index = data.days.indexOf(day);
  const previous = data.days[index - 1];
  const next = data.days[index + 1];
  const route = day.route.split('→').map(s => s.trim()).filter(Boolean);
  return <main className={'day-page region-' + day.region}>
    <section className={'day-hero' + (overviewPhoto ? ' has-photo' : '')}>
      {overviewPhoto && <div className="hero-media"><Photo filename={overviewPhoto.file} alt={overviewPhoto.alt} priority /></div>}
      <div className="hero-shade" aria-hidden="true" />
      {!overviewPhoto && <span className="day-hero-numeral" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
      <div className="day-hero-content wrap">
        <a className="back-link" href="#/schedule"><Icon name="back" size={16} />전체 일정</a>
        <p className="day-hero-overline">DAY {index + 1} · {dateLabel(day.date)} · {regionNames[day.region] ?? day.city}</p>
        <h1>{day.title}</h1>
        <p className="day-hero-meta">{day.meta}</p>
      </div>
      {overviewPhoto && <p className="hero-credit">{overviewPhoto.caption}</p>}
    </section>
    <DayNav days={data.days} current={day} goDay={goDay} />

    <div className="wrap day-body">
      <section className="summary-card" aria-label="이날 요약">
        <StatusBadges statuses={day.statuses} />
        <p className="summary-text">{day.subtitle}</p>
        {route.length > 1 && <ol className="route-chips" aria-label="이동 경로">
          {route.map((stop, i) => <li key={i}>{stop}</li>)}
        </ol>}
        <nav className="summary-actions" aria-label="이날 바로가기">
          <a href={mapUrl(day.date)} className="primary"><Icon name="map" size={18} />이날 지도</a>
          <a href="#steps" onClick={event => { event.preventDefault(); scrollToSection('steps'); }}><Icon name="down" size={18} />이동 순서</a>
          <a href="#checks" onClick={event => { event.preventDefault(); scrollToSection('checks'); }}><Icon name="check" size={18} />확인사항</a>
        </nav>
      </section>

      <Checks reminders={day.reminders} />
      <WalkCandidates day={day} data={data} />
      <Steps day={day} data={data} />

      {day.details && <section className="day-reference">
        <SectionHeading overline="DETAILS" title="운영·교통 세부사항" help="운영시간과 교통편은 출발 전에 재확인하세요." />
        <div className="source-details" dangerouslySetInnerHTML={{__html:day.details}} />
      </section>}

      <nav className="day-pager" aria-label="앞뒤 날짜">
        {previous ? <button type="button" className={'pager-card region-' + previous.region} onClick={() => goDay(previous.date)}>
          <small><Icon name="back" size={14} />이전 날 · {shortDate(previous.date)}</small><strong>{previous.title}</strong>
        </button> : <span />}
        {next ? <button type="button" className={'pager-card next region-' + next.region} onClick={() => goDay(next.date)}>
          <small>다음 날 · {shortDate(next.date)}<Icon name="arrow" size={14} /></small><strong>{next.title}</strong>
        </button> : <span />}
      </nav>
      <div className="day-footer-links">
        <a href={original + 'itinerary/#day-' + day.id}>기존 상세 일정 원문 <Icon name="external" size={14} /></a>
        <a href="#/reservations">예약 현황 <Icon name="arrow" size={14} /></a>
      </div>
    </div>
  </main>;
}
function Footer() {
  return <footer className="footer">
    <div className="wrap footer-row">
      <span className="footer-brand">Italia</span>
      <span>이탈리아 가족여행 · 2026.12.23 – 2027.01.02</span>
      <span>사진: <a href="https://github.com/Jaeho211/italy-family-trip-2026/blob/main/web/PHOTO_CREDITS.md" target="_blank" rel="noopener noreferrer">Wikimedia Commons (출처·라이선스)</a></span>
    </div>
  </footer>;
}
export default function App() {
  const [data, setData] = useState<TripData | null>(null);
  const [route, setRoute] = useState<string | null>(routeDate);
  const [hash, setHash] = useState(() => window.location.hash);
  const [mapDate, setMapDate] = useState<string | null>(routeMapDate);
  const [error, setError] = useState<string | null>(null);
  const reservationsView = hash === '#/reservations';

  useEffect(() => {
    const syncRoute = () => {
      setRoute(routeDate());
      setHash(window.location.hash);
      setMapDate(routeMapDate());
      if (window.location.hash === '#/schedule') {
        window.requestAnimationFrame(() => document.getElementById('schedule')?.scrollIntoView());
      } else {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(base + 'data/trip-data.json', {signal:controller.signal})
      .then(response => {
        if (!response.ok) throw new Error('여행 데이터를 불러오지 못했습니다.');
        return response.json() as Promise<TripData>;
      }).then(setData).catch(err => {
        if (err?.name !== 'AbortError') setError(String(err));
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (data && hash === '#/schedule') {
      window.requestAnimationFrame(() => document.getElementById('schedule')?.scrollIntoView());
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = useMemo(() => data?.days.find(day => day.date === route), [data, route]);
  const goDay = (date: string) => { window.location.hash = '#/day/' + date; };
  const tab: Tab = reservationsView ? 'reservations' : mapDate !== null ? 'map'
    : current || hash === '#/schedule' ? 'schedule' : 'home';
  return <div className="app-shell">
    <Header tab={tab} />
    {error && <main className="loading wrap"><h1>데이터를 불러오지 못했어요.</h1><p>{error}</p><a href={original}>기존 여행 수첩 열기 ↗</a></main>}
    {!error && !data && <main className="loading wrap" aria-busy="true"><div className="skeleton hero-skeleton" /><div className="skeleton line" /><div className="skeleton line short" /></main>}
    {data && <div className="view" key={tab + (route ?? '') + (mapDate ?? '')}>
      {reservationsView
        ? <ReservationsPage />
        : mapDate !== null ? <MapPage data={data} date={mapDate} goDay={goDay} />
        : current ? <DayView day={current} data={data} goDay={goDay} />
        : <Home data={data} goDay={goDay} />}
    </div>}
    {data && <Footer />}
    <TabBar tab={tab} />
  </div>;
}
