/**
 * SweetAlert helper functions for OSRM Inspector
 */

/**
 * Show a simple alert message
 * @param {string} message - The message to display
 * @param {string} title - Optional title for the alert
 */
function showAlert(message, title = "Information") {
  Swal.fire({
    title: title,
    text: message,
    icon: "info",
    confirmButtonColor: "#4361ee",
    confirmButtonText: "OK",
  });
}

/**
 * Show a success message
 * @param {string} message - The message to display
 * @param {string} title - Optional title for the alert
 */
function showSuccess(message, title = "Success") {
  Swal.fire({
    title: title,
    text: message,
    icon: "success",
    confirmButtonColor: "#4361ee",
    confirmButtonText: "OK",
  });
}

/**
 * Show an error message
 * @param {string} message - The error message to display
 * @param {string} title - Optional title for the alert
 */
function showError(message, title = "Error") {
  Swal.fire({
    title: title,
    text: message,
    icon: "error",
    confirmButtonColor: "#4361ee",
    confirmButtonText: "OK",
  });
}

/**
 * Show a warning message
 * @param {string} message - The warning message to display
 * @param {string} title - Optional title for the alert
 */
function showWarning(message, title = "Warning") {
  Swal.fire({
    title: title,
    text: message,
    icon: "warning",
    confirmButtonColor: "#4361ee",
    confirmButtonText: "OK",
  });
}

/**
 * Show a confirmation dialog with Yes/No options
 * @param {string} message - The confirmation message
 * @param {string} title - Optional title for the confirmation
 * @param {Function} onConfirm - Callback function to execute on confirmation
 * @param {Function} onCancel - Optional callback function to execute on cancel
 */
function showConfirmation(
  message,
  title = "Confirmation",
  onConfirm,
  onCancel = null
) {
  Swal.fire({
    title: title,
    text: message,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#4361ee",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes",
    cancelButtonText: "No",
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === "function") {
      onConfirm();
    } else if (
      result.dismiss === Swal.DismissReason.cancel &&
      typeof onCancel === "function"
    ) {
      onCancel();
    }
  });
}

/**
 * Show an input dialog to get text from the user
 * @param {string} message - The prompt message
 * @param {string} title - Optional title for the prompt
 * @param {string} defaultValue - Optional default value for the input
 * @param {Function} onConfirm - Callback function that receives the input value
 */
function showPrompt(message, title = "Input", defaultValue = "", onConfirm) {
  Swal.fire({
    title: title,
    text: message,
    input: "text",
    inputValue: defaultValue,
    showCancelButton: true,
    confirmButtonColor: "#4361ee",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "OK",
    cancelButtonText: "Cancel",
    inputValidator: (value) => {
      if (!value) {
        return "Please enter a value";
      }
    },
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === "function") {
      onConfirm(result.value);
    }
  });
}

/**
 * Show a custom dialog for editing profile
 * @param {Array} profiles - Array of available profiles
 * @param {string} currentProfile - Current selected profile
 * @param {Function} onSave - Callback function when profile is saved
 */
function showProfileEditor(profiles, currentProfile, onSave) {
  // Create HTML content for the profile editor
  let html = `
    <select id="swal-profile-select" class="swal2-select" style="width:100%; margin-bottom:15px;">
      <option value="custom">Custom profile...</option>
      ${profiles
        .map(
          (profile) =>
            `<option value="${profile}" ${
              profile === currentProfile ? "selected" : ""
            }>${profile}</option>`
        )
        .join("")}
    </select>
    <div id="swal-custom-profile-container" style="display:none; margin-top:10px;">
      <input id="swal-custom-profile-input" class="swal2-input" placeholder="Enter custom profile name">
    </div>
  `;

  Swal.fire({
    title: "Edit Profile",
    html: html,
    showCancelButton: true,
    confirmButtonColor: "#4361ee",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Save",
    cancelButtonText: "Cancel",
    didOpen: () => {
      // Set up event listener for the select dropdown
      const selectElement = document.getElementById("swal-profile-select");
      const customContainer = document.getElementById(
        "swal-custom-profile-container"
      );
      const customInput = document.getElementById("swal-custom-profile-input");

      selectElement.addEventListener("change", function () {
        if (this.value === "custom") {
          customContainer.style.display = "block";
          customInput.focus();
        } else {
          customContainer.style.display = "none";
        }
      });

      // Initialize display
      if (selectElement.value === "custom") {
        customContainer.style.display = "block";
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const selectElement = document.getElementById("swal-profile-select");
      const customInput = document.getElementById("swal-custom-profile-input");

      let newProfile;
      if (selectElement.value === "custom") {
        newProfile = customInput.value.trim();
        if (!newProfile) {
          showWarning("Please enter a custom profile name");
          return;
        }
      } else {
        newProfile = selectElement.value;
      }

      if (typeof onSave === "function") {
        onSave(newProfile);
      }
    }
  });
}

/**
 * Show a loading indicator
 * @param {string} message - The loading message to display
 * @returns {Object} - SweetAlert instance that can be used to close the dialog
 */
function showLoading(message = "Processing...") {
  return Swal.fire({
    title: message,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

/**
 * Show a custom dialog for entering and loading a URL
 * @param {Function} onConfirm - Callback function when URL is confirmed
 */
function showUrlPrompt(onConfirm) {
  Swal.fire({
    title: "Enter OSRM routing URL",
    input: "text",
    inputPlaceholder: "http://localhost:9966/api/route/v1/...",
    showCancelButton: true,
    confirmButtonColor: "#4361ee",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Load",
    cancelButtonText: "Cancel",
    inputValidator: (value) => {
      if (!value) {
        return "Please enter a URL";
      }
      if (!value.includes("/route/v1/")) {
        return "Invalid OSRM routing URL format";
      }
    },
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === "function") {
      onConfirm(result.value);
    }
  });
}

/**
 * Toast notification - shows a small notification at the corner of the screen
 * @param {string} message - The message to display
 * @param {string} icon - Icon type: success, error, warning, info, question
 */
function showToast(message, icon = "success") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  Toast.fire({
    icon: icon,
    title: message,
  });
}
