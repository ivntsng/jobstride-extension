// class LinkedIn extends window.JobSite {
//   getSelectors() {
//     return {
//       jobPage: ".job-view-layout",
//       company: ".job-details-jobs-unified-top-card__company-name a",
//       title: ".t-24.job-details-jobs-unified-top-card__job-title h1",
//       location:
//         ".job-details-jobs-unified-top-card__primary-description-container .tvm__text:first-child",
//       description:
//         ".jobs-description__content .jobs-description-content__text--stretch",
//     };
//   }

//   isJobPage() {
//     const selectors = this.getSelectors();
//     return document.querySelector(selectors.jobPage) !== null;
//   }

//   extractJobDetails() {
//     const selectors = this.getSelectors();
//     const elements = {
//       company: document.querySelector(selectors.company),
//       title: document.querySelector(selectors.title),
//       location: document.querySelector(selectors.location),
//       description: document.querySelector(selectors.description),
//     };

//     return {
//       company: elements.company?.textContent.trim(),
//       position: elements.title?.textContent.trim(),
//       location: elements.location?.textContent.trim() || "",
//       url: window.location.href,
//       jobDescription: elements.description
//         ? window.Utils.convertHtmlToMarkdown(elements.description.innerHTML)
//         : "",
//     };
//   }
// }

// window.LinkedIn = LinkedIn;
