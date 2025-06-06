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
    // For Ashby, we need to check the URL first
    const isAshbyDomain = window.location.hostname === "jobs.ashbyhq.com";

    if (isAshbyDomain) {
      // Check for the specific job posting URL pattern with UUID
      const jobPostingPattern =
        /\/[^\/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const isValidJobUrl = jobPostingPattern.test(window.location.pathname);

      if (isValidJobUrl) {
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

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
          }
        }

        return selectors.some((selector) => document.querySelector(selector));
      };

      // Wait for the DOM to be ready
      return new Promise((resolve) => {
        if (document.readyState === "complete") {
          const result = domCheck();
          resolve(result);
        } else {
          window.addEventListener("load", () => {
            const result = domCheck();
            resolve(result);
          });
        }
      });
    }

    return Promise.resolve(false);
  }

  extractJobDetails() {
    let companyName = "";
    let jobTitle = "";
    let jsonLdData = null;

    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      try {
        jsonLdData = JSON.parse(jsonLdScript.textContent);
      } catch (error) {
        console.error("Error parsing JSON-LD data:", error);
      }
    }

    // Company name from JSON-LD
    if (jsonLdData && jsonLdData.hiringOrganization && jsonLdData.hiringOrganization.name) {
      companyName = jsonLdData.hiringOrganization.name.trim();
    }

    // Fallbacks for company name
    if (!companyName) {
      const logoImg = document.querySelector("._navLogoWordmarkImage_1e3cr_105");
      if (logoImg && logoImg.alt) {
        companyName = logoImg.alt.trim();
      }
    }
    if (!companyName) {
      const companySelectors = [".company-name", ".posting-headline h1", "h1"];
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          companyName = element.textContent.trim();
          break;
        }
      }
    }

    // Job title from JSON-LD
    if (jsonLdData && jsonLdData.title) {
      jobTitle = jsonLdData.title.trim();
    }

    // Fallbacks for job title
    if (!jobTitle) {
      const titleSelectors = ["._title_ud4nd_34", "h2", ".job-title"];
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobTitle = element.textContent.trim();
          break;
        }
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
        break;
      }
    }

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
