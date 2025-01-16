class ICims extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".iCIMS_JobPage",
      company: ".iCIMS_JobHeaderGroup", // We'll parse this differently
      title: ".iCIMS_Header",
      location: ".iCIMS_JobHeaderGroup", // We'll parse this differently
      description: ".iCIMS_InfoMsg_Job",
      salary: ".iCIMS_JobHeaderGroup", // We'll parse this for salary info
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
      description: document.querySelectorAll(selectors.description),
      salary: document.querySelector(selectors.salary),
    };

    // Extract location from the header group
    let location = "";
    if (elements.location) {
      const locationTag = Array.from(
        elements.location.querySelectorAll(".iCIMS_JobHeaderTag")
      ).find((tag) => tag.textContent.includes("Location"));
      if (locationTag) {
        location =
          locationTag
            .querySelector(".iCIMS_JobHeaderData")
            ?.textContent.trim() || "";
      }
    }

    // Extract salary from the header group
    let salary = "";
    if (elements.salary) {
      const salaryTag = Array.from(
        elements.salary.querySelectorAll(".iCIMS_JobHeaderTag")
      ).find((tag) => tag.textContent.includes("Mid"));
      if (salaryTag) {
        salary =
          salaryTag.querySelector(".iCIMS_JobHeaderData")?.textContent.trim() ||
          "";
      }
    }

    // Combine all description sections
    let description = "";
    if (elements.description) {
      elements.description.forEach((section) => {
        const text = section.querySelector(".iCIMS_Expandable_Text");
        if (text) {
          description += text.innerHTML + "\n\n";
        }
      });
    }

    // Extract company name from URL or page content
    const company =
      window.location.hostname.split("-")[1]?.split(".")[0].toUpperCase() || "";

    return {
      company: company,
      position: elements.title?.textContent.trim(),
      location: location,
      url: window.location.href,
      jobDescription: description
        ? window.Utils.convertHtmlToMarkdown(description)
        : "",
      salaryRange: salary,
    };
  }
}

window.ICims = ICims;
