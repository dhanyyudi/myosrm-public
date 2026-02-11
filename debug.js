/**
 * Debug visualization module — Nodes, Edges, Speed
 * Uses MapLibre GL JS via map.js functions
 */

let debugStatus = {
  nodes: false,
  edges: false,
  speed: false,
};

/**
 * Initialize debug tools
 */
function initDebugTools() {
  document
    .getElementById("btn-show-nodes")
    .addEventListener("click", () => toggleDebugNodes());
  document
    .getElementById("btn-show-edges")
    .addEventListener("click", () => toggleDebugEdges());
  document
    .getElementById("btn-show-speed")
    .addEventListener("click", () => toggleDebugSpeed());
  document
    .getElementById("btn-clear-debug")
    .addEventListener("click", clearAllDebugVisualization);
}

/**
 * Toggle debug nodes
 */
async function toggleDebugNodes() {
  debugStatus.nodes = !debugStatus.nodes;
  toggleDebugButton("btn-show-nodes", debugStatus.nodes);

  if (!debugStatus.nodes) {
    clearDebugLayer("nodes");
    return;
  }

  showLoading();
  try {
    const startPoint = document.getElementById("start-point").value;
    const endPoint = document.getElementById("end-point").value;

    if (!startPoint && !endPoint) {
      const bounds = map.getBounds();
      const center = bounds.getCenter();
      await fetchAndDisplayNearestNodes(
        formatCoordinateString([center.lng, center.lat]),
        getApproximateRadiusInMeters(bounds)
      );
    } else {
      if (startPoint) await fetchAndDisplayNearestNodes(startPoint, 1000);
      if (endPoint) await fetchAndDisplayNearestNodes(endPoint, 1000);
    }
  } catch (error) {
    console.error("Error fetching nodes:", error);
    showError("Error fetching nodes. See console for details.");
  } finally {
    hideLoading();
  }
}

/**
 * Toggle debug edges
 */
async function toggleDebugEdges() {
  debugStatus.edges = !debugStatus.edges;
  toggleDebugButton("btn-show-edges", debugStatus.edges);

  if (!debugStatus.edges) {
    clearDebugLayer("edges");
    return;
  }

  showLoading();
  try {
    const routeData = getCurrentRouteData();

    if (routeData && routeData.routes && routeData.routes.length > 0) {
      await extractAndDisplayRouteEdges(routeData.routes[0]);
    } else {
      simulateDebugEdges();
    }
  } catch (error) {
    console.error("Error displaying edges:", error);
    showError("Error displaying edges. See console for details.");
  } finally {
    hideLoading();
  }
}

/**
 * Toggle debug speed visualization
 */
function toggleDebugSpeed() {
  debugStatus.speed = !debugStatus.speed;
  toggleDebugButton("btn-show-speed", debugStatus.speed);

  if (!debugStatus.speed) {
    clearDebugLayer("speed");
    return;
  }

  showLoading();
  try {
    const routeData = getCurrentRouteData();

    if (routeData && routeData.routes && routeData.routes.length > 0) {
      const route = routeData.routes[0];

      if (!route.legs || route.legs.length === 0) {
        showWarning("Cannot visualize speed: route has no leg data.");
        debugStatus.speed = false;
        toggleDebugButton("btn-show-speed", false);
        hideLoading();
        return;
      }

      clearDebugLayer("speed");
      addDebugSpeed(route);
    } else {
      showWarning("No route is displayed. Please search for a route first.");
      debugStatus.speed = false;
      toggleDebugButton("btn-show-speed", false);
    }
  } catch (error) {
    console.error("Error displaying speed:", error);
    showError("Error displaying speed visualization. See console for details.");
    debugStatus.speed = false;
    toggleDebugButton("btn-show-speed", false);
  } finally {
    hideLoading();
  }
}

/**
 * Toggle active class on debug button
 */
function toggleDebugButton(buttonId, isActive) {
  const button = document.getElementById(buttonId);
  if (isActive) {
    button.classList.add("active");
  } else {
    button.classList.remove("active");
  }
}

/**
 * Clear all debug visualizations
 */
function clearAllDebugVisualization() {
  Object.keys(debugStatus).forEach((key) => {
    debugStatus[key] = false;
    toggleDebugButton(`btn-show-${key}`, false);
  });
  clearAllDebugLayers();
  showToast("Debug visualizations cleared", "success");
}

/**
 * Fetch and display nearest nodes from OSRM API
 */
async function fetchAndDisplayNearestNodes(coordinateString, radius = 1000) {
  try {
    const response = await fetch(
      `${CONFIG.osrmBackendUrl}/nearest/v1/driving/${coordinateString}?number=50`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.waypoints) {
      throw new Error("Cannot find nearest nodes");
    }

    const nodes = data.waypoints.map((waypoint) => ({
      coordinates: waypoint.location,
      id: waypoint.name || "Unknown",
    }));

    addDebugNodes(nodes);
  } catch (error) {
    console.error("Error fetching nearest nodes:", error);
    simulateDebugNodes();
    showWarning("Could not fetch real nodes, showing simulated nodes instead");
  }
}

/**
 * Extract and display route edges
 */
async function extractAndDisplayRouteEdges(route) {
  if (!route || !route.legs) {
    simulateDebugEdges();
    showWarning("Route has no leg data, showing simulated edges instead");
    return;
  }

  const edges = [];
  route.legs.forEach((leg) => {
    if (!leg.steps) return;
    leg.steps.forEach((step) => {
      if (!step.geometry) return;
      edges.push({
        geometry: step.geometry,
        id: step.name || "Unknown",
        weight: step.duration,
      });
    });
  });

  addDebugEdges(edges);
}

/**
 * Simulate debug nodes in viewport
 */
function simulateDebugNodes() {
  const bounds = map.getBounds();
  const nodes = [];

  for (let i = 0; i < 50; i++) {
    const lat =
      bounds.getSouth() +
      Math.random() * (bounds.getNorth() - bounds.getSouth());
    const lng =
      bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());

    nodes.push({
      coordinates: [lng, lat],
      id: `Node-${i}`,
    });
  }

  addDebugNodes(nodes);
}

/**
 * Simulate debug edges in viewport
 */
function simulateDebugEdges() {
  const bounds = map.getBounds();
  const edges = [];

  for (let i = 0; i < 30; i++) {
    const startLat =
      bounds.getSouth() +
      Math.random() * (bounds.getNorth() - bounds.getSouth());
    const startLng =
      bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());

    const endLat = startLat + (Math.random() - 0.5) * 0.01;
    const endLng = startLng + (Math.random() - 0.5) * 0.01;

    edges.push({
      geometry: {
        type: "LineString",
        coordinates: [
          [startLng, startLat],
          [endLng, endLat],
        ],
      },
      id: `Edge-${i}`,
      weight: Math.floor(Math.random() * 100),
    });
  }

  addDebugEdges(edges);
}

/**
 * Approximate radius in meters from map bounds
 */
function getApproximateRadiusInMeters(bounds) {
  const center = bounds.getCenter();
  const ne = bounds.getNorthEast();

  const lat1 = (center.lat * Math.PI) / 180;
  const lon1 = (center.lng * Math.PI) / 180;
  const lat2 = (ne.lat * Math.PI) / 180;
  const lon2 = (ne.lng * Math.PI) / 180;

  const R = 6371000;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
