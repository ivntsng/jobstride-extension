/*******************************
 *  Chrome Extension Setup
 *******************************/
window.AUTH_CONFIG = {
  apiBaseUrl: "http://localhost:8080",
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

/*******************************
 *  Modal Functionality
 *******************************/
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
      description: document.getElementById("jobDescription").value.trim(),
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

/*******************************
 *  Utility: Convert HTML to Text
 *******************************/
function convertHtmlToText(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  ["script", "style", "svg"].forEach((tag) => {
    tempDiv.querySelectorAll(tag).forEach((el) => el.remove());
  });

  const blockElements = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "div",
    "section",
  ];
  blockElements.forEach((tag) => {
    tempDiv.querySelectorAll(tag).forEach((el) => {
      el.insertAdjacentText("beforebegin", "\n\n");
      el.insertAdjacentText("afterend", "\n\n");
    });
  });

  tempDiv.querySelectorAll("ul, ol").forEach((list) => {
    list.insertAdjacentText("beforebegin", "\n");
    const isOrdered = list.tagName.toLowerCase() === "ol";
    let counter = 1;

    list.querySelectorAll("li").forEach((li) => {
      const prefix = isOrdered ? `${counter}. ` : "• ";
      li.insertAdjacentText("afterbegin", `${prefix}`);
      li.insertAdjacentText("afterend", "\n");
      if (isOrdered) counter++;
    });
    list.insertAdjacentText("afterend", "\n");
  });

  tempDiv.querySelectorAll("br").forEach((br) => {
    br.insertAdjacentText("beforebegin", "\n");
  });

  // 5. Extract and clean text
  let text = tempDiv.textContent
    .replace(/\t+/g, " ")
    .replace(/\r?\n/g, "\n")
    .replace(/[ ]{2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n");
  return text;
}

function createFloatingButton(jobSite) {
  // Check if button already exists
  if (document.getElementById("job-tracker-btn")) {
    return;
  }

  console.log("Creating floating button...");
  const button = document.createElement("button");
  button.id = "job-tracker-btn";
  button.textContent = "Track This Job";
  document.body.appendChild(button);

  const modal = createModalForm();

  button.addEventListener("click", function () {
    const jobDetails = jobSite.extractJobDetails();
    console.log("Extracted job details:", jobDetails);

    // Populate the form fields with extracted info
    modal.querySelector("#position").value = jobDetails.position || "";
    modal.querySelector("#company").value = jobDetails.company || "";
    modal.querySelector("#location").value = jobDetails.location || "";
    modal.querySelector("#url").value = jobDetails.url || "";
    modal.querySelector("#jobDescription").value =
      jobDetails.jobDescription || "";

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

/*******************************
 *  Main Execution
 *******************************/
function initializeJobTracker() {
  let jobSite = null;
  const hostname = window.location.hostname;

  console.log("Initializing job tracker for:", hostname);

  if (hostname.includes("linkedin.com")) {
    jobSite = new window.LinkedIn();
  } else if (hostname.includes("indeed.com")) {
    jobSite = new window.Indeed();
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

  if (jobSite) {
    console.log("Job site handler created:", jobSite.constructor.name);
    jobSite.isJobPage().then((isJobPage) => {
      console.log("Is job page:", isJobPage);
      if (isJobPage) {
        createFloatingButton(jobSite);
      }
    });
  }
}

const observer = new MutationObserver((mutations) => {
  // If the button already exists, do nothing
  if (document.getElementById("job-tracker-btn")) {
    return;
  }

  const relevantChange = mutations.some((mutation) =>
    Array.from(mutation.addedNodes).some((node) => {
      if (node.nodeType !== 1) return false;
      return (
        node.matches?.(".job-view-layout, .jobs-search__job-details") ||
        node.querySelector?.(".job-view-layout, .jobs-search__job-details")
      );
    })
  );

  if (relevantChange) {
    initializeJobTracker();
  }
});

// Observer configuration
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
});

// Also run on initial page load
initializeJobTracker();
