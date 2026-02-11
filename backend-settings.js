/**
 * Backend Settings Module - Configure OSRM Backend URL
 * Stores settings in localStorage for persistence
 */

// Default backends
const DEFAULT_BACKENDS = {
  local: {
    name: "Local OSRM (Podman)",
    url: "/api",
    description: "Local OSRM instance running via Podman",
  },
  public: {
    name: "OSRM Public Demo",
    url: "https://router.project-osrm.org",
    description: "Public OSRM demo server (rate limited)",
  },
};

// Storage key
const BACKEND_STORAGE_KEY = "osrm_backend_url";

/**
 * Get current backend URL from localStorage or default
 */
function getBackendUrl() {
  const stored = localStorage.getItem(BACKEND_STORAGE_KEY);
  return stored || DEFAULT_BACKENDS.local.url;
}

/**
 * Set backend URL
 */
function setBackendUrl(url) {
  localStorage.setItem(BACKEND_STORAGE_KEY, url);
  // Update CONFIG immediately
  CONFIG.osrmBackendUrl = url;
  console.log("Backend URL updated to:", url);
}

/**
 * Reset to default backend
 */
function resetBackendUrl() {
  localStorage.removeItem(BACKEND_STORAGE_KEY);
  CONFIG.osrmBackendUrl = DEFAULT_BACKENDS.local.url;
}

/**
 * Show Backend Settings Modal
 */
function showBackendSettings() {
  const currentUrl = getBackendUrl();
  const isDefaultLocal = currentUrl === DEFAULT_BACKENDS.local.url;
  const isDefaultPublic = currentUrl === DEFAULT_BACKENDS.public.url;
  const isCustom = !isDefaultLocal && !isDefaultPublic;

  const html = `
    <div style="text-align:left;">
      <div class="backend-option" onclick="selectBackendOption('local')" id="backend-opt-local"
           style="padding:14px;border:2px solid ${isDefaultLocal ? 'var(--accent)' : 'var(--glass-border)'};border-radius:10px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;background:${isDefaultLocal ? 'rgba(91,159,232,0.1)' : 'transparent'};">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="radio" name="backend-choice" value="local" ${isDefaultLocal ? 'checked' : ''} style="cursor:pointer;">
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--white);font-size:0.9rem;">Local OSRM (Podman)</div>
            <div style="font-size:0.75rem;color:var(--white-50);margin-top:2px;">http://localhost:5001</div>
          </div>
        </div>
      </div>
      
      <div class="backend-option" onclick="selectBackendOption('public')" id="backend-opt-public"
           style="padding:14px;border:2px solid ${isDefaultPublic ? 'var(--accent)' : 'var(--glass-border)'};border-radius:10px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;background:${isDefaultPublic ? 'rgba(91,159,232,0.1)' : 'transparent'};">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="radio" name="backend-choice" value="public" ${isDefaultPublic ? 'checked' : ''} style="cursor:pointer;">
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--white);font-size:0.9rem;">OSRM Public Demo</div>
            <div style="font-size:0.75rem;color:var(--white-50);margin-top:2px;">https://router.project-osrm.org</div>
          </div>
        </div>
      </div>
      
      <div class="backend-option" onclick="selectBackendOption('custom')" id="backend-opt-custom"
           style="padding:14px;border:2px solid ${isCustom ? 'var(--accent)' : 'var(--glass-border)'};border-radius:10px;cursor:pointer;transition:all 0.2s;background:${isCustom ? 'rgba(91,159,232,0.1)' : 'transparent'};">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="radio" name="backend-choice" value="custom" ${isCustom ? 'checked' : ''} style="cursor:pointer;">
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--white);font-size:0.9rem;">Custom Backend URL</div>
            <input type="text" id="custom-backend-url" placeholder="https://your-osrm-server.com"
                   value="${isCustom ? currentUrl : ''}"
                   style="width:100%;margin-top:8px;padding:8px 10px;border:1px solid var(--glass-border);border-radius:6px;background:rgba(0,0,0,0.2);color:var(--white);font-size:0.8rem;font-family:var(--font-mono);"
                   onclick="event.stopPropagation();selectBackendOption('custom');">
          </div>
        </div>
      </div>
      
      <div style="margin-top:14px;padding:10px;background:rgba(255,193,7,0.1);border-left:3px solid var(--orange);border-radius:4px;">
        <div style="font-size:0.75rem;color:var(--white-70);">
          <i class="fa fa-info-circle" style="color:var(--orange);margin-right:4px;"></i>
          Remote backends require CORS enabled. Local backends work without configuration.
        </div>
      </div>
    </div>
  `;

  Swal.fire({
    title: "Backend Settings",
    html: html,
    showCancelButton: true,
    confirmButtonText: "Save Changes",
    cancelButtonText: "Cancel",
    width: 480,
    didOpen: () => {
      // Add hover effects
      document.querySelectorAll('.backend-option').forEach(el => {
        el.addEventListener('mouseenter', function() {
          if (!this.querySelector('input').checked) {
            this.style.borderColor = 'var(--glass-border-strong)';
            this.style.background = 'var(--white-08)';
          }
        });
        el.addEventListener('mouseleave', function() {
          if (!this.querySelector('input').checked) {
            this.style.borderColor = 'var(--glass-border)';
            this.style.background = 'transparent';
          }
        });
      });
    },
    preConfirm: () => {
      const selected = document.querySelector('input[name="backend-choice"]:checked').value;
      let newUrl;
      
      if (selected === 'local') {
        newUrl = DEFAULT_BACKENDS.local.url;
      } else if (selected === 'public') {
        newUrl = DEFAULT_BACKENDS.public.url;
      } else if (selected === 'custom') {
        newUrl = document.getElementById('custom-backend-url').value.trim();
        if (!newUrl) {
          Swal.showValidationMessage('Please enter a custom backend URL');
          return false;
        }
        // Add https:// if no protocol specified
        if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
          newUrl = 'https://' + newUrl;
        }
      }
      
      return newUrl;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const oldUrl = getBackendUrl();
      setBackendUrl(result.value);
      
      if (oldUrl !== result.value) {
        showToast(`Backend updated to: ${result.value}`, 'success');
        // Clear any existing route since backend changed
        clearRouteAndWaypoints();
      }
    }
  });
}

