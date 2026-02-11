/**
 * Routing area module — GeoJSON overlay using MapLibre GL JS
 */

const ROUTING_AREA_SOURCE = "routing-area-src";
const ROUTING_AREA_FILL = "routing-area-fill";
const ROUTING_AREA_LINE = "routing-area-line";

let isRoutingAreaVisible = true;
let routingAreaLoaded = false;

/**
 * Initialize routing area module
 */
function initRoutingArea() {
  document
    .getElementById("btn-load-routing-area")
    .addEventListener("click", promptRoutingAreaFile);
  document
    .getElementById("btn-upload-routing-area")
    .addEventListener("click", function () {
      document.getElementById("routing-area-file-input").click();
    });
  document
    .getElementById("routing-area-file-input")
    .addEventListener("change", handleRoutingAreaFileUpload);
  document
    .getElementById("btn-toggle-routing-area")
    .addEventListener("click", toggleRoutingArea);

  autoLoadLastRoutingArea();
  console.log("Routing area module initialized");
}

/**
 * Handle file upload for routing area GeoJSON
 */
function handleRoutingAreaFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".geojson") && !file.name.endsWith(".json")) {
    showError("Please upload a GeoJSON file (.geojson or .json)");
    event.target.value = "";
    return;
  }

  showLoading();

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      let geojsonData;
      try {
        geojsonData = JSON.parse(e.target.result);
      } catch (parseError) {
        hideLoading();
        showError(`Invalid JSON in file: ${parseError.message}`);
        return;
      }

      if (!isValidGeoJSON(geojsonData)) {
        hideLoading();
        showError("Invalid GeoJSON format.");
        return;
      }

      const areaName = extractAreaNameFromPath(file.name);
      displayRoutingAreaFromData(geojsonData, areaName, file.name);
    } catch (error) {
      hideLoading();
      console.error("Error processing GeoJSON file:", error);
      showError(`Failed to process GeoJSON file: ${error.message}`);
    }
  };

  reader.onerror = function () {
    hideLoading();
    showError("Error reading file");
  };

  reader.readAsText(file);
  event.target.value = "";
}

/**
 * Load GeoJSON routing area from a file path
 */
async function loadRoutingArea(filePath) {
  try {
    showLoading();

    const areaName = extractAreaNameFromPath(filePath);
    const response = await window.fs.readFile(filePath, { encoding: "utf8" });
    let geojsonData;

    try {
      geojsonData = JSON.parse(response);
    } catch (parseError) {
      hideLoading();
      showError(`Invalid JSON in file: ${parseError.message}`);
      return;
    }

    if (!isValidGeoJSON(geojsonData)) {
      hideLoading();
      showError("Invalid GeoJSON format.");
      return;
    }

    displayRoutingAreaFromData(geojsonData, areaName, filePath);
    localStorage.setItem("lastRoutingAreaFile", filePath);
  } catch (error) {
    console.error("Error loading routing area:", error);
    hideLoading();
    showError(`Failed to load routing area: ${error.message}`);
    updateRoutingAreaInfo(null, false);
  }
}

/**
 * Display routing area from parsed GeoJSON data on the MapLibre map
 */
