class Indeed extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".jobsearch-JobComponent",
      company: "[data-company-name='true'] .css-1gcjz36",
      title: ".jobsearch-JobInfoHeader-title",
      location: "[data-testid='job-location']",
      description: "#jobDescriptionText",
      salary: "#salaryInfoAndJobType",
    };
  }

  isJobPage() {
    const selectors = this.getSelectors();
    return new Promise((resolve) => {
      setTimeout(() => {
        const element = document.querySelector(selectors.jobPage);
        console.log("Indeed job page element:", element);
        console.log("Current URL:", window.location.href);
        resolve(!!element);
      }, 500);
    });
  }

  extractJobDetails() {
    const selectors = this.getSelectors();
    const elements = {
      company: document.querySelector(selectors.company),
      title: document.querySelector(selectors.title),
      location: document.querySelector(selectors.location),
      description: document.querySelector(selectors.description),
      salary: document.querySelector(selectors.salary),
    };

    let salaryRange = "";
    if (elements.salary) {
      const salarySpan = elements.salary.querySelector(".css-1jh4tn2");
      if (salarySpan) {
        salaryRange = salarySpan.textContent.trim();
      }
    }

    let jobDescription = "";
    if (elements.description) {
      jobDescription = window.Utils.convertHtmlToMarkdown(
        elements.description.innerHTML
      );
    }

    return {
      company: elements.company?.textContent.trim() || "",
      position: elements.title?.textContent.trim() || "",
      location: elements.location?.textContent.trim() || "",
      url: window.location.href,
      jobDescription: jobDescription,
      salaryRange: salaryRange,
    };
  }
}

window.Indeed = Indeed;
