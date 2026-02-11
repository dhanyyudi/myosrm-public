/**
 * Routing module — handles OSRM API communication, waypoints, TD routing
 */

// Current route data
let currentRouteData = null;

// Waypoints list (array of "lng,lat" strings)
let waypointsList = [];

// Current routing URL
let currentRoutingUrl = "";

// Mapping: display profile → OSRM API profile name
const PROFILE_API_MAP = {
  driving: "driving",
  cycling: "cycling",
  walking: "walking",
};

function getApiProfileName(displayProfile) {
  return PROFILE_API_MAP[displayProfile] || "driving";
}

/**
 * Build ISO 8601 string with local timezone offset
 * "2026-02-11T04:23" → "2026-02-11T04:23:00+07:00"
 */
function buildIsoWithTimezone(datetimeLocalValue) {
  const date = new Date(datetimeLocalValue);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMins = String(absOffset % 60).padStart(2, "0");
  return datetimeLocalValue + ":00" + sign + offsetHours + ":" + offsetMins;
}

/**
 * Initialize routing — attach event listeners to static HTML elements
 */
function initRouting() {
  // Profile display from runtime config
  document.getElementById("profile-display").textContent =
    RUNTIME_CONFIG.displayProfile;
  document.getElementById("algorithm-display").textContent = "MLD";

  // Edit profile button
  document
    .getElementById("btn-edit-profile")
    .addEventListener("click", editProfile);

  // Find Route / Clear
  document
    .getElementById("btn-find-route")
    .addEventListener("click", findRouteWithMultipleWaypoints);
  document
    .getElementById("btn-clear-route")
    .addEventListener("click", clearRouteAndWaypoints);

  // Clear start/end
  document
    .getElementById("btn-clear-start")
    .addEventListener("click", clearStartPoint);
  document
    .getElementById("btn-clear-end")
    .addEventListener("click", clearEndPoint);

  // Add Waypoint / Import CSV
  document
    .getElementById("btn-add-waypoint")
    .addEventListener("click", addNewWaypoint);
  document
    .getElementById("btn-import-csv")
    .addEventListener("click", () =>
      document.getElementById("waypoint-file-input").click()
    );
  document
    .getElementById("waypoint-file-input")
    .addEventListener("change", handleFileUpload);

  // TD controls — show/hide based on runtime config
  initTimeDependentControls();

  // Load URL button (in waypoints card)
  document
    .getElementById("btn-load-url")
    .addEventListener("click", promptLoadUrl);

  // Results modal buttons
  document
    .getElementById("btn-show-routing-url")
    .addEventListener("click", showRoutingUrlModal);
  document
    .getElementById("btn-show-waypoints")
    .addEventListener("click", showWaypointsModal);
  document
    .getElementById("btn-show-wayids")
    .addEventListener("click", showWayIdsModal);

  // Step info collapsible toggle
  document
    .getElementById("step-info-toggle")
    .addEventListener("click", toggleStepInfo);

  // Override map click for multiple waypoints
  map.off("click", handleMapClick);
  map.on("click", handleMapClickWithMultipleWaypoints);

  // Init waypoints list
  updateWaypointsList();

  // Init drag-and-drop for waypoint rows
  initWaypointDragDrop();

  console.log("Routing module initialized");
}

/**
 * Initialize drag-and-drop for waypoint reordering
 */
let dragSrcRow = null;

function initWaypointDragDrop() {
  const container = document.getElementById("waypoints-container");

  container.addEventListener("dragstart", function (e) {
    const row = e.target.closest(".waypoint-row");
    if (!row) return;
    dragSrcRow = row;
    row.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  });

  container.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const row = e.target.closest(".waypoint-row");
    if (!row || row === dragSrcRow) return;

    // Remove all drag-over indicators
    container
      .querySelectorAll(".waypoint-row")
      .forEach((r) => r.classList.remove("drag-over"));
    row.classList.add("drag-over");
  });

  container.addEventListener("dragleave", function (e) {
    const row = e.target.closest(".waypoint-row");
    if (row) row.classList.remove("drag-over");
  });

  container.addEventListener("drop", function (e) {
    e.preventDefault();
    const targetRow = e.target.closest(".waypoint-row");
    if (!targetRow || !dragSrcRow || targetRow === dragSrcRow) return;

    // Determine position: insert before or after target
    const rows = Array.from(container.querySelectorAll(".waypoint-row"));
    const srcIdx = rows.indexOf(dragSrcRow);
    const tgtIdx = rows.indexOf(targetRow);

    if (srcIdx < tgtIdx) {
      container.insertBefore(dragSrcRow, targetRow.nextSibling);
    } else {
      container.insertBefore(dragSrcRow, targetRow);
    }

    // Clean up classes
    container
      .querySelectorAll(".waypoint-row")
      .forEach((r) => r.classList.remove("drag-over", "dragging"));

    // Relabel all waypoints after reorder
    relabelWaypoints();
    updateWaypointsList();
    rebuildMarkersFromInputs();

    showToast("Waypoints reordered", "success");
  });

  container.addEventListener("dragend", function () {
    container
      .querySelectorAll(".waypoint-row")
      .forEach((r) => r.classList.remove("drag-over", "dragging"));
    dragSrcRow = null;
  });
}

