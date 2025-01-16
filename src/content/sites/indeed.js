class Indeed extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".jobsearch-ViewJobLayout",
      company: ".jobsearch-CompanyInfoContainer a",
      title: ".jobsearch-JobInfoHeader-title",
      location:
        ".jobsearch-JobInfoHeader-subtitle .jobsearch-JobInfoHeader-subtitle-location",
      description: "#jobDescriptionText",
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

    return {
      company: elements.company?.textContent.trim(),
      position: elements.title?.textContent.trim(),
      location: elements.location?.textContent.trim() || "",
      url: window.location.href,
      description: elements.description
        ? window.Utils.convertHtmlToMarkdown(elements.description.innerHTML)
        : "",
    };
  }
}

window.Indeed = Indeed;
