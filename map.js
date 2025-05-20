/**
 * Module for map management and visual layers
 */

// Global variables for map
let map;
let mapLayers = {
  route: new L.LayerGroup(),
  waypoints: new L.LayerGroup(),
  routingArea: new L.LayerGroup(),
  debug: {
    nodes: new L.LayerGroup(),
    edges: new L.LayerGroup(),
    cells: new L.LayerGroup(),
    turns: new L.LayerGroup(),
    speed: new L.LayerGroup(),
    names: new L.LayerGroup(),
  },
};

// Layer markers for start and end
let markerStart = null;
let markerEnd = null;

// Layer for route
let routeLines = [];

/**
 * Initialize map
 */
function initMap() {
  // Create map with Leaflet
  map = L.map("map", {
    center: CONFIG.map.center,
    zoom: CONFIG.map.zoom,
    maxZoom: CONFIG.map.maxZoom,
    minZoom: CONFIG.map.minZoom,
    zoomControl: false, // We'll create custom zoom controls
  });

  // Add base tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | OSRM Inspector',
  }).addTo(map);

  // Add all layers to map
  mapLayers.route.addTo(map);
  mapLayers.waypoints.addTo(map);
  mapLayers.routingArea.addTo(map);

  // Add debug layers
  Object.values(mapLayers.debug).forEach((layer) => layer.addTo(map));

  // Update coordinates when mouse moves
  map.on("mousemove", updateCoordinatesDisplay);

  // Add event for map clicks
  map.on("click", handleMapClick);

  // Setup map zoom controls
  document
    .getElementById("btn-zoom-in")
    .addEventListener("click", () => map.zoomIn());
  document
    .getElementById("btn-zoom-out")
    .addEventListener("click", () => map.zoomOut());

  // Setup sidebar toggle
  document
    .getElementById("btn-sidebar-toggle")
    .addEventListener("click", toggleSidebar);
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
  document.getElementById("app").classList.toggle("sidebar-collapsed");
  // Trigger resize event so the map adjusts its size
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

/**
 * Update coordinates display when mouse moves over map
 */
function updateCoordinatesDisplay(e) {
  const { lat, lng } = e.latlng;
  const displayFormat = `Lat: ${formatCoordinate(lat)}, Lng: ${formatCoordinate(
    lng
  )}`;
  const coordElement = document.getElementById("coordinates-display");
  coordElement.textContent = displayFormat;
}

/**
 * Handle click on map to determine start or end point
 */
function handleMapClick(e) {
  const latlng = e.latlng;
  const osrmFormat = [latlng.lng, latlng.lat]; // OSRM format [lng, lat]
  const coordString = formatCoordinateString(osrmFormat);

  // Determine which input is active or empty to fill
  const startInput = document.getElementById("start-point");
  const endInput = document.getElementById("end-point");

  if (document.activeElement === startInput || startInput.value === "") {
    startInput.value = coordString;
    addStartMarker(latlng);
  } else if (document.activeElement === endInput || endInput.value === "") {
    endInput.value = coordString;
    addEndMarker(latlng);
  } else {
    // If both inputs are filled, replace start point
    startInput.value = coordString;
    addStartMarker(latlng);
  }
}

/**
 * Add marker for start point with dragging capability and better icon
 */
