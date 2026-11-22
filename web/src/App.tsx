import { useEffect, useMemo, useState } from 'react';
import './styles.css';

type TripStep = { text: string; places: number[]; priority: string };
type TripDay = {
  id: string; date: string; title: string; subtitle: string; city: string;
  region: string; meta: string; route: string; steps: TripStep[];
  reminders: string[]; details: string;
  statuses: { kind: string; text: string }[];
};
type Place = { properties: { sort: number; name: string; googleQuery?: string; note?: string; region: string } };
type TripData = { days: TripDay[]; places: Place[] };

const base = import.meta.env.BASE_URL;
const photo = (name: string) => `${base}photos/${name}.jpg`;
const siteHome = '../';

const displayDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
};
const shortDate = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
};
const dateIndex = (day: TripDay, days: TripDay[]) => String(days.indexOf(day) + 1).padStart(2, '0');
const googleMaps = (search: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(search)}`;

function routeKey() {
  const found = window.location.hash.match(/^#\/day\/(\d{4}-\d{2}-\d{2})$/);
  return found ? found[1] : null;
}

function Picture({ src, alt, className = '', eager = false }: {
  src: string; alt: string; className?: string; eager?: boolean
}) {
  return <img
    className={className} src={photo(src)} alt={alt}
    loading={eager ? 'eager' : 'lazy'} decoding="async"
  />;
}

function Header({ dark, onHome }: { dark: boolean; onHome: () => void }) {
  return <header className={`site-header ${dark ? 'header-over-image' : ''}`}>
    <button className="wordmark" type="button" onClick={onHome} aria-label="여행 홈으로">
      <span className="wordmark-title">ITALIA<span className="wordmark-stop">.</span></span>
      <span className="wordmark-label">FAMILY FIELD NOTES</span>
    </button>
    <nav className="header-links" aria-label="주요 메뉴">
      <a href="#/day/2026-12-25">THE JOURNEY <span aria-hidden="true">↗</span></a>
      <a href="../?view=map&date=2026-12-25" title="기존 사이트에서 지도 열기">MAP <span aria-hidden="true">↗</span></a>
    </nav>
  </header>;
}

function Home({ data, goDay }: { data: TripData; goDay: (date: string) => void }) {
  const amalfi = data.days.find(day => day.id === '1225');
  const opening = data.days[0];
  return <>
    <section className="cover" aria-label="이탈리아 가족여행 화보 표지">
      <Picture src="rome" alt="로마 콜로세움의 아름다운 건축과 풍경" className="cover-photo" eager />
      <div className="cover-shade" />
      <div className="cover-meta">
        <span>ISSUE NO. 01</span>
        <span>DEC 2026 — JAN 2027</span>
      </div>
      <div className="cover-copy">
        <p className="eyebrow light">A family journey through Italy</p>
        <h1>낯선 도시에서,<br /><em>우리의 겨울.</em></h1>
        <div className="cover-footer-line">
          <p>로마에서 나폴리까지.<br />열한 번의 아침을 함께 걷는 여행.</p>
          <a className="editorial-link light-link" href="#chapters">여행 미리보기 <span aria-hidden="true">↘</span></a>
        </div>
      </div>
      <span className="cover-edge">ITALY / 2026–27</span>
    </section>

    <section className="intro section-wrap" id="chapters">
      <div className="intro-topline"><span>01 / THE STORY</span><span>2026.12.23 — 2027.01.02</span></div>
      <div className="intro-grid">
        <h2>여행은<br />떠나기 전부터<br /><i>시작된다.</i></h2>
        <div className="intro-copy">
          <p>지도에 동그라미를 치고, 사진 속 골목을 상상하고, 저마다 가장 가고 싶은 곳을 하나씩 골라보는 시간.</p>
          <p className="intro-note">이 수첩은 네 사람이 함께 기대하고, 현장에서는 쉽게 펼쳐볼 수 있는 작은 여행 잡지입니다.</p>
        </div>
      </div>
    </section>

    <section className="destinations section-wrap" aria-labelledby="chapters-title">
      <div className="section-heading"><span>PLACES WE WILL SEE</span><span>02 / THE PLACES</span></div>
      <h2 id="chapters-title" className="section-display">Three places, <em>one story.</em></h2>
      <div className="destination-layout">
        <a href="#/day/2027-01-02" className="destination destination-large" aria-label="로마 일정 보기">
          <Picture src="rome" alt="로마 콜로세움" />
          <span className="destination-copy"><small>01 — HISTORY</small><strong>Roma</strong><span>수천 년의 시간을 걷는 도시</span></span>
        </a>
        <a href="#/day/2026-12-25" className="destination destination-tall" aria-label="아말피 해안 일정 보기">
          <Picture src="positano" alt="절벽과 바다가 이어지는 포지타노" />
          <span className="destination-copy"><small>02 — THE COAST</small><strong>Amalfi</strong><span>절벽 끝에서 만나는 바다</span></span>
        </a>
        <a href="#/day/2026-12-27" className="destination destination-small" aria-label="폼페이 일정 보기">
          <Picture src="pompeii" alt="폼페이 유적" />
          <span className="destination-copy"><small>03 — ANCIENT WORLD</small><strong>Pompeii</strong><span>오래된 도시를 발견하는 하루</span></span>
        </a>
      </div>
    </section>

    <section className="feature-day">
      <div className="feature-image">
        <Picture src="coast" alt="아말피 해안의 길과 푸른 바다" />
        <span className="photo-index">FIELD NOTE / 03</span>
      </div>
      <div className="feature-copy">
        <span className="eyebrow">A DAY TO REMEMBER</span>
        <p className="serif-overline">December 25, 2026</p>
        <h2>길은 굽이치고,<br />바다는 <i>끝없이.</i></h2>
        <p>크리스마스의 아말피 해안. 포지타노의 전망에서 시작해 아말피의 작은 골목을 걷는 하루.</p>
        <button type="button" className="text-action" onClick={() => goDay('2026-12-25')}>
          이 날의 이야기 읽기 <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>

    <section className="days-section section-wrap" aria-labelledby="days-heading">
      <div className="section-heading"><span>THE ITINERARY</span><span>03 / THE DAYS</span></div>
      <div className="days-head">
        <h2 id="days-heading">열한 개의 <em>하루.</em></h2>
        <p>관광지보다 중요한 것은, 그곳에서 우리에게 남을 장면들.</p>
      </div>
      <div className="days-list">
        {data.days.map((day, index) => <button
          className="day-list-row" key={day.id} type="button" onClick={() => goDay(day.date)}>
          <span className="day-list-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="day-list-date">{shortDate(day.date)}</span>
          <span className="day-list-title">{day.title}</span>
          <span className="day-list-arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
      <p className="source-note">일정과 교통 시각은 원본 여행 수첩의 내용을 사용합니다. 날씨와 운영 조건에 따라 바뀔 수 있어요.</p>
      <a className="understated-link" href={siteHome + 'itinerary/'}>기존 전체 일정·예약 안내 보기 ↗</a>
    </section>
    <div className="opening-date sr-only">{opening.date} · {amalfi?.date}</div>
  </>;
}

const HIGHLIGHTS = [
  { number: '01', title: 'Positano', hangul: '포지타노', caption: '가장 먼저 마주할, 절벽 위의 마을.', image: 'positano',
    description: '겹겹이 쌓인 집들과 바다를 바라보며 잠깐 걸어보는 시간.', query: 'Positano Italy' },
  { number: '02', title: 'Amalfi', hangul: '아말피', caption: '느린 걸음으로 마을의 중심으로.', image: 'amalfi',
    description: '준비한 간편식으로 점심을 먹고, 중심부를 편안하게 산책해요.', query: 'Amalfi Italy' },
  { number: '03', title: 'Ravello', hangul: '라벨로', caption: '시간이 허락하면, 조금 더 높은 곳으로.', image: 'ravello',
    description: '날씨와 주차, 이동 시간이 충분할 때만 선택하는 코스.', query: 'Ravello Italy' },
];

function DayRail({ days, selected, goDay }: {
  days: TripDay[]; selected: TripDay; goDay: (date: string) => void
}) {
  return <nav className="date-rail" aria-label="여행 날짜 선택">
    {days.map(day => <button key={day.id} type="button"
      className={`date-button ${day.date === selected.date ? 'active' : ''}`}
      aria-current={day.date === selected.date ? 'date' : undefined}
      onClick={() => goDay(day.date)}>
      <span>{dateIndex(day, days)}</span><strong>{day.date.slice(5).replace('-', '.')}</strong>
    </button>)}
  </nav>;
}

function OriginalPlan({ day, data }: { day: TripDay; data: TripData }) {
  const linkedPlace = (step: TripStep) => step.places
    .map(pid => data.places.find(p => p.properties.sort === pid))
    .filter((p): p is Place => Boolean(p));
  return <section className="practical section-wrap" id="practical">
    <div className="section-heading"><span>KEEP THIS HANDY</span><span>THE PRACTICAL NOTES</span></div>
    <div className="practical-grid">
      <div className="practical-heading">
        <p className="eyebrow">For the day itself</p>
        <h2>여행 중에는<br /><em>간단하게.</em></h2>
        <p>여기부터는 실제 이동과 준비에 필요한 정보예요. 기존 수첩의 일정 및 확인사항을 그대로 사용합니다.</p>
        <a href={siteHome + `?date=${day.date}&view=map`} className="understated-link">기존 지도에서 이 날의 장소 보기 ↗</a>
      </div>
      <div className="practical-details">
        {day.statuses.length > 0 && <div className="status-line" aria-label="일정 상태">
          {day.statuses.map((status, index) => <span key={index}>{status.text}</span>)}
        </div>}
        <div className="plan-section">
          <h3><span>01</span> 이동 · 방문 순서</h3>
          <ol className="plan-steps">
            {day.steps.map((step, index) => <li key={index}>
              <div><span className="step-index">{String(index + 1).padStart(2, '0')}</span>
                <p>{step.text}</p>
                {step.priority !== 'main' && <small className="optional-mark">선택·대안 일정</small>}
              </div>
              {linkedPlace(step).length > 0 && <div className="step-places">
                {linkedPlace(step).map(place => <a key={place.properties.sort}
                  href={googleMaps(place.properties.googleQuery || place.properties.name)}
                  target="_blank" rel="noopener noreferrer">
                  {place.properties.name} ↗
                </a>)}
              </div>}
            </li>)}
          </ol>
        </div>
        <details className="plan-accordion">
          <summary>출발 전·당일 체크 사항 <span aria-hidden="true">+</span></summary>
          <ul>{day.reminders.map((reminder, index) => <li key={index}>{reminder}</li>)}</ul>
        </details>
        {day.details && <details className="plan-accordion">
          <summary>교통·운영 상세 확인 <span aria-hidden="true">+</span></summary>
          <div className="source-details" dangerouslySetInnerHTML={{ __html: day.details }} />
        </details>}
        <a href={siteHome + `itinerary/#day-${day.id}`} className="understated-link">원본 여행 수첩의 상세 내용 ↗</a>
      </div>
    </div>
  </section>;
}

