/**
 * Module untuk mengelola konfigurasi backend
 */

/**
 * Inisialisasi pengaturan backend
 */
function initBackendSettings() {
  // Tambahkan item menu untuk backend settings
  addBackendSettingsMenuItem();

  // Tambahkan handler untuk status koneksi
  setupBackendStatusIndicator();

  // Periksa koneksi backend
  checkBackendConnection();
}

/**
 * Tambahkan item menu untuk pengaturan backend
 */
function addBackendSettingsMenuItem() {
  // Dapatkan sidebar header
  const sidebarHeader = document.querySelector(".sidebar-header");

  // Buat tombol pengaturan
  const settingsButton = document.createElement("button");
  settingsButton.id = "btn-backend-settings";
  settingsButton.className = "btn-header-icon";
  settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
  settingsButton.title = "Backend Settings";

  // Tambahkan event listener
  settingsButton.addEventListener("click", showBackendSettingsDialog);

  // Tambahkan ke sidebar header
  sidebarHeader.appendChild(settingsButton);

  // Tambahkan indikator status backend
  const statusIndicator = document.createElement("div");
  statusIndicator.id = "backend-status-indicator";
  statusIndicator.className = "backend-status unknown";
  statusIndicator.title = "Backend status: Checking...";

  // Tambahkan ke sidebar header
  sidebarHeader.appendChild(statusIndicator);
}

/**
 * Setup indikator status backend
 */
function setupBackendStatusIndicator() {
  // Check backend status setiap 30 detik
  setInterval(checkBackendConnection, 30000);

  // Tambahkan event listener untuk klik pada indikator
  const indicator = document.getElementById("backend-status-indicator");
  if (indicator) {
    indicator.addEventListener("click", function () {
      checkBackendConnection(true); // Force check
    });
  }
}

/**
 * Cek koneksi ke backend
 * @param {boolean} showFeedback - Whether to show feedback to user
 */
async function checkBackendConnection(showFeedback = false) {
  if (showFeedback) {
    showToast("Checking backend connection...", "info");
  }

  const indicator = document.getElementById("backend-status-indicator");

  try {
    // Ubah ke 'checking' state
    indicator.className = "backend-status checking";
    indicator.title = "Backend status: Checking...";

    // Coba akses endpoint status backend
    const url = `${CONFIG.osrmBackendUrl}/status`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      // Backend merespons dengan benar
      indicator.className = "backend-status connected";
      indicator.title = "Backend status: Connected";

      // Ambil informasi status backend
      const data = await response.json();
      if (data && data.profile) {
        indicator.title = `Backend connected: ${data.profile} profile`;
      }

      if (showFeedback) {
        showToast("Backend connection successful!", "success");
      }

      return true;
    } else {
      // Backend merespons tapi dengan error
      indicator.className = "backend-status error";
      indicator.title = `Backend error: HTTP ${response.status}`;

      if (showFeedback) {
        showError(`Backend error: HTTP ${response.status}`);
      }

      return false;
    }
  } catch (error) {
    // Tidak dapat terhubung ke backend
    indicator.className = "backend-status disconnected";
    indicator.title = `Backend disconnected: ${error.message}`;

    if (showFeedback) {
      showError(`Backend connection failed: ${error.message}`);
    }

    return false;
  }
}

/**
 * Tampilkan dialog pengaturan backend
 */
