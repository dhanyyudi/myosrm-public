/**
 * Map module — MapLibre GL JS
 */

let map;

// Marker references
let markerStart = null;
let markerEnd = null;
const viaMarkers = {};

// Route line source IDs
let routeSourceIds = [];

// Debug markers (HTML markers for speed labels)
let debugMarkers = { nodes: [], edges: [], speed: [] };

// Route label markers
let routeLabelMarkers = [];

// Counter for unique source/layer IDs
let sourceIdCounter = 0;
function nextId(prefix) {
  return `${prefix}-${++sourceIdCounter}`;
}

/**
 * Initialize MapLibre map
 * 
 * Basemap options (all free, no API key needed):
 * 1. CartoDB Positron (light gray) - https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
 * 2. CartoDB Voyager (bright) - https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
 * 3. OSM Standard - https://tile.openstreetmap.org/{z}/{x}/{y}.png
 */
function initMap() {
  // CartoDB Voyager - bright, colorful style similar to OSM but cleaner
  const baseMapUrl = "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  map = new maplibregl.Map({
    container: "map",
    style: {
      version: 8,
      sources: {
        carto: {
          type: "raster",
          tiles: [baseMapUrl],
          tileSize: 256,
          attribution: attribution,
        },
      },
      layers: [{ id: "carto", type: "raster", source: "carto" }],
    },
    center: [CONFIG.map.center[1], CONFIG.map.center[0]], // MapLibre uses [lng, lat]
    zoom: CONFIG.map.zoom,
    maxZoom: CONFIG.map.maxZoom,
    minZoom: CONFIG.map.minZoom,
    attributionControl: true,
  });

  // Disable default zoom/rotate controls
  map.getCanvas().style.cursor = "crosshair";

  map.on("mousemove", updateCoordinatesDisplay);
  map.on("click", handleMapClick);

  // Prevent default context menu on map canvas so marker right-click works
  map.getCanvas().addEventListener("contextmenu", (e) => e.preventDefault());

  // Zoom controls
  document
    .getElementById("btn-zoom-in")
    .addEventListener("click", () => map.zoomIn());
  document
    .getElementById("btn-zoom-out")
    .addEventListener("click", () => map.zoomOut());

  // Sidebar toggle
  document
    .getElementById("btn-sidebar-toggle")
    .addEventListener("click", toggleSidebar);
}

/**
 * Toggle sidebar
 */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
  setTimeout(() => map.resize(), 300);
}

/**
 * Update coordinates display
 */
function updateCoordinatesDisplay(e) {
  const { lng, lat } = e.lngLat;
  document.getElementById("coordinates-display").textContent =
    `Lat: ${formatCoordinate(lat)}, Lng: ${formatCoordinate(lng)}`;
}

/**
 * Handle map click — set start or end point
 */
function handleMapClick(e) {
  const { lng, lat } = e.lngLat;
  const coordString = formatCoordinateString([lng, lat]);

  const startInput = document.getElementById("start-point");
  const endInput = document.getElementById("end-point");

  if (document.activeElement === startInput || startInput.value === "") {
    startInput.value = coordString;
    addStartMarker({ lat, lng });
  } else if (document.activeElement === endInput || endInput.value === "") {
    endInput.value = coordString;
    addEndMarker({ lat, lng });
  } else {
    startInput.value = coordString;
    addStartMarker({ lat, lng });
  }
}

/**
 * Create a draggable HTML marker element
 */
function createMarkerElement(cssClass, label) {
  const el = document.createElement("div");
  el.className = `map-marker ${cssClass}`;
  el.textContent = label;
  return el;
}

/**
 * Add start marker (draggable, right-click to delete)
 */