function displayRoutingAreaFromData(geojsonData, areaName, fileName) {
  try {
    // Remove existing routing area layers/source
    removeRoutingAreaLayers();

    // Add source
    map.addSource(ROUTING_AREA_SOURCE, {
      type: "geojson",
      data: geojsonData,
    });

    // Add fill layer
    map.addLayer({
      id: ROUTING_AREA_FILL,
      type: "fill",
      source: ROUTING_AREA_SOURCE,
      paint: {
        "fill-color": "#4cc9f0",
        "fill-opacity": 0.1,
      },
    });

    // Add line layer
    map.addLayer({
      id: ROUTING_AREA_LINE,
      type: "line",
      source: ROUTING_AREA_SOURCE,
      paint: {
        "line-color": "#4cc9f0",
        "line-width": 2,
        "line-opacity": 0.7,
      },
    });

    routingAreaLoaded = true;

    // Fit map to GeoJSON bounds
    const bounds = getGeoJSONBounds(geojsonData);
    if (bounds) {
      map.fitBounds(bounds, { padding: 50 });
    }

    hideLoading();

    updateRoutingAreaInfo(areaName, true);
    updateRoutingAreaToggleState(true);
    isRoutingAreaVisible = true;

    localStorage.setItem("lastRoutingAreaName", areaName);

    try {
      const minifiedGeoJSON = simplifyGeoJSONForStorage(geojsonData);
      localStorage.setItem(
        "routingAreaGeoJSON",
        JSON.stringify(minifiedGeoJSON)
      );
    } catch (storageError) {
      console.warn("Could not save GeoJSON to localStorage:", storageError);
    }

    setTimeout(() => {
      showSuccess(`Routing area "${areaName}" loaded successfully`);
    }, 100);
  } catch (error) {
    console.error("Error displaying routing area:", error);
    hideLoading();
    showError(`Failed to display routing area: ${error.message}`);
    updateRoutingAreaInfo(null, false);
  }
}

/**
 * Remove routing area layers and source from map
 */
function removeRoutingAreaLayers() {
  if (map.getLayer(ROUTING_AREA_FILL)) map.removeLayer(ROUTING_AREA_FILL);
  if (map.getLayer(ROUTING_AREA_LINE)) map.removeLayer(ROUTING_AREA_LINE);
  if (map.getSource(ROUTING_AREA_SOURCE))
    map.removeSource(ROUTING_AREA_SOURCE);
  routingAreaLoaded = false;
}

/**
 * Calculate bounding box from GeoJSON data
 */
function getGeoJSONBounds(geojsonData) {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  let hasCoords = false;

  function processCoords(coords) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && coords.length >= 2) {
      minLng = Math.min(minLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLng = Math.max(maxLng, coords[0]);
      maxLat = Math.max(maxLat, coords[1]);
      hasCoords = true;
    } else {
      coords.forEach(processCoords);
    }
  }

  function processGeometry(geometry) {
    if (!geometry || !geometry.coordinates) return;
    processCoords(geometry.coordinates);
  }

  if (geojsonData.type === "FeatureCollection" && geojsonData.features) {
    geojsonData.features.forEach((f) => processGeometry(f.geometry));
  } else if (geojsonData.type === "Feature") {
    processGeometry(geojsonData.geometry);
  } else if (geojsonData.coordinates) {
    processCoords(geojsonData.coordinates);
  }

  if (!hasCoords) return null;

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Toggle routing area visibility
 */
function toggleRoutingArea() {
  if (!routingAreaLoaded) {
    showWarning("No routing area has been loaded yet");
    return;
  }

  isRoutingAreaVisible = !isRoutingAreaVisible;
  const visibility = isRoutingAreaVisible ? "visible" : "none";

  if (map.getLayer(ROUTING_AREA_FILL))
    map.setLayoutProperty(ROUTING_AREA_FILL, "visibility", visibility);
  if (map.getLayer(ROUTING_AREA_LINE))
    map.setLayoutProperty(ROUTING_AREA_LINE, "visibility", visibility);

  if (isRoutingAreaVisible) {
    const areaName = localStorage.getItem("lastRoutingAreaName") || "Unknown";
    updateRoutingAreaInfo(areaName, true);
  } else {
    updateRoutingAreaInfo(null, false);
  }

  updateRoutingAreaToggleState(isRoutingAreaVisible);

  showToast(
    `Routing area ${isRoutingAreaVisible ? "shown" : "hidden"}`,
    isRoutingAreaVisible ? "success" : "info"
  );
}

/**
 * Update toggle button state
 */
function updateRoutingAreaToggleState(isVisible) {
  const toggleBtn = document.getElementById("btn-toggle-routing-area");
  if (toggleBtn) {
    if (isVisible) {
      toggleBtn.classList.add("active");
    } else {
      toggleBtn.classList.remove("active");
    }
  }
}

