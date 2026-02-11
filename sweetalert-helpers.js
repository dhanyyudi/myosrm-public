/**
 * SweetAlert helper functions for OSRM Inspector
 */

function showAlert(message, title = "Information") {
  Swal.fire({
    title: title,
    text: message,
    icon: "info",
    confirmButtonText: "OK",
  });
}

function showSuccess(message, title = "Success") {
  Swal.fire({
    title: title,
    text: message,
    icon: "success",
    confirmButtonText: "OK",
  });
}

function showError(message, title = "Error") {
  Swal.fire({
    title: title,
    text: message,
    icon: "error",
    confirmButtonText: "OK",
  });
}

function showWarning(message, title = "Warning") {
  Swal.fire({
    title: title,
    text: message,
    icon: "warning",
    confirmButtonText: "OK",
  });
}

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

function showPrompt(message, title = "Input", defaultValue = "", onConfirm) {
  Swal.fire({
    title: title,
    text: message,
    input: "text",
    inputValue: defaultValue,
    showCancelButton: true,
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

function showProfileEditor(profiles, currentProfile, onSave) {
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
    confirmButtonText: "Save",
    cancelButtonText: "Cancel",
    didOpen: () => {
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

function showUrlPrompt(onConfirm) {
  Swal.fire({
    title: "Enter OSRM routing URL",
    input: "text",
    inputPlaceholder: "http://localhost:9966/api/route/v1/...",
    showCancelButton: true,
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