function addStartMarker(latlng) {
  if (markerStart) markerStart.remove();

  const el = createMarkerElement("start", "A");
  markerStart = new maplibregl.Marker({ element: el, draggable: true })
    .setLngLat([latlng.lng, latlng.lat])
    .addTo(map);

  markerStart.on("dragend", () => {
    const pos = markerStart.getLngLat();
    document.getElementById("start-point").value = formatCoordinateString([
      pos.lng,
      pos.lat,
    ]);
    updateWaypointsList();
    if (
      document.getElementById("auto-update-route") &&
      document.getElementById("auto-update-route").checked
    ) {
      findRouteWithMultipleWaypoints();
    }
  });

  el.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    e.stopPropagation();
    deleteWaypointByType("start");
  });
}

/**
 * Add end marker (draggable, right-click to delete)
 */
function addEndMarker(latlng) {
  if (markerEnd) markerEnd.remove();

  const el = createMarkerElement("end", "B");
  markerEnd = new maplibregl.Marker({ element: el, draggable: true })
    .setLngLat([latlng.lng, latlng.lat])
    .addTo(map);

  markerEnd.on("dragend", () => {
    const pos = markerEnd.getLngLat();
    document.getElementById("end-point").value = formatCoordinateString([
      pos.lng,
      pos.lat,
    ]);
    updateWaypointsList();
    if (
      document.getElementById("auto-update-route") &&
      document.getElementById("auto-update-route").checked
    ) {
      findRouteWithMultipleWaypoints();
    }
  });

  el.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    e.stopPropagation();
    deleteWaypointByType("end");
  });
}

/**
 * Add a via marker (draggable)
 */
function addViaMarker(latlng, inputId) {
  const index = inputId.split("-").pop();
  const markerId = `via-marker-${index}`;

  // Remove existing
  if (viaMarkers[markerId]) {
    viaMarkers[markerId].remove();
    delete viaMarkers[markerId];
  }

  // Letter label: C, D, E, ...
  const letterIndex = parseInt(index, 10);
  const label = String.fromCharCode(67 + letterIndex - 1); // C=67

  const el = createMarkerElement("via", label);
  const marker = new maplibregl.Marker({ element: el, draggable: true })
    .setLngLat([latlng.lng, latlng.lat])
    .addTo(map);

  marker.on("dragend", () => {
    const pos = marker.getLngLat();
    document.getElementById(inputId).value = formatCoordinateString([
      pos.lng,
      pos.lat,
    ]);
    updateWaypointsList();
    if (
      document.getElementById("auto-update-route") &&
      document.getElementById("auto-update-route").checked
    ) {
      findRouteWithMultipleWaypoints();
    }
  });

  el.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    e.stopPropagation();
    deleteWaypointByType("via", inputId);
  });

  viaMarkers[markerId] = marker;
}

/**
 * Display route on map
 */
function displayRoute(routeData, profile = "driving") {
  clearRoute();

  if (!routeData || !routeData.routes || routeData.routes.length === 0) {
    console.log("No valid route data to display");
    return;
  }

  const route = routeData.routes[0];
  const baseColor =
    CONFIG.routing.colors[profile] || CONFIG.routing.colors.driving;
  const segmentCount = Math.max(waypointsList.length - 1, 1);
  const colors = generateColorPalette(baseColor, segmentCount);

  // Multi-segment via waypoints
  if (
    route.geometry &&
    route.geometry.type === "LineString" &&
    route.geometry.coordinates &&
    route.geometry.coordinates.length > 0 &&
    waypointsList.length > 2
  ) {
    const routeCoordinates = route.geometry.coordinates;
    const waypointCoordinates = waypointsList
      .map((wp) => {
        const coords = parseCoordinateString(wp);
        return coords ? [coords[0], coords[1]] : null;
      })
      .filter(Boolean);

    if (waypointCoordinates.length > 1) {
      const waypointIndices = findWaypointIndicesInRoute(
        routeCoordinates,
        waypointCoordinates
      );

      if (waypointIndices.length >= 2) {
        for (let i = 0; i < waypointIndices.length - 1; i++) {
          const startIdx = waypointIndices[i];
          const endIdx = waypointIndices[i + 1];
          if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) continue;

          const segCoords = routeCoordinates.slice(startIdx, endIdx + 1);
          if (segCoords.length > 1) {
            addRouteSegment(
              { type: "LineString", coordinates: segCoords },
              colors[i % colors.length]
            );
          }
        }
        addRouteLegend(colors, waypointsList);
      } else {
        addRouteSegment(route.geometry, baseColor);
      }
    } else {
      addRouteSegment(route.geometry, baseColor);
    }
  }
  // Multiple legs
  else if (route.legs && route.legs.length > 1) {
    route.legs.forEach((leg, idx) => {
      if (leg.geometry) {
        addRouteSegment(leg.geometry, colors[idx % colors.length]);
      }
    });
    addRouteLegend(colors, waypointsList);
  }
  // Single route
  else if (route.geometry) {
    addRouteSegment(route.geometry, baseColor);
  }

  // Fit map to route bounds
  fitToRoute(route);
}

