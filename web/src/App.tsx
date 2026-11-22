import { useEffect, useMemo, useState } from 'react';
import placePhotos from './place-photos.json';
import dayPhotos from './day-photos.json';
import PwaControls from './PwaControls';
import './styles.css';

type TripStep = { text: string; places: number[]; priority: string };
type TripDay = {
  id: string; date: string; title: string; subtitle: string; city: string;
  region: string; meta: string; route: string; steps: TripStep[];
  reminders: string[]; details: string;
  statuses: { kind: string; text: string }[];
};
type Place = { properties: { sort: number; name: string; googleQuery?: string } };
type TripData = { days: TripDay[]; places: Place[] };

const base = import.meta.env.BASE_URL;
const image = (filename: string) => base + 'photos/' + filename + '.jpg';
const photosByPlaceId = placePhotos as Record<string, {file: string; alt: string; heading?: string}>;
const photosByDate = dayPhotos as Record<string, {file: string; alt: string; caption: string}>;
// Archived MkDocs pages remain accessible from the new home page.
const original = base + 'legacy/';
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

function dateLabel(value: string) {
  const date = new Date(value + 'T12:00:00Z');
  return (date.getUTCMonth() + 1) + '월 ' + date.getUTCDate() + '일 (' + weekdays[date.getUTCDay()] + ')';
}
function routeDate() {
  const match = window.location.hash.match(/^#\/day\/(\d{4}-\d{2}-\d{2})$/);
  return match ? match[1] : null;
}
function mapUrl(date?: string) {
  return original + (date ? '?view=map&date=' + encodeURIComponent(date) : '?view=map');
}
function mapsSearch(query: string) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}
function Photo({ filename, alt, priority = false }: {filename: string; alt: string; priority?: boolean}) {
  return <img src={image(filename)} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" />;
}
function SectionHeading({ title, help }: {title: string; help?: string}) {
  return <div className="section-heading">
    <h2>{title}</h2>
    {help && <p>{help}</p>}
  </div>;
}
function Header() {
  return <header className="site-header">
    <a className="brand" href="#/" aria-label="여행 수첩 홈">ITALIA <span>이탈리아 가족여행</span></a>
    <nav aria-label="주요 메뉴" className="top-nav">
      <a href="#/schedule">전체 일정</a>
      <a href={mapUrl()}>여행 지도</a>
      <a href={original + 'reservations/'}>예약 현황</a>
      <PwaControls />
    </nav>
  </header>;
}
function QuickLinks({ date }: {date?: string}) {
  return <nav className="quick-links" aria-label="여행 도구">
    <a href={date ? '#steps' : '#schedule'}>날짜별 일정 <span>→</span></a>
    <a href={mapUrl(date)}>여행 지도 <span>↗</span></a>
    <a href={original + 'reservations/'}>예약 현황 <span>↗</span></a>
    <a href={original + 'checklist/'}>준비 체크리스트 <span>↗</span></a>
  </nav>;
}

const featuredPlaces = [
  {name: '로마', image: 'rome', description: '판테온·바티칸·콜로세움', date: '2026-12-28'},
  {name: '아말피 해안', image: 'positano', description: '포지타노·아말피·라벨로(선택)', date: '2026-12-25'},
  {name: '폼페이', image: 'pompeii', description: '고대 도시 유적 관람', date: '2026-12-27'},
];

