/**
 * Configuration for OSRM Inspector
 */
const CONFIG = {
  // Backend API URL
  osrmBackendUrl: "/api",

  // Default Map Settings
  map: {
    center: [-0.084039, 106.7709673],
    zoom: 5,
    maxZoom: 19,
    minZoom: 2,
  },

  // Routing Options
  routing: {
    colors: {
      truck18w: "#e74c3c",
      driving: "#3498db",
      walking: "#2ecc71",
      cycling: "#9b59b6",
      van: "#f39c12",
      van_2022: "#e74c3c",
      van_scpa: "#1abc9c",
      truck_staticth: "#8e44ad",
      car: "#27ae60",
    },

    lineWeight: 6,
    lineOpacity: 0.75,
    highlightOpacity: 0.9,
  },

  // Debug Visualization
  debug: {
    nodes: {
      color: "#f72585",
      radius: 4,
      fillOpacity: 0.8,
    },

    edges: {
      color: "#4cc9f0",
      weight: 3,
      opacity: 0.7,
    },

    speed: {
      color: "#277da1",
      fontSize: 10,
    },

    maxNodes: 1000,
    maxEdges: 500,
  },
};