/**
 * Add a single route segment (GeoJSON line) to the map
 */
function addRouteSegment(geometry, color) {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length < 2)
    return;

  const srcId = nextId("route-src");
  const layerId = nextId("route-layer");

  map.addSource(srcId, {
    type: "geojson",
    data: { type: "Feature", geometry: geometry },
  });

  map.addLayer({
    id: layerId,
    type: "line",
    source: srcId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": color,
      "line-width": CONFIG.routing.lineWeight,
      "line-opacity": CONFIG.routing.lineOpacity,
    },
  });

  routeSourceIds.push({ srcId, layerId });
}

/**
 * Fit map to route bounds
 */
function fitToRoute(route) {
  if (!route.geometry || !route.geometry.coordinates) return;

  const coords = route.geometry.coordinates;
  if (coords.length === 0) return;

  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  );

  map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
}

/**
 * Find closest route indices for each waypoint
 */
function findWaypointIndicesInRoute(routeCoordinates, waypointCoordinates) {
  const indices = [0];

  for (let i = 1; i < waypointCoordinates.length - 1; i++) {
    const wp = waypointCoordinates[i];
    let minDist = Infinity;
    let closestIdx = -1;

    for (let j = 0; j < routeCoordinates.length; j++) {
      const rp = routeCoordinates[j];
      const d = Math.hypot(rp[0] - wp[0], rp[1] - wp[1]);
      if (d < minDist) {
        minDist = d;
        closestIdx = j;
      }
    }
    if (minDist < 0.01) indices.push(closestIdx);
  }

  indices.push(routeCoordinates.length - 1);
  return indices;
}

/**
 * Generate color palette
 */
function generateColorPalette(baseColor, count) {
  if (count <= 1) return [baseColor];

  const predefined = [
    "#3498db",
    "#e74c3c",
    "#2ecc71",
    "#9b59b6",
    "#f39c12",
    "#1abc9c",
    "#d35400",
    "#34495e",
    "#16a085",
    "#c0392b",
  ];

  if (count <= predefined.length) return predefined.slice(0, count);

  return Array.from(
    { length: count },
    (_, i) => `hsl(${(i * 360) / count}, 70%, 50%)`
  );
}

/**
 * Get waypoint labels matching sidebar order: A, C, D, E, ..., B
 */
function getWaypointLabels(count) {
  if (count <= 0) return [];
  if (count === 1) return ["A"];
  if (count === 2) return ["A", "B"];
  // A (start), then via labels C, D, E..., then B (end)
  const labels = ["A"];
  for (let i = 1; i < count - 1; i++) {
    labels.push(String.fromCharCode(66 + i)); // C=67, D=68, ...
  }
  labels.push("B");
  return labels;
}

/**
 * Add route legend
 */
