window.AUTH_CONFIG = {
  apiBaseUrl: "http://localhost:8080", // Replace with your actual API URL
};

let currentToken = null;

// Listen for auth state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTH_STATE_CHANGED") {
    currentToken = message.token;
    // Refresh dashboards if modal is open
    if (document.getElementById("job-tracker-modal")) {
      initializeModalFunctionality(
        document.getElementById("job-tracker-modal")
      );
    }
  }
});

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
  `;
  document.body.appendChild(modal);

  // Add the authentication and dashboard functionality
  initializeModalFunctionality(modal);

  return modal;
}

async function initializeModalFunctionality(modal) {
  const form = modal.querySelector("#job-form-modal");
  const dashboardSelect = modal.querySelector("#dashboardName");

  // Show loading state while fetching dashboards
  dashboardSelect.innerHTML =
    '<option value="" disabled selected>Loading dashboards...</option>';

  try {
    const dashboards = await window.Auth.getUserDashboards();

    if (dashboards?.length) {
      // Replace the entire innerHTML with just the dashboard options
      dashboardSelect.innerHTML =
        '<option value="" disabled>Select a dashboard...</option>' +
        dashboards
          .map((d) => `<option value="${d.id}">${d.name}</option>`)
          .join("");

      // Set the first dashboard as selected
      dashboardSelect.value = dashboards[0].id;
    } else {
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>No dashboards found</option>';
    }
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    dashboardSelect.innerHTML =
      '<option value="" disabled selected>Error loading dashboards</option>';
  }

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
      applied_date: null,
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: "FETCH_REQUEST",
        config: {
          url: `${window.AUTH_CONFIG.apiBaseUrl}/jobs`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(jobData),
        },
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to save job");
      }

      console.log("Job saved successfully:", response.data);
      alert("Job info saved successfully!");
      modal.style.display = "none";
    } catch (error) {
      console.error("Error saving job:", error);
      alert("Failed to save job. Please try again.");
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
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    // Remove HTML comments
    .replace(/<!--.*?-->/g, "")
    // Remove extra spaces before/after tags
    .replace(/\s*<([^>]*)>\s*/g, "<$1>");

  // Create a temporary div to handle HTML content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanHtml;

  // Convert bullet points before getting text content
  const bulletLists = tempDiv.querySelectorAll("ul");
  bulletLists.forEach((ul) => {
    const items = ul.querySelectorAll("li");
    items.forEach((li) => {
      li.textContent = `• ${li.textContent.trim()}`;
    });
  });

  // Get the text content
  let text = tempDiv.textContent || tempDiv.innerText;

  // Clean up the text
  return (
    text
      // Replace multiple spaces with a single space
      .replace(/\s+/g, " ")
      // Preserve URLs by temporarily replacing dots in them
      .replace(/(https?:\/\/[^\s]+)/gi, (url) => url.replace(/\./g, "{{DOT}}"))
      // Add proper spacing after periods that aren't part of URLs or bullet points
      .replace(/\.(?!\s*[•{{DOT}}])/g, ".\n\n")
      // Clean up section headers
      .replace(/([A-Z][A-Za-z\s]+:)\s*/g, "\n$1\n\n")
      // Ensure bullet points start on new lines
      .replace(/\s*•\s*/g, "\n• ")
      // Replace multiple newlines with max two newlines
      .replace(/\n{3,}/g, "\n\n")
      // Handle "About the job" section
      .replace(/About the job\s*\n+/g, "About the job\n\n")
      // Restore URLs by replacing temporary dots
      .replace(/{{DOT}}/g, ".")
      // Remove any whitespace at start and end
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
let jobSite = null;
const hostname = window.location.hostname;

// Initialize the appropriate job site handler based on hostname
if (hostname.includes("linkedin.com")) {
  jobSite = new LinkedIn();
} else if (hostname.includes("indeed.com")) {
  jobSite = new Indeed();
} else if (hostname.includes("glassdoor.com")) {
  jobSite = new Glassdoor();
} else if (hostname.includes("greenhouse.io")) {
  jobSite = new Greenhouse();
} else if (
  hostname.includes("workday.com") ||
  hostname.includes("myworkday.com") ||
  hostname.includes("myworkdayjobs.com")
) {
  jobSite = new Workday();
} else if (hostname.includes("icims.com")) {
  jobSite = new ICims();
}

// Create the floating button if we're on a job page
if (jobSite && jobSite.isJobPage()) {
  createFloatingButton(jobSite);
}