/**
 * Relabel all waypoint rows after reorder.
 * First = Start (A), Last = End (B), Middle = Via (C, D, E...)
 */
function relabelWaypoints() {
  const container = document.getElementById("waypoints-container");
  const rows = Array.from(container.querySelectorAll(".waypoint-row"));

  rows.forEach((row, idx) => {
    const markerEl = row.querySelector(".waypoint-marker");
    const input = row.querySelector(".waypoint-input");
    const removeBtn = row.querySelector(".btn-remove-waypoint");

    if (idx === 0) {
      // Start
      row.dataset.type = "start";
      markerEl.className = "waypoint-marker start";
      markerEl.textContent = "A";
      input.id = "start-point";
      input.placeholder = "Click map or enter lng,lat";
      if (removeBtn) removeBtn.id = "btn-clear-start";
    } else if (idx === rows.length - 1) {
      // End
      row.dataset.type = "end";
      markerEl.className = "waypoint-marker end";
      markerEl.textContent = "B";
      input.id = "end-point";
      input.placeholder = "Click map or enter lng,lat";
      if (removeBtn) removeBtn.id = "btn-clear-end";
    } else {
      // Via
      const viaIndex = idx;
      const letter = String.fromCharCode(66 + viaIndex); // C, D, E...
      row.dataset.type = "via";
      markerEl.className = "waypoint-marker via";
      markerEl.textContent = letter;
      input.id = `via-point-${viaIndex}`;
      input.placeholder = `Via Point ${viaIndex}`;
      if (removeBtn) {
        removeBtn.id = "";
        removeBtn.onclick = function () {
          removeWaypoint(row);
        };
      }
    }
  });
}

/**
 * Rebuild all map markers from current input values
 */
function rebuildMarkersFromInputs() {
  clearWaypoints();
  addMarkersFromInputs();
}

/**
 * Initialize TD controls based on runtime config
 * Public version: TD only works with local backends
 */
function initTimeDependentControls() {
  const tdControls = document.getElementById("td-controls");
  const checkbox = document.getElementById("enable-time-routing");
  
  // Check if using local backend (TD only works locally)
  const isLocalBackend = CONFIG.osrmBackendUrl === '/api' || CONFIG.osrmBackendUrl.includes('localhost');
  
  if (!isLocalBackend) {
    // Public backend - disable TD with info message
    tdControls.style.display = "";
    checkbox.checked = false;
    checkbox.disabled = true;
    
    // Add info tooltip
    const infoTip = document.querySelector('.info-tip[title*="traffic"]');
    if (infoTip) {
      infoTip.title = "Time-dependent routing requires local OSRM backend with TD support";
      infoTip.style.color = "var(--white-30)";
    }
    
    // Disable time input
    const dtInput = document.getElementById("departure-time");
    if (dtInput) dtInput.disabled = true;
    
    // Add warning label
    const warningLabel = document.createElement('div');
    warningLabel.id = 'td-warning';
    warningLabel.style.cssText = 'font-size:0.7rem;color:var(--orange);margin-top:6px;';
    warningLabel.innerHTML = '<i class="fa fa-info-circle"></i> TD requires local backend';
    if (!document.getElementById('td-warning')) {
      tdControls.appendChild(warningLabel);
    }
    return;
  }
  
  // Local backend - enable TD controls
  if (RUNTIME_CONFIG.tdEnabled) {
    tdControls.style.display = "";
    checkbox.checked = true;
    checkbox.disabled = false;
    setCurrentTimeAsDeparture();

    document
      .getElementById("btn-use-current-time")
      .addEventListener("click", setCurrentTimeAsDeparture);
  } else {
    tdControls.style.display = "none";
    checkbox.checked = false;
  }
}

/**
 * Set current time as departure time
 */