function Home({ data, goDay }: {data: TripData; goDay: (date: string) => void}) {
  return <main>
    <section className="home-hero wrap">
      <div className="home-hero-copy">
        <p className="overline">2026.12.23 – 2027.01.02</p>
        <h1>이탈리아 가족여행</h1>
        <p className="home-summary">로마 · 나폴리 · 아말피 해안 · 폼페이</p>
        <div className="hero-facts">
          <div><strong>{data.days.length}일</strong><span>전체 여행 기간</span></div>
          <div><strong>가족 4명</strong><span>성인 2명 · 어린이 2명</span></div>
        </div>
        <QuickLinks />
      </div>
      <figure className="hero-photo">
        <Photo filename="rome" alt="로마 콜로세움" priority />
        <figcaption>로마 · 콜로세움</figcaption>
      </figure>
    </section>

    <section className="wrap itinerary-section" id="schedule">
      <SectionHeading title="전체 일정" help="날짜를 선택하면 이동 순서와 준비사항을 볼 수 있습니다." />
      <p className="notice">항공편·숙소·일부 고속열차는 예약 완료, 관광 일정은 잠정안입니다. 날짜별 확인사항을 참고하세요.</p>
      <div className="schedule-list">
        {data.days.map((day, index) => <button
          type="button" className="schedule-row" key={day.id} onClick={() => goDay(day.date)}>
          <span className="schedule-day">DAY {String(index + 1).padStart(2, '0')}</span>
          <span className="schedule-date">{dateLabel(day.date)}</span>
          <span className="schedule-main"><strong>{day.title}</strong><small>{day.meta}</small></span>
          <span className="schedule-status">{day.statuses.find(s => s.kind === 'recheck' || s.kind === 'weather')?.text || day.statuses[0]?.text || ''}</span>
          <span className="schedule-arrow" aria-hidden="true">→</span>
        </button>)}
      </div>
    </section>

    <section className="wrap place-section">
      <SectionHeading title="주요 방문지" help="사진을 누르면 해당 날짜의 일정으로 이동합니다." />
      <div className="place-grid">
        {featuredPlaces.map(place => <button key={place.name} className="place-preview"
          type="button" onClick={() => goDay(place.date)}>
          <div className="place-preview-photo"><Photo filename={place.image} alt={place.name + ' 여행 풍경'} /></div>
          <div className="place-preview-info"><strong>{place.name}</strong><span>{place.description}</span></div>
        </button>)}
      </div>
    </section>

    <section className="wrap preparation-section">
      <SectionHeading title="여행 준비" />
      <div className="resource-links">
        <a href={original + 'reservations/'}><strong>예약 현황</strong><span>예약 완료·준비·재확인 항목 확인 →</span></a>
        <a href={original + 'checklist/'}><strong>출발 전 체크리스트</strong><span>준비물 및 출발 전 점검 →</span></a>
        <a href={original + 'itinerary/'}><strong>상세 일정 문서</strong><span>전체 계획과 공식 출처 확인 →</span></a>
      </div>
    </section>
  </main>;
}

