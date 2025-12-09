class Indeed extends JobSite {
  getSelectors(): JobSelectors {
    return {
      jobPage: '.jobsearch-ViewJobLayout-jobDisplay',
      company: '.jobsearch-CompanyName',
      title: '.jobsearch-JobInfoHeader-title',
      location: '.jobsearch-JobInfoHeader-subtitle',
      description: '.jobsearch-JobComponent-description',
      salary: '.jobsearch-JobMetadataHeader-item',
    };
  }

  isJobPage(): Promise<boolean> {
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

  extractJobDetails(): JobDetails {
    const selectors = this.getSelectors();

    let companyElement = document.querySelector(selectors.company);
    if (!companyElement) {
      // Fallback selectors for company
      const fallbackSelectors = [
        '.jobsearch-CompanyName',
        '[data-testid="company-name"]',
        '.jobsearch-CompanyReview--continue',
      ];
      for (const selector of fallbackSelectors) {
        companyElement = document.querySelector(selector);
        if (companyElement) break;
      }
    }

    let locationElement = document.querySelector(selectors.location);
    if (!locationElement) {
      // Fallback selectors for location
      const fallbackSelectors = [
        '.jobsearch-JobInfoHeader-subtitle',
        '[data-testid="job-location"]',
        '.jobsearch-JobMetadataHeader-item',
      ];
      for (const selector of fallbackSelectors) {
        locationElement = document.querySelector(selector);
        if (locationElement) break;
      }
    }

    const elements = {
      company: companyElement,
      title: document.querySelector(selectors.title),
      location: locationElement,
      description: document.querySelector(selectors.description),
      salary: document.querySelector(selectors.salary || ''),
    };

    let salaryRange = '';
    if (elements.salary) {
      const salarySpan = elements.salary.querySelector('.css-1jh4tn2');
      if (salarySpan) {
        salaryRange = salarySpan.textContent?.trim() || '';
      }
    }

    let jobDescription = '';
    if (elements.description) {
      jobDescription = window.Utils.convertHtmlToMarkdown(
        elements.description.innerHTML,
      );
    }

    // Log what we found for debugging
    console.log('Company element found:', elements.company);
    console.log('Location element found:', elements.location);
    console.log('Location text:', elements.location?.textContent);

    return {
      company: elements.company?.textContent?.trim() || '',
      position: elements.title?.textContent?.trim() || '',
      location: elements.location?.textContent?.trim() || '',
      url: window.location.href,
      jobDescription: jobDescription,
      salaryRange: salaryRange,
    };
  }
}

window.Indeed = Indeed;
