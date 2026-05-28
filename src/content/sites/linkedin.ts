class LinkedIn extends JobSite {
  getSelectors(): JobSelectors {
    return {
      jobPage:
        '.job-view-layout, .jobs-search__job-details, .job-details-jobs-container',
      company:
        '.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name',
      title:
        '.t-24.job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title h1, .jobs-unified-top-card__job-title, .top-card-layout__title',
      location:
        '.job-details-jobs-unified-top-card__primary-description-container .tvm__text:first-child, .job-details-jobs-unified-top-card__primary-description-container .tvm__text, .jobs-unified-top-card__bullet, .jobs-unified-top-card__subtitle-primary-grouping .tvm__text:first-child, .topcard__flavor--bullet',
      description:
        '.jobs-description__content .jobs-description-content__text--stretch, .jobs-description-content__text, .jobs-description__content, #job-details, .description__text .show-more-less-html__markup, .show-more-less-html__markup',
    };
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private isLinkedInJobUrl(): boolean {
    if (window.location.pathname.startsWith('/jobs/view/')) {
      return true;
    }

    if (!window.location.pathname.startsWith('/jobs/')) {
      return false;
    }

    try {
      return new URL(window.location.href).searchParams.has('currentJobId');
    } catch {
      return window.location.search.includes('currentJobId=');
    }
  }

  private getCurrentJobId(): string {
    try {
      const currentJobId = new URL(window.location.href).searchParams.get(
        'currentJobId',
      );

      if (currentJobId) {
        return currentJobId;
      }
    } catch {
      const currentJobId = window.location.search.match(
        /[?&]currentJobId=([^&]+)/,
      )?.[1];

      if (currentJobId) {
        return decodeURIComponent(currentJobId);
      }
    }

    return window.location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || '';
  }

  private getJobDetailsRoot(root: ParentNode = document): ParentNode {
    return (
      root.querySelector(
        '.jobs-search__job-details, .job-view-layout, .job-details-jobs-container, .jobs-details',
      ) || root
    );
  }

  private findText(root: ParentNode, selectors: string[]): string {
    for (const selector of selectors) {
      const text = root.querySelector(selector)?.textContent || '';
      const cleanedText = this.cleanText(text);

      if (cleanedText) {
        return cleanedText;
      }
    }

    return '';
  }

  private findHtmlText(root: ParentNode, selectors: string[]): string {
    for (const selector of selectors) {
      const html = root.querySelector(selector)?.innerHTML || '';

      if (html) {
        return window.convertHtmlToText(html);
      }
    }

    return '';
  }

  private findMetaContent(root: ParentNode, selectors: string[]): string {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      const content =
        element?.getAttribute('content') || element?.textContent || '';
      const cleanedContent = content ? this.cleanText(content) : '';

      if (cleanedContent) {
        return cleanedContent;
      }
    }

    return '';
  }

  private parseTitleFromMetaTitle(title: string): Partial<JobDetails> {
    const match = title.match(
      /^(.*?)\s+hiring\s+(.*?)\s+in\s+(.*?)\s+\|\s+LinkedIn$/i,
    );

    if (!match) {
      return {};
    }

    return {
      company: this.cleanText(match[1] || ''),
      position: this.cleanText(match[2] || ''),
      location: this.cleanText(match[3] || ''),
    };
  }

  private extractSalaryFromText(text: string): string {
    const normalizedText = text.replace(/\s+/g, ' ');
    const salaryPatterns = [
      /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:-|–|—|to)\s?\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:USD|\/\s?(?:yr|year|hr|hour)))?/i,
      /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:\/\s?(?:yr|year|hr|hour)|per\s+(?:year|hour))/i,
      /\d{1,3}\s?[kK]\s?(?:-|–|—|to)\s?\d{1,3}\s?[kK](?:\s?(?:\/\s?(?:yr|year|hr|hour)|per\s+(?:year|hour)))?/i,
    ];

    for (const pattern of salaryPatterns) {
      const salaryRange = normalizedText.match(pattern)?.[0];

      if (salaryRange) {
        return this.cleanText(salaryRange);
      }
    }

    return '';
  }

  private extractVisibleJobDetails(root: ParentNode = document): JobDetails {
    const selectors = this.getSelectors();
    const detailsRoot = this.getJobDetailsRoot(root);
    const titleSelectors = [
      selectors.title,
      '.jobs-search__job-details h1',
      '.job-details-jobs-unified-top-card__container h1',
      '.jobs-unified-top-card h1',
      '.top-card-layout__title',
      '.topcard__title',
    ];
    const companySelectors = [
      selectors.company,
      '.job-details-jobs-unified-top-card__primary-description-container a[href*="/company/"]',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '.topcard__flavor:first-child',
      'a[href*="/company/"]',
    ];
    const locationSelectors = [
      selectors.location,
      '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text:first-child',
      '.job-details-jobs-unified-top-card__primary-description-container span[dir="ltr"] + span + span',
      '.jobs-unified-top-card__workplace-type',
      '.topcard__flavor--bullet',
    ];
    const descriptionSelectors = [
      selectors.description,
      '.jobs-description-content__text--stretch',
      '.jobs-description-content__text',
      '.jobs-description__content',
      '.description__text .show-more-less-html__markup',
      '.show-more-less-html__markup',
      '#job-details',
    ];
    const metaDetails = this.parseTitleFromMetaTitle(
      this.findMetaContent(root, [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'title',
      ]),
    );
    const jobDescription =
      this.findHtmlText(detailsRoot, descriptionSelectors) ||
      this.findMetaContent(root, [
        'meta[property="og:description"]',
        'meta[name="description"]',
        'meta[name="twitter:description"]',
      ]);

    let salaryRange = '';
    const jobDetailsButtons = root.querySelectorAll(
      '.job-details-fit-level-preferences button strong',
    );
    for (const button of jobDetailsButtons) {
      const text = button.textContent?.trim() || '';
      if (text.includes('$') || text.match(/\d+[kK]\/yr/)) {
        salaryRange = text;
        break;
      }
    }

    salaryRange =
      salaryRange ||
      this.findText(root, [
        '.job-details-jobs-unified-top-card__job-insight-view-model-secondary',
        '.jobs-unified-top-card__job-insight',
        '.job-details-preferences-and-skills__pill',
      ])
        .split('\n')
        .map((value) => this.extractSalaryFromText(value))
        .find(Boolean) ||
      this.extractSalaryFromText(jobDescription);

    return {
      company:
        this.findText(detailsRoot, companySelectors) ||
        metaDetails.company ||
        '',
      position:
        this.findText(detailsRoot, titleSelectors) ||
        metaDetails.position ||
        '',
      location:
        this.findText(detailsRoot, locationSelectors) ||
        metaDetails.location ||
        '',
      url: window.location.href,
      jobDescription: jobDescription,
      salaryRange: salaryRange,
    };
  }

  private getString(value: unknown): string {
    if (typeof value === 'string') {
      return this.cleanText(value);
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return (
        this.getString(record.text) ||
        this.getString(record.name) ||
        this.getString(record.localizedName)
      );
    }

    return '';
  }

  private getFirstString(
    record: Record<string, unknown>,
    keys: string[],
  ): string {
    for (const key of keys) {
      const value = this.getString(record[key]);

      if (value) {
        return value;
      }
    }

    return '';
  }

  private extractLocationFromValue(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return this.cleanText(value);
    }

    if (Array.isArray(value)) {
      return this.extractLocationFromValue(value[0]);
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const address = record.address as Record<string, unknown> | undefined;
      const addressParts = [
        this.getString(address?.streetAddress),
        this.getString(address?.addressLocality),
        this.getString(address?.addressRegion),
        this.getString(address?.postalCode),
        this.getString(address?.addressCountry),
      ].filter(Boolean);

      return (
        this.getFirstString(record, [
          'formattedLocation',
          'locationName',
          'name',
          'text',
        ]) || addressParts.join(', ')
      );
    }

    return '';
  }

  private extractSalaryFromValue(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return this.cleanText(value);
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const valueRecord = record.value as Record<string, unknown> | undefined;
      const currency =
        this.getString(record.currency) ||
        this.getString(valueRecord?.currency);
      const minValue =
        this.getString(record.minValue) ||
        this.getString(valueRecord?.minValue);
      const maxValue =
        this.getString(record.maxValue) ||
        this.getString(valueRecord?.maxValue);

      if (minValue && maxValue) {
        return `${currency ? `${currency} ` : ''}${minValue} - ${maxValue}`;
      }

      return (
        this.getFirstString(record, [
          'text',
          'formattedSalary',
          'formattedBaseSalary',
        ]) || this.extractSalaryFromValue(record.value)
      );
    }

    return '';
  }

  private extractDetailsFromRecord(
    record: Record<string, unknown>,
  ): Partial<JobDetails> {
    const hiringOrganization = record.hiringOrganization as
      | Record<string, unknown>
      | undefined;
    const companyDetails = record.companyDetails as
      | Record<string, unknown>
      | undefined;
    const company = companyDetails?.company as
      | Record<string, unknown>
      | undefined;
    const rawDescription = this.getFirstString(record, [
      'description',
      'jobDescription',
      'formattedDescription',
    ]);

    return {
      company:
        this.getFirstString(record, ['companyName', 'company']) ||
        this.getString(company) ||
        this.getString(hiringOrganization),
      position: this.getFirstString(record, [
        'title',
        'jobTitle',
        'jobPostingTitle',
        'formattedTitle',
      ]),
      location:
        this.getFirstString(record, ['formattedLocation', 'location']) ||
        this.extractLocationFromValue(record.jobLocation),
      jobDescription: rawDescription
        ? window.convertHtmlToText(rawDescription)
        : '',
      salaryRange:
        this.getFirstString(record, [
          'salaryRange',
          'formattedSalary',
          'formattedBaseSalary',
        ]) || this.extractSalaryFromValue(record.baseSalary),
    };
  }

  private countDetails(details: Partial<JobDetails>): number {
    return [
      details.company,
      details.position,
      details.location,
      details.jobDescription,
      details.salaryRange,
    ].filter((value) => value?.trim()).length;
  }

  private mergeDetails(
    primary: JobDetails,
    fallback: Partial<JobDetails>,
  ): JobDetails {
    return {
      company: primary.company || fallback.company || '',
      position: primary.position || fallback.position || '',
      location: primary.location || fallback.location || '',
      url: window.location.href,
      jobDescription: primary.jobDescription || fallback.jobDescription || '',
      salaryRange: primary.salaryRange || fallback.salaryRange || '',
    };
  }

  private parseJsonCandidates(text: string): unknown[] {
    const trimmedText = text
      .trim()
      .replace(/^<!--/, '')
      .replace(/-->$/, '')
      .trim();

    if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
      return [];
    }

    try {
      return [JSON.parse(trimmedText)];
    } catch {
      return [];
    }
  }

  private extractStructuredJobDetails(root: ParentNode): Partial<JobDetails> {
    const currentJobId = this.getCurrentJobId();
    const candidates: Array<{
      details: Partial<JobDetails>;
      score: number;
    }> = [];
    const jsonElements = root.querySelectorAll(
      'script[type="application/ld+json"], code',
    );

    const visit = (value: unknown, depth: number): void => {
      if (!value || depth > 12) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1));
        return;
      }

      if (typeof value !== 'object') {
        return;
      }

      const record = value as Record<string, unknown>;
      const details = this.extractDetailsFromRecord(record);
      const detailCount = this.countDetails(details);

      if (detailCount > 0) {
        const mentionsCurrentJob =
          currentJobId && JSON.stringify(record).includes(currentJobId);
        const typeScore =
          this.getString(record['@type']).toLowerCase() === 'jobposting'
            ? 8
            : 0;
        candidates.push({
          details,
          score: detailCount + (mentionsCurrentJob ? 12 : 0) + typeScore,
        });
      }

      Object.values(record).forEach((nestedValue) =>
        visit(nestedValue, depth + 1),
      );
    };

    for (const element of jsonElements) {
      const text = element.textContent || element.innerHTML || '';
      this.parseJsonCandidates(text).forEach((candidate) =>
        visit(candidate, 0),
      );
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.details || {};
  }

  private async fetchJobDetailsPage(url: string): Promise<Partial<JobDetails>> {
    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) {
      return {};
    }

    const html = await response.text();
    const documentFromResponse = new DOMParser().parseFromString(
      html,
      'text/html',
    );
    const visibleDetails = this.extractVisibleJobDetails(documentFromResponse);
    const structuredDetails =
      this.extractStructuredJobDetails(documentFromResponse);

    return this.mergeDetails(visibleDetails, structuredDetails);
  }

  private async fetchCanonicalJobDetails(): Promise<Partial<JobDetails>> {
    const currentJobId = this.getCurrentJobId();

    if (!currentJobId) {
      return {};
    }

    const urls = [
      new URL(
        `/jobs-guest/jobs/api/jobPosting/${currentJobId}`,
        window.location.href,
      ).href,
      new URL(`/jobs/view/${currentJobId}/`, window.location.href).href,
    ];

    for (const url of urls) {
      try {
        const details = await this.fetchJobDetailsPage(url);

        if (this.countDetails(details) > 0) {
          return details;
        }
      } catch {}
    }

    return {};
  }

  isJobPage(): Promise<boolean> {
    const selectors = this.getSelectors();
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          document.querySelector(selectors.jobPage) !== null ||
            this.isLinkedInJobUrl(),
        );
      }, 500);
    });
  }

  async extractJobDetails(): Promise<JobDetails> {
    const visibleDetails = this.extractVisibleJobDetails();
    const structuredDetails = this.extractStructuredJobDetails(document);
    let jobDetails = this.mergeDetails(visibleDetails, structuredDetails);

    if (this.countDetails(jobDetails) < 3) {
      jobDetails = this.mergeDetails(
        jobDetails,
        await this.fetchCanonicalJobDetails(),
      );
    }

    return jobDetails;
  }
}

window.LinkedIn = LinkedIn;
