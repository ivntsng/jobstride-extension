class Greenhouse extends window.JobSite {
  getSelectors() {
    return {
      jobPage: ".main.font-secondary.job-post",
      company: ".logo img",
      title: ".job__title h1",
      location: ".job__location",
      description: ".job__description",
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
      company: elements.company?.alt.replace(" Logo", "").trim() || "",
      position: elements.title?.textContent.trim() || "",
      location: elements.location?.textContent.trim() || "",
      url: window.location.href,
      jobDescription: description,
    };
  }
}

window.Greenhouse = Greenhouse;