function addRouteLegend(colors, waypoints) {
  clearRouteLegend();

  const legend = document.createElement("div");
  legend.id = "route-color-legend";
  legend.className = "map-card";
  legend.style.cssText =
    "bottom:50px;right:12px;position:absolute;z-index:5;font-size:0.75rem;";

  const labels = getWaypointLabels(waypoints.length);
  let html = '<div style="font-weight:600;margin-bottom:4px;">Segments</div>';
  for (let i = 0; i < colors.length && i < waypoints.length - 1; i++) {
    html += `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;">
      <span style="width:12px;height:3px;background:${colors[i]};border-radius:2px;display:inline-block;"></span>
      <span>${labels[i]} → ${labels[i + 1]}</span>
    </div>`;
  }
  legend.innerHTML = html;
  document.getElementById("map-container").appendChild(legend);
}

function clearRouteLegend() {
  const el = document.getElementById("route-color-legend");
  if (el) el.remove();
}

/**
 * Add route labels on map (None / Order / Duration / Speed / Node ID)
 */
function addRouteLabels(route, labelType) {
  clearRouteLabels();
  if (!route || labelType === "none") return;

  const route0 = route.routes ? route.routes[0] : route;

  if (labelType === "order") {
    waypointsList.forEach((wp, idx) => {
      const coords = parseCoordinateString(wp);
      if (!coords) return;
      const el = document.createElement("div");
      el.className = "route-label";
      el.textContent = idx;
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([coords[0], coords[1]])
        .addTo(map);
      routeLabelMarkers.push(marker);
    });
    return;
  }

  if (!route0.legs) return;

  route0.legs.forEach((leg) => {
    if (!leg.steps) return;

    leg.steps.forEach((step) => {
      if (!step.geometry || !step.geometry.coordinates) return;
      const coords = step.geometry.coordinates;
      const mid = coords[Math.floor(coords.length / 2)];
      if (!mid) return;

      let text = "";
      if (labelType === "duration" && step.duration != null) {
        text = formatDuration(step.duration);
      } else if (labelType === "speed" && step.distance && step.duration) {
        text = Math.round((step.distance / step.duration) * 3.6) + " km/h";
      } else if (labelType === "wayid") {
        // Extract from annotation nodes if available
        if (
          leg.annotation &&
          leg.annotation.nodes &&
          leg.annotation.nodes.length > 0
        ) {
          text = "way:" + leg.annotation.nodes[0];
        }
      }

      if (!text) return;

      const el = document.createElement("div");
      el.className = "route-label";
      el.textContent = text;
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(mid)
        .addTo(map);
      routeLabelMarkers.push(marker);
    });
  });
}

function clearRouteLabels() {
  routeLabelMarkers.forEach((m) => m.remove());
  routeLabelMarkers = [];
}

/**
 * Clear all routes
 */
function clearRoute() {
  routeSourceIds.forEach(({ srcId, layerId }) => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(srcId)) map.removeSource(srcId);
  });
  routeSourceIds = [];
  clearRouteLegend();
  clearRouteLabels();
}

/**
 * Clear all waypoint markers
 */
function clearWaypoints() {
  if (markerStart) {
    markerStart.remove();
    markerStart = null;
  }
  if (markerEnd) {
    markerEnd.remove();
    markerEnd = null;
  }
  Object.values(viaMarkers).forEach((m) => m.remove());
  for (const k in viaMarkers) delete viaMarkers[k];
}

/**
 * Clear all debug layers
 */
function clearAllDebugLayers() {
  Object.keys(debugMarkers).forEach((key) => clearDebugLayer(key));
}

/**
 * Clear a specific debug layer
 */
function clearDebugLayer(layerName) {
  if (!debugMarkers[layerName]) return;

  debugMarkers[layerName].forEach((item) => {
    if (item.remove) {
      item.remove(); // MapLibre Marker
    } else if (item.srcId) {
      // Source/Layer pair
      if (map.getLayer(item.layerId)) map.removeLayer(item.layerId);
      if (map.getSource(item.srcId)) map.removeSource(item.srcId);
    }
  });
  debugMarkers[layerName] = [];
}

/**
 * Add debug nodes as a circle layer
 */