function DayNav({ days, current, goDay }: {
  days: TripDay[]; current: TripDay; goDay: (date: string) => void
}) {
  return <nav className="day-nav" aria-label="날짜 이동">
    {days.map((day, index) => <button key={day.id} type="button"
      aria-current={day.id === current.id ? 'date' : undefined}
      className={'day-nav-item' + (day.id === current.id ? ' selected' : '')}
      onClick={() => goDay(day.date)}>
      <span>{index + 1}일차</span><strong>{Number(day.date.slice(5,7))}/{Number(day.date.slice(8))}</strong>
    </button>)}
  </nav>;
}
function Checks({ reminders }: {reminders: string[]}) {
  return <section id="checks" className="content-section">
    <h2>출발 전·당일 확인</h2>
    <ul className="checks-list">
      {reminders.length > 0
        ? reminders.map((note, index) => <li key={index}>{note}</li>)
        : <li>추가 준비사항은 기존 상세 일정에서 확인하세요.</li>}
    </ul>
  </section>;
}
function Steps({ day, data }: {day: TripDay; data: TripData}) {
  const lookup = new Map(data.places.map(place => [place.properties.sort, place.properties]));

  // Feature photography belongs to the actual sightseeing stop, not a preceding
  // transfer. Only verified, single-place steps receive a photographic spread.
  const lastPhotoStep = new Map<number, number>();
  day.steps.forEach((step, index) => {
    if (step.places.length === 1 && photosByPlaceId[String(step.places[0])]) {
      lastPhotoStep.set(step.places[0], index);
    }
  });

  const placeLinks = (step: TripStep) => <nav className="journey-place-links" aria-label="장소별 지도">
    {step.places.map(id => {
      const place = lookup.get(id);
      return place ? <a key={id} href={mapsSearch(place.googleQuery || place.name)}
        target="_blank" rel="noopener noreferrer">{place.name} 지도 ↗</a> : null;
    })}
  </nav>;

  return <section id="steps" className="journey-section">
    <SectionHeading title="이동·방문 순서" help="관광지는 사진과 함께, 이동·교통은 간결한 목록으로 정리했습니다." />
    <ol className="journey-sequence">
      {day.steps.map((step, index) => {
        const placeId = step.places.length === 1 ? step.places[0] : null;
        const preview = placeId !== null && lastPhotoStep.get(placeId) === index
          ? photosByPlaceId[String(placeId)] : undefined;
        const number = String(index + 1).padStart(2, '0');
        const optional = step.priority !== 'main';

        if (preview) {
          const place = lookup.get(placeId!);
          return <li key={index} className="journey-stop journey-feature">
            <article className="destination-spread">
              <span className="destination-kicker" aria-hidden="true">{number}</span>
              <div className="destination-spread-content">
                <h3>{preview.heading ?? place?.name ?? '관광지'}{optional && <small className="destination-condition">선택 방문</small>}</h3>
                <p>{step.text}</p>
              </div>
              <figure className="destination-spread-image">
                <Photo filename={preview.file} alt={preview.alt} />
              </figure>
              {placeLinks(step)}
            </article>
          </li>;
        }

        return <li key={index} className="journey-stop journey-logistics">
          <div className="journey-row">
            <span className="journey-row-index">{number}</span>
            <div className="journey-row-copy">
              <p>{step.text}</p>
              {optional && <span className="secondary-note">선택·대안 포함</span>}
              {step.places.length > 0 && placeLinks(step)}
            </div>
          </div>
        </li>;
      })}
    </ol>
  </section>;
}
function DayView({ day, data, goDay }: {day: TripDay; data: TripData; goDay: (date: string) => void}) {
  const hasFeaturedStopPhoto = day.steps.some(step =>
    step.places.length === 1 && Boolean(photosByPlaceId[String(step.places[0])]));
  // Never substitute a city-wide landmark for a different day's itinerary.
  // When a sightseeing stop has its own full-width photo below, omit the
  // smaller overview image so that the same landmark is not repeated.
  const overviewPhoto = hasFeaturedStopPhoto ? undefined : photosByDate[day.date];
  const index = data.days.indexOf(day);
  const next = data.days[index + 1];
  return <main className="wrap day-page">
    <a className="back-link" href="#/">← 전체 일정으로</a>
    <DayNav days={data.days} current={day} goDay={goDay} />
    <div className="day-heading">
      <p className="overline">DAY {index + 1} · {dateLabel(day.date)}</p>
      <h1>{day.title}</h1>
      <p className="day-meta">{day.meta}</p>
      <div className="day-statuses">
        {day.statuses.map((status, i) => <span className={'status-label ' + status.kind} key={i}>{status.text}</span>)}
      </div>
    </div>
    <div className={'day-overview' + (overviewPhoto ? '' : ' no-photo')}>
      <div className="day-overview-copy">
        <h2>오늘의 일정</h2>
        <p>{day.subtitle}</p>
        <p>아래에서 이동 순서, 확인할 사항, 관련 지도를 확인할 수 있습니다.</p>
        <nav className="day-shortcuts" aria-label="이날 바로가기">
          <a href="#checks">확인사항 ↓</a>
          <a href="#steps">이동 순서 ↓</a>
          <a href={mapUrl(day.date)}>지도 ↗</a>
        </nav>
      </div>
      {overviewPhoto && <figure className="day-photo">
        <Photo filename={overviewPhoto.file} alt={overviewPhoto.alt} priority />
        <figcaption>{overviewPhoto.caption}</figcaption>
      </figure>}
    </div>
    <div className="day-information">
      <Checks reminders={day.reminders} />
    </div>
    <Steps day={day} data={data} />

    {day.details && <section className="day-reference">
      <SectionHeading title="운영·교통 세부사항" help="운영시간과 교통편은 출발 전에 재확인하세요." />
      <div className="source-details" dangerouslySetInnerHTML={{__html:day.details}} />
    </section>}
    <div className="day-footer-links">
      <a href={original + 'itinerary/#day-' + day.id}>기존 상세 일정 원문 ↗</a>
      <a href={original + 'reservations/'}>예약 현황 ↗</a>
      {next && <button type="button" onClick={() => goDay(next.date)}>다음 날: {next.title} →</button>}
    </div>
  </main>;
}
function Footer() {
  return <footer className="footer">
    <div className="wrap footer-row"><span>이탈리아 가족여행 · 2026.12.23 – 2027.01.02</span>
      <span>사진: <a href="https://github.com/Jaeho211/italy-family-trip-2026/blob/main/web/PHOTO_CREDITS.md" target="_blank" rel="noopener noreferrer">Wikimedia Commons (출처·라이선스)</a></span>
    </div>
  </footer>;
}
export default function App() {
  const [data, setData] = useState<TripData | null>(null);
  const [route, setRoute] = useState<string | null>(routeDate);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncRoute = () => {
      setRoute(routeDate());
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
  const current = useMemo(() => data?.days.find(day => day.date === route), [data, route]);
  const goDay = (date: string) => { window.location.hash = '#/day/' + date; };
  return <div className="app-shell">
    <Header />
    {error && <main className="loading"><h1>데이터를 불러오지 못했어요.</h1><p>{error}</p><a href={original}>기존 여행 수첩 열기 ↗</a></main>}
    {!error && !data && <main className="loading"><h1>여행 일정 불러오는 중…</h1></main>}
    {data && (current ? <DayView day={current} data={data} goDay={goDay} /> : <Home data={data} goDay={goDay} />)}
    {data && <Footer />}
  </div>;
}
