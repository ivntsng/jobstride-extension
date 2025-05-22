class LinkedIn extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".job-view-layout",
      company: ".job-details-jobs-unified-top-card__company-name a",
      title: ".t-24.job-details-jobs-unified-top-card__job-title h1",
      location:
        ".job-details-jobs-unified-top-card__primary-description-container .tvm__text:first-child",
      description:
        ".jobs-description__content .jobs-description-content__text--stretch",
    };
  }

  isJobPage() {
    const selectors = this.getSelectors();
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(document.querySelector(selectors.jobPage) !== null);
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
      description = window.convertHtmlToText(elements.description.innerHTML);
    }

    return {
      company: elements.company?.textContent.trim() || "",
      position: elements.title?.textContent.trim() || "",
      location: elements.location?.textContent.trim() || "",
      url: window.location.href,
      jobDescription: description,
    };
  }
}

window.LinkedIn = LinkedIn;
