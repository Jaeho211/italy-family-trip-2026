import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map-page.css';

type Place = {
  properties: {
    sort: number;
    name: string;
    region: string;
    group: string;
    note?: string;
    dates?: string[];
    googleQuery?: string;
  };
  geometry: { type: 'Point'; coordinates: [number, number] };
};
type Day = {
  date: string;
  title: string;
  lodging?: number;
  places?: number[];
  steps: { places: number[] }[];
};
type TripData = { days: Day[]; places: Place[] };

const regions = [
  { id: 'all', name: '전체' },
  { id: 'rome', name: '로마' },
  { id: 'naples', name: '나폴리' },
  { id: 'amalfi', name: '아말피' },
  { id: 'pompeii', name: '폼페이' },
  { id: 'civita', name: '치비타·오르비에토' }
];

function mapsSearch(place: Place) {
  const query = place.properties.googleQuery || place.properties.name + ', Italy';
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

function makePopup(place: Place) {
  const content = document.createElement('div');
  content.className = 'travel-map-popup';
  const title = document.createElement('strong');
  title.textContent = place.properties.name;
  content.append(title);
  const note = document.createElement('p');
  note.textContent = place.properties.note || (place.properties.dates || []).join(' · ');
  content.append(note);
  const link = document.createElement('a');
  link.textContent = 'Google Maps에서 열기 ↗';
  link.href = mapsSearch(place);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  content.append(link);
  return content;
}

export default function MapPage({data, date, goDay}: {
  data: TripData;
  date: string;
  goDay: (date: string) => void;
}) {
  const [region, setRegion] = useState('all');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());

  const selectedDay = useMemo(() => data.days.find(day => day.date === date), [data, date]);
  const places = useMemo(() => {
    if (selectedDay) {
      // Include actual visits and both ends of an intercity transfer, not just
      // a single region. Lodging is part of a day's practical navigation.
      const ids = new Set<number>([
        ...(selectedDay.places || []),
        ...selectedDay.steps.flatMap(step => step.places),
        ...(selectedDay.lodging ? [selectedDay.lodging] : [])
      ]);
      return data.places.filter(place => ids.has(place.properties.sort))
        .sort((a, b) => a.properties.sort - b.properties.sort);
    }
    return data.places.filter(place => region === 'all' || place.properties.region === region)
      .sort((a, b) => a.properties.sort - b.properties.sort);
  }, [data, selectedDay, region]);

  useEffect(() => {
    if (!mapElement.current) return;
    let active = true;
    let map: maplibregl.Map | undefined;
    try {
      map = new maplibregl.Map({
        container: mapElement.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [13.3, 41.1],
        zoom: 6,
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        localIdeographFontFamily: 'system-ui, sans-serif'
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
      const locate = new maplibregl.GeolocateControl({
        trackUserLocation: false,
        showUserLocation: true,
        positionOptions: {enableHighAccuracy: true, maximumAge: 0, timeout: 10000}
      });
      map.addControl(locate, 'top-right');
      map.on('load', () => {
        if (!active) return;
        setReady(true);
        setError('');
      });
      map.on('error', () => {
        if (active && !map?.isStyleLoaded()) {
          setError('배경지도를 불러오지 못했습니다. 아래 장소 목록은 계속 사용할 수 있습니다.');
        }
      });
    } catch {
      setError('이 브라우저에서 지도를 열지 못했습니다. 아래 장소 목록을 이용하세요.');
    }
    return () => {
      active = false;
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const markers = markersRef.current;
    markers.forEach(marker => marker.remove());
    markers.clear();
    const bounds = new maplibregl.LngLatBounds();
    places.forEach((place, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'travel-map-pin';
      button.dataset.group = place.properties.group;
      button.textContent = selectedDay ? String(index + 1) : '•';
      button.title = place.properties.name;
      button.setAttribute('aria-label', place.properties.name);
      const marker = new maplibregl.Marker({element: button, anchor: 'center'})
        .setLngLat(place.geometry.coordinates)
        .setPopup(new maplibregl.Popup({offset: 15, maxWidth: '280px'})
          .setDOMContent(makePopup(place)))
        .addTo(map);
      markers.set(place.properties.sort, marker);
      bounds.extend(place.geometry.coordinates);
    });
    if (places.length) {
      map.fitBounds(bounds, {
        padding: {top: 65, right: 60, bottom: 65, left: 60},
        maxZoom: 14,
        duration: 0
      });
    }
    return () => {
      markers.forEach(marker => marker.remove());
      markers.clear();
    };
  }, [places, ready, selectedDay]);

  const focusPlace = (place: Place) => {
    const map = mapRef.current;
    const marker = markersRef.current.get(place.properties.sort);
    if (!map || !marker) return;
    map.flyTo({center: place.geometry.coordinates, zoom: Math.max(map.getZoom(), 13)});
    marker.getPopup()?.addTo(map);
    mapElement.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
  };

  return <main className="wrap travel-map-page">
    <a className="back-link" href={selectedDay ? '#/day/' + selectedDay.date : '#/'}>
      ← {selectedDay ? '해당 날짜 일정으로' : '전체 일정으로'}
    </a>
    <header className="travel-map-heading">
      <p className="overline">ITALIA · 여행 지도</p>
      <h1>방문 장소 지도</h1>
      <p>여행 일정에 포함된 장소와 숙소 위치입니다. 지도에서 위치를 확인하고 Google Maps로 연결할 수 있습니다.</p>
    </header>

    <section className="travel-map-filters" aria-label="지도 필터">
      <label htmlFor="travel-map-date">방문일</label>
      <select id="travel-map-date" value={selectedDay?.date || ''} onChange={event => {
        window.location.hash = event.target.value ? '#/map/' + event.target.value : '#/map';
      }}>
        <option value="">전체 날짜</option>
        {data.days.map((day, index) =>
          <option key={day.date} value={day.date}>
            {index + 1}일차 · {day.date.slice(5).replace('-', '/')} · {day.title}
          </option>
        )}
      </select>
      {selectedDay
        ? <div className="travel-map-day-selection">
          <span>{selectedDay.title}</span>
          <button type="button" onClick={() => goDay(selectedDay.date)}>상세 일정 보기 ↗</button>
        </div>
        : <div className="travel-map-region-tabs" aria-label="지역 선택">
          {regions.map(item => <button key={item.id} type="button"
            aria-pressed={region === item.id}
            className={region === item.id ? 'active' : ''}
            onClick={() => setRegion(item.id)}>{item.name}</button>)}
        </div>}
    </section>

    <div className="travel-map-canvas-shell">
      <div className="travel-map-canvas" ref={mapElement} aria-label="여행지 위치 지도" />
      {error && <p className="travel-map-error" role="status">{error}</p>}
    </div>

    <section className="travel-map-list" aria-labelledby="travel-map-list-title">
      <div className="travel-map-list-heading">
        <h2 id="travel-map-list-title">표시된 장소</h2>
        <span>{places.length}곳</span>
      </div>
      <p className="travel-map-hint">지도를 두 손가락으로 이동할 수 있습니다. 현재 위치는 지도 오른쪽 위 버튼을 눌렀을 때만 한 번 표시하며 자동 추적하지 않습니다.</p>
      {places.length ? <div className="travel-map-place-grid">
        {places.map((place, index) => <article className="travel-map-place" key={place.properties.sort}>
          <div className="travel-map-place-heading">
            <span className="travel-map-place-number">{index + 1}</span>
            <h3>{place.properties.name}</h3>
          </div>
          {!!place.properties.dates?.length && <p className="travel-map-place-date">{place.properties.dates.join(' · ')}</p>}
          {place.properties.note && <p>{place.properties.note}</p>}
          <div className="travel-map-place-actions">
            {ready && <button type="button" onClick={() => focusPlace(place)}>지도에서 보기</button>}
            <a href={mapsSearch(place)} target="_blank" rel="noopener noreferrer">Google Maps ↗</a>
          </div>
        </article>)}
      </div> : <p className="travel-map-empty">해당 날짜에 연결된 장소가 없습니다. 전체 날짜 또는 다른 지역을 선택해 주세요.</p>}
    </section>
  </main>;
}
