class Lever extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".content-wrapper.posting-page",
      company: ".main-header-logo img",
      title: ".posting-headline h2",
      location: ".posting-categories .location",
      description: ".section.page-centered",
    };
  }

  isJobPage() {
    const selectors = this.getSelectors();
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (document.querySelector(selectors.jobPage) !== null) {
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      if (document.querySelector(selectors.jobPage) !== null) {
        observer.disconnect();
        resolve(true);
      }
    });
  }

  extractJobDetails() {
    const selectors = this.getSelectors();
    const elements = {
      company: document.querySelector(selectors.company),
      title: document.querySelector(selectors.title),
      location: document.querySelector(selectors.location),
      description: document.querySelectorAll(selectors.description),
    };

    let description = "";
    if (elements.description) {
      // Combine all sections into one description
      description = Array.from(elements.description)
        .map((section) => window.convertHtmlToText(section.innerHTML))
        .join("\n\n");
    }

    let location = "";
    if (elements.location) {
      location = elements.location.textContent
        .split("/")
        .map((loc) => loc.trim())
        .filter((loc) => loc)
        .join(", ");
    }

    return {
      company: elements.company?.alt.replace(" Logo", "").trim() || "",
      position: elements.title?.textContent.trim() || "",
      location: location,
      url: window.location.href,
      jobDescription: description,
    };
  }
}

window.Lever = Lever;
