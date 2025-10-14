class Workday extends JobSite {
  getSelectors(): JobSelectors {
    return {
      jobPage: '[data-automation-id="jobPostingDetails"]',
      company: '[data-automation-id="breadcrumbs"] a',
      title: '[data-automation-id="jobPostingHeader"]',
      location: '[data-automation-id="locations"]',
      description: '[data-automation-id="jobPostingDescription"]',
    };
  }

  isJobPage(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hasJobDetails = document.querySelector('[data-automation-id="jobPostingDetails"]') !== null;
        const isJobUrl = window.location.pathname.includes('/details/') || window.location.pathname.includes('/job/');
        resolve(hasJobDetails || isJobUrl);
      }, 500);
    });
  }

  convertWorkdayHtmlToText(element: Element): string {
    const clone = element.cloneNode(true) as Element;
    clone.querySelectorAll('script, style, svg').forEach(el => el.remove());
    clone.querySelectorAll('p').forEach(p => {
      const text = p.textContent?.trim();
      if (text) {
        p.textContent = text + '\n\n';
      } else {
        p.remove();
      }
    });

    clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      const text = heading.textContent?.trim();
      if (text) {
        heading.textContent = '\n' + text + '\n\n';
      }
    });

    clone.querySelectorAll('li').forEach(li => {
      const text = li.textContent?.trim();
      if (text) {
        if (text.startsWith('•')) {
          li.textContent = text + '\n';
        } else {
          li.textContent = '• ' + text + '\n';
        }
      }
    });

    clone.querySelectorAll('ul, ol').forEach(list => {
      list.insertAdjacentText('afterend', '\n');
    });

    clone.querySelectorAll('br').forEach(br => {
      br.insertAdjacentText('beforebegin', '\n');
    });

    let text = clone.textContent || '';
    text = text
      .replace(/\t+/g, ' ')
      .replace(/[ \u00A0]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }
  extractJobDetails(): JobDetails {
    const selectors = this.getSelectors();

    let company = "";
    const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonicalLink && canonicalLink.href) {
      const hostname = new URL(canonicalLink.href).hostname;
      const match = hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com$/);
      if (match && match[1]) {
        company = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }
    if (!company) {
      const hostname = window.location.hostname;
      const match = hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com$/);
      if (match && match[1]) {
        company = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }
    if (!company) {
      const companyElement = document.querySelector('[data-automation-id="breadcrumbs"] a');
      if (companyElement) {
        company = companyElement.textContent?.trim() || "";
      }
    }

    const titleElement = document.querySelector('[data-automation-id="jobPostingHeader"]');
    const position = titleElement?.textContent?.trim() || "";

    let location = "";
    const locationElement = document.querySelector('[data-automation-id="locations"]') ||
                           document.querySelector('[data-automation-id="location"]');
    if (locationElement) {
      let rawLocation = locationElement.textContent?.trim() || "";
      rawLocation = rawLocation
        .replace(/^locations?/i, '')
        .replace(/^:/, '')
        .trim();

      location = rawLocation;
    }

    let description = "";
    const descriptionElement = document.querySelector('[data-automation-id="jobPostingDescription"]');
    if (descriptionElement) {
      description = this.convertWorkdayHtmlToText(descriptionElement);
    }

    let salaryRange = "";
    const salaryElement = document.querySelector('[data-automation-id="compensationRange"]') ||
                         document.querySelector('[data-automation-id="salary"]');
    if (salaryElement) {
      salaryRange = salaryElement.textContent?.trim() || "";
    }

    return {
      company: company,
      position: position,
      location: location,
      url: window.location.href,
      jobDescription: description,
      salaryRange: salaryRange,
    };
  }
}

window.Workday = Workday;