function addDebugNodes(nodes) {
  clearDebugLayer("nodes");
  if (!nodes || !Array.isArray(nodes)) return;

  const limit = Math.min(nodes.length, CONFIG.debug.maxNodes);
  const features = [];

  for (let i = 0; i < limit; i++) {
    const node = nodes[i];
    if (!node || !node.coordinates) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: node.coordinates },
      properties: { id: node.id || "" },
    });
  }

  if (features.length === 0) return;

  const srcId = nextId("debug-nodes-src");
  const layerId = nextId("debug-nodes-layer");

  map.addSource(srcId, {
    type: "geojson",
    data: { type: "FeatureCollection", features },
  });

  map.addLayer({
    id: layerId,
    type: "circle",
    source: srcId,
    paint: {
      "circle-radius": CONFIG.debug.nodes.radius,
      "circle-color": CONFIG.debug.nodes.color,
      "circle-opacity": CONFIG.debug.nodes.fillOpacity,
    },
  });

  debugMarkers.nodes.push({ srcId, layerId });
}

/**
 * Add debug edges as a line layer
 */
function addDebugEdges(edges) {
  clearDebugLayer("edges");
  if (!edges || !Array.isArray(edges)) return;

  const limit = Math.min(edges.length, CONFIG.debug.maxEdges);
  const features = [];

  for (let i = 0; i < limit; i++) {
    const edge = edges[i];
    if (!edge || !edge.geometry) continue;
    features.push({
      type: "Feature",
      geometry: edge.geometry,
      properties: { id: edge.id || "", weight: edge.weight || "" },
    });
  }

  if (features.length === 0) return;

  const srcId = nextId("debug-edges-src");
  const layerId = nextId("debug-edges-layer");

  map.addSource(srcId, {
    type: "geojson",
    data: { type: "FeatureCollection", features },
  });

  map.addLayer({
    id: layerId,
    type: "line",
    source: srcId,
    paint: {
      "line-color": CONFIG.debug.edges.color,
      "line-width": CONFIG.debug.edges.weight,
      "line-opacity": CONFIG.debug.edges.opacity,
    },
  });

  debugMarkers.edges.push({ srcId, layerId });
}

/**
 * Add debug speed labels as HTML markers
 */
function addDebugSpeed(route) {
  clearDebugLayer("speed");

  if (!route || !route.legs) {
    console.log("No route data for speed visualization");
    return;
  }

  let displayed = false;

  // Method 1: Speed annotations
  route.legs.forEach((leg) => {
    if (
      !leg.annotation ||
      !leg.annotation.speed ||
      leg.annotation.speed.length === 0 ||
      !leg.geometry ||
      !leg.geometry.coordinates
    )
      return;

    const coords = leg.geometry.coordinates;
    for (
      let i = 0;
      i < Math.min(coords.length - 1, leg.annotation.speed.length);
      i++
    ) {
      if (i % 3 !== 0) continue;
      const speed = leg.annotation.speed[i];
      if (speed == null || !coords[i] || !coords[i + 1]) continue;

      const mid = [
        (coords[i][0] + coords[i + 1][0]) / 2,
        (coords[i][1] + coords[i + 1][1]) / 2,
      ];

      const el = document.createElement("div");
      el.className = "speed-label";
      el.textContent = Math.round(speed) + " km/h";

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(mid)
        .addTo(map);
      debugMarkers.speed.push(marker);
      displayed = true;
    }
  });

  // Method 2: Calculated from steps
  if (!displayed) {
    route.legs.forEach((leg) => {
      if (!leg.steps) return;
      leg.steps.forEach((step) => {
        if (!step.geometry || !step.duration || !step.distance) return;
        const avgSpeed = (step.distance / step.duration) * 3.6;
        const coords = step.geometry.coordinates;
        const mid = coords[Math.floor(coords.length / 2)];
        if (!mid) return;

        const el = document.createElement("div");
        el.className = "speed-label";
        el.textContent = Math.round(avgSpeed) + " km/h";

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(mid)
          .addTo(map);
        debugMarkers.speed.push(marker);
        displayed = true;
      });
    });
  }

  if (!displayed) {
    console.warn("No speed data available for visualization");
  }
}