function DayView({ day, data, goDay }: {
  day: TripDay; data: TripData; goDay: (date: string) => void
}) {
  const isAmalfi = day.id === '1225';
  const chosenPhoto = isAmalfi ? 'positano' :
    ({ rome: 'rome', naples: 'naples', pompeii: 'pompeii', amalfi: 'coast', civita: 'rome' } as Record<string,string>)[day.region] || 'rome';
  const heading = isAmalfi ? '바다를 따라,\n남쪽으로.' : day.title;
  return <main className="day-page">
    <div className="day-top section-wrap">
      <button type="button" className="back-home" onClick={() => { window.location.hash = '#/'; }}>← HOME / 여행 홈</button>
      <span>ITALIA / FAMILY FIELD NOTES</span>
    </div>
    <DayRail days={data.days} selected={day} goDay={goDay} />
    <section className="day-masthead section-wrap">
      <div className="day-masthead-top"><span>DAY {dateIndex(day, data.days)} / {String(data.days.length).padStart(2, '0')}</span>
      <span>{displayDate(day.date)} · {day.city}</span></div>
      <h1>{heading.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}</h1>
      <div className="day-deck"><p>{day.subtitle}</p><a href="#practical">실제 일정 보기 <span aria-hidden="true">↓</span></a></div>
    </section>
    <figure className="day-landscape">
      <Picture src={chosenPhoto} alt={isAmalfi ? '포지타노와 아말피 해안의 마을' : day.city + ' 여행 풍경'} eager />
      <figcaption><span>{isAmalfi ? 'POSITANO / CAMPANIA, ITALIA' : day.city.toUpperCase()}</span><span>PHOTO JOURNAL · {dateIndex(day, data.days)}</span></figcaption>
    </figure>

    {isAmalfi ? <>
      <section className="day-story section-wrap">
        <div className="story-label">THE STORY / 03</div>
        <div>
          <p className="story-quote">“눈앞에 나타나는 풍경마다<br />조금씩 속도를 늦추는 날.”</p>
          <p className="story-copy">크리스마스의 아말피 해안. 포지타노의 전망을 먼저 보고, 아말피에서 점심을 먹고 산책해요. 라벨로는 날씨와 이동 여유가 충분할 때만 들릅니다.</p>
          <p className="story-footnote">날씨에 따라 일정 취소 가능 · 아래 실제 준비사항 확인</p>
        </div>
      </section>
      <section className="highlight-section section-wrap">
        <div className="section-heading"><span>THE HIGHLIGHTS</span><span>03 PLACES / ONE DAY</span></div>
        <h2 className="section-display">Along the <em>coast.</em></h2>
        <div className="highlight-stack">
          {HIGHLIGHTS.map((item, i) => <article className={`highlight-row highlight-${i + 1}`} key={item.number}>
            <figure><Picture src={item.image} alt={item.hangul + ' 여행 풍경'} />
              <figcaption>{item.number} / {item.title.toUpperCase()}</figcaption></figure>
            <div className="highlight-copy">
              <span>{item.number} — {i === 2 ? 'IF THERE IS TIME' : 'THE ROUTE'}</span>
              <h3>{item.title}<small>{item.hangul}{i === 2 ? ' · 선택' : ''}</small></h3>
              <p className="highlight-caption">{item.caption}</p>
              <p>{item.description}</p>
              <a href={googleMaps(item.query)} target="_blank" rel="noopener noreferrer">지도에서 보기 ↗</a>
            </div>
          </article>)}
        </div>
      </section>
    </> : <section className="day-story section-wrap">
      <div className="story-label">THE DAY / {dateIndex(day, data.days)}</div>
      <div>
        <p className="story-quote">{day.title}</p>
        <p className="story-copy">{day.subtitle} 그날의 이동 순서와 준비사항은 아래에 원본 수첩의 내용을 그대로 연결했습니다.</p>
      </div>
    </section>}
    <OriginalPlan day={day} data={data} />
    <div className="next-day section-wrap">
      {data.days.indexOf(day) < data.days.length - 1 ? <button type="button" onClick={() => goDay(data.days[data.days.indexOf(day) + 1].date)}>
        <span>KEEP READING / NEXT DAY</span><strong>{data.days[data.days.indexOf(day) + 1].title}</strong><b aria-hidden="true">↗</b>
      </button> : <button type="button" onClick={() => { window.location.hash = '#/'; }}>
        <span>BACK TO THE BEGINNING</span><strong>여행의 첫 장으로</strong><b aria-hidden="true">↗</b>
      </button>}
    </div>
  </main>;
}

