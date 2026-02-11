/**
 * Module for managing backend configuration
 */

/**
 * Initialize backend settings
 */
function initBackendSettings() {
  // Add menu item for backend settings
  addBackendSettingsMenuItem();

  // Add handlers for connection status
  setupBackendStatusIndicator();

  // Check backend connection
  checkBackendConnection();
}

/**
 * Add menu item for backend settings
 */
function addBackendSettingsMenuItem() {
  // Get sidebar header
  const sidebarHeader = document.querySelector(".sidebar-header");

  // Create settings button
  const settingsButton = document.createElement("button");
  settingsButton.id = "btn-backend-settings";
  settingsButton.className = "btn-header-icon";
  settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
  settingsButton.title = "Backend Settings";

  // Add event listener
  settingsButton.addEventListener("click", showBackendSettingsDialog);

  // Add to sidebar header
  sidebarHeader.appendChild(settingsButton);

  // Add backend status indicator
  const statusIndicator = document.createElement("div");
  statusIndicator.id = "backend-status-indicator";
  statusIndicator.className = "backend-status unknown";
  statusIndicator.title = "Backend status: Checking...";

  // Add to sidebar header
  sidebarHeader.appendChild(statusIndicator);
}

/**
 * Set up backend status indicator
 */
function setupBackendStatusIndicator() {
  // Check backend status every 30 seconds
  setInterval(checkBackendConnection, 30000);

  // Add event listener for clicks on the indicator
  const indicator = document.getElementById("backend-status-indicator");
  if (indicator) {
    indicator.addEventListener("click", function () {
      checkBackendConnection(true); // Force check
    });
  }
}

/**
 * Check connection to backend
 * @param {boolean} showFeedback - Whether to show feedback to user
 */
async function checkBackendConnection(showFeedback = false) {
  if (showFeedback) {
    showToast("Checking backend connection...", "info");
  }

  const indicator = document.getElementById("backend-status-indicator");

  try {
    // Change to 'checking' state
    indicator.className = "backend-status checking";
    indicator.title = "Backend status: Checking...";

    // Try to access backend status endpoint
    const url = `${CONFIG.osrmBackendUrl}/status`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      // Backend responded correctly
      indicator.className = "backend-status connected";
      indicator.title = "Backend status: Connected";

      // Get backend status information
      const data = await response.json();
      if (data && data.profile) {
        indicator.title = `Backend connected: ${data.profile} profile`;
      }

      if (showFeedback) {
        showToast("Backend connection successful!", "success");
      }

      return true;
    } else {
      // Backend responded but with an error
      indicator.className = "backend-status error";
      indicator.title = `Backend error: HTTP ${response.status}`;

      if (showFeedback) {
        showError(`Backend error: HTTP ${response.status}`);
      }

      return false;
    }
  } catch (error) {
    // Cannot connect to backend
    indicator.className = "backend-status disconnected";
    indicator.title = `Backend disconnected: ${error.message}`;

    if (showFeedback) {
      showError(`Backend connection failed: ${error.message}`);
    }

    return false;
  }
}

/**
 * Display backend settings dialog
 */
function showBackendSettingsDialog() {
  // Get current backend URL
  const currentUrl = CONFIG.osrmBackendUrl;

  // Check if using default URL
  const isDefaultUrl = currentUrl === "https://api.myosrm.my.id";

  // Custom CSS for dialog
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

  // Create HTML for dialog
  const html = `
      ${customStyles}
      <div class="backend-options">
        <div class="backend-option">
          <input type="radio" id="backend-default" name="backend-type" value="default" ${
            isDefaultUrl ? "checked" : ""
          }>
          <div class="backend-option-content">
            <div class="backend-option-title">Default OSRM Backend (Cloudflare Tunnel)</div>
            <div class="backend-option-desc">Use the OSRM backend hosted at api.myosrm.my.id via Cloudflare Tunnel.</div>
          </div>
        </div>
        
        <div class="backend-option">
          <input type="radio" id="backend-custom" name="backend-type" value="custom" ${
            !isDefaultUrl ? "checked" : ""
          }>
          <div class="backend-option-content">
            <div class="backend-option-title">Custom Backend URL</div>
            <div class="backend-option-desc">Connect to an OSRM backend at a custom URL (local or remote).</div>
          </div>
        </div>
        
        <div id="custom-backend-container" style="${
          !isDefaultUrl ? "" : "opacity: 0.5;"
        }">
          <label for="backend-url-input">Custom Backend URL:</label>
          <input type="text" id="backend-url-input" placeholder="https://router.project-osrm.org" value="${
            !isDefaultUrl ? currentUrl : ""
          }">
          <div class="backend-examples">
            Examples:<br>
            - https://router.project-osrm.org<br>
            - http://localhost:5000
          </div>
        </div>
        
        <div class="backend-note">
          <i class="fa fa-info-circle"></i> Changing the backend will affect all routing features. Remote backends require properly configured CORS.
        </div>
      </div>
    `;

  // Show SweetAlert dialog
  Swal.fire({
    title: "Backend Settings",
    html: html,
    width: 600,
    showCancelButton: true,
    confirmButtonText: "Save Changes",
    cancelButtonText: "Cancel",
    didOpen: () => {
      // Add event listeners for radio buttons
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

        // Validate URL
        if (!newBackendUrl) {
          showError("Backend URL cannot be empty");
          return;
        }

        // Ensure URL starts with http:// or https://
        if (
          !newBackendUrl.startsWith("http://") &&
          !newBackendUrl.startsWith("https://")
        ) {
          showError("Backend URL must start with http:// or https://");
          return;
        }

        // Auto-correct public OSRM server to HTTPS to avoid mixed content
        if (newBackendUrl === "http://router.project-osrm.org" || 
            newBackendUrl === "http://router.project-osrm.org/") {
          newBackendUrl = "https://router.project-osrm.org";
          console.log("Auto-corrected OSRM server URL to HTTPS to avoid mixed content issues");
        }

        // Warn about mixed content if using HTTP on HTTPS page
        if (newBackendUrl.startsWith("http://") && window.location.protocol === "https:") {
          showWarning("Using HTTP backend on HTTPS page may cause mixed content blocking. Consider using HTTPS for the backend.");
        }
      }

      // Save in localStorage
      localStorage.setItem("osrmBackendUrl", newBackendUrl);

      // Show confirmation and reload page
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
