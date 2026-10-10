(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const nearbyInput = document.getElementById("nearby");
  const radiusInput = document.getElementById("radius");
  const nearbyContext = document.getElementById("nearby-context");
  const nearbyTitle = document.getElementById("nearby-title");
  const filtersPanel = document.getElementById("restaurant-filters");
  let anchor = null;
  let landmarks = [];
  const queryCoordinates = (params.get("near") || "").split(",").map(Number);
  const validQuery = params.has("near") && params.get("near").split(",").every((part) => part.trim() !== "") && queryCoordinates.length === 2 && queryCoordinates.every(Number.isFinite) && Math.abs(queryCoordinates[0]) <= 180 && Math.abs(queryCoordinates[1]) <= 90;
  const cityInput = document.getElementById("city");
  const categoryInput = document.getElementById("category");
  const searchInput = document.getElementById("search");
  const countElement = document.getElementById("result-count");
  const listElement = document.getElementById("restaurant-list");
  const listHelp = document.getElementById("list-help");
  const mapMessage = document.getElementById("map-message");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (["rome", "naples"].includes(params.get("city"))) cityInput.value = params.get("city");
  if (validQuery) anchor = {coordinates:queryCoordinates, name:params.get("label") || "선택한 장소", city:cityInput.value};
  filtersPanel.open = !anchor;
  let candidates = [];

  function distance(coordinates) {
    if (!anchor || !coordinates) return Infinity;
    const rad = (n) => n * Math.PI / 180;
    const [lon1, lat1] = anchor.coordinates, [lon2, lat2] = coordinates;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  }

  function renderAnchors() {
    nearbyInput.replaceChildren();
    const all = textElement("option", "시내 전체"); all.value = "all"; nearbyInput.append(all);
    if (anchor && anchor.city === cityInput.value) {
      const selected = textElement("option", `${anchor.name} 주변`); selected.value = "selected"; nearbyInput.append(selected);
    }
    landmarks.filter((place) => place.properties.region === cityInput.value).forEach((place) => {
      const option = textElement("option", `${place.properties.name} 주변`);
      option.value = String(place.properties.sort); nearbyInput.append(option);
    });
    nearbyInput.value = anchor && anchor.city === cityInput.value ? "selected" : "all";
  }
  let map = null;
  let mapReady = false;
  let anchorMarker = null;

  function textElement(tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }

  function mapLink(candidate) {
    const link = textElement("a", "Google Maps에서 열기 →");
    link.href = candidate.googleUrl;
    link.target = "_blank";
    link.rel = "noopener";
    return link;
  }

  function popupContent(candidate) {
    const box = document.createElement("div");
    box.append(textElement("h2", candidate.name));
    box.append(textElement("p", `${candidate.category} · 검토 중`));
    box.append(mapLink(candidate));
    return box;
  }

  function showPopup(candidate) {
    if (!mapReady || !candidate.coordinates) return;
    map.flyTo({ center: candidate.coordinates, zoom: Math.max(map.getZoom(), 15), essential: !reducedMotion });
    new maplibregl.Popup({ offset: 10, maxWidth: "17rem" })
      .setLngLat(candidate.coordinates)
      .setDOMContent(popupContent(candidate))
      .addTo(map);
  }

  function filteredCandidates() {
    const term = searchInput.value.trim().toLocaleLowerCase();
    return candidates.filter((candidate) =>
      candidate.city === cityInput.value &&
      (!anchor || radiusInput.value === "all" || distance(candidate.coordinates) <= Number(radiusInput.value)) &&
      (categoryInput.value === "all" || candidate.category === categoryInput.value) &&
      candidate.name.toLocaleLowerCase().includes(term)
    ).sort((a, b) => anchor ? distance(a.coordinates) - distance(b.coordinates) : 0);
  }

  function setMapMessage(message, state = "ready") {
    mapMessage.textContent = message;
    mapMessage.dataset.state = state;
  }

  function update() {
    const city = cityInput.value;
    const visible = filteredCandidates();
    const cityName = city === "rome" ? "로마" : "나폴리";
    nearbyContext.hidden = !anchor;
    document.querySelector('.restaurant-app').classList.toggle('is-nearby', Boolean(anchor));
    nearbyTitle.textContent = anchor ? `${anchor.name} 주변` : "";
    countElement.textContent = anchor ? `${radiusInput.value === "all" ? cityName + " 전체" : "직선거리 " + radiusInput.value + "km 이내"} 후보 ${visible.length}곳 · 가까운 순` : `${cityName} 후보 ${visible.length}곳 · 미검증 후보`;
    listHelp.textContent = anchor ? "직선거리 기준이며 실제 도보 거리·영업 여부는 Google Maps에서 확인하세요." : "핀을 누르거나 목록에서 Google Maps를 열 수 있습니다. 동명 지점은 방문 전에 확인하세요.";

    listElement.replaceChildren();
    if (!visible.length) listElement.append(textElement("p", anchor ? "이 범위와 검색 조건에 맞는 후보가 없어요. 표시 범위를 넓히거나 검색 조건을 바꿔보세요." : "조건에 맞는 후보가 없습니다."));
    visible.forEach((candidate) => {
      const card = document.createElement("article");
      card.className = "restaurant-card";
      card.append(textElement("h2", candidate.name));
      card.append(textElement("p", `${candidate.category} · 검토 중`));
      if (anchor && candidate.coordinates) {
        const km = distance(candidate.coordinates);
        card.append(textElement("p", `직선거리 ${km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`}`));
      }
      if (candidate.coordinates) {
        const button = textElement("button", "지도에서 보기");
        button.type = "button";
        button.addEventListener("click", () => showPopup(candidate));
        card.append(button);
      }
      card.append(mapLink(candidate));
      listElement.append(card);
    });

    if (mapReady) {
      const features = visible.filter((candidate) => candidate.coordinates).map((candidate) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: candidate.coordinates },
        properties: { index: candidates.indexOf(candidate) }
      }));
      map.getSource("restaurants").setData({ type: "FeatureCollection", features });
      anchorMarker?.remove();
      anchorMarker = null;
      if (anchor) {
        const marker = textElement("div", anchor.name);
        marker.className = "anchor-marker";
        anchorMarker = new maplibregl.Marker({element:marker, anchor:"bottom"}).setLngLat(anchor.coordinates).addTo(map);
      }
      map.resize();
      if (features.length) {
        const bounds = new maplibregl.LngLatBounds();
        features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
        if (anchor) bounds.extend(anchor.coordinates);
        map.fitBounds(bounds, { padding: {top:65, bottom:45, left:45, right:45}, maxZoom: anchor ? 16 : 14, duration: reducedMotion ? 0 : 500 });
      } else if (anchor) {
        map.easeTo({center:anchor.coordinates, zoom:15, duration:reducedMotion ? 0 : 500});
      }
      setMapMessage(features.length ? (anchor ? "초록 표시는 기준 장소, 갈색 핀은 주변 식당 후보예요." : "핀을 누르면 후보 이름을 볼 수 있습니다.") : "조건에 맞는 핀이 없습니다.");
    }
  }

  function supportsWebGL() {
    if (!window.WebGLRenderingContext) return false;
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch { return false; }
  }

  function initializeMap() {
    if (!window.maplibregl || !supportsWebGL()) {
      setMapMessage("지도를 사용할 수 없습니다. 오른쪽 목록과 Google Maps 링크를 이용하세요.", "error");
      return;
    }
    map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [12.48, 41.9],
      zoom: 11,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      localIdeographFontFamily: "system-ui, sans-serif"
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      trackUserLocation: false,
      showUserLocation: true
    });
    geolocateControl.on("geolocate", (event) => {
      anchor = {coordinates:[event.coords.longitude, event.coords.latitude], name:"현재 위치", city:cityInput.value};
      radiusInput.value = "1";
      renderAnchors(); update();
      setMapMessage("현재 위치에서 가까운 순으로 표시합니다. 위치는 이 화면에만 사용하고 저장하지 않습니다.");
    });
    geolocateControl.on("error", () => setMapMessage("현재 위치를 확인하지 못했습니다. 위치 권한과 기기 설정을 확인하세요.", "error"));
    map.addControl(geolocateControl, "top-right");
    const locationButton = map.getContainer().querySelector(".maplibregl-ctrl-geolocate");
    if (locationButton) {
      locationButton.title = "현재 위치 한 번 표시";
      locationButton.setAttribute("aria-label", "현재 위치 한 번 표시");
    }
    map.on("load", () => {
      map.addSource("restaurants", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 42,
        clusterMaxZoom: 14
      });
      map.addLayer({
        id: "clusters", type: "circle", source: "restaurants", filter: ["has", "point_count"],
        paint: { "circle-color": "#8f3f35", "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 25], "circle-stroke-color": "#fffdf8", "circle-stroke-width": 2 }
      });
      map.addLayer({
        id: "cluster-count", type: "symbol", source: "restaurants", filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#ffffff" }
      });
      map.addLayer({
        id: "unclustered", type: "circle", source: "restaurants", filter: ["!", ["has", "point_count"]],
        paint: { "circle-color": "#b56a3a", "circle-radius": 7, "circle-stroke-color": "#fffdf8", "circle-stroke-width": 2 }
      });
      map.on("click", "clusters", async (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const zoom = await map.getSource("restaurants").getClusterExpansionZoom(feature.properties.cluster_id);
        map.easeTo({ center: feature.geometry.coordinates, zoom });
      });
      map.on("click", "unclustered", (event) => {
        const feature = event.features?.[0];
        if (feature) showPopup(candidates[feature.properties.index]);
      });
      ["clusters", "unclustered"].forEach((layer) => {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      });
      mapReady = true;
      update();
    });
    map.on("error", () => {
      if (!mapReady) setMapMessage("배경지도를 불러오지 못했습니다. 목록은 계속 사용할 수 있습니다.", "error");
    });
  }

  cityInput.addEventListener("input", () => {anchor = null; renderAnchors(); update();});
  [categoryInput, searchInput].forEach((input) => input.addEventListener("input", update));
  radiusInput.addEventListener("change", update);
  nearbyInput.addEventListener("change", () => {
    if (nearbyInput.value === "all") anchor = null;
    else if (nearbyInput.value !== "selected") {
      const place = landmarks.find((place) => String(place.properties.sort) === nearbyInput.value);
      anchor = place ? {coordinates:place.geometry.coordinates, name:place.properties.name, city:cityInput.value} : null;
    }
    update();
  });
  renderAnchors();
  fetch("./places.geojson").then((response) => {if (!response.ok) throw new Error("places"); return response.json();}).then((collection) => {landmarks = collection.features; renderAnchors();}).catch(() => {});
  fetch("./restaurants.json", { cache: "no-cache" })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((data) => { candidates = data; update(); initializeMap(); })
    .catch(() => {
      countElement.textContent = "식당 목록을 불러오지 못했습니다.";
      setMapMessage("식당 데이터를 불러오지 못했습니다.", "error");
    });
})();