function Footer() {
  return <footer className="site-footer">
    <div className="footer-brand">ITALIA<span>.</span></div>
    <div className="footer-bottom"><p>FAMILY FIELD NOTES · WINTER 2026—27</p><p>이 여행지 사진은 풍경 참고용이며 실제 12월 날씨와 다를 수 있습니다.</p></div>
    <p className="photo-credit">Photos: CC0 sources via <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>.
      <a href="https://github.com/Jaeho211/italy-family-trip-2026/blob/main/web/PHOTO_CREDITS.md" target="_blank" rel="noopener noreferrer"> 사진별 출처 확인 ↗</a></p>
  </footer>;
}

export default function App() {
  const [data, setData] = useState<TripData | null>(null);
  const [route, setRoute] = useState<string | null>(routeKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => { setRoute(routeKey()); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${base}data/trip-data.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('여행 데이터를 불러오지 못했습니다.');
        return response.json() as Promise<TripData>;
      }).then(setData).catch(err => {
        if (err?.name !== 'AbortError') setError(String(err));
      });
    return () => controller.abort();
  }, []);
  const selected = useMemo(() => data?.days.find(day => day.date === route), [data, route]);
  const goDay = (date: string) => { window.location.hash = `#/day/${date}`; };
  return <div className="app-shell">
    {selected ? <Header dark={false} onHome={() => { window.location.hash = '#/'; }} />
      : <Header dark onHome={() => { window.location.hash = '#/'; }} />}
    {error && <main className="loading-screen"><h1>데이터를 불러오지 못했어요.</h1><p>{error}</p><a href={siteHome}>기존 여행 수첩 열기 ↗</a></main>}
    {!error && !data && <main className="loading-screen"><p>ITALIA · FIELD NOTES</p><h1>여행의 첫 장을 여는 중…</h1></main>}
    {data && (selected ? <DayView day={selected} data={data} goDay={goDay} /> : <main><Home data={data} goDay={goDay} /></main>)}
    {data && <Footer />}
  </div>;
}
