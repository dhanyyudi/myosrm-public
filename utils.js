/**
 * Common utilities for OSRM Inspector application
 */

// Format time from seconds to minutes and hours format
function formatDuration(seconds) {
  if (seconds < 60) {
    return Math.round(seconds) + " seconds";
  } else if (seconds < 3600) {
    return (
      Math.floor(seconds / 60) +
      " minutes " +
      Math.round(seconds % 60) +
      " seconds"
    );
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours + " hours " + minutes + " minutes";
  }
}

// Format distance from meters to more readable format
function formatDistance(meters) {
  if (meters < 1000) {
    return Math.round(meters) + " m";
  } else {
    return (meters / 1000).toFixed(2) + " km";
  }
}

// Format coordinate from float to string
function formatCoordinate(coord) {
  return coord.toFixed(6);
}

// Format coordinates from [lng, lat] to string "lng,lat"
function formatCoordinateString(lngLat) {
  return formatCoordinate(lngLat[0]) + "," + formatCoordinate(lngLat[1]);
}

// Parse coordinates from string "lng,lat" to array [lng, lat]
function parseCoordinateString(coordString) {
  if (!coordString) return null;

  const parts = coordString.split(",").map((part) => part.trim());
  if (parts.length !== 2) return null;

  const lng = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);

  if (isNaN(lng) || isNaN(lat)) return null;

  return [lng, lat];
}

// Convert from [lng, lat] format to [lat, lng] for Leaflet
function toLeafletCoordinates(coord) {
  return [coord[1], coord[0]];
}

// Convert from [lat, lng] format to [lng, lat] for OSRM API
function toOsrmCoordinates(coord) {
  return [coord[1], coord[0]];
}

// Get icon for turn instructions
function getTurnIcon(modifier) {
  const icons = {
    straight: "arrow-up",
    "slight right": "arrow-up-right",
    right: "arrow-right",
    "sharp right": "arrow-alt-circle-right",
    uturn: "arrow-circle-up",
    "sharp left": "arrow-alt-circle-left",
    left: "arrow-left",
    "slight left": "arrow-up-left",
    arrive: "flag-checkered",
    depart: "map-marker-alt",
    roundabout: "redo",
    rotary: "sync",
    "roundabout turn": "undo",
    "exit roundabout": "sign-out-alt",
    "exit rotary": "door-open",
    "use lane": "road",
  };

  return icons[modifier.toLowerCase()] || "arrow-up";
}

// Get readable navigation instructions
function getReadableInstruction(maneuver) {
  if (!maneuver) return "Continue";

  const type = maneuver.type || "";
  const modifier = maneuver.modifier || "";

  // Mapping for instructions in English
  const typeInstructions = {
    turn: "Turn",
    "new name": "Continue onto",
    depart: "Start from",
    arrive: "Arrive at",
    merge: "Merge",
    "on ramp": "Take the ramp onto",
    "off ramp": "Take the exit",
    fork: "Take the fork",
    "end of road": "At the end of the road",
    continue: "Continue",
    roundabout: "Enter the roundabout",
    rotary: "Enter the rotary",
    "roundabout turn": "At the roundabout, take",
    "exit roundabout": "Exit the roundabout",
    "exit rotary": "Exit the rotary",
    "use lane": "Use the lane",
  };

  const modifierInstructions = {
    straight: "straight",
    "slight right": "slightly right",
    right: "right",
    "sharp right": "sharp right",
    uturn: "U-turn",
    "sharp left": "sharp left",
    left: "left",
    "slight left": "slightly left",
  };

  let instruction = typeInstructions[type] || "Continue";

  if (modifier && modifierInstructions[modifier.toLowerCase()]) {
    instruction += " " + modifierInstructions[modifier.toLowerCase()];
  }

  return instruction;
}

// Show loading indicator using SweetAlert2
let loadingDialog = null;

function showLoading() {
  // Close any existing dialog first
  if (loadingDialog) {
    loadingDialog.close();
  }

  loadingDialog = Swal.fire({
    title: "Processing...",
    html: '<div class="spinner" style="margin: 0 auto;"></div>',
    showConfirmButton: false,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

// Hide loading indicator
function hideLoading() {
  if (loadingDialog) {
    loadingDialog.close();
    loadingDialog = null;
  }
}

// Generate random color for debug visualization
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Generate URL for OSRM request
function generateOsrmRequestUrl(profile, coordinates, options = {}) {
  const {
    algorithm = "mld",
    alternatives = false,
    steps = true,
    annotations = true,
    geometries = "geojson",
    overview = "full",
  } = options;

  let url = `${CONFIG.osrmBackendUrl}/route/v1/${profile}/`;

  // Format coordinates
  url += coordinates.map((coord) => formatCoordinateString(coord)).join(";");

  // Add query parameters
  const params = new URLSearchParams({
    algorithms: algorithm,
    alternatives: alternatives,
    steps: steps,
    annotations: annotations,
    geometries: geometries,
    overview: overview,
  });

  return `${url}?${params.toString()}`;
}

// Create debounce function for performance optimization
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Create throttle function for performance optimization
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