function setCurrentTimeAsDeparture() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("departure-time").value =
    `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Edit profile via SweetAlert prompt
 */
function editProfile() {
  const current = RUNTIME_CONFIG.displayProfile;

  Swal.fire({
    title: "Change Profile",
    input: "text",
    inputValue: current,
    inputPlaceholder: "e.g. truck18w, van, driving",
    showCancelButton: true,
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const newProfile = result.value.trim();
      RUNTIME_CONFIG.displayProfile = newProfile;
      document.getElementById("profile-display").textContent = newProfile;
      showToast("Profile updated to " + newProfile, "success");

      // Auto-refresh route if exists
      if (
        currentRouteData &&
        document.getElementById("auto-update-route") &&
        document.getElementById("auto-update-route").checked
      ) {
        findRouteWithMultipleWaypoints();
      }
    }
  });
}

/**
 * Add a new via waypoint input
 */
function addNewWaypoint() {
  const container = document.getElementById("waypoints-container");
  const endRow = container.querySelector('[data-type="end"]');

  const viaCount = container.querySelectorAll('[data-type="via"]').length;
  const newIndex = viaCount + 1;
  const letter = String.fromCharCode(66 + newIndex); // C, D, E...

  const row = document.createElement("div");
  row.className = "waypoint-row";
  row.dataset.type = "via";
  row.draggable = true;
  row.innerHTML = `
    <div class="drag-handle" title="Drag to reorder"><i class="fa fa-grip-vertical"></i></div>
    <div class="waypoint-marker via">${letter}</div>
    <input type="text" id="via-point-${newIndex}" placeholder="Via Point ${newIndex}" class="waypoint-input" />
    <button class="btn-icon-sm btn-remove-waypoint" title="Remove"><i class="fa fa-times"></i></button>
  `;

  row
    .querySelector(".btn-remove-waypoint")
    .addEventListener("click", function () {
      removeWaypoint(row);
    });

  const input = row.querySelector(".waypoint-input");
  input.addEventListener("focus", () => (input.dataset.active = "true"));
  input.addEventListener("blur", () => (input.dataset.active = "false"));

  container.insertBefore(row, endRow);
  updateWaypointsList();
  showToast("Via waypoint added", "success");
  return row;
}

/**
 * Remove a via waypoint
 */
function removeWaypoint(waypointElement) {
  showConfirmation("Remove this waypoint?", "Confirm", function () {
    waypointElement.remove();
    updateWaypointsList();
    showToast("Waypoint removed", "success");

    if (
      document.getElementById("auto-update-route") &&
      document.getElementById("auto-update-route").checked
    ) {
      findRouteWithMultipleWaypoints();
    }
  });
}

/**
 * Update waypoints list from DOM inputs
 */
function updateWaypointsList() {
  waypointsList = [];

  const startInput = document.getElementById("start-point");
  if (startInput && startInput.value) waypointsList.push(startInput.value);

  // Via points in order
  document
    .querySelectorAll('[data-type="via"] .waypoint-input')
    .forEach((input) => {
      if (input.value) waypointsList.push(input.value);
    });

  const endInput = document.getElementById("end-point");
  if (endInput && endInput.value) waypointsList.push(endInput.value);
}

/**
 * Handle map click with multiple waypoints support
 */
function handleMapClickWithMultipleWaypoints(e) {
  const { lng, lat } = e.lngLat;
  const coordString = formatCoordinateString([lng, lat]);
  const latlng = { lat, lng };

  // Check for active input
  const activeInput = document.querySelector(
    '.waypoint-input[data-active="true"]'
  );

  if (activeInput) {
    activeInput.value = coordString;
    if (activeInput.id === "start-point") addStartMarker(latlng);
    else if (activeInput.id === "end-point") addEndMarker(latlng);
    else addViaMarker(latlng, activeInput.id);
  } else {
    const startInput = document.getElementById("start-point");
    const endInput = document.getElementById("end-point");

    if (startInput.value === "") {
      startInput.value = coordString;
      addStartMarker(latlng);
    } else if (endInput.value === "") {
      endInput.value = coordString;
      addEndMarker(latlng);
    } else {
      // Both filled — promote current End to Via, new click becomes End
      const currentEndValue = endInput.value;
      const row = addNewWaypoint();
      setTimeout(() => {
        const newInput = row.querySelector(".waypoint-input");
        if (newInput) {
          // Move old End value to the new Via
          newInput.value = currentEndValue;
          const oldEndCoords = parseCoordinateString(currentEndValue);
          if (oldEndCoords) {
            addViaMarker(
              { lat: oldEndCoords[1], lng: oldEndCoords[0] },
              newInput.id
            );
          }
          // Set clicked point as new End
          endInput.value = coordString;
          addEndMarker(latlng);
          updateWaypointsList();
        }
      }, 10);
    }
  }

  updateWaypointsList();
}

/**
 * Handle CSV/TXT file upload
 */
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => parseWaypointsFile(e.target.result, file.name);
  reader.readAsText(file);
}

/**
 * Parse waypoints file
 */
function parseWaypointsFile(contents, filename) {
  clearWaypoints();

  const lines = contents.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    showWarning("File must contain at least 2 waypoints");
    return;
  }

  const hasHeader = /latitude|longitude|lat|lng|lon/i.test(lines[0]);
  let latFirst = true;

  if (hasHeader) {
    const parts = lines[0].toLowerCase().split(",");
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim().replace(/["']/g, "");
      if (p.includes("longitude") || p.includes("lng") || p.includes("lon")) {
        if (
          i <
          parts.findIndex(
            (pp) => pp.includes("latitude") || pp.includes("lat")
          )
        ) {
          latFirst = false;
        }
        break;
      }
    }
  }

  const startIndex = hasHeader ? 1 : 0;
  if (lines.length - startIndex < 2) {
    showWarning("File must contain at least 2 waypoints after header");
    return;
  }

  function processLine(line) {
    line = line.replace(/"/g, "");
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) return null;
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (isNaN(a) || isNaN(b)) return null;
    return latFirst ? `${b},${a}` : `${a},${b}`;
  }

  const validLines = [];
  for (let i = startIndex; i < lines.length; i++) {
    const r = processLine(lines[i]);
    if (r) validLines.push(r);
  }

  if (validLines.length < 2) {
    showWarning("Could not find at least 2 valid waypoints");
    return;
  }

  document.getElementById("start-point").value = validLines[0];

  // Remove existing via points
  document.querySelectorAll('[data-type="via"]').forEach((el) => el.remove());

  for (let i = 1; i < validLines.length - 1; i++) {
    const row = addNewWaypoint();
    const input = row.querySelector(".waypoint-input");
    if (input) input.value = validLines[i];
  }

  document.getElementById("end-point").value =
    validLines[validLines.length - 1];

  updateWaypointsList();
  addMarkersFromInputs();
  showSuccess(`Imported ${validLines.length} waypoints from ${filename}`);
}

/**
 * Add markers from all waypoint inputs
 */
function addMarkersFromInputs() {
  const inputs = document.querySelectorAll(".waypoint-input");
  inputs.forEach((input) => {
    if (!input.value) return;
    const coords = parseCoordinateString(input.value);
    if (!coords) return;
    const latlng = { lat: coords[1], lng: coords[0] };

    if (input.id === "start-point") addStartMarker(latlng);
    else if (input.id === "end-point") addEndMarker(latlng);
    else addViaMarker(latlng, input.id);
  });
}

/**
 * Find route with multiple waypoints
 */
async function findRouteWithMultipleWaypoints() {
  updateWaypointsList();

  if (waypointsList.length < 2) {
    showWarning("Please specify at least a start and end point");
    return;
  }

  showLoading();

  try {
    const displayProfile = RUNTIME_CONFIG.displayProfile;
    const profile = getApiProfileName(displayProfile);
    const waypointsString = waypointsList.join(";");

    // Check if TD is enabled
    const timeEnabled =
      document.getElementById("enable-time-routing") &&
      document.getElementById("enable-time-routing").checked;

    // Build URL - use standard annotations for public backends
    const isLocalBackend = CONFIG.osrmBackendUrl === '/api' || CONFIG.osrmBackendUrl.includes('localhost');
    
    // Local backends support 'ways' annotation, public backends use standard 'true'
    const annotationsParam = isLocalBackend ? 'distance,duration,ways' : 'true';
    let url = `${CONFIG.osrmBackendUrl}/route/v1/${profile}/${waypointsString}?overview=full&geometries=geojson&steps=true&annotations=${annotationsParam}&alternatives=false`;

    // Only add start_time for local backends (public OSRM doesn't support TD)
    if (timeEnabled && isLocalBackend) {
      const dtInput = document.getElementById("departure-time");
      if (dtInput && dtInput.value) {
        const startTime = buildIsoWithTimezone(dtInput.value);
        url += `&start_time=${encodeURIComponent(startTime)}`;
        console.log(`TD routing with start_time: ${startTime}`);
      }
    }

    console.log("OSRM API request:", url);
    currentRoutingUrl = `http://localhost:9966${url}`;
    updateRoutingUrlDisplay();

    let response;
    try {
      response = await fetch(url);
    } catch (fetchError) {
      throw new Error(`Network error: ${fetchError.message}`);
    }

    // If profile fails, try alternatives
    if (!response.ok && response.status === 400) {
      const altProfiles = ["driving", "cycling", "walking"];
      for (const alt of altProfiles) {
        if (alt === profile) continue;
        const annotationsParam = isLocalBackend ? 'distance,duration,ways' : 'true';
        let altUrl = `${CONFIG.osrmBackendUrl}/route/v1/${alt}/${waypointsString}?overview=full&geometries=geojson&steps=true&annotations=${annotationsParam}&alternatives=false`;
        if (timeEnabled && isLocalBackend) {
          const dtInput = document.getElementById("departure-time");
          if (dtInput && dtInput.value) {
            altUrl += `&start_time=${encodeURIComponent(buildIsoWithTimezone(dtInput.value))}`;
          }
        }

        try {
          const altResp = await fetch(altUrl);
          if (altResp.ok) {
            let data = await altResp.json();
            if (data.code !== "Ok" || !data.routes || !data.routes.length)
              continue;

            data = processRouteGeometry(data);
            currentRoutingUrl = `http://localhost:9966${altUrl}`;
            updateRoutingUrlDisplay();
            currentRouteData = data;
            displayRoute(data, displayProfile);
            displayRouteSummary(data.routes[0], timeEnabled);
            displayRouteSteps(data.routes[0]);
            displayWaypointsTab();
            displayWayIdsTab(data.routes[0]);
            showResultsCards();
            addMarkersFromInputs();
            hideLoading();
            showSuccess(`Route found (API profile: ${alt})`);
            return;
          }
        } catch (_) {
          /* continue */
        }
      }
      throw new Error("Routing failed with all API profiles");
    }

    if (!response.ok)
      throw new Error(`HTTP error! Status: ${response.status}`);

    let data = await response.json();
    if (data.code !== "Ok" || !data.routes || !data.routes.length)
      throw new Error("Route not found");

    data = processRouteGeometry(data);

    // TD warning
    if (timeEnabled && !checkForTimeData(data)) {
      showToast("Time-dependent routing may not be supported", "warning");
    }

    currentRouteData = data;
    displayRoute(data, displayProfile);
    displayRouteSummary(data.routes[0], timeEnabled);
    displayRouteSteps(data.routes[0]);
    displayWaypointsTab();
    displayWayIdsTab(data.routes[0]);
    showResultsCards();
    addMarkersFromInputs();
    showToast("Route found successfully", "success");
  } catch (error) {
    console.error("Error:", error);
    showError(`Route finding failed: ${error.message}`);
  } finally {
    hideLoading();
  }
}

