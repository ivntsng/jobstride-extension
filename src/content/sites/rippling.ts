class Rippling extends JobSite {
  getSelectors(): JobSelectors {
    return {
      jobPage: "[data-testid='breadcrumb'], .ATS_htmlPreview",
      company: "[data-testid='breadcrumb'] li:first-child a",
      title: 'h2',
      location: "[data-icon='LOCATION_OUTLINE'] + p",
      description: '.ATS_htmlPreview',
    };
  }

  isJobPage(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hasBreadcrumb =
          document.querySelector('[data-testid="breadcrumb"]') !== null;
        const hasDescription =
          document.querySelector('.ATS_htmlPreview') !== null;
        const urlMatch =
          window.location.hostname.includes('rippling.com') &&
          window.location.pathname.includes('/jobs/');

        const isJobPage = (hasBreadcrumb && hasDescription) || urlMatch;
        resolve(isJobPage);
      }, 500);
    });
  }

  extractJobDetails(): JobDetails {
    const selectors = this.getSelectors();
    const elements = {
      company: document.querySelector(selectors.company),
      title: document.querySelector(selectors.title),
      location: document.querySelector(selectors.location),
      description: document.querySelector(selectors.description),
    };

    let company = elements.company?.textContent?.trim() || '';
    company = company.replace(/\s*Careers?\s*$/i, '').trim();

    if (!company && window.location.pathname) {
      const pathMatch = window.location.pathname.match(/\/([^/]+)\/jobs/);
      if (pathMatch?.[1]) {
        company = pathMatch[1];
      }
    }

    let description = '';
    if (elements.description) {
      description = window.convertHtmlToText(elements.description.innerHTML);
    }

    return {
      company: company,
      position: elements.title?.textContent?.trim() || '',
      location: elements.location?.textContent?.trim() || '',
      url: window.location.href,
      jobDescription: description,
    };
  }
}

window.Rippling = Rippling;
