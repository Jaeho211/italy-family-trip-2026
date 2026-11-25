import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map-page.css';
import placePhotos from './place-photos.json';

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
export type Walk = {
  properties: {
    id: string; parent?: string; date: string; order: number; color: string; name: string;
    recommended?: boolean; optionalSegment?: boolean; summary?: string; stops?: string[];
    distanceKm: number; oneWayKm?: number; minutes?: string; kind?: string; option?: string;
    waypoints?: [number, number][]; returnSame?: boolean;
  };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
};
type TripData = { days: Day[]; places: Place[]; walks?: Walk[] };

function walkDirections(walk: Walk) {
  const coords = walk.geometry.coordinates;
  const latLng = ([lng, lat]: [number, number]) => lat + ',' + lng;
  const points = walk.properties.waypoints || [];
  const origin = coords[0];
  // Out-and-back routes open the outbound leg; loops return to the start.
  const destination = walk.properties.returnSame ? points[points.length - 1] ?? coords[coords.length - 1] : origin;
  const via = walk.properties.returnSame ? points.slice(0, -1) : points;
  const params = new URLSearchParams({ api: '1', origin: latLng(origin), destination: latLng(destination), travelmode: 'walking' });
  if (via.length) params.set('waypoints', via.map(latLng).join('|'));
  return 'https://www.google.com/maps/dir/?' + params.toString();
}
function initialWalk() {
  const match = window.location.hash.match(/\/walk\/([A-Za-z-]+)$/);
  return match ? match[1] : '';
}

const regions = [
  { id: 'all', name: '전체' },
  { id: 'rome', name: '로마' },
  { id: 'naples', name: '나폴리' },
  { id: 'amalfi', name: '아말피' },
  { id: 'pompeii', name: '폼페이' },
  { id: 'civita', name: '치비타·오르비에토' }
];

const photoIndex = placePhotos as Record<string, {file: string; alt: string; heading?: string}>;
/** Locally stored thumbnail of a visited sight (lodging never has one). */
function placePhoto(place: Place) {
  const photo = photoIndex[String(place.properties.sort)];
  return photo ? {src: import.meta.env.BASE_URL + 'photos/sm/' + photo.file + '.jpg', alt: photo.alt} : null;
}