function showBackendSettingsDialog() {
  // Get current backend URL
  const currentUrl = CONFIG.osrmBackendUrl;

  // Cek apakah menggunakan URL default
  const isDefaultUrl = currentUrl === "https://api.myosrm.my.id";

  // Custom CSS untuk dialog
  const customStyles = `
      <style>
        .backend-option {
          display: flex;
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background-color: #f9f9f9;
        }
        .backend-option:hover {
          background-color: #f0f0f0;
        }
        .backend-option input[type="radio"] {
          margin-right: 10px;
        }
        .backend-option-content {
          flex: 1;
        }
        .backend-option-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .backend-option-desc {
          font-size: 12px;
          color: #666;
        }
        #custom-backend-container {
          margin-top: 15px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 6px;
          border: 1px solid #ddd;
          transition: all 0.3s ease;
        }
        #backend-url-input {
          width: 100%;
          padding: 10px;
          margin-top: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .backend-examples {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
        }
        .backend-note {
          padding: 10px;
          background-color: #fff9e6;
          border-left: 3px solid #f39c12;
          margin-top: 15px;
          font-size: 12px;
        }
      </style>
    `;

  // Buat HTML untuk dialog
  const html = `
      ${customStyles}
      <div class="backend-options">
        <div class="backend-option">
          <input type="radio" id="backend-default" name="backend-type" value="default" ${
            isDefaultUrl ? "checked" : ""
          }>
          <div class="backend-option-content">
            <div class="backend-option-title">Default OSRM Backend (Cloudflare Tunnel)</div>
            <div class="backend-option-desc">Gunakan OSRM backend yang dihosting di api.myosrm.my.id melalui Cloudflare Tunnel.</div>
          </div>
        </div>
        
        <div class="backend-option">
          <input type="radio" id="backend-custom" name="backend-type" value="custom" ${
            !isDefaultUrl ? "checked" : ""
          }>
          <div class="backend-option-content">
            <div class="backend-option-title">Custom Backend URL</div>
            <div class="backend-option-desc">Hubungkan ke OSRM backend di URL kustom (lokal atau remote).</div>
          </div>
        </div>
        
        <div id="custom-backend-container" style="${
          !isDefaultUrl ? "" : "opacity: 0.5;"
        }">
          <label for="backend-url-input">Custom Backend URL:</label>
          <input type="text" id="backend-url-input" placeholder="https://another-backend.example.com" value="${
            !isDefaultUrl ? currentUrl : ""
          }">
          <div class="backend-examples">
            Examples:<br>
            - https://osrm-api.example.com<br>
            - http://localhost:5000
          </div>
        </div>
        
        <div class="backend-note">
          <i class="fa fa-info-circle"></i> Perubahan backend akan memengaruhi semua fitur routing. Backend remote membutuhkan CORS yang dikonfigurasi dengan benar.
        </div>
      </div>
    `;

  // Tampilkan SweetAlert dialog
  Swal.fire({
    title: "Backend Settings",
    html: html,
    width: 600,
    showCancelButton: true,
    confirmButtonText: "Save Changes",
    cancelButtonText: "Cancel",
    didOpen: () => {
      // Tambahkan event listener untuk radio buttons
      const defaultRadio = document.getElementById("backend-default");
      const customRadio = document.getElementById("backend-custom");
      const customContainer = document.getElementById(
        "custom-backend-container"
      );

      defaultRadio.addEventListener("change", function () {
        customContainer.style.opacity = "0.5";
      });

      customRadio.addEventListener("change", function () {
        customContainer.style.opacity = "1.0";
      });
    },
  }).then((result) => {
    if (result.isConfirmed) {
      // Get selected backend type
      const defaultRadio = document.getElementById("backend-default");
      const backendUrlInput = document.getElementById("backend-url-input");

      // Set new backend URL based on selection
      let newBackendUrl;
      if (defaultRadio.checked) {
        newBackendUrl = "https://api.myosrm.my.id";
      } else {
        newBackendUrl = backendUrlInput.value.trim();

        // Validasi URL
        if (!newBackendUrl) {
          showError("Backend URL cannot be empty");
          return;
        }

        // Pastikan URL berbentuk http:// atau https://
        if (
          !newBackendUrl.startsWith("http://") &&
          !newBackendUrl.startsWith("https://")
        ) {
          showError("Backend URL must start with http:// or https://");
          return;
        }
      }

      // Save di localStorage
      localStorage.setItem("osrmBackendUrl", newBackendUrl);

      // Tampilkan konfirmasi dan reload page
      Swal.fire({
        title: "Backend Updated",
        text: "Backend settings have been saved. The page will reload to apply changes.",
        icon: "success",
        confirmButtonText: "Reload Now",
      }).then(() => {
        window.location.reload();
      });
    }
  });
}
