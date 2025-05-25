class Ashby extends window.JobSite {
  getSelectors() {
    return {
      jobPage:
        "._navRoot_1e3cr_29, .ashby-job-posting-header, ._container_ud4nd_29",
      company: "._navLogoWordmarkImage_1e3cr_105",
      title: "._title_ud4nd_34, h2",
      location: "._left_14ib5_426 p, .job-location",
      description: "._descriptionText_14ib5_206, .job-description",
      salary: "._compensationTierSummary_14ib5_335",
    };
  }

  isJobPage() {
    console.log("Ashby.isJobPage() called");
    console.log("Current URL:", window.location.href);
    console.log("Hostname:", window.location.hostname);
    console.log("Pathname:", window.location.pathname);

    // For Ashby, we need to check the URL first
    const isAshbyDomain = window.location.hostname === "jobs.ashbyhq.com";
    console.log("Is Ashby domain?", isAshbyDomain);

    if (isAshbyDomain) {
      console.log("Ashby URL detected:", window.location.href);

      // Check for the specific job posting URL pattern with UUID
      const jobPostingPattern =
        /\/[^\/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const isValidJobUrl = jobPostingPattern.test(window.location.pathname);
      console.log("Does URL match job posting pattern?", isValidJobUrl);

      if (isValidJobUrl) {
        console.log("Ashby job page detected by URL pattern");
        return Promise.resolve(true);
      }

      // Direct check for the specific DOM structure
      const domCheck = () => {
        const selectors = [
          ".ashby-job-posting-page",
          "[data-testid='job-posting']",
          ".posting-headline",
          ".posting-content",
          // Add some more general selectors that might be present
          "h1", // Company name is usually in h1
          "h2", // Job title is usually in h2
          ".job-description",
          ".posting-categories",
        ];

        console.log("Checking DOM selectors...");
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          console.log(`Selector "${selector}" present?`, !!element);
          if (element) {
            console.log(`Found element with selector: ${selector}`, element);
          }
        }

        return selectors.some((selector) => document.querySelector(selector));
      };

      // Wait for the DOM to be ready
      return new Promise((resolve) => {
        if (document.readyState === "complete") {
          console.log("Document is already complete");
          const result = domCheck();
          console.log("DOM check result:", result);
          resolve(result);
        } else {
          console.log("Waiting for document to load...");
          window.addEventListener("load", () => {
            const result = domCheck();
            console.log("DOM check result after load:", result);
            resolve(result);
          });
        }
      });
    }

    console.log("Not an Ashby domain, returning false");
    return Promise.resolve(false);
  }

  extractJobDetails() {
    // Try to get company name from the logo image
    let companyName = "";
    const logoImg = document.querySelector("._navLogoWordmarkImage_1e3cr_105");
    if (logoImg && logoImg.alt) {
      companyName = logoImg.alt.trim();
      console.log("Found company name from logo:", companyName);
    }

    // If no company name found from logo, try other methods
    if (!companyName) {
      const companySelectors = [".company-name", ".posting-headline h1", "h1"];

      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          companyName = element.textContent.trim();
          console.log(`Found company name with selector: ${selector}`);
          break;
        }
      }
    }

    // Get job title
    let jobTitle = "";
    const titleSelectors = ["._title_ud4nd_34", "h2", ".job-title"];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        jobTitle = element.textContent.trim();
        console.log(`Found job title with selector: ${selector}`);
        break;
      }
    }

    // Get location
    let locationText = "";
    const locationSelectors = ["._left_14ib5_426 p", ".job-location"];

    for (const selector of locationSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent.trim();
        if (text) {
          locationText = text;
          console.log(`Found location with selector: ${selector}`, text);
          break;
        }
      }
      if (locationText) break;
    }

    // Get description
    let jobDescription = "";
    const descriptionSelectors = [
      "._descriptionText_14ib5_206",
      ".job-description",
    ];

    let descriptionElement;
    for (const selector of descriptionSelectors) {
      descriptionElement = document.querySelector(selector);
      if (descriptionElement) {
        console.log(`Found description with selector: ${selector}`);
        break;
      }
    }

    if (descriptionElement) {
      try {
        jobDescription = window.Utils.convertHtmlToText(
          descriptionElement.innerHTML
        );
      } catch (error) {
        console.error("Error converting description HTML to text:", error);
        jobDescription = descriptionElement.textContent || "";
      }
    }

    // Get salary information
    let salaryRange = "";
    const salarySelectors = [
      "._compensationTierSummary_14ib5_335",
      ".compensation-range",
    ];

    for (const selector of salarySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        salaryRange = element.textContent.trim();
        console.log(`Found salary with selector: ${selector}`);
        break;
      }
    }

    // Log what we found for debugging
    console.log("Company:", companyName);
    console.log("Title:", jobTitle);
    console.log("Location:", locationText);
    console.log("Description length:", jobDescription.length);
    console.log("Salary:", salaryRange);

    return {
      company: companyName,
      position: jobTitle,
      location: locationText,
      url: window.location.href,
      jobDescription: jobDescription,
      salaryRange: salaryRange,
    };
  }
}

window.Ashby = Ashby;
