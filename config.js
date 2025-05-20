/**
 * Konfigurasi untuk OSRM Inspector
 */
const CONFIG = (function () {
  // Cek jika ada parameter backend di URL (untuk testing cepat)
  const urlParams = new URLSearchParams(window.location.search);
  const urlBackend = urlParams.get("backend");

  // Cek jika ada backend yang disimpan di localStorage
  const storedBackend = localStorage.getItem("osrmBackendUrl");

  // Default backend config untuk tunnel Cloudflare
  const defaultBackend = "https://api.myosrm.my.id";

  // Prioritaskan parameter URL, lalu localStorage, lalu default
  const osrmBackendUrl = urlBackend || storedBackend || defaultBackend;

  return {
    // Backend API URL - disesuaikan dengan prioritas
    osrmBackendUrl: osrmBackendUrl,
    // Status backend
    isRemoteBackend: osrmBackendUrl.startsWith("http"),

    // Default Map Settings
    map: {
      center: [-0.084039, 106.7709673], // Changed center to requested coordinates
      zoom: 5, // Increased zoom to show wider area view of Asia and Australia
      maxZoom: 19,
      minZoom: 2,
    },

    // Routing Options
    routing: {
      // Colors per profile
      colors: {
        driving: "#3498db",
        walking: "#2ecc71",
        cycling: "#9b59b6",
        van: "#f39c12",
        van_2022: "#e74c3c",
        van_scpa: "#1abc9c",
        truck_staticth: "#8e44ad", // Ungu untuk truck_staticth
        car: "#27ae60",
        // Add more profile-specific colors as needed
      },

      lineWeight: 6,
      lineOpacity: 0.75,
      highlightOpacity: 0.9,
    },

    // Debug Visualization
    debug: {
      // Node options
      nodes: {
        color: "#f72585", // Updated to match modern UI color
        radius: 4,
        fillOpacity: 0.8,
        weight: 1,
      },

      // Edge options
      edges: {
        color: "#4cc9f0", // Updated to match modern UI color
        weight: 3,
        opacity: 0.7,
      },

      // Cell options
      cells: {
        color: "#f8961e", // Updated to match modern UI color
        fillOpacity: 0.2,
        weight: 1,
        opacity: 0.7,
      },

      // Turn options
      turns: {
        color: "#43aa8b", // Updated to match modern UI color
        iconSize: [20, 20],
      },

      // Speed options
      speed: {
        color: "#277da1", // Updated to match modern UI color
        fontSize: 10,
      },

      // Road names options
      names: {
        color: "#9e0059", // Updated to match modern UI color
        fontSize: 10,
      },

      // Limit how many debug items to show at once
      maxNodes: 1000,
      maxEdges: 500,
      maxCells: 100,
    },
  };
})();
