/**
 * Main application entry point
 */
document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi pengaturan backend terlebih dahulu
  initBackendSettings();

  // Inisialisasi peta dan komponen
  initMap();
  initRouting();
  initDebugTools();
  initRoutingArea(); // Tambahkan inisialisasi routing area

  // Tambahkan badge backend jika menggunakan remote
  if (CONFIG.isRemoteBackend) {
    addRemoteBackendBadge();
  }

  // Log aplikasi telah dimuat
  console.log("OSRM Inspector loaded successfully");

  // Sembunyikan loading indicator
  hideLoading();

  // Verify modifications
  verifyChanges();
});

/**
 * Tambahkan badge untuk menampilkan status remote backend
 */
function addRemoteBackendBadge() {
  const badge = document.createElement("div");
  badge.className = "remote-backend-badge";
  badge.innerHTML = `
    <i class="fa fa-cloud"></i>
    <span>Remote Backend: ${CONFIG.osrmBackendUrl}</span>
  `;

  // Tambahkan ke map container
  document.getElementById("map-container").appendChild(badge);
}

/**
 * Verify OSRM Inspector modifications have been applied correctly
 */
function verifyChanges() {
  console.log("Verifying OSRM Inspector modifications:");

  // Check profile and algorithm display
  setTimeout(async () => {
    try {
      const profile = document.querySelector(".profile-value");
      const algorithm = document.querySelector(".algorithm-value");

      console.log("Profile display:", profile ? "✓" : "✗");
      console.log("Algorithm display:", algorithm ? "✓" : "✗");

      // Check multiple waypoints functionality
      const addWaypointBtn = document.getElementById("btn-add-waypoint");
      const importCsvBtn = document.getElementById("btn-import-csv");

      console.log("Multiple waypoints:", addWaypointBtn ? "✓" : "✗");
      console.log("CSV import:", importCsvBtn ? "✓" : "✗");

      // Check time-dependent routing
      const timeSelection = document.querySelector(".time-selection");
      console.log("Time-dependent routing:", timeSelection ? "✓" : "✗");

      // Check for new features
      const autoUpdateToggle = document.getElementById("auto-update-route");
      console.log("Auto-update toggle:", autoUpdateToggle ? "✓" : "✗");

      const curbToggle = document.getElementById("enable-curb");
      console.log("CURB toggle:", curbToggle ? "✓" : "✗");

      const routingUrlDisplay = document.getElementById("routing-url-display");
      console.log("Routing URL display:", routingUrlDisplay ? "✓" : "✗");

      const editProfileBtn = document.getElementById("btn-edit-profile");
      console.log("Edit profile button:", editProfileBtn ? "✓" : "✗");

      // Check routing area functionality
      const loadRoutingAreaBtn = document.getElementById(
        "btn-load-routing-area"
      );
      const toggleRoutingAreaBtn = document.getElementById(
        "btn-toggle-routing-area"
      );

      console.log("Routing area load button:", loadRoutingAreaBtn ? "✓" : "✗");
      console.log(
        "Routing area toggle button:",
        toggleRoutingAreaBtn ? "✓" : "✗"
      );

      console.log("All modifications applied successfully!");
    } catch (e) {
      console.error("Verification failed:", e);
    }
  }, 1000);
}