/**
 * Select backend option in modal
 */
function selectBackendOption(option) {
  document.querySelectorAll('input[name="backend-choice"]').forEach(radio => {
    radio.checked = radio.value === option;
  });
  
  // Update visual selection
  document.querySelectorAll('.backend-option').forEach(el => {
    el.style.borderColor = 'var(--glass-border)';
    el.style.background = 'transparent';
  });
  
  const selectedEl = document.getElementById(`backend-opt-${option}`);
  if (selectedEl) {
    selectedEl.style.borderColor = 'var(--accent)';
    selectedEl.style.background = 'rgba(91,159,232,0.1)';
  }
  
  // Focus custom input if selected
  if (option === 'custom') {
    document.getElementById('custom-backend-url').focus();
  }
}

/**
 * Initialize backend settings on app load
 */
function initBackendSettings() {
  // Load stored backend URL
  const backendUrl = getBackendUrl();
  CONFIG.osrmBackendUrl = backendUrl;
  console.log("Using OSRM backend:", backendUrl);
  
  // Add backend button to sidebar header
  const sidebarHeader = document.querySelector('.sidebar-header');
  if (sidebarHeader && !document.getElementById('btn-backend-settings')) {
    const btn = document.createElement('button');
    btn.id = 'btn-backend-settings';
    btn.className = 'btn-icon-sm';
    btn.innerHTML = '<i class="fa fa-server"></i>';
    btn.title = 'Backend Settings';
    btn.style.cssText = 'margin-left:auto;width:32px;height:32px;';
    btn.onclick = showBackendSettings;
    sidebarHeader.appendChild(btn);
  }
}

/**
 * Get backend display name for UI
 */
function getBackendDisplayName(url) {
  if (url === DEFAULT_BACKENDS.local.url) return 'Local (Podman)';
  if (url === DEFAULT_BACKENDS.public.url) return 'Public Demo';
  return url.replace(/^https?:\/\//, '');
}
