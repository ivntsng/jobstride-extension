class Indeed extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".jobsearch-JobComponent",
      company: ".css-1ytmynw",
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

    // Try multiple possible selectors for company
    const companySelectors = [
      ".css-1ytmynw",
      "[data-company-name='true'] .css-1gcjz36",
      ".css-1cjkto6",
      ".jobsearch-CompanyInfoContainer a",
    ];

    let companyElement = null;
    for (const selector of companySelectors) {
      companyElement = document.querySelector(selector);
      if (companyElement) break;
    }

    // Try multiple possible selectors for location
    const locationSelectors = [
      "[data-testid='job-location']",
      "[data-testid='inlineHeader-companyLocation'] div",
      ".css-6z8o9s",
      ".css-1vysp2z div",
      ".jobsearch-JobInfoHeader-subtitle .css-6z8o9s",
      ".jobsearch-CompanyInfoContainer .css-6z8o9s",
    ];

    let locationElement = null;
    for (const selector of locationSelectors) {
      locationElement = document.querySelector(selector);
      if (locationElement) {
        console.log(`Found location with selector: ${selector}`);
        break;
      }
    }

    // If we still don't have a location, try a more aggressive approach
    if (!locationElement) {
      console.log("Trying more aggressive location search");
      // Look for any div containing text that looks like a location
      const possibleLocationDivs = document.querySelectorAll("div");
      for (const div of possibleLocationDivs) {
        const text = div.textContent?.trim();
        if (
          text &&
          (text.includes(", CA") ||
            text.includes(", NY") ||
            text.includes(", TX") ||
            text.includes(", FL") ||
            text.match(/[A-Za-z]+,\s+[A-Z]{2}/))
        ) {
          locationElement = div;
          console.log("Found location with text pattern match:", text);
          break;
        }
      }
    }

    const elements = {
      company: companyElement,
      title: document.querySelector(selectors.title),
      location: locationElement,
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

    // Log what we found for debugging
    console.log("Company element found:", elements.company);
    console.log("Location element found:", elements.location);
    console.log("Location text:", elements.location?.textContent);

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