function addStartMarker(latlng) {
  // Remove old marker if exists
  if (markerStart) {
    mapLayers.waypoints.removeLayer(markerStart);
  }

  // Create new marker with custom icon
  markerStart = L.marker(latlng, {
    icon: L.divIcon({
      className: "custom-div-icon start-icon",
      html: `<div style="background-color:${CONFIG.routing.colors.driving}; width:24px; height:24px; border-radius:50%; border: 3px solid white; box-shadow: 0 1px 5px rgba(0,0,0,0.4); position: relative;">
              <i class="fa fa-map-marker-alt" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 14px;"></i>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    draggable: true, // Make marker draggable
  });

  // Add drag end event
  markerStart.on("dragend", function (event) {
    const marker = event.target;
    const position = marker.getLatLng();
    const lngLat = [position.lng, position.lat];
    const coordString = formatCoordinateString(lngLat);

    // Update input field
    document.getElementById("start-point").value = coordString;

    // Update waypoints list
    updateWaypointsList();

    // Auto-refresh route if desired
    if (
      document.getElementById("auto-update-route") &&
      document.getElementById("auto-update-route").checked
    ) {
      findRouteWithMultipleWaypoints();
    }
  });

  // Add marker to layer
  mapLayers.waypoints.addLayer(markerStart);
}

/**
 * Add marker for end point with dragging capability and better icon
 */
function addEndMarker(latlng) {
  // Remove old marker if exists
  if (markerEnd) {
    mapLayers.waypoints.removeLayer(markerEnd);
  }

  // Create new marker with custom icon
  markerEnd = L.marker(latlng, {
    icon: L.divIcon({
      className: "custom-div-icon end-icon",
      html: `<div style="background-color:#e74c3c; width:24px; height:24px; border-radius:50%; border: 3px solid white; box-shadow: 0 1px 5px rgba(0,0,0,0.4); position: relative;">
              <i class="fa fa-flag" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 14px;"></i>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    draggable: true, // Make marker draggable
  });

  // Add drag end event
  markerEnd.on("dragend", function (event) {
    const marker = event.target;
    const position = marker.getLatLng();
    const lngLat = [position.lng, position.lat];
    const coordString = formatCoordinateString(lngLat);

    // Update input field
    document.getElementById("end-point").value = coordString;

    // Update waypoints list
    updateWaypointsList();

    // Auto-refresh route if desired
    if (
      document.getElementById("auto-update-route") &&
      document.getElementById("auto-update-route").checked
    ) {
      findRouteWithMultipleWaypoints();
    }
  });

  // Add marker to layer
  mapLayers.waypoints.addLayer(markerEnd);
}

/**
 * Add a marker for via points with dragging capability and better icon
 */
function addViaMarker(latlng, inputId) {
  // Extract index from input ID (like "via-point-1")
  const index = inputId.split("-").pop();

  // Create a unique marker ID
  const markerId = `via-marker-${index}`;

  // Check if a marker with this ID already exists in the layer
  let existingMarker = null;
  mapLayers.waypoints.eachLayer(function (layer) {
    if (layer.options && layer.options.markerId === markerId) {
      existingMarker = layer;
    }
  });

  // Remove existing marker if found
  if (existingMarker) {
    mapLayers.waypoints.removeLayer(existingMarker);
  }

  // Create a new marker with custom icon
  const viaMarker = L.marker(latlng, {
    markerId: markerId, // Store ID in marker options for easier retrieval
    icon: L.divIcon({
      className: "custom-div-icon via-icon",
      html: `<div style="background-color:#f39c12; width:24px; height:24px; border-radius:50%; border: 3px solid white; box-shadow: 0 1px 5px rgba(0,0,0,0.4); position: relative;">
              <i class="fa fa-map-pin" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 14px;"></i>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    draggable: true, // Make marker draggable
  });

  // Add drag end event
  viaMarker.on("dragend", function (event) {
    const marker = event.target;
    const position = marker.getLatLng();
    const lngLat = [position.lng, position.lat];
    const coordString = formatCoordinateString(lngLat);

    // Update the corresponding input field
    document.getElementById(inputId).value = coordString;

    // Update waypoints list
    updateWaypointsList();

    // Auto-refresh route if desired
    if (
      document.getElementById("auto-update-route") &&
      document.getElementById("auto-update-route").checked
    ) {
      findRouteWithMultipleWaypoints();
    }
  });

  // Add to waypoints layer
  mapLayers.waypoints.addLayer(viaMarker);

  console.log(
    `Added via marker ${markerId} at coordinates: ${latlng.lat},${latlng.lng}`
  );
}

/**
 * Display route on map with multi-color segments for different legs
 */
function displayRoute(routeData, profile = "driving") {
  clearRoute();

  if (!routeData || !routeData.routes || routeData.routes.length === 0) {
    console.log("No valid route data to display");
    return;
  }

  const route = routeData.routes[0];

  // Debug the route data structure to help identify issues
  console.log(
    "Route data structure:",
    JSON.stringify({
      hasGeometry: !!route.geometry,
      geometryType: route.geometry ? route.geometry.type : "none",
      legCount: route.legs ? route.legs.length : 0,
      hasCoordinates:
        route.geometry && route.geometry.coordinates
          ? route.geometry.coordinates.length
          : 0,
    })
  );

  // Get base color based on profile
  const baseColor =
    CONFIG.routing.colors[profile] || CONFIG.routing.colors.driving;

  // Generate a color palette for the segments
  const segmentCount = Math.max(waypointsList.length - 1, 1);
  const colors = generateColorPalette(baseColor, segmentCount);

  // Check if we need to split the overall route into segments
  if (
    route.geometry &&
    route.geometry.type === "LineString" &&
    route.geometry.coordinates &&
    route.geometry.coordinates.length > 0 &&
    waypointsList.length > 2
  ) {
    // Only split if we have via points

    console.log(
      `Splitting route into ${segmentCount} segments based on waypoints`
    );

    // We need to split the single route geometry into segments based on waypoints
    const routeCoordinates = route.geometry.coordinates;

    // Extract coordinates from waypoints
    const waypointCoordinates = waypointsList
      .map((wp) => {
        const coords = parseCoordinateString(wp);
        return coords ? [coords[0], coords[1]] : null;
      })
      .filter((coords) => coords !== null);

    if (waypointCoordinates.length > 1) {
      // Find the indices where the route passes through the waypoints
      const waypointIndices = findWaypointIndicesInRoute(
        routeCoordinates,
        waypointCoordinates
      );
      console.log("Waypoint indices in route:", waypointIndices);

      // Split the route into segments using these indices
      if (waypointIndices.length >= 2) {
        for (let i = 0; i < waypointIndices.length - 1; i++) {
          const startIdx = waypointIndices[i];
          const endIdx = waypointIndices[i + 1];

          // Skip if invalid indices
          if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
            continue;
          }

          // Extract segment coordinates
          const segmentCoords = routeCoordinates.slice(startIdx, endIdx + 1);

          if (segmentCoords.length > 1) {
            const segmentGeometry = {
              type: "LineString",
              coordinates: segmentCoords,
            };

            const segmentColor = colors[i % colors.length];

            console.log(
              `Adding segment ${i + 1} with ${
                segmentCoords.length
              } coordinates in color ${segmentColor}`
            );

            const segmentLine = L.geoJSON(segmentGeometry, {
              style: {
                color: segmentColor,
                weight: CONFIG.routing.lineWeight,
                opacity: CONFIG.routing.lineOpacity,
                lineJoin: "round",
                lineCap: "round",
              },
            });

            mapLayers.route.addLayer(segmentLine);
            routeLines.push(segmentLine);
          }
        }

        // Add a legend to show which color corresponds to which segment
        addRouteLegend(colors, waypointsList);
      } else {
        // Fallback to displaying the full route if we couldn't find waypoint indices
        console.log("Couldn't find waypoint indices, displaying full route");
        addFullRoute(route.geometry, baseColor);
      }
    } else {
      // Not enough valid waypoint coordinates, display full route
      console.log(
        "Not enough valid waypoint coordinates, displaying full route"
      );
      addFullRoute(route.geometry, baseColor);
    }
  }
  // Check if we have multiple legs to display
  else if (route.legs && route.legs.length > 1) {
    console.log(`Displaying ${route.legs.length} route legs`);

    // Add each leg with its own color
    route.legs.forEach((leg, index) => {
      if (!leg.geometry) {
        console.log(`Leg ${index} has no geometry`);
        return;
      }

      console.log(
        `Adding leg ${index} with geometry type: ${leg.geometry.type}`
      );

      const legColor = colors[index % colors.length];

      try {
        const legLine = L.geoJSON(leg.geometry, {
          style: {
            color: legColor,
            weight: CONFIG.routing.lineWeight,
            opacity: CONFIG.routing.lineOpacity,
            lineJoin: "round",
            lineCap: "round",
          },
        });

        mapLayers.route.addLayer(legLine);
        routeLines.push(legLine);
      } catch (error) {
        console.error(`Error displaying leg ${index}:`, error);
      }

      // Add hover highlight for this leg's steps
      if (leg.steps) {
        leg.steps.forEach((step, stepIndex) => {
          if (!step.geometry) return;

          try {
            const stepLine = L.geoJSON(step.geometry, {
              style: {
                color: legColor,
                weight: CONFIG.routing.lineWeight + 2,
                opacity: 0,
                lineJoin: "round",
                lineCap: "round",
              },
            });

            // Add hover effect
            stepLine.on("mouseover", function () {
              this.setStyle({
                opacity: CONFIG.routing.highlightOpacity,
              });
            });

            stepLine.on("mouseout", function () {
              this.setStyle({
                opacity: 0,
              });
            });

            mapLayers.route.addLayer(stepLine);
            routeLines.push(stepLine);
          } catch (stepError) {
            console.error(
              `Error displaying step ${stepIndex} of leg ${index}:`,
              stepError
            );
          }
        });
      }
    });

    // Add a legend to show which color corresponds to which segment
    addRouteLegend(colors, waypointsList);
  }
  // Otherwise display the full route as a single segment
  else {
    console.log("Displaying single route segment");
    addFullRoute(route.geometry, baseColor);
  }

  // If no route lines were successfully created, exit early
  if (routeLines.length === 0) {
    console.error("No route lines could be created from the route data");
    return;
  }

  // Zoom to route bounds with improved error handling
  try {
    if (routeLines && routeLines.length > 0) {
      const allRouteLines = L.featureGroup(routeLines);

      // Verify that bounds is valid before fitting
      const bounds = allRouteLines.getBounds();

      // Check if bounds is valid by ensuring it has valid NW and SE corners
      if (
        bounds &&
        bounds.getNorthWest() &&
        bounds.getSouthEast() &&
        !isNaN(bounds.getNorth()) &&
        !isNaN(bounds.getSouth()) &&
        !isNaN(bounds.getEast()) &&
        !isNaN(bounds.getWest())
      ) {
        // Ensure bounds has dimension (not just one point)
        const hasDimension =
          bounds.getNorth() !== bounds.getSouth() ||
          bounds.getEast() !== bounds.getWest();

        if (hasDimension) {
          console.log("Fitting map to valid bounds:", bounds);
          map.fitBounds(bounds, {
            padding: [50, 50],
          });
        } else {
          console.log("Bounds has no dimension, centering map instead");
          // If bounds has no dimension (just one point), set view to that point
          map.setView([bounds.getNorth(), bounds.getEast()], 12);
        }
      } else {
        console.warn("Invalid bounds, can't fit map to route");

        // Fallback to coordinates from waypointsList if they're valid
        if (waypointsList && waypointsList.length >= 2) {
          try {
            const startCoords = parseCoordinateString(waypointsList[0]);
            const endCoords = parseCoordinateString(
              waypointsList[waypointsList.length - 1]
            );

            if (startCoords && endCoords) {
              // Create bounds from start and end coordinates
              const fallbackBounds = L.latLngBounds(
                [startCoords[1], startCoords[0]],
                [endCoords[1], endCoords[0]]
              );

              // Ensure these bounds are valid
              if (
                fallbackBounds &&
                !isNaN(fallbackBounds.getNorth()) &&
                !isNaN(fallbackBounds.getSouth()) &&
                !isNaN(fallbackBounds.getEast()) &&
                !isNaN(fallbackBounds.getWest())
              ) {
                console.log("Using fallback bounds from waypoints");
                map.fitBounds(fallbackBounds, {
                  padding: [50, 50],
                });
              } else {
                // If still not valid, zoom to start coordinate only
                map.setView([startCoords[1], startCoords[0]], 12);
              }
            }
          } catch (boundsError) {
            console.error("Error creating fallback bounds:", boundsError);
          }
        }
      }
    } else {
      console.warn("No route lines to display for bounds fitting");
    }
  } catch (error) {
    console.error("Error fitting bounds:", error);

    // Fallback: try to get the last waypoint from waypointsList
    try {
      if (waypointsList && waypointsList.length > 0) {
        const firstWaypoint = parseCoordinateString(waypointsList[0]);
        if (firstWaypoint) {
          map.setView([firstWaypoint[1], firstWaypoint[0]], 12);
        }
      }
    } catch (fallbackError) {
      console.error("Fallback view error:", fallbackError);
    }
  }

  return routeLines;
}

/**
 * Helper function to add the full route as a single segment
 */
function addFullRoute(geometry, color) {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length < 2) {
    console.error("Invalid geometry for full route");
    return;
  }

  console.log(
    `Adding overall route with ${geometry.coordinates.length} coordinates`
  );

  const routeLine = L.geoJSON(geometry, {
    style: {
      color: color,
      weight: CONFIG.routing.lineWeight,
      opacity: CONFIG.routing.lineOpacity,
      lineJoin: "round",
      lineCap: "round",
    },
  });

  mapLayers.route.addLayer(routeLine);
  routeLines.push(routeLine);
}

/**
 * Find indices in the route coordinates array that are closest to waypoints
 */
function findWaypointIndicesInRoute(routeCoordinates, waypointCoordinates) {
  const indices = [];

  // For the first waypoint, always use index 0
  indices.push(0);

  // For each waypoint except the first and last
  for (let i = 1; i < waypointCoordinates.length - 1; i++) {
    const waypoint = waypointCoordinates[i];

    // Find the closest point in the route
    let minDistance = Infinity;
    let closestIndex = -1;

    for (let j = 0; j < routeCoordinates.length; j++) {
      const routePoint = routeCoordinates[j];
      const distance = calculateDistance(
        waypoint[1],
        waypoint[0],
        routePoint[1],
        routePoint[0]
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = j;
      }
    }

    // If we found a close enough point (within 0.01 degrees ~1km)
    if (minDistance < 0.01) {
      indices.push(closestIndex);
    }
  }

  // For the last waypoint, always use the last index
  indices.push(routeCoordinates.length - 1);

  return indices;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
}

/**
 * Generate a color palette based on a base color
 * @param {string} baseColor - The base color (hex)
 * @param {number} count - Number of colors needed
 * @returns {Array} Array of color hex codes
 */
function generateColorPalette(baseColor, count) {
  if (count <= 1) return [baseColor];

  // Define set of distinct colors for segments
  const predefinedColors = [
    "#3498db", // Blue
    "#e74c3c", // Red
    "#2ecc71", // Green
    "#9b59b6", // Purple
    "#f39c12", // Orange
    "#1abc9c", // Turquoise
    "#d35400", // Pumpkin
    "#34495e", // Dark Blue
    "#16a085", // Green Sea
    "#c0392b", // Dark Red
  ];

  // If we have enough predefined colors, use them
  if (count <= predefinedColors.length) {
    return predefinedColors.slice(0, count);
  }

  // Otherwise, generate colors with varying hue
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = ((i * 360) / count) % 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }

  return colors;
}

/**
 * Add a route legend showing the color of each segment
 * @param {Array} colors - Array of colors used for segments
 * @param {Array} waypoints - Array of waypoints
 */
function addRouteLegend(colors, waypoints) {
  // Remove existing legend if any
  const existingLegend = document.getElementById("route-color-legend");
  if (existingLegend) {
    existingLegend.remove();
  }

  // Create a new legend div
  const legend = document.createElement("div");
  legend.id = "route-color-legend";
  legend.className = "route-legend";

  // Add a header
  const header = document.createElement("div");
  header.className = "legend-header";
  header.textContent = "Route Segments";
  legend.appendChild(header);

  // Add a legend item for each segment
  for (let i = 0; i < colors.length && i < waypoints.length - 1; i++) {
    const item = document.createElement("div");
    item.className = "legend-item";

    const colorBox = document.createElement("div");
    colorBox.className = "legend-color";
    colorBox.style.backgroundColor = colors[i];

    const label = document.createElement("div");
    label.className = "legend-label";

    // Format waypoint names/coordinates for better readability
    const startCoord = shortenCoordinate(waypoints[i]);
    const endCoord = shortenCoordinate(waypoints[i + 1]);
    label.textContent = `Waypoint ${i + 1} → ${i + 2}`;

    item.appendChild(colorBox);
    item.appendChild(label);
    legend.appendChild(item);
  }

  // Add the legend to the map
  document.getElementById("map-container").appendChild(legend);
}

/**
 * Shorten coordinate for display purposes
 * @param {string} coordStr - Coordinate string "lng,lat"
 * @returns {string} Shortened coordinate
 */
function shortenCoordinate(coordStr) {
  const coords = parseCoordinateString(coordStr);
  if (!coords) return "Unknown";

  return `${coords[1].toFixed(3)},${coords[0].toFixed(3)}`;
}

/**
 * Clear route legend when clearing routes
 */
function clearRouteLegend() {
  const legend = document.getElementById("route-color-legend");
  if (legend) {
    legend.remove();
  }
}

/**
 * Clear all routes from map
 */
function clearRoute() {
  routeLines.forEach((line) => {
    mapLayers.route.removeLayer(line);
  });
  routeLines = [];

  // Also clear the legend
  clearRouteLegend();
}

/**
 * Clear all waypoint markers
 */
function clearWaypoints() {
  mapLayers.waypoints.clearLayers();
  markerStart = null;
  markerEnd = null;
}

/**
 * Clear all debug visualizations
 */
function clearAllDebugLayers() {
  Object.values(mapLayers.debug).forEach((layer) => {
    layer.clearLayers();
  });
}

/**
 * Clear specific debug visualization
 */
function clearDebugLayer(layerName) {
  if (mapLayers.debug[layerName]) {
    mapLayers.debug[layerName].clearLayers();
  }
}

/**
 * Add nodes visualization for debug
 */
function addDebugNodes(nodes) {
  clearDebugLayer("nodes");

  if (!nodes || !Array.isArray(nodes)) return;

  // Limit number of nodes displayed
  const limit = Math.min(nodes.length, CONFIG.debug.maxNodes);

  for (let i = 0; i < limit; i++) {
    const node = nodes[i];

    if (!node || !node.coordinates) continue;

    const marker = L.circleMarker(toLeafletCoordinates(node.coordinates), {
      radius: CONFIG.debug.nodes.radius,
      color: CONFIG.debug.nodes.color,
      fillColor: CONFIG.debug.nodes.color,
      fillOpacity: CONFIG.debug.nodes.fillOpacity,
      weight: CONFIG.debug.nodes.weight,
    });

    // Add popup with information
    if (node.id) {
      marker.bindTooltip(`Node ID: ${node.id}`, {
        permanent: false,
        direction: "top",
      });
    }

    mapLayers.debug.nodes.addLayer(marker);
  }
}

/**
 * Add edges visualization for debug
 */
function addDebugEdges(edges) {
  clearDebugLayer("edges");

  if (!edges || !Array.isArray(edges)) return;

  // Limit number of edges displayed
  const limit = Math.min(edges.length, CONFIG.debug.maxEdges);

  for (let i = 0; i < limit; i++) {
    const edge = edges[i];

    if (!edge || !edge.geometry) continue;

    const line = L.geoJSON(edge.geometry, {
      style: {
        color: CONFIG.debug.edges.color,
        weight: CONFIG.debug.edges.weight,
        opacity: CONFIG.debug.edges.opacity,
      },
    });

    // Add popup with information
    if (edge.id || edge.weight) {
      line.bindTooltip(
        `Edge ID: ${edge.id || "N/A"}, Weight: ${edge.weight || "N/A"}`,
        {
          permanent: false,
          direction: "top",
        }
      );
    }

    mapLayers.debug.edges.addLayer(line);
  }
}

/**
 * Add cells visualization for debug
 */
function addDebugCells(cells) {
  clearDebugLayer("cells");

  if (!cells || !Array.isArray(cells)) return;

  // Limit number of cells displayed
  const limit = Math.min(cells.length, CONFIG.debug.maxCells);

  for (let i = 0; i < limit; i++) {
    const cell = cells[i];

    if (!cell || !cell.geometry) continue;

    const polygon = L.geoJSON(cell.geometry, {
      style: {
        color: CONFIG.debug.cells.color,
        fillColor: CONFIG.debug.cells.color,
        fillOpacity: CONFIG.debug.cells.fillOpacity,
        weight: CONFIG.debug.cells.weight,
        opacity: CONFIG.debug.cells.opacity,
      },
    });

    // Add popup with information
    if (cell.id || cell.level) {
      polygon.bindTooltip(
        `Cell ID: ${cell.id || "N/A"}, Level: ${cell.level || "N/A"}`,
        {
          permanent: false,
          direction: "top",
        }
      );
    }

    mapLayers.debug.cells.addLayer(polygon);
  }
}

/**
 * Display turn instructions on map
 */
function addDebugTurns(route) {
  clearDebugLayer("turns");

  if (!route || !route.legs) return;

  route.legs.forEach((leg) => {
    if (!leg.steps) return;

    leg.steps.forEach((step) => {
      if (!step.maneuver || !step.maneuver.location) return;

      const location = step.maneuver.location;
      const turnType = step.maneuver.type;
      const modifier = step.maneuver.modifier || "";

      // Create turn icon
      const turnIcon = L.divIcon({
        className: "turn-icon",
        html: `<i class="fa fa-${getTurnIcon(modifier)}"></i>`,
        iconSize: CONFIG.debug.turns.iconSize,
      });

      const marker = L.marker(toLeafletCoordinates(location), {
        icon: turnIcon,
      });

      // Add tooltip with turn description
      marker.bindTooltip(
        getReadableInstruction({ type: turnType, modifier: modifier }),
        {
          permanent: false,
          direction: "top",
        }
      );

      mapLayers.debug.turns.addLayer(marker);
    });
  });
}

/**
 * Enhanced speed visualization function with minimal styling
 */
function addDebugSpeed(route) {
  clearDebugLayer("speed");

  if (!route || !route.legs) {
    console.log("No route data for speed visualization");
    return;
  }

  console.log("Processing route for speed visualization");

  // Flag to track if we've successfully displayed any speed data
  let hasDisplayedSpeed = false;

  try {
    // Processing approach 1: Use speed annotations if available
    route.legs.forEach((leg, legIndex) => {
      if (
        leg.annotation &&
        leg.annotation.speed &&
        leg.annotation.speed.length > 0 &&
        leg.geometry &&
        leg.geometry.coordinates &&
        leg.geometry.coordinates.length > 0
      ) {
        console.log(`Found speed annotations in leg ${legIndex}`);

        // Get coordinates from geometry
        const coordinates = leg.geometry.coordinates;

        // Display speed for each segment (or every few segments to avoid crowding)
        for (
          let i = 0;
          i < Math.min(coordinates.length - 1, leg.annotation.speed.length);
          i++
        ) {
          // Display every 3rd point to avoid cluttering
          if (i % 3 !== 0) continue;

          const speed = leg.annotation.speed[i];
          if (speed === undefined || speed === null) continue;

          // Make sure we have valid coordinates for this point and the next
          if (!coordinates[i] || !coordinates[i + 1]) continue;

          // Calculate midpoint of segment for label placement
          const midpoint = [
            (coordinates[i][0] + coordinates[i + 1][0]) / 2,
            (coordinates[i][1] + coordinates[i + 1][1]) / 2,
          ];

          // Create a minimal speed label - just text with a white border/halo
          const speedIcon = L.divIcon({
            className: "speed-label-minimal",
            html: `<div style="color:black; font-weight:bold; font-size:11px; text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white; white-space: nowrap;">${Math.round(
              speed
            )} km/h</div>`,
            iconSize: [60, 16],
            iconAnchor: [30, 8],
          });

          const marker = L.marker(toLeafletCoordinates(midpoint), {
            icon: speedIcon,
          });

          mapLayers.debug.speed.addLayer(marker);
          hasDisplayedSpeed = true;
        }
      }
    });
  } catch (err) {
    console.error("Error displaying speed annotations:", err);
  }

  // If no annotations were successfully displayed, use an alternative method based on step duration/distance
  if (!hasDisplayedSpeed) {
    try {
      console.log(
        "No speed annotations found or error occurred, using calculated speeds from steps"
      );

      route.legs.forEach((leg) => {
        if (!leg.steps) return;

        leg.steps.forEach((step, stepIndex) => {
          if (
            !step.geometry ||
            !step.geometry.coordinates ||
            !step.duration ||
            !step.distance
          )
            return;

          // Calculate average speed (m/s to km/h)
          const avgSpeed = (step.distance / step.duration) * 3.6;

          const coordinates = step.geometry.coordinates;
          if (coordinates.length < 2) return;

          // Place markers at reasonable intervals along the step
          const interval = Math.max(1, Math.floor(coordinates.length / 3));

          for (let i = interval; i < coordinates.length - 1; i += interval) {
            // Make sure this coordinate exists
            if (!coordinates[i]) continue;

            // Place marker at this coordinate
            const point = coordinates[i];

            // Create a minimal label for calculated speeds
            const speedIcon = L.divIcon({
              className: "speed-label-minimal calculated",
              html: `<div style="color:black; font-weight:bold; font-size:11px; text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white; white-space: nowrap;">${Math.round(
                avgSpeed
              )} km/h</div>`,
              iconSize: [60, 16],
              iconAnchor: [30, 8],
            });

            const marker = L.marker(toLeafletCoordinates(point), {
              icon: speedIcon,
            });

            mapLayers.debug.speed.addLayer(marker);
            hasDisplayedSpeed = true;
          }
        });
      });
    } catch (err) {
      console.error("Error displaying calculated speeds:", err);
    }
  }

  // If we still haven't displayed any speed, use a last resort method
  if (!hasDisplayedSpeed) {
    try {
      console.warn(
        "Could not visualize speeds using standard methods, using fallback approach"
      );

      // Fallback: Create evenly spaced markers along the route geometry with overall average speed
      if (
        route.geometry &&
        route.geometry.coordinates &&
        route.distance &&
        route.duration
      ) {
        const overallSpeed = (route.distance / route.duration) * 3.6;
        const coordinates = route.geometry.coordinates;

        // Place markers at regular intervals
        const interval = Math.max(1, Math.floor(coordinates.length / 10));

        for (let i = interval; i < coordinates.length - 1; i += interval) {
          if (!coordinates[i]) continue;

          const point = coordinates[i];

          const speedIcon = L.divIcon({
            className: "speed-label-minimal fallback",
            html: `<div style="color:black; font-weight:bold; font-size:11px; text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white; white-space: nowrap;">~${Math.round(
              overallSpeed
            )} km/h</div>`,
            iconSize: [60, 16],
            iconAnchor: [30, 8],
          });

          const marker = L.marker(toLeafletCoordinates(point), {
            icon: speedIcon,
          });

          mapLayers.debug.speed.addLayer(marker);
          hasDisplayedSpeed = true;
        }
      }
    } catch (err) {
      console.error("Error in fallback speed visualization:", err);
    }
  }

  // If we still couldn't display any speed info, show a message
  if (!hasDisplayedSpeed) {
    // Create a centered message on the map
    const bounds = map.getBounds();
    const center = bounds.getCenter();

    const errorIcon = L.divIcon({
      className: "speed-error",
      html: `<div style="color:red; font-weight:bold; font-size:14px; text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white;">No speed data available</div>`,
      iconSize: [200, 40],
      iconAnchor: [100, 20],
    });

    const marker = L.marker([center.lat, center.lng], {
      icon: errorIcon,
    });

    mapLayers.debug.speed.addLayer(marker);
    console.error("Failed to display any speed information");
  } else {
    console.log("Speed visualization complete");
  }
}

/**
 * Display road names along route
 */
function addDebugNames(route) {
  clearDebugLayer("names");

  if (!route || !route.legs) return;

  route.legs.forEach((leg) => {
    if (!leg.steps) return;

    leg.steps.forEach((step) => {
      if (!step.name || !step.geometry) return;

      // Skip if name is empty or "unknown"
      if (step.name === "" || step.name.toLowerCase() === "unknown") return;

      // Get midpoint of segment for label position
      const coordinates = step.geometry.coordinates;
      const midIndex = Math.floor(coordinates.length / 2);

      if (!coordinates[midIndex]) return;

      // Create road name label
      const nameIcon = L.divIcon({
        className: "name-label",
        html: step.name,
        iconSize: [120, 20],
        iconAnchor: [60, 10],
      });

      const marker = L.marker(toLeafletCoordinates(coordinates[midIndex]), {
        icon: nameIcon,
      });

      mapLayers.debug.names.addLayer(marker);
    });
  });
}
