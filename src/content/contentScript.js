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

    try {
      // Get token from storage
      const tokenData = await chrome.storage.local.get("token");
      const token = tokenData.token;

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
        // Check if the error is related to authentication
        if (
          response.error &&
          (response.error.includes("token") ||
            response.error.includes("auth") ||
            response.error.includes("expired"))
        ) {
          // Trigger a re-login or token refresh
          await chrome.runtime.sendMessage({ type: "REFRESH_TOKEN" });
          alert("Your session has expired. Please login again.");
          return;
        }

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

  const modal = window.createModalForm();

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
    modal.querySelector("#salaryRange").value = jobDetails.salaryRange || "";

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

  // Add the authentication and dashboard functionality
  initializeModalFunctionality(modal);

  document.body.setAttribute("data-site", "indeed");
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
    document.body.setAttribute("data-site", "indeed");
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
        node.matches?.(
          ".job-view-layout, .jobs-search__job-details, .job-details-jobs-container, .jobsearch-ViewJobLayout-jobDisplay"
        ) ||
        node.querySelector?.(
          ".job-view-layout, .jobs-search__job-details, .job-details-jobs-container, .jobsearch-ViewJobLayout-jobDisplay"
        )
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