function mapsSearch(place: Place) {
  const query = place.properties.googleQuery || place.properties.name + ', Italy';
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

function makePopup(place: Place) {
  const content = document.createElement('div');
  content.className = 'travel-map-popup';
  const photo = placePhoto(place);
  if (photo) {
    // The image URL is only assigned when the popup opens (see marker setup),
    // so opening the map does not download every thumbnail at once.
    const img = document.createElement('img');
    img.className = 'travel-map-popup-photo';
    img.alt = photo.alt;
    img.dataset.src = photo.src;
    img.decoding = 'async';
    content.append(img);
  }
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
  const dayWalks = useMemo(() => (data.walks || []).filter(walk => walk.properties.date === date)
    .sort((a, b) => a.properties.order - b.properties.order), [data, date]);
  const walkChoices = useMemo(() => dayWalks.filter(walk => !walk.properties.parent), [dayWalks]);
  const [activeWalk, setActiveWalk] = useState(initialWalk);
  const currentWalk = walkChoices.find(walk => walk.properties.id === activeWalk)
    ?? walkChoices.find(walk => walk.properties.recommended) ?? walkChoices[0];
  const chooseWalk = (id: string) => {
    setActiveWalk(id);
    if (date) history.replaceState(null, '', '#/map/' + date + '/walk/' + id);
  };
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
      const content = makePopup(place);
      const popup = new maplibregl.Popup({offset: 15, maxWidth: '280px'}).setDOMContent(content);
      popup.on('open', () => {
        const img = content.querySelector<HTMLImageElement>('img[data-src]');
        if (img && !img.src) img.src = img.dataset.src!;
      });
      const marker = new maplibregl.Marker({element: button, anchor: 'center'})
        .setLngLat(place.geometry.coordinates)
        .setPopup(popup)
        .addTo(map);
      markers.set(place.properties.sort, marker);
      bounds.extend(place.geometry.coordinates);
    });
    if (currentWalk) {
      currentWalk.geometry.coordinates.forEach(point => bounds.extend(point));
    }
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
  }, [places, ready, selectedDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Walking-route candidates: drawn as lines under the place pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const activeId = currentWalk?.properties.id;
    const collection = {
      type: 'FeatureCollection' as const,
      features: dayWalks.map(walk => ({
        type: 'Feature' as const,
        geometry: walk.geometry,
        properties: { ...walk.properties, active: walk.properties.id === activeId || walk.properties.parent === activeId },
      })),
    };
    const source = map.getSource('walks') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(collection as GeoJSON.FeatureCollection);
    } else {
      map.addSource('walks', { type: 'geojson', data: collection as GeoJSON.FeatureCollection });
      map.addLayer({ id: 'walks-casing', type: 'line', source: 'walks',
        filter: ['==', ['get', 'active'], true],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': .9 } });
      map.addLayer({ id: 'walks-line', type: 'line', source: 'walks',
        filter: ['!=', ['get', 'optionalSegment'], true],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'active'], 5, 3],
          'line-opacity': ['case', ['get', 'active'], 1, .3],
        } });
      map.addLayer({ id: 'walks-optional', type: 'line', source: 'walks',
        filter: ['==', ['get', 'optionalSegment'], true],
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'active'], 4, 2],
          'line-opacity': ['case', ['get', 'active'], .95, .3],
          'line-dasharray': [1.2, 1.2],
        } });
      map.on('click', 'walks-line', event => {
        const props = event.features?.[0]?.properties as {id?: string; parent?: string} | undefined;
        const id = props?.parent || props?.id;
        if (id) chooseWalkRef.current(id);
      });
      map.on('mouseenter', 'walks-line', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'walks-line', () => { map.getCanvas().style.cursor = ''; });
    }
    if (currentWalk) {
      // Frame the chosen course together with its optional spur (e.g. the gallery).
      const bounds = new maplibregl.LngLatBounds();
      dayWalks.filter(walk => walk.properties.id === activeId || walk.properties.parent === activeId)
        .forEach(walk => walk.geometry.coordinates.forEach(point => bounds.extend(point)));
      map.fitBounds(bounds, { padding: {top: 50, right: 56, bottom: 50, left: 50}, maxZoom: 15.5, duration: 400 });
    }
  }, [dayWalks, currentWalk, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseWalkRef = useRef(chooseWalk);
  chooseWalkRef.current = chooseWalk;

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

    {walkChoices.length > 0 && currentWalk && <section className="walk-panel" aria-labelledby="walk-panel-title">
      <div className="walk-panel-head">
        <h2 id="walk-panel-title">산책 코스 후보</h2>
        <p>지도에서 선을 누르거나 아래에서 골라 보세요. 거리·시간은 표시용 추정이에요.</p>
      </div>
      <div className="walk-tabs" role="tablist" aria-label="산책 코스 선택">
        {walkChoices.map(walk => <button key={walk.properties.id} type="button" role="tab"
          aria-selected={walk.properties.id === currentWalk.properties.id}
          style={{'--walk': walk.properties.color} as React.CSSProperties}
          onClick={() => chooseWalk(walk.properties.id)}>
          <span className="walk-swatch" aria-hidden="true" />
          <span className="walk-tab-name">{walk.properties.name}</span>
          <span className="walk-tab-meta">{walk.properties.distanceKm}km · {walk.properties.minutes}분</span>
          {walk.properties.recommended && <span className="walk-tab-badge">추천</span>}
        </button>)}
      </div>
      <article className="walk-detail" style={{'--walk': currentWalk.properties.color} as React.CSSProperties} role="tabpanel">
        <p className="walk-detail-summary">{currentWalk.properties.summary}</p>
        {currentWalk.properties.stops && <ol className="walk-stops">
          {currentWalk.properties.stops.map((stop, i) => <li key={i}>{stop}</li>)}
        </ol>}
        <ul className="walk-facts">
          <li><strong>{currentWalk.properties.distanceKm}km</strong>{currentWalk.properties.kind}{currentWalk.properties.oneWayKm ? ' · 편도 ' + currentWalk.properties.oneWayKm + 'km' : ''}</li>
          <li><strong>{currentWalk.properties.minutes}분</strong>아이 걸음 기준</li>
          {currentWalk.properties.option && <li className="walk-option">{currentWalk.properties.option} (점선)</li>}
        </ul>
        <a className="walk-directions" href={walkDirections(currentWalk)} target="_blank" rel="noopener noreferrer">
          Google Maps 도보 길찾기{currentWalk.properties.returnSame ? ' (가는 길)' : ''} ↗
        </a>
      </article>
    </section>}

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
        {places.map((place, index) => {
          const photo = placePhoto(place);
          return <article className={'travel-map-place' + (photo ? ' has-photo' : '')} key={place.properties.sort}>
          {photo && <img className="travel-map-place-photo" src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />}
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
        </article>;
        })}
      </div> : <p className="travel-map-empty">해당 날짜에 연결된 장소가 없습니다. 전체 날짜 또는 다른 지역을 선택해 주세요.</p>}
    </section>
  </main>;
}