/**
 * Process route geometry — ensure proper GeoJSON format
 */
function processRouteGeometry(data) {
  if (!data || !data.routes) return data;
  data.routes.forEach((route) => {
    if (Array.isArray(route.geometry)) {
      route.geometry = { type: "LineString", coordinates: route.geometry };
    }
    if (route.legs) {
      route.legs.forEach((leg) => {
        if (Array.isArray(leg.geometry)) {
          leg.geometry = { type: "LineString", coordinates: leg.geometry };
        }
        if (leg.steps) {
          leg.steps.forEach((step) => {
            if (Array.isArray(step.geometry)) {
              step.geometry = { type: "LineString", coordinates: step.geometry };
            }
          });
        }
      });
    }
  });
  return data;
}

function isValidRouteGeometry(data) {
  if (!data || !data.routes || !data.routes[0]) return false;
  const r = data.routes[0];
  if (
    r.geometry &&
    r.geometry.type === "LineString" &&
    r.geometry.coordinates &&
    r.geometry.coordinates.length > 1
  )
    return true;
  if (r.legs) {
    for (const leg of r.legs) {
      if (
        leg.geometry &&
        leg.geometry.coordinates &&
        leg.geometry.coordinates.length > 1
      )
        return true;
    }
  }
  return false;
}