/**
 * Prompt user for file path
 */
function promptRoutingAreaFile() {
  showPrompt(
    "Enter path to GeoJSON routing area file",
    "Load Routing Area",
    "routing-area.geojson",
    function (filePath) {
      if (filePath) loadRoutingArea(filePath);
    }
  );
}

/**
 * Auto-load last routing area from localStorage
 */
function autoLoadLastRoutingArea() {
  const savedGeoJSON = localStorage.getItem("routingAreaGeoJSON");
  const areaName = localStorage.getItem("lastRoutingAreaName");

  if (savedGeoJSON) {
    try {
      const geojsonData = JSON.parse(savedGeoJSON);
      // Delay until map style is loaded
      if (map.isStyleLoaded()) {
        displayRoutingAreaFromData(
          geojsonData,
          areaName || "Saved Area",
          "saved-geojson"
        );
      } else {
        map.on("load", () => {
          displayRoutingAreaFromData(
            geojsonData,
            areaName || "Saved Area",
            "saved-geojson"
          );
        });
      }
      return;
    } catch (error) {
      console.warn("Could not load GeoJSON from localStorage:", error);
    }
  }

  const lastFile = localStorage.getItem("lastRoutingAreaFile");
  if (lastFile) loadRoutingArea(lastFile);
}

/**
 * Update routing area info display
 */
function updateRoutingAreaInfo(areaName, isVisible) {
  const infoElement = document.getElementById("routing-area-info");
  const nameElement = document.getElementById("routing-area-name");

  if (!infoElement || !nameElement) return;

  if (areaName && isVisible) {
    nameElement.textContent = areaName;
    infoElement.style.display = "flex";
  } else {
    infoElement.style.display = "none";
  }
}

/**
 * Extract area name from file path
 */
function extractAreaNameFromPath(filePath) {
  if (!filePath) return "Unknown";
  const withoutExtension = filePath.replace(/\.[^/.]+$/, "");
  const pathParts = withoutExtension.split("/");
  let areaName = pathParts[pathParts.length - 1];
  areaName = areaName
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return areaName;
}

/**
 * Validate GeoJSON structure
 */
function isValidGeoJSON(obj) {
  if (!obj || typeof obj !== "object") return false;

  if (obj.type === "FeatureCollection") return Array.isArray(obj.features);
  if (obj.type === "Feature")
    return obj.geometry && obj.properties !== undefined;
  if (
    [
      "Point",
      "LineString",
      "Polygon",
      "MultiPoint",
      "MultiLineString",
      "MultiPolygon",
    ].includes(obj.type)
  )
    return Array.isArray(obj.coordinates);

  return (
    obj.type !== undefined &&
    (obj.features !== undefined ||
      obj.geometry !== undefined ||
      obj.coordinates !== undefined)
  );
}

/**
 * Simplify GeoJSON for localStorage storage
 */
function simplifyGeoJSONForStorage(geojsonData) {
  try {
    const result = JSON.parse(JSON.stringify(geojsonData));

    const simplifyCoord = (coord) => {
      if (Array.isArray(coord)) {
        if (typeof coord[0] === "number") {
          return coord.map((num) => Math.round(num * 100000) / 100000);
        }
        return coord.map(simplifyCoord);
      }
      return coord;
    };

    if (result.features && Array.isArray(result.features)) {
      result.features.forEach((feature) => {
        if (feature.properties) {
          const simplifiedProps = {};
          ["name", "title", "description", "id"].forEach((key) => {
            if (feature.properties[key] !== undefined) {
              simplifiedProps[key] = feature.properties[key];
            }
          });
          feature.properties = simplifiedProps;
        }

        if (feature.geometry && feature.geometry.coordinates) {
          feature.geometry.coordinates = simplifyCoord(
            feature.geometry.coordinates
          );
        }
      });
    }

    return result;
  } catch (error) {
    console.warn("Error simplifying GeoJSON:", error);
    return geojsonData;
  }
}
