(() => {
  "use strict";

  const cityInput = document.getElementById("city");
  const categoryInput = document.getElementById("category");
  const searchInput = document.getElementById("search");
  const countElement = document.getElementById("result-count");
  const listElement = document.getElementById("restaurant-list");
  const listHelp = document.getElementById("list-help");
  const mapMessage = document.getElementById("map-message");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let candidates = [];
  let map = null;
  let mapReady = false;

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
      (categoryInput.value === "all" || candidate.category === categoryInput.value) &&
      candidate.name.toLocaleLowerCase().includes(term)
    );
  }

  function setMapMessage(message, state = "ready") {
    mapMessage.textContent = message;
    mapMessage.dataset.state = state;
  }

  function update() {
    const city = cityInput.value;
    const visible = filteredCandidates();
    const cityName = city === "rome" ? "로마" : "나폴리";
    countElement.textContent = `${cityName} 후보 ${visible.length}곳 · 지도 핀은 표시용 위치`;
    listHelp.textContent = "핀을 누르거나 목록에서 Google Maps를 열 수 있습니다. 동명 지점은 방문 전에 확인하세요.";

    listElement.replaceChildren();
    if (!visible.length) listElement.append(textElement("p", "조건에 맞는 후보가 없습니다."));
    visible.forEach((candidate) => {
      const card = document.createElement("article");
      card.className = "restaurant-card";
      card.append(textElement("h2", candidate.name));
      card.append(textElement("p", `${candidate.category} · 검토 중`));
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
      map.resize();
      if (features.length) {
        const bounds = new maplibregl.LngLatBounds();
        features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
        map.fitBounds(bounds, { padding: 45, maxZoom: 14, duration: reducedMotion ? 0 : 500 });
      }
      setMapMessage(features.length ? "핀을 누르면 후보 이름을 볼 수 있습니다." : "조건에 맞는 핀이 없습니다.");
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

  [cityInput, categoryInput, searchInput].forEach((input) => input.addEventListener("input", update));
  fetch("./restaurants.json", { cache: "no-cache" })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((data) => { candidates = data; update(); initializeMap(); })
    .catch(() => {
      countElement.textContent = "식당 목록을 불러오지 못했습니다.";
      setMapMessage("식당 데이터를 불러오지 못했습니다.", "error");
    });
})();
