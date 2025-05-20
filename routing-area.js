/**
 * Module untuk mengelola routing area di OSRM Inspector
 * Dengan fitur upload GeoJSON - REVISI dengan perbaikan loading
 */

// Variabel untuk menyimpan referensi ke layer routing area
let routingAreaLayer = null;
let isRoutingAreaVisible = true; // Default visible

/**
 * Inisialisasi fungsi routing area dengan fitur upload
 */
function initRoutingArea() {
  // Setup event listener untuk tombol load routing area
  document
    .getElementById("btn-load-routing-area")
    .addEventListener("click", promptRoutingAreaFile);

  // Setup event listener untuk tombol upload routing area
  document
    .getElementById("btn-upload-routing-area")
    .addEventListener("click", function () {
      // Trigger klik pada input file tersembunyi
      document.getElementById("routing-area-file-input").click();
    });

  // Setup event listener untuk input file
  document
    .getElementById("routing-area-file-input")
    .addEventListener("change", handleRoutingAreaFileUpload);

  // Setup event listener untuk tombol toggle routing area
  document
    .getElementById("btn-toggle-routing-area")
    .addEventListener("click", toggleRoutingArea);

  // Auto-load routing area terakhir
  autoLoadLastRoutingArea();

  console.log("Routing area module initialized with upload feature");
}

/**
 * Tampilkan loading indicator khusus untuk routing area
 */
function showRoutingAreaLoading() {
  // Gunakan loading indicator global
  showLoading();

  // Catat waktu mulai untuk memastikan loading minimal 1 detik (mencegah flash)
  window.routingAreaLoadStart = Date.now();
}

/**
 * Sembunyikan loading indicator khusus untuk routing area
 */
function hideRoutingAreaLoading() {
  // Pastikan loading ditampilkan minimal 1 detik
  const now = Date.now();
  const loadStart = window.routingAreaLoadStart || now;
  const elapsedTime = now - loadStart;

  if (elapsedTime < 1000) {
    // Jika kurang dari 1 detik, tunda penutupan
    setTimeout(() => {
      hideLoading(); // Tutup loading indicator global
    }, 1000 - elapsedTime);
  } else {
    // Jika lebih dari 1 detik, tutup langsung
    hideLoading(); // Tutup loading indicator global
  }
}

/**
 * Muat file GeoJSON routing area
 * @param {string} filePath - Path ke file GeoJSON
 */
async function loadRoutingArea(filePath) {
  try {
    showRoutingAreaLoading();

    // Ekstrak nama area dari file path
    const areaName = extractAreaNameFromPath(filePath);

    // Baca file GeoJSON
    const response = await window.fs.readFile(filePath, { encoding: "utf8" });
    let geojsonData;

    try {
      geojsonData = JSON.parse(response);
    } catch (parseError) {
      hideRoutingAreaLoading();
      showError(`Invalid JSON in file: ${parseError.message}`);
      return;
    }

    // Validasi GeoJSON
    if (!isValidGeoJSON(geojsonData)) {
      hideRoutingAreaLoading();
      showError(
        "Invalid GeoJSON format. File must contain valid GeoJSON structure."
      );
      return;
    }

    // Tampilkan GeoJSON pada peta
    displayRoutingAreaFromData(geojsonData, areaName, filePath);

    // Simpan file path ke localStorage
    localStorage.setItem("lastRoutingAreaFile", filePath);
  } catch (error) {
    console.error("Error loading routing area:", error);
    hideRoutingAreaLoading();
    showError(`Failed to load routing area: ${error.message}`);

    // Reset info display
    updateRoutingAreaInfo(null, false);
  }
}

/**
 * Handle file upload untuk routing area GeoJSON - FIXED VERSION
 * @param {Event} event - Event dari input file
 */
function handleRoutingAreaFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validasi tipe file
  if (!file.name.endsWith(".geojson") && !file.name.endsWith(".json")) {
    showError("Please upload a GeoJSON file (.geojson or .json)");
    event.target.value = "";
    return;
  }

  // Show loading immediately
  showRoutingAreaLoading();

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      // Parse data GeoJSON
      let geojsonData;
      try {
        geojsonData = JSON.parse(e.target.result);
      } catch (parseError) {
        hideRoutingAreaLoading();
        showError(`Invalid JSON in file: ${parseError.message}`);
        return;
      }

      // Validasi struktur GeoJSON dasar
      if (!isValidGeoJSON(geojsonData)) {
        hideRoutingAreaLoading();
        showError(
          "Invalid GeoJSON format. File must be a valid GeoJSON with type and features properties."
        );
        return;
      }

      // Ekstrak nama dari nama file
      const areaName = extractAreaNameFromPath(file.name);

      // Tampilkan GeoJSON pada peta
      displayRoutingAreaFromData(geojsonData, areaName, file.name);
    } catch (error) {
      hideRoutingAreaLoading();
      console.error("Error processing GeoJSON file:", error);
      showError(`Failed to process GeoJSON file: ${error.message}`);
    }
  };

  reader.onerror = function () {
    hideRoutingAreaLoading();
    showError("Error reading file");
  };

  // Baca file sebagai text
  reader.readAsText(file);

  // Reset input file agar event change bisa dipicu lagi dengan file yang sama
  event.target.value = "";
}

/**
 * Tampilkan routing area dari data GeoJSON yang diunggah - FIXED VERSION
 * @param {Object} geojsonData - Data GeoJSON yang sudah di-parse
 * @param {string} areaName - Nama area
 * @param {string} fileName - Nama file (untuk referensi)
 */