function checkForTimeData(data) {
  try {
    const r = data.routes[0];
    if (r.depart || r.arrival) return true;
    if (data.metadata && data.metadata.traffic) return true;
    if (r.legs) {
      for (const leg of r.legs) {
        if (leg.traffic || leg.departure_time || leg.arrival_time) return true;
      }
    }
    if (data.time_dependent || data.traffic) return true;
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Display route summary in floating stats card
 */
function displayRouteSummary(route, isTimeBased = false) {
  if (!route) return;

  const statsEl = document.getElementById("route-stats");
  statsEl.style.display = "";

  document.getElementById("stat-distance").textContent = formatDistance(
    route.distance
  );
  document.getElementById("stat-duration").textContent = formatDuration(
    route.duration
  );

  if (route.distance && route.duration) {
    const avgSpeed = (route.distance / route.duration) * 3.6;
    document.getElementById("stat-speed").textContent =
      Math.round(avgSpeed) + " km/h";
  }
}

/**
 * Display route steps in the bottom panel tab
 */
function displayRouteSteps(route) {
  const el = document.getElementById("route-steps");
  if (!route || !route.legs || !route.legs.length) {
    el.innerHTML = '<p style="color:var(--gray-400);">No steps available.</p>';
    return;
  }

  let html = "";
  route.legs.forEach((leg) => {
    if (!leg.steps) return;
    leg.steps.forEach((step) => {
      const instruction = getReadableInstruction(step.maneuver);
      const dist = formatDistance(step.distance);
      const dur = formatDuration(step.duration);
      const icon = getTurnIcon(step.maneuver?.modifier || "straight");
      let speedStr = "";
      if (step.distance && step.duration) {
        speedStr = ` — ${Math.round((step.distance / step.duration) * 3.6)} km/h`;
      }
      html += `
        <div class="step-item">
          <div class="step-icon"><i class="fa fa-${icon}"></i></div>
          <div class="step-info">
            <div class="step-instruction">${instruction}${step.name ? " onto " + step.name : ""}</div>
            <div class="step-meta">${dist} (${dur})${speedStr}</div>
          </div>
        </div>`;
    });
  });

  el.innerHTML = html;
}

/**
 * Populate Waypoints tab
 */
function displayWaypointsTab() {
  const el = document.getElementById("waypoints-table");
  if (waypointsList.length === 0) {
    el.innerHTML = "<p>No waypoints.</p>";
    return;
  }

  let html =
    "<table><thead><tr><th>#</th><th>Coordinates (lng,lat)</th></tr></thead><tbody>";
  waypointsList.forEach((wp, i) => {
    html += `<tr><td>${i}</td><td>${wp}</td></tr>`;
  });
  html += "</tbody></table>";
  el.innerHTML = html;
}

/**
 * Populate Way IDs tab from route annotation
 * Note: 'ways' annotation only available on local SWAT backend
 */
function displayWayIdsTab(route) {
  const el = document.getElementById("way-ids-table");
  const isLocalBackend = CONFIG.osrmBackendUrl === '/api' || CONFIG.osrmBackendUrl.includes('localhost');
  
  if (!route || !route.legs) {
    el.innerHTML = "<p>No way ID data.</p>";
    return;
  }

  const wayIds = [];
  route.legs.forEach((leg) => {
    if (leg.annotation && leg.annotation.ways) {
      // Use 'ways' array from OSRM annotation (OSM Way IDs) - only on local backend
      leg.annotation.ways.forEach((w) => {
        if (!wayIds.includes(w)) wayIds.push(w);
      });
    }
  });

  if (wayIds.length === 0) {
    if (!isLocalBackend) {
      el.innerHTML = "<p>Way ID data not available with public OSRM backend.<br>Use local backend for way-level details.</p>";
    } else {
      el.innerHTML = "<p>No annotation way data available.</p>";
    }
    return;
  }

  let html = `<p style="margin-bottom:6px;color:var(--white-50);font-size:var(--text-xs);">${wayIds.length} unique ways</p>`;
  html +=
    "<table><thead><tr><th>#</th><th>Way ID</th></tr></thead><tbody>";
  for (let i = 0; i < Math.min(wayIds.length, 500); i++) {
    html += `<tr><td>${i}</td><td>${wayIds[i]}</td></tr>`;
  }
  if (wayIds.length > 500) {
    html += `<tr><td colspan="2">... ${wayIds.length - 500} more</td></tr>`;
  }
  html += "</tbody></table>";
  el.innerHTML = html;
}

/**
 * Show/hide results cards in sidebar
 */
function showResultsCards() {
  document.getElementById("card-results").style.display = "";
  document.getElementById("card-step-info").style.display = "";
}

function hideResultsCards() {
  document.getElementById("card-results").style.display = "none";
  document.getElementById("card-step-info").style.display = "none";
}

/**
 * Toggle step info collapsible
 */
function toggleStepInfo() {
  const header = document.getElementById("step-info-toggle");
  const body = document.getElementById("step-info-body");
  const icon = header.querySelector(".card-collapse-icon");

  if (body.style.display === "none") {
    body.style.display = "";
    icon.style.transform = "";
  } else {
    body.style.display = "none";
    icon.style.transform = "rotate(-90deg)";
  }
}

/**
 * Show Routing URL modal with copy functionality
 */
function showRoutingUrlModal() {
  if (!currentRoutingUrl) {
    showWarning("No routing URL available");
    return;
  }

  Swal.fire({
    title: "Routing URL",
    html: `
      <div style="text-align:left;">
        <textarea id="swal-routing-url" readonly
          style="width:100%;height:80px;font-family:'SF Mono','Fira Code','Consolas',monospace;font-size:0.75rem;
          padding:10px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;resize:none;color:#fff;background:rgba(0,0,0,0.3);"
        >${currentRoutingUrl}</textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="fa fa-copy"></i> Copy URL',
    cancelButtonText: "Close",
    didOpen: () => {
      const textarea = document.getElementById("swal-routing-url");
      textarea.addEventListener("click", () => textarea.select());
    },
  }).then((result) => {
    if (result.isConfirmed) {
      navigator.clipboard
        .writeText(currentRoutingUrl)
        .then(() => showToast("URL copied to clipboard", "success"))
        .catch(() => {
          const textarea = document.getElementById("swal-routing-url");
          if (textarea) {
            textarea.select();
            document.execCommand("copy");
          }
          showToast("URL copied to clipboard", "success");
        });
    }
  });
}

/**
 * Show Waypoints modal with CSV export
 */
function showWaypointsModal() {
  if (waypointsList.length === 0) {
    showWarning("No waypoints available");
    return;
  }

  let tableHtml = `
    <div style="text-align:left;max-height:300px;overflow-y:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.75rem;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;font-weight:600;color:#4b5563;background:#f8f9fb;border-bottom:1px solid #e5e7eb;">#</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;color:#4b5563;background:#f8f9fb;border-bottom:1px solid #e5e7eb;">Coordinates (lng,lat)</th>
          </tr>
        </thead>
        <tbody>`;

  waypointsList.forEach((wp, i) => {
    tableHtml += `<tr>
      <td style="padding:5px 8px;color:#374151;border-bottom:1px solid #f1f3f5;">${i}</td>
      <td style="padding:5px 8px;color:#374151;border-bottom:1px solid #f1f3f5;font-family:'SF Mono','Fira Code',monospace;font-size:0.7rem;">${wp}</td>
    </tr>`;
  });

  tableHtml += `</tbody></table></div>`;

  Swal.fire({
    title: `Waypoints (${waypointsList.length})`,
    html: tableHtml,
    showCancelButton: true,
    confirmButtonText: '<i class="fa fa-file-csv"></i> Export CSV',
    cancelButtonText: "Close",
    width: 480,
  }).then((result) => {
    if (result.isConfirmed) {
      exportWaypointsCsv();
    }
  });
}

/**
 * Show Way IDs modal with CSV export
 * Note: 'ways' annotation only available on local SWAT backend
 */
function showWayIdsModal() {
  if (!currentRouteData || !currentRouteData.routes || !currentRouteData.routes[0]) {
    showWarning("No route data available");
    return;
  }

  const route = currentRouteData.routes[0];
  const isLocalBackend = CONFIG.osrmBackendUrl === '/api' || CONFIG.osrmBackendUrl.includes('localhost');
  const wayIds = [];
  
  if (route.legs) {
    route.legs.forEach((leg) => {
      // Use 'ways' from annotation (OSM Way IDs) - only on local backend
      if (leg.annotation && leg.annotation.ways) {
        leg.annotation.ways.forEach((w) => {
          if (!wayIds.includes(w)) wayIds.push(w);
        });
      }
    });
  }

  if (wayIds.length === 0) {
    if (!isLocalBackend) {
      showWarning("Way ID data not available with public OSRM backend. Use local backend for way-level details.");
    } else {
      showWarning("No Way ID data available.");
    }
    return;
  }

  const displayLimit = Math.min(wayIds.length, 200);
  let tableHtml = `
    <div style="text-align:left;max-height:300px;overflow-y:auto;">
      <p style="margin-bottom:6px;color:var(--white-50);font-size:0.7rem;">${wayIds.length} unique OSM ways</p>
      <table style="width:100%;border-collapse:collapse;font-size:0.75rem;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;font-weight:600;color:var(--white-70);background:var(--white-08);border-bottom:1px solid var(--white-15);">#</th>
            <th style="text-align:left;padding:6px 8px;font-weight:600;color:var(--white-70);background:var(--white-08);border-bottom:1px solid var(--white-15);">Way ID</th>
          </tr>
        </thead>
        <tbody>`;

  for (let i = 0; i < displayLimit; i++) {
    tableHtml += `<tr>
      <td style="padding:5px 8px;color:var(--white-70);border-bottom:1px solid var(--white-08);">${i}</td>
      <td style="padding:5px 8px;color:var(--white-90);border-bottom:1px solid var(--white-08);font-family:'SF Mono','Fira Code',monospace;">${wayIds[i]}</td>
    </tr>`;
  }

  if (wayIds.length > displayLimit) {
    tableHtml += `<tr><td colspan="2" style="padding:5px 8px;color:var(--white-50);text-align:center;">... ${wayIds.length - displayLimit} more (all included in CSV export)</td></tr>`;
  }

  tableHtml += `</tbody></table></div>`;

  Swal.fire({
    title: `Way IDs (${wayIds.length})`,
    html: tableHtml,
    showCancelButton: true,
    confirmButtonText: '<i class="fa fa-file-csv"></i> Export CSV',
    cancelButtonText: "Close",
    width: 480,
  }).then((result) => {
    if (result.isConfirmed) {
      exportWayIdsCsv(wayIds);
    }
  });
}

/**
 * Export waypoints to CSV file
 */
function exportWaypointsCsv() {
  let csv = "index,longitude,latitude\n";
  waypointsList.forEach((wp, i) => {
    const coords = parseCoordinateString(wp);
    if (coords) {
      csv += `${i},${coords[0]},${coords[1]}\n`;
    }
  });

  downloadCsv(csv, "waypoints.csv");
  showToast("Waypoints exported to CSV", "success");
}

/**
 * Export Way IDs to CSV file
 * Note: Way IDs are OSM Way IDs extracted from OSRM annotation.ways
 */
function exportWayIdsCsv(wayIds) {
  let csv = "index,osm_way_id\n";
  wayIds.forEach((id, i) => {
    csv += `${i},${id}\n`;
  });

  downloadCsv(csv, "way_ids.csv");
  showToast("Way IDs exported to CSV", "success");
}

/**
 * Download a CSV string as a file
 */
function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Update routing URL (internal state only, no DOM element needed)
 */
function updateRoutingUrlDisplay() {
  // URL is stored in currentRoutingUrl, displayed via modal
}

/**
 * Prompt to load URL
 */
function promptLoadUrl() {
  showUrlPrompt(function (url) {
    loadRoutingUrl(url);
  });
}

/**
 * Load route from URL
 */
async function loadRoutingUrl(url) {
  if (!url || !url.includes("/route/v1/")) {
    showError("Invalid OSRM routing URL format");
    return;
  }

  showLoading();
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const v1Idx = pathParts.findIndex((p) => p === "v1");
    if (v1Idx === -1 || v1Idx + 2 >= pathParts.length) {
      throw new Error("Invalid URL format");
    }

    const coordinatesStr = pathParts[v1Idx + 2];
    const waypoints = coordinatesStr.split(";");
    if (waypoints.length < 2) throw new Error("Need at least 2 waypoints");

    // Clear existing
    clearRoute();
    clearWaypoints();
    document.getElementById("start-point").value = "";
    document.getElementById("end-point").value = "";
    document.querySelectorAll('[data-type="via"]').forEach((el) => el.remove());
    waypointsList = [];

    // Set waypoints
    document.getElementById("start-point").value = waypoints[0];
    for (let i = 1; i < waypoints.length - 1; i++) {
      const row = addNewWaypoint();
      const input = row.querySelector(".waypoint-input");
      if (input) input.value = waypoints[i];
    }
    document.getElementById("end-point").value =
      waypoints[waypoints.length - 1];

    updateWaypointsList();
    addMarkersFromInputs();

    // Set TD params if present
    const params = new URLSearchParams(urlObj.search);
    const tdParam = params.get("start_time") || params.get("depart");
    if (tdParam && document.getElementById("enable-time-routing")) {
      document.getElementById("enable-time-routing").checked = true;
      const dt = document.getElementById("departure-time");
      if (dt) {
        const date = new Date(tdParam);
        if (!isNaN(date.getTime())) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const d = String(date.getDate()).padStart(2, "0");
          const h = String(date.getHours()).padStart(2, "0");
          const min = String(date.getMinutes()).padStart(2, "0");
          dt.value = `${y}-${m}-${d}T${h}:${min}`;
        }
      }
    }

    await findRouteWithMultipleWaypoints();
    currentRoutingUrl = url;
    updateRoutingUrlDisplay();
    showSuccess("URL loaded successfully");
  } catch (error) {
    showError(`Error loading URL: ${error.message}`);
  } finally {
    hideLoading();
  }
}

/**
 * Clear all routes, waypoints and UI state
 */
function clearRouteAndWaypoints() {
  showConfirmation("Clear all waypoints and routes?", "Confirm", function () {
    clearRoute();
    clearWaypoints();

    document.getElementById("start-point").value = "";
    document.getElementById("end-point").value = "";
    document.querySelectorAll('[data-type="via"]').forEach((el) => el.remove());

    // Hide stats and results cards
    document.getElementById("route-stats").style.display = "none";
    hideResultsCards();

    // Reset state
    currentRouteData = null;
    currentRoutingUrl = "";
    waypointsList = [];

    document.getElementById("route-steps").innerHTML = "";
    document.getElementById("waypoints-table").innerHTML = "";
    document.getElementById("way-ids-table").innerHTML = "";

    showToast("Cleared", "success");
  });
}

function clearStartPoint() {
  document.getElementById("start-point").value = "";
  if (markerStart) {
    markerStart.remove();
    markerStart = null;
  }
  updateWaypointsList();
}

function clearEndPoint() {
  document.getElementById("end-point").value = "";
  if (markerEnd) {
    markerEnd.remove();
    markerEnd = null;
  }
  updateWaypointsList();
}

/**
 * Delete a waypoint by type, triggered by right-click on marker
 */
function deleteWaypointByType(type, inputId) {
  if (type === "start") {
    clearStartPoint();
    showToast("Start point removed", "success");
  } else if (type === "end") {
    clearEndPoint();
    showToast("End point removed", "success");
  } else if (type === "via" && inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      const row = input.closest(".waypoint-row");
      if (row) {
        // Remove marker
        const index = inputId.split("-").pop();
        const markerId = `via-marker-${index}`;
        if (viaMarkers[markerId]) {
          viaMarkers[markerId].remove();
          delete viaMarkers[markerId];
        }
        row.remove();
        relabelWaypoints();
        updateWaypointsList();
        showToast("Waypoint removed", "success");
      }
    }
  }
}

function getCurrentRouteData() {
  return currentRouteData;
}
