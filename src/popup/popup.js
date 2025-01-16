// popup.js

document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("job-form");
  const dashboardSelect = document.getElementById("dashboardName");

  // Load saved form data if it exists
  const savedData = await chrome.storage.local.get("formData");
  if (savedData.formData) {
    Object.keys(savedData.formData).forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = savedData.formData[id];
      }
    });
  }

  // Save form data when any input changes
  form.addEventListener("input", async (e) => {
    if (e.target.id) {
      const formData =
        (await chrome.storage.local.get("formData")).formData || {};
      formData[e.target.id] = e.target.value;
      await chrome.storage.local.set({ formData });
    }
  });

  // Add change event listener specifically for dashboard select
  dashboardSelect.addEventListener("change", async (e) => {
    const formData =
      (await chrome.storage.local.get("formData")).formData || {};
    formData["dashboardName"] = e.target.value;
    await chrome.storage.local.set({ formData });
  });

  // Check auth status and update UI
  const isAuthenticated = await window.Auth.checkAuthStatus();
  if (!isAuthenticated) {
    // Show login button instead of form
    form.style.display = "none";
    const loginButton = document.createElement("button");
    loginButton.textContent = "Login with GitHub";
    loginButton.className = "btn-primary";
    loginButton.onclick = async () => {
      try {
        const token = await window.Auth.initiateGithubLogin();
        if (token) {
          // Store token and refresh the popup
          await chrome.storage.local.set({ token });
          window.location.reload();
        }
      } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed. Please try again.");
      }
    };
    document.querySelector(".card").appendChild(loginButton);
    return;
  }

  // Show loading state while fetching dashboards
  dashboardSelect.innerHTML =
    '<option value="" disabled selected>Loading dashboards...</option>';

  // Fetch and populate dashboards
  try {
    const dashboards = await window.Auth.getUserDashboards();
    console.log("Received dashboards:", dashboards);
    if (dashboards?.length) {
      dashboardSelect.innerHTML = dashboards
        .map((d) => `<option value="${d.id}">${d.name}</option>`)
        .join("");

      // Restore the previously selected dashboard if it exists
      const savedData = await chrome.storage.local.get("formData");
      if (savedData.formData && savedData.formData.dashboardName) {
        dashboardSelect.value = savedData.formData.dashboardName;
      }

      form.style.display = "block";
    } else {
      console.log("No dashboards found or dashboards is null");
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>No dashboards found</option>';
    }
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    dashboardSelect.innerHTML =
      '<option value="" disabled selected>Error loading dashboards</option>';
  }

  // Clear saved data after successful submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Gather form data
    const jobData = {
      dashboard_id: document.getElementById("dashboardName").value.trim(),
      company: document.getElementById("company").value.trim(),
      position: document.getElementById("position").value.trim(),
      location: document.getElementById("location").value.trim(),
      url: document.getElementById("url").value.trim(),
      salary_range: document.getElementById("salaryRange").value.trim(),
      job_description: document.getElementById("jobDescription").value.trim(),
      status: "saved",
      applied_date: null,
    };

    try {
      const response = await fetch(`${window.AUTH_CONFIG.apiBaseUrl}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await chrome.storage.local.get("token")
            ).token
          }`,
        },
        credentials: "include",
        mode: "cors",
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error("Failed to save job");
      }

      const savedJob = await response.json();
      console.log("Job saved successfully:", savedJob);
      alert("Job info saved successfully!");

      // If submission is successful, clear the saved form data
      await chrome.storage.local.remove("formData");
      form.reset();
    } catch (error) {
      console.error("Error saving job:", error);
      alert("Failed to save job. Please try again.");
    }
  });

  const modal = document.getElementById("createDashboardModal");
  const closeModal = modal.querySelector(".close-modal");
  const dashboardForm = document.getElementById("dashboard-form");

  // Close modal functionality
  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Handle dashboard creation
  dashboardForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newDashboardName = document
      .getElementById("newDashboardName")
      .value.trim();

    try {
      const response = await fetch(
        `${window.AUTH_CONFIG.apiBaseUrl}/dashboards/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (
                await chrome.storage.local.get("token")
              ).token
            }`,
          },
          body: JSON.stringify({ name: newDashboardName }),
        }
      );

      if (!response.ok) throw new Error("Failed to create dashboard");

      const newDashboard = await response.json();

      // Add new dashboard to select element
      const option = new Option(newDashboard.name, newDashboard.id);
      dashboardSelect.add(option);
      dashboardSelect.value = newDashboard.id;

      // Close modal and reset form
      modal.style.display = "none";
      dashboardForm.reset();
    } catch (error) {
      console.error("Error creating dashboard:", error);
      alert("Failed to create dashboard. Please try again.");
    }
  });
});
