// popup.js

document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("job-form");
  const dashboardSelect = document.getElementById("dashboardName");

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
    if (dashboards?.length) {
      dashboardSelect.innerHTML = dashboards
        .map((d) => `<option value="${d.id}">${d.name}</option>`)
        .join("");
      form.style.display = "block";
    } else {
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>No dashboards found</option>';
    }
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    dashboardSelect.innerHTML =
      '<option value="" disabled selected>Error loading dashboards</option>';
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Gather form data
    const dashboardId = document.getElementById("dashboardName").value.trim();
    const company = document.getElementById("company").value.trim();
    const position = document.getElementById("position").value.trim();
    const location = document.getElementById("location").value.trim();
    const url = document.getElementById("url").value.trim();
    const salaryRange = document.getElementById("salaryRange").value.trim();
    const jobDescription = document
      .getElementById("jobDescription")
      .value.trim();

    // Create a job object
    const jobData = {
      dashboardId,
      company,
      position,
      location,
      url,
      salaryRange,
      jobDescription,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `${window.AUTH_CONFIG.apiBaseUrl}/api/jobs`,
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
          body: JSON.stringify(jobData),
        }
      );

      if (!response.ok) throw new Error("Failed to save job");

      console.log("Job data saved:", jobData);
      alert("Job info saved successfully!");
      form.reset();
    } catch (error) {
      console.error("Error saving job:", error);
      alert("Failed to save job. Please try again.");
    }
  });

  const createDashboardBtn = document.getElementById("createDashboard");
  const modal = document.getElementById("createDashboardModal");
  const closeModal = modal.querySelector(".close-modal");
  const dashboardForm = document.getElementById("dashboard-form");

  // Show modal when clicking Create New Dashboard
  createDashboardBtn.addEventListener("click", () => {
    modal.style.display = "block";
  });

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
        `${window.AUTH_CONFIG.apiBaseUrl}/api/dashboards`,
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
