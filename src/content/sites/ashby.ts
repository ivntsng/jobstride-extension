class Ashby extends JobSite {
  getSelectors(): JobSelectors {
    return {
      jobPage:
        '._navRoot_1e3cr_29, .ashby-job-posting-header, ._container_ud4nd_29',
      company: '._navLogoWordmarkImage_1e3cr_105',
      title: '._title_ud4nd_34, h2',
      location: '._left_14ib5_426 p, .job-location',
      description: '._descriptionText_14ib5_206, .job-description',
      salary: '._compensationTierSummary_14ib5_335',
    };
  }

  isJobPage(): Promise<boolean> {
    const isAshbyDomain = window.location.hostname === 'jobs.ashbyhq.com';

    if (isAshbyDomain) {
      const jobPostingPattern =
        /\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const isValidJobUrl = jobPostingPattern.test(window.location.pathname);

      if (isValidJobUrl) {
        return Promise.resolve(true);
      }

      const domCheck = (): boolean => {
        const selectors = [
          '.ashby-job-posting-page',
          "[data-testid='job-posting']",
          '.posting-headline',
          '.posting-content',
          'h1',
          'h2',
          '.job-description',
          '.posting-categories',
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
          }
        }

        return selectors.some((selector) => document.querySelector(selector));
      };

      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          const result = domCheck();
          resolve(result);
        } else {
          window.addEventListener('load', () => {
            const result = domCheck();
            resolve(result);
          });
        }
      });
    }

    return Promise.resolve(false);
  }

  extractJobDetails(): JobDetails {
    let companyName = '';
    let jobTitle = '';
    let jsonLdData: any = null;

    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    for (const script of jsonLdScripts) {
      try {
        const parsedData = JSON.parse(script.textContent || '');
        if (parsedData && parsedData['@type'] === 'JobPosting') {
          jsonLdData = parsedData;
          break;
        }
      } catch (error) {
        console.error('Error parsing JSON-LD data:', error);
      }
    }

    if (jsonLdData?.hiringOrganization?.name) {
      companyName = jsonLdData.hiringOrganization.name.trim();
    }

    if (!companyName) {
      const logoImg = document.querySelector(
        '._navLogoWordmarkImage_1e3cr_105',
      ) as HTMLImageElement;
      if (logoImg?.alt) {
        companyName = logoImg.alt.trim();
      }
    }
    if (!companyName) {
      const companySelectors = ['.company-name', '.posting-headline h1', 'h1'];
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          companyName = element.textContent?.trim() || '';
          break;
        }
      }
    }

    if (jsonLdData?.title) {
      jobTitle = jsonLdData.title.trim();
    }

    if (!jobTitle) {
      const titleSelectors = ['._title_ud4nd_34', 'h2', '.job-title'];
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobTitle = element.textContent?.trim() || '';
          break;
        }
      }
    }

    let locationText = '';
    if (jsonLdData?.jobLocation?.address) {
      const address = jsonLdData.jobLocation.address;
      const parts: string[] = [];
      if (address.addressLocality) parts.push(address.addressLocality);
      if (address.addressRegion) parts.push(address.addressRegion);
      if (address.addressCountry) parts.push(address.addressCountry);
      if (parts.length > 0) {
        locationText = parts.join(', ');
      }
    }

    if (!locationText) {
      const locationSelectors = ['._left_14ib5_426 p', '.job-location'];
      for (const selector of locationSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim() || '';
          if (text) {
            locationText = text;
            break;
          }
        }
        if (locationText) break;
      }
    }

    let jobDescription = '';
    if (jsonLdData?.description) {
      try {
        jobDescription = window.Utils.convertHtmlToText(jsonLdData.description);
      } catch (error) {
        console.error(
          'Error converting JSON-LD description HTML to text:',
          error,
        );
        jobDescription = jsonLdData.description.replace(/<[^>]*>/g, '').trim();
      }
    }

    if (!jobDescription) {
      const descriptionSelectors = [
        '._descriptionText_14ib5_206',
        '.job-description',
      ];

      let descriptionElement: Element | null = null;
      for (const selector of descriptionSelectors) {
        descriptionElement = document.querySelector(selector);
        if (descriptionElement) {
          break;
        }
      }

      if (descriptionElement) {
        try {
          jobDescription = window.Utils.convertHtmlToText(
            descriptionElement.innerHTML,
          );
        } catch (error) {
          console.error('Error converting description HTML to text:', error);
          jobDescription = descriptionElement.textContent || '';
        }
      }
    }

    let salaryRange = '';
    if (jsonLdData?.baseSalary) {
      const salary = jsonLdData.baseSalary;
      if (salary.value?.minValue && salary.value.maxValue) {
        const currency = salary.currency || 'USD';
        salaryRange = `${currency} ${salary.value.minValue} - ${salary.value.maxValue} per ${salary.value.unitText?.toLowerCase() || 'year'}`;
      }
    }

    if (!salaryRange) {
      const salarySelectors = [
        '._compensationTierSummary_14ib5_335',
        '.compensation-range',
      ];

      for (const selector of salarySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          salaryRange = element.textContent?.trim() || '';
          break;
        }
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
