class Greenhouse extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".main.font-secondary.job-post, #app_body",
      company: ".logo img, .company-name",
      title: ".job__title h1, .app-title",
      location: ".job__location, .location",
      description: ".job__description, #content",
    };
  }

  isJobPage() {
    const selectors = this.getSelectors();
    return new Promise((resolve) => {
      setTimeout(() => {
        // Check for either regular job page or embedded application page
        const isJobPage =
          document.querySelector(selectors.jobPage) !== null ||
          window.location.pathname.includes("/embed/job_app");
        console.log("DOM elements found:", {
          jobPage: document.querySelector(selectors.jobPage),
          content: document.querySelector(selectors.description),
          pathname: window.location.pathname,
        });
        resolve(isJobPage);
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
    };

    let description = "";
    if (elements.description) {
      // For embedded pages, we need to get all the content
      if (window.location.pathname.includes("/embed/job_app")) {
        const contentIntro =
          elements.description.querySelector(".content-intro");
        const contentMain = Array.from(elements.description.children)
          .filter(
            (el) =>
              !el.classList.contains("content-intro") &&
              !el.classList.contains("content-conclusion")
          )
          .map((el) => el.innerHTML)
          .join("\n");
        const contentConclusion = elements.description.querySelector(
          ".content-conclusion"
        );

        description = [
          contentIntro?.innerHTML || "",
          contentMain,
          contentConclusion?.innerHTML || "",
        ]
          .filter(Boolean)
          .join("\n\n");
      } else {
        description = elements.description.innerHTML;
      }
      description = window.convertHtmlToText(description);
    }

    // For embedded pages, try to get company name from URL if not found in DOM
    let company =
      elements.company?.alt?.replace(" Logo", "").trim() ||
      elements.company?.textContent?.replace("at ", "").trim() ||
      "";
    if (!company && window.location.hostname.includes("boards.greenhouse.io")) {
      company = window.location.pathname.split("/")[1] || "";
    }

    return {
      company: company,
      position: elements.title?.textContent.trim() || "",
      location: elements.location?.textContent.trim() || "",
      url: window.location.href,
      jobDescription: description,
    };
  }
}

window.Greenhouse = Greenhouse;
