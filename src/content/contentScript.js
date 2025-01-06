// Modal functionality
function createModalForm() {
  const modal = document.createElement("div");
  modal.id = "job-tracker-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Track This Job</h2>
      <form id="job-form-modal">
        <div class="form-group">
          <label for="dashboardName">Select Dashboard</label>
          <select id="dashboardName" required>
            <option value="" disabled selected>Choose a dashboard...</option>
          </select>
          <button type="button" id="createDashboard" class="btn-secondary">
            Create New Dashboard
          </button>
        </div>
        <div class="form-group">
          <label for="company">Company</label>
          <input type="text" id="company" placeholder="e.g. Google" required />
        </div>
        <div class="form-group">
          <label for="position">Position</label>
          <input type="text" id="position" placeholder="e.g. Frontend Engineer" required />
        </div>
        <div class="form-group">
          <label for="location">Location</label>
          <input type="text" id="location" placeholder="e.g. San Francisco" required />
        </div>
        <div class="form-group">
          <label for="jobDescription">Job Description</label>
          <textarea id="jobDescription" rows="6" placeholder="Job description and requirements"></textarea>
        </div>
        <div class="form-group">
          <label for="url">Job URL</label>
          <input type="url" id="url" placeholder="https://example.com/job-post" />
        </div>
        <div class="form-group">
          <label for="salaryRange">Salary Range</label>
          <input type="text" id="salaryRange" placeholder="$80k - $100k" />
        </div>
        <button type="submit" class="btn-primary">Save</button>
      </form>
    </div>

    <div id="createDashboardModal" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h2>Create New Dashboard</h2>
        <form id="dashboard-form">
          <div class="form-group">
            <label for="newDashboardName">Dashboard Name</label>
            <input
              type="text"
              id="newDashboardName"
              placeholder="e.g. Tech Applications 2024"
              required
            />
          </div>
          <button type="submit" class="btn-primary">Create Dashboard</button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add the authentication and dashboard functionality
  initializeModalFunctionality(modal);

  return modal;
}

