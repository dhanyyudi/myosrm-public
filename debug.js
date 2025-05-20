/**
 * Modul untuk visualisasi debug dan analisis data OSRM
 */

// Status visualisasi debug
let debugStatus = {
  nodes: false,
  edges: false,
  cells: false,
  turns: false,
  speed: false,
  names: false,
};

/**
 * Inisialisasi fungsi debugging
 */
function initDebugTools() {
  // Setup event listener untuk button debug nodes
  document
    .getElementById("btn-show-nodes")
    .addEventListener("click", () => toggleDebugNodes());

  // Setup event listener untuk button debug edges
  document
    .getElementById("btn-show-edges")
    .addEventListener("click", () => toggleDebugEdges());

  // Setup event listener untuk button debug cells
  document
    .getElementById("btn-show-cells")
    .addEventListener("click", () => toggleDebugCells());

  // Setup event listener untuk button debug turns
  document
    .getElementById("btn-show-turns")
    .addEventListener("click", () => toggleDebugTurns());

  // Setup event listener untuk button debug speed
  document
    .getElementById("btn-show-speed")
    .addEventListener("click", () => toggleDebugSpeed());

  // Setup event listener untuk button debug names
  document
    .getElementById("btn-show-names")
    .addEventListener("click", () => toggleDebugNames());

  // Setup event listener untuk button clear debug
  document
    .getElementById("btn-clear-debug")
    .addEventListener("click", clearAllDebugVisualization);
}

/**
 * Toggle visualisasi debug nodes
 */
async function toggleDebugNodes() {
  debugStatus.nodes = !debugStatus.nodes;

  // Toggle button class
  toggleDebugButton("btn-show-nodes", debugStatus.nodes);

  // Clear layer jika status false
  if (!debugStatus.nodes) {
    clearDebugLayer("nodes");
    return;
  }

  // Tampilkan nodes jika status true
  showLoading();

  try {
    // Fetch nearest nodes dari titik awal dan akhir
    const startPoint = document.getElementById("start-point").value;
    const endPoint = document.getElementById("end-point").value;

    if (!startPoint && !endPoint) {
      // Jika tidak ada titik, ambil nodes di viewport saat ini
      const bounds = map.getBounds();
      const center = map.getCenter();
      const radius = getApproximateRadiusInMeters(bounds);

      await fetchAndDisplayNearestNodes(
        formatCoordinateString([center.lng, center.lat]),
        radius
      );
    } else {
      // Ambil nodes di sekitar titik awal dan akhir
      if (startPoint) {
        await fetchAndDisplayNearestNodes(startPoint, 1000);
      }

      if (endPoint) {
        await fetchAndDisplayNearestNodes(endPoint, 1000);
      }
    }
  } catch (error) {
    console.error("Error fetching nodes:", error);
    showError("Error fetching nodes. See console for details.");
  } finally {
    hideLoading();
  }
}

/**
 * Toggle visualisasi debug edges
 */