function displayRoutingAreaFromData(geojsonData, areaName, fileName) {
  try {
    // Hapus layer lama jika ada
    if (routingAreaLayer) {
      mapLayers.routingArea.removeLayer(routingAreaLayer);
    }

    // Buat layer baru dengan GeoJSON dengan opsi yang fixed
    routingAreaLayer = L.geoJSON(geojsonData, {
      interactive: false, // Penting! Mencegah interaksi dengan layer
      style: {
        color: "#4cc9f0",
        weight: 2,
        opacity: 0.7,
        fillColor: "#4cc9f0",
        fillOpacity: 0.1,
      },
    });

    // Tambahkan ke layer grup
    mapLayers.routingArea.addLayer(routingAreaLayer);

    // Fit map ke boundary GeoJSON dan tutup loading setelah selesai
    if (routingAreaLayer && routingAreaLayer.getBounds) {
      try {
        const bounds = routingAreaLayer.getBounds();
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (boundsError) {
        console.warn("Error fitting to bounds:", boundsError);
      }
    }

    // Tutup loading indicator sebelum menampilkan alert sukses
    hideRoutingAreaLoading();

    // Update routing area info display
    updateRoutingAreaInfo(areaName, true);

    // Perbarui status UI
    updateRoutingAreaToggleState(true);
    isRoutingAreaVisible = true;

    // Simpan nama area ke localStorage
    localStorage.setItem("lastRoutingAreaName", areaName);

    // Simpan data GeoJSON ke localStorage untuk load otomatis dengan versi ringkas
    try {
      const minifiedGeoJSON = simplifyGeoJSONForStorage(geojsonData);
      localStorage.setItem(
        "routingAreaGeoJSON",
        JSON.stringify(minifiedGeoJSON)
      );
    } catch (storageError) {
      console.warn(
        "Could not save GeoJSON to localStorage (might be too large):",
        storageError
      );
    }

    // Tampilkan alert sukses setelah loading ditutup
    setTimeout(() => {
      showSuccess(`Routing area "${areaName}" loaded successfully`);
    }, 100);
  } catch (error) {
    console.error("Error displaying routing area:", error);
    hideRoutingAreaLoading(); // Pastikan loading ditutup jika terjadi error
    showError(`Failed to display routing area: ${error.message}`);

    // Reset info display
    updateRoutingAreaInfo(null, false);
  }
}

/**
 * Sederhanakan GeoJSON untuk storage
 * Mengurangi precision dan hapus properti yang tidak penting
 * @param {Object} geojsonData - Data GeoJSON yang akan disederhanakan
 * @returns {Object} GeoJSON yang disederhanakan
 */
function simplifyGeoJSONForStorage(geojsonData) {
  try {
    // Clone data untuk menghindari modifikasi asli
    const result = JSON.parse(JSON.stringify(geojsonData));

    // Fungsi untuk menyederhanakan koordinat
    const simplifyCoord = (coord) => {
      if (Array.isArray(coord)) {
        if (typeof coord[0] === "number") {
          // Ini adalah koordinat, bulatkan ke 5 desimal (~1m precision)
          return coord.map((num) => Math.round(num * 100000) / 100000);
        }
        // Ini adalah array yang berisi koordinat, proses rekursif
        return coord.map(simplifyCoord);
      }
      return coord;
    };

    // Proses setiap feature
    if (result.features && Array.isArray(result.features)) {
      result.features.forEach((feature) => {
        // Sederhanakan properti, pertahankan hanya yang penting
        if (feature.properties) {
          const simplifiedProps = {};
          // Pertahankan properti penting saja
          ["name", "title", "description", "id"].forEach((key) => {
            if (feature.properties[key] !== undefined) {
              simplifiedProps[key] = feature.properties[key];
            }
          });
          feature.properties = simplifiedProps;
        }

        // Sederhanakan geometri
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
    return geojsonData; // Return original if error
  }
}

/**
 * Toggle visibility routing area
 */
function toggleRoutingArea() {
  if (!routingAreaLayer) {
    showWarning("No routing area has been loaded yet");
    return;
  }

  isRoutingAreaVisible = !isRoutingAreaVisible;

  if (isRoutingAreaVisible) {
    mapLayers.routingArea.addLayer(routingAreaLayer);

    // Update info display
    const areaName = localStorage.getItem("lastRoutingAreaName") || "Unknown";
    updateRoutingAreaInfo(areaName, true);
  } else {
    mapLayers.routingArea.removeLayer(routingAreaLayer);

    // Hide info display
    updateRoutingAreaInfo(null, false);
  }

  // Update UI toggle button
  updateRoutingAreaToggleState(isRoutingAreaVisible);

  // Show toast
  showToast(
    `Routing area ${isRoutingAreaVisible ? "shown" : "hidden"}`,
    isRoutingAreaVisible ? "success" : "info"
  );
}

/**
 * Update UI toggle state
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
 * Prompt user untuk memilih file GeoJSON routing area
 */
function promptRoutingAreaFile() {
  showPrompt(
    "Enter path to GeoJSON routing area file",
    "Load Routing Area",
    "routing-area.geojson",
    function (filePath) {
      if (filePath) {
        loadRoutingArea(filePath);
      }
    }
  );
}

/**
 * Auto-load routing area terakhir yang digunakan
 */
function autoLoadLastRoutingArea() {
  // Coba load dari localStorage dulu (untuk file yang diunggah)
  const savedGeoJSON = localStorage.getItem("routingAreaGeoJSON");
  const areaName = localStorage.getItem("lastRoutingAreaName");

  if (savedGeoJSON) {
    try {
      const geojsonData = JSON.parse(savedGeoJSON);
      displayRoutingAreaFromData(
        geojsonData,
        areaName || "Saved Area",
        "saved-geojson"
      );
      return;
    } catch (error) {
      console.warn("Could not load GeoJSON from localStorage:", error);
    }
  }

  // Fallback ke file path jika tersedia
  const lastFile = localStorage.getItem("lastRoutingAreaFile");
  if (lastFile) {
    loadRoutingArea(lastFile);
  }
}

/**
 * Update info display routing area
 * @param {string} areaName - Nama area routing
 * @param {boolean} isVisible - Status visibilitas area
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
 * Ekstrak nama area dari file path
 * @param {string} filePath - Path file GeoJSON
 * @returns {string} - Nama area
 */
function extractAreaNameFromPath(filePath) {
  if (!filePath) return "Unknown";

  // Remove file extension
  const withoutExtension = filePath.replace(/\.[^/.]+$/, "");

  // Get last part of path
  const pathParts = withoutExtension.split("/");
  let areaName = pathParts[pathParts.length - 1];

  // Replace hyphens with spaces and capitalize
  areaName = areaName
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return areaName;
}

/**
 * Validasi apakah objek adalah GeoJSON yang valid
 * @param {Object} obj - Objek yang akan divalidasi
 * @returns {boolean} True jika valid
 */
function isValidGeoJSON(obj) {
  // Periksa tipe dasar GeoJSON
  if (!obj || typeof obj !== "object") return false;

  // FeatureCollection harus memiliki features array
  if (obj.type === "FeatureCollection") {
    return Array.isArray(obj.features);
  }

  // Feature harus memiliki properties dan geometry
  if (obj.type === "Feature") {
    return obj.geometry && obj.properties !== undefined;
  }

  // Geometry harus memiliki coordinates
  if (
    [
      "Point",
      "LineString",
      "Polygon",
      "MultiPoint",
      "MultiLineString",
      "MultiPolygon",
    ].includes(obj.type)
  ) {
    return Array.isArray(obj.coordinates);
  }

  // Fallback: periksa apakah memiliki struktur seperti GeoJSON
  return (
    obj.type !== undefined &&
    (obj.features !== undefined ||
      obj.geometry !== undefined ||
      obj.coordinates !== undefined)
  );
}