function initializeModalFunctionality(modal) {
  const form = modal.querySelector("#job-form-modal");
  const dashboardSelect = modal.querySelector("#dashboardName");

  // Show loading state while fetching dashboards
  dashboardSelect.innerHTML =
    '<option value="" disabled selected>Loading dashboards...</option>';

  // Fetch and populate dashboards using Auth service
  (async () => {
    try {
      const dashboards = await window.Auth.getUserDashboards();
      console.log("Received dashboards:", dashboards);

      if (dashboards?.length) {
        dashboardSelect.innerHTML = dashboards
          .map((d) => `<option value="${d.id}">${d.name}</option>`)
          .join("");
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
  })();

  // Handle form submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const token = (await chrome.storage.local.get("token")).token;
    if (!token) {
      alert("Please login first");
      return;
    }

    const jobData = {
      dashboard_id: document.getElementById("dashboardName").value.trim(),
      company: document.getElementById("company").value.trim(),
      position: document.getElementById("position").value.trim(),
      location: document.getElementById("location").value.trim(),
      url: document.getElementById("url").value.trim(),
      salary_range: document.getElementById("salaryRange").value.trim(),
      job_description: document.getElementById("jobDescription").value.trim(),
      status: "saved",
      applied_date: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${window.AUTH_CONFIG.apiBaseUrl}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        mode: "cors",
        body: JSON.stringify(jobData),
      });

      if (!response.ok) throw new Error("Failed to save job");

      const savedJob = await response.json();
      console.log("Job saved successfully:", savedJob);
      alert("Job info saved successfully!");
      modal.style.display = "none";
    } catch (error) {
      console.error("Error saving job:", error);
      alert("Failed to save job. Please try again.");
    }
  });

  // Handle dashboard creation modal
  const createDashboardBtn = modal.querySelector("#createDashboard");
  const dashboardModal = modal.querySelector("#createDashboardModal");
  const closeModal = dashboardModal.querySelector(".close-modal");
  const dashboardForm = modal.querySelector("#dashboard-form");

  createDashboardBtn.addEventListener("click", () => {
    dashboardModal.style.display = "block";
  });

  closeModal.addEventListener("click", () => {
    dashboardModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === dashboardModal) {
      dashboardModal.style.display = "none";
    }
  });

  // Handle dashboard creation
  dashboardForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newDashboardName = modal
      .querySelector("#newDashboardName")
      .value.trim();

    try {
      const token = (await chrome.storage.local.get("token")).token;
      const response = await fetch(
        `${window.AUTH_CONFIG.apiBaseUrl}/api/dashboards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
      dashboardModal.style.display = "none";
      dashboardForm.reset();
    } catch (error) {
      console.error("Error creating dashboard:", error);
      alert("Failed to create dashboard. Please try again.");
    }
  });
}

// Utils
function convertHtmlToMarkdown(html) {
  // First, handle common LinkedIn job description patterns
  const cleanHtml = html
    // Remove any hidden elements
    .replace(/<div[^>]*style="display:\s*none[^>]*>.*?<\/div>/g, "")
    // Remove any script tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove SVG elements
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");

  // Create a temporary div to handle HTML content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanHtml;

  // Get the text content
  let text = tempDiv.textContent || tempDiv.innerText;

  // Clean up the text
  return (
    text
      // Replace multiple spaces with a single space
      .replace(/\s+/g, " ")
      // Replace multiple newlines with max two newlines
      .replace(/\n{3,}/g, "\n\n")
      // Handle "About the job" section
      .replace(/About the job\s*\n+/g, "About the job\n\n")
      // Trim whitespace at start and end
      .trim()
  );
}

// LinkedIn implementation
class LinkedIn extends JobSite {
  getSelectors() {
    return {
      jobPage: ".job-view-layout",
      company: ".job-details-jobs-unified-top-card__company-name a",
      title: ".t-24.job-details-jobs-unified-top-card__job-title h1",
      location:
        ".job-details-jobs-unified-top-card__primary-description-container .tvm__text:first-child",
      description:
        ".jobs-description__content .jobs-description-content__text--stretch",
    };
  }

  isJobPage() {
    const selectors = this.getSelectors();
    return document.querySelector(selectors.jobPage) !== null;
  }

  extractJobDetails() {
    const selectors = this.getSelectors();
    const elements = {
      company: document.querySelector(selectors.company),
      title: document.querySelector(selectors.title),
      location: document.querySelector(selectors.location),
      description: document.querySelector(selectors.description),
    };

    let description = "";
    if (elements.description) {
      // Get clean text content while preserving bullet points
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = elements.description.innerHTML;

      // Convert bullet points before getting text content
      const bulletLists = tempDiv.querySelectorAll("ul");
      bulletLists.forEach((ul) => {
        const items = ul.querySelectorAll("li");
        items.forEach((li) => {
          li.textContent = `• ${li.textContent}`;
        });
      });

      // Clean up the text
      description = tempDiv.innerText
        // Remove extra whitespace
        .replace(/\s+/g, " ")
        // Add proper spacing after periods that aren't part of bullet points
        .replace(/\.(?!\s*•)/g, ".\n\n")
        // Clean up "About the job" section
        .replace(/About the job\s*/g, "About the job\n\n")
        // Ensure bullet points start on new lines
        .replace(/\s*•\s*/g, "\n• ")
        // Remove any excessive newlines
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    return {
      company: elements.company?.textContent.trim(),
      position: elements.title?.textContent.trim(),
      location: elements.location?.textContent.trim() || "",
      url: window.location.href,
      jobDescription: description,
    };
  }
}

// Button and modal functionality
function createFloatingButton(jobSite) {
  console.log("Creating floating button...");
  const button = document.createElement("button");
  button.id = "job-tracker-btn";
  button.textContent = "Track This Job";
  document.body.appendChild(button);

  const modal = createModalForm();

  button.addEventListener("click", function () {
    const jobDetails = jobSite.extractJobDetails();
    console.log("Extracted job details:", jobDetails);

    // Populate form with extracted details
    modal.querySelector("#position").value = jobDetails.position || "";
    modal.querySelector("#company").value = jobDetails.company || "";
    modal.querySelector("#location").value = jobDetails.location || "";
    modal.querySelector("#url").value = jobDetails.url || "";
    modal.querySelector("#jobDescription").value = jobDetails.jobDescription;

    modal.style.display = "block";
  });

  // Close modal functionality
  const closeBtn = modal.querySelector(".close");
  closeBtn.onclick = function () {
    modal.style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

// Main execution
const hostname = window.location.hostname;
let jobSite = null;

if (hostname.includes("linkedin.com")) {
  jobSite = new LinkedIn();
}

if (jobSite && jobSite.isJobPage()) {
  createFloatingButton(jobSite);
}