async function toggleDebugEdges() {
  debugStatus.edges = !debugStatus.edges;

  // Toggle button class
  toggleDebugButton("btn-show-edges", debugStatus.edges);

  // Clear layer jika status false
  if (!debugStatus.edges) {
    clearDebugLayer("edges");
    return;
  }

  // Tampilkan edges jika status true
  showLoading();

  try {
    // Ambil edges dari rute saat ini jika ada
    const routeData = getCurrentRouteData();

    if (routeData && routeData.routes && routeData.routes.length > 0) {
      // Ekstrak edges dari rute
      await extractAndDisplayRouteEdges(routeData.routes[0]);
    } else {
      // Simulasi edges di area viewport
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
 * Toggle visualisasi debug cells
 */
async function toggleDebugCells() {
  debugStatus.cells = !debugStatus.cells;

  // Toggle button class
  toggleDebugButton("btn-show-cells", debugStatus.cells);

  // Clear layer jika status false
  if (!debugStatus.cells) {
    clearDebugLayer("cells");
    return;
  }

  // Tampilkan cells jika status true
  showLoading();

  try {
    // Simulasi cells di area viewport
    simulateDebugCells();
  } catch (error) {
    console.error("Error displaying cells:", error);
    showError("Error displaying cells. See console for details.");
  } finally {
    hideLoading();
  }
}

/**
 * Toggle visualisasi debug belokan
 */
function toggleDebugTurns() {
  debugStatus.turns = !debugStatus.turns;

  // Toggle button class
  toggleDebugButton("btn-show-turns", debugStatus.turns);

  // Clear layer jika status false
  if (!debugStatus.turns) {
    clearDebugLayer("turns");
    return;
  }

  // Tampilkan belokan jika status true dan ada rute
  const routeData = getCurrentRouteData();

  if (routeData && routeData.routes && routeData.routes.length > 0) {
    addDebugTurns(routeData.routes[0]);
  } else {
    showWarning("No route is displayed. Please search for a route first.");
    debugStatus.turns = false;
    toggleDebugButton("btn-show-turns", false);
  }
}

/**
 * Improved toggle speed visualization function with better error handling
 */
function toggleDebugSpeed() {
  debugStatus.speed = !debugStatus.speed;

  // Toggle button class
  toggleDebugButton("btn-show-speed", debugStatus.speed);

  // Clear layer if status is false
  if (!debugStatus.speed) {
    clearDebugLayer("speed");
    return;
  }

  // Show loading indicator
  showLoading();

  try {
    // Get current route data
    const routeData = getCurrentRouteData();

    if (routeData && routeData.routes && routeData.routes.length > 0) {
      console.log("Toggling speed visualization ON");

      // Make sure we clear the layer first
      clearDebugLayer("speed");

      // Check if the route has the necessary data for speed visualization
      const route = routeData.routes[0];

      // Safe check for legs
      if (!route.legs || route.legs.length === 0) {
        console.warn("Route has no legs, cannot visualize speed");
        showWarning("Cannot visualize speed: route has no leg data.");
        debugStatus.speed = false;
        toggleDebugButton("btn-show-speed", false);
        hideLoading();
        return;
      }

      // Display speed visualization with improved error handling
      try {
        addDebugSpeed(route);
      } catch (speedError) {
        console.error("Error in speed visualization:", speedError);
        showError(
          "Error displaying speed visualization. See console for details."
        );
        debugStatus.speed = false;
        toggleDebugButton("btn-show-speed", false);
      }
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
 * Toggle visualisasi debug nama jalan
 */
function toggleDebugNames() {
  debugStatus.names = !debugStatus.names;

  // Toggle button class
  toggleDebugButton("btn-show-names", debugStatus.names);

  // Clear layer jika status false
  if (!debugStatus.names) {
    clearDebugLayer("names");
    return;
  }

  // Tampilkan nama jalan jika status true dan ada rute
  const routeData = getCurrentRouteData();

  if (routeData && routeData.routes && routeData.routes.length > 0) {
    addDebugNames(routeData.routes[0]);
  } else {
    showWarning("No route is displayed. Please search for a route first.");
    debugStatus.names = false;
    toggleDebugButton("btn-show-names", false);
  }
}

/**
 * Toggle class active pada button debug
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
 * Bersihkan semua visualisasi debug
 */
function clearAllDebugVisualization() {
  showConfirmation(
    "Are you sure you want to clear all debug visualizations?",
    "Confirm Clear",
    function () {
      // Reset semua status
      Object.keys(debugStatus).forEach((key) => {
        debugStatus[key] = false;
        toggleDebugButton(`btn-show-${key}`, false);
      });

      // Clear semua layer
      clearAllDebugLayers();

      // Show success toast
      showToast("All debug visualizations cleared", "success");
    }
  );
}

function clearDebugLayer(layerName) {
  console.log(`Clearing debug layer: ${layerName}`);
  if (mapLayers.debug[layerName]) {
    mapLayers.debug[layerName].clearLayers();
  }
}

/**
 * Fetch dan tampilkan node terdekat dari koordinat
 */
async function fetchAndDisplayNearestNodes(coordinateString, radius = 1000) {
  try {
    // Fetch nearest nodes dari OSRM API
    const response = await fetch(
      `${CONFIG.osrmBackendUrl}/nearest/v1/driving/${coordinateString}?number=50`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.waypoints) {
      throw new Error("Tidak dapat menemukan nodes terdekat");
    }

    // Konversi waypoints ke format nodes
    const nodes = data.waypoints.map((waypoint) => ({
      coordinates: waypoint.location,
      id: waypoint.name || "Unknown",
    }));

    // Tambahkan nodes ke visualisasi
    addDebugNodes(nodes);
  } catch (error) {
    console.error("Error fetching nearest nodes:", error);
    // Jika gagal, tampilkan simulasi nodes
    simulateDebugNodes();
    showWarning("Could not fetch real nodes, showing simulated nodes instead");
  }
}

/**
 * Ekstrak dan tampilkan edges dari rute
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
 * Simulasi nodes untuk debug jika API tidak tersedia
 */
function simulateDebugNodes() {
  const bounds = map.getBounds();
  const nodes = [];

  // Generate random nodes within viewport
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
 * Simulasi edges untuk debug jika API tidak tersedia
 */
function simulateDebugEdges() {
  const bounds = map.getBounds();
  const edges = [];

  // Generate random edges within viewport
  for (let i = 0; i < 30; i++) {
    const startLat =
      bounds.getSouth() +
      Math.random() * (bounds.getNorth() - bounds.getSouth());
    const startLng =
      bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());

    const endLat = startLat + (Math.random() - 0.5) * 0.01;
    const endLng = startLng + (Math.random() - 0.5) * 0.01;

    const edge = {
      geometry: {
        type: "LineString",
        coordinates: [
          [startLng, startLat],
          [endLng, endLat],
        ],
      },
      id: `Edge-${i}`,
      weight: Math.floor(Math.random() * 100),
    };

    edges.push(edge);
  }

  addDebugEdges(edges);
}

/**
 * Simulasi cells untuk debug
 */
function simulateDebugCells() {
  const bounds = map.getBounds();
  const cells = [];

  // Generate grid cells
  const gridSize = 5;
  const latStep = (bounds.getNorth() - bounds.getSouth()) / gridSize;
  const lngStep = (bounds.getEast() - bounds.getWest()) / gridSize;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const south = bounds.getSouth() + i * latStep;
      const north = bounds.getSouth() + (i + 1) * latStep;
      const west = bounds.getWest() + j * lngStep;
      const east = bounds.getWest() + (j + 1) * lngStep;

      const cell = {
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
        id: `Cell-${i}-${j}`,
        level: Math.floor(Math.random() * 3) + 1,
      };

      cells.push(cell);
    }
  }

  addDebugCells(cells);
}

/**
 * Get approximate radius in meters from map bounds
 */
function getApproximateRadiusInMeters(bounds) {
  const center = bounds.getCenter();
  const northEast = bounds.getNorthEast();

  // Approximate calculation based on Haversine formula
  const lat1 = (center.lat * Math.PI) / 180;
  const lon1 = (center.lng * Math.PI) / 180;
  const lat2 = (northEast.lat * Math.PI) / 180;
  const lon2 = (northEast.lng * Math.PI) / 180;

  const R = 6371000; // Earth's radius in meters
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}
