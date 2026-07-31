(() => {
  "use strict";

  const GROUPS = {
    "rome": { color: "#8f3f35" },
    "day-trip": { color: "#69704c" },
    "naples": { color: "#225e78" },
    "amalfi": { color: "#b56a3a" }
  };
  const REGIONS = {
    "naples": { label: "나폴리·폼페이", groups: ["naples"] },
    "amalfi": { label: "아말피 해안", groups: ["amalfi"] },
    "rome-lazio": { label: "로마·근교", groups: ["rome", "day-trip"] }
  };

  const requestedRegion = new URLSearchParams(window.location.search).get("region");
  const region = REGIONS[requestedRegion] || REGIONS["rome-lazio"];
  const mapElement = document.getElementById("map");
  const messageElement = document.getElementById("map-message");
  const listElement = document.getElementById("place-list");
  const titleElement = document.getElementById("region-title");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let collection = { type: "FeatureCollection", features: [] };
  let map = null;
  let mapReady = false;

  titleElement.textContent = `${region.label} 관광지 지도`;
  document.title = `${region.label} | 이탈리아 가족여행 지도`;

  function setMessage(text, state = "ready") {
    messageElement.textContent = text;
    messageElement.dataset.state = state;
  }

  function supportsWebGL() {
    if (!window.WebGLRenderingContext) return false;
    const canvas = document.createElement("canvas");
    try {
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }

  function arrayValue(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  function visibleFeatures() {
    const selectedGroups = new Set(region.groups);
    return collection.features
      .filter((feature) => {
        const groups = arrayValue(feature.properties.groups);
        if (!groups.length) groups.push(feature.properties.group);
        return groups.some((group) => selectedGroups.has(group));
      })
      .sort((a, b) => a.properties.sort - b.properties.sort);
  }

  function googleMapsUrl(feature) {
    const query = feature.properties.googleQuery || `${feature.properties.name}, Italy`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function makeText(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function makeMapLink(feature, className) {
    const link = document.createElement("a");
    link.className = className;
    link.href = googleMapsUrl(feature);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Google Maps에서 열기 →";
    return link;
  }

  function renderList(features) {
    listElement.replaceChildren();
    if (!features.length) {
      listElement.append(makeText("p", "empty", "이 지역에 표시할 장소가 없습니다."));
      return;
    }

    features.forEach((feature) => {
      const properties = feature.properties;
      const card = document.createElement("article");
      card.className = "place-card";
      card.style.setProperty("--place-color", GROUPS[properties.group]?.color || "#8f3f35");
      card.append(makeText("h3", "", properties.name));
      card.append(makeText("p", "place-card__date", arrayValue(properties.dates).join(" · ")));
      card.append(makeText("p", "", properties.note));
      card.append(makeMapLink(feature, "place-link"));
      listElement.append(card);
    });
  }

  function popupContent(feature) {
    const properties = feature.properties;
    const content = document.createElement("div");
    content.append(makeText("h3", "popup-title", properties.name));
    content.append(makeText("p", "popup-meta", arrayValue(properties.dates).join(" · ")));
    content.append(makeText("p", "popup-note", properties.note));
    content.append(makeMapLink(feature, "popup-link"));
    return content;
  }

  function fitToFeatures(features) {
    if (!mapReady || !features.length) return;
    const bounds = new maplibregl.LngLatBounds();
    features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
    map.fitBounds(bounds, {
      padding: { top: 55, right: 45, bottom: 55, left: 45 },
      maxZoom: 14,
      duration: prefersReducedMotion ? 0 : 650
    });
  }

  function updateView() {
    const features = visibleFeatures();
    renderList(features);

    if (mapReady) {
      map.getSource("places").setData({ type: "FeatureCollection", features });
      fitToFeatures(features);
    }

    setMessage(
      features.length ? `${region.label} 관광지 ${features.length}곳을 표시합니다.` : "표시할 장소가 없습니다.",
      features.length ? "ready" : "empty"
    );
  }

  function initializeMap() {
    if (!window.maplibregl) {
      setMessage("지도 프로그램을 불러오지 못했습니다. 아래 장소 목록을 이용하세요.", "error");
      return;
    }
    if (!supportsWebGL()) {
      setMessage("이 브라우저에서는 WebGL 지도를 사용할 수 없습니다. 아래 장소 목록을 이용하세요.", "error");
      return;
    }

    map = new maplibregl.Map({
      container: mapElement,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [12.9, 41.3],
      zoom: 6.5,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      localIdeographFontFamily: "system-ui, sans-serif"
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.on("load", () => {
      map.addSource("places", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });

      map.addLayer({
        id: "places",
        type: "circle",
        source: "places",
        paint: {
          "circle-color": [
            "match",
            ["get", "group"],
            "rome", GROUPS.rome.color,
            "day-trip", GROUPS["day-trip"].color,
            "naples", GROUPS.naples.color,
            "amalfi", GROUPS.amalfi.color,
            "#8f3f35"
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 12, 10],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fffdf8",
          "circle-opacity": 0.94
        }
      });

      map.on("click", "places", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        new maplibregl.Popup({ offset: 12, maxWidth: "19rem" })
          .setLngLat(feature.geometry.coordinates)
          .setDOMContent(popupContent(feature))
          .addTo(map);
      });

      map.on("mouseenter", "places", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "places", () => { map.getCanvas().style.cursor = ""; });

      mapReady = true;
      updateView();
    });

    map.on("error", () => {
      if (!mapReady) {
        setMessage("배경지도를 불러오지 못했습니다. 아래 장소 목록은 계속 사용할 수 있습니다.", "error");
      }
    });
  }

  async function start() {
    try {
      const response = await fetch("./places.geojson", { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      collection = await response.json();
      renderList(visibleFeatures());
      initializeMap();
    } catch {
      setMessage("장소 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.", "error");
    }
  }

  start();
})();
