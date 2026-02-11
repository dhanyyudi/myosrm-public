/**
 * Configuration for OSRM Inspector - Public Edition
 * 
 * Backend can be configured via the settings icon in the sidebar.
 * Default: Public OSRM demo (works immediately on deployment)
 */
const CONFIG = {
  // Backend API URL - defaults to public demo for immediate use
  // Users can change this via Settings → Backend
  osrmBackendUrl: "https://router.project-osrm.org",

  // Default Map Settings
  map: {
    center: [-0.084039, 106.7709673],
    zoom: 5,
    maxZoom: 19,
    minZoom: 2,
  },

  // Routing Options
  routing: {
    // Profile mapping: display name → API profile name
    // Public OSRM only supports: driving, walking, cycling
    // Local SWAT backend supports custom profiles: truck18w, van, etc.
    profiles: {
      public: [
        { id: "driving", name: "Driving", api: "driving" },
        { id: "walking", name: "Walking", api: "walking" },
        { id: "cycling", name: "Cycling", api: "cycling" },
      ],
      local: [
        { id: "driving", name: "Driving", api: "driving" },
        { id: "truck18w", name: "Truck 18W", api: "driving" },
        { id: "truck10w", name: "Truck 10W", api: "driving" },
        { id: "van", name: "Van", api: "driving" },
        { id: "walking", name: "Walking", api: "walking" },
        { id: "cycling", name: "Cycling", api: "cycling" },
      ],
    },
    colors: {
      driving: "#3498db",
      truck18w: "#e74c3c",
      truck10w: "#f39c12",
      van: "#9b59b6",
      walking: "#2ecc71",
      cycling: "#9b59b6",
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
