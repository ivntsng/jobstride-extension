window.AUTH_CONFIG = window.AUTH_CONFIG || {
  apiBaseUrl: '',
  webAppUrl: '',
  supabaseStorageKey: '',
};

const escapeContentHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      (
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }) as Record<string, string>
      )[char] || char,
  );

const isContentAuthError = (error: any): boolean => {
  if (!error) return false;

  const message = error.message || error.error || String(error);
  return (
    /AUTH_REQUIRED/.test(message) ||
    /\b401\b/.test(message) ||
    /\b403\b/.test(message) ||
    /unauthorized/i.test(message) ||
    /unauthenticated/i.test(message) ||
    /token.?expired/i.test(message)
  );
};

const getContentSaveErrorMessage = (error: any): string => {
  const message = error?.message || error?.error || String(error || '');

  if (/DASHBOARD_NOT_FOUND|\b404\b/.test(message)) {
    return 'That dashboard is no longer available. Choose another dashboard and try again.';
  }

  if (/VALIDATION_ERROR|\b422\b/.test(message)) {
    const detail = message.replace(/^.*VALIDATION_ERROR:?\s*/i, '').trim();
    return detail
      ? `Please check the job details: ${detail}`
      : 'Please check that the required fields are filled in.';
  }

  if (/JOB_ALREADY_SAVED|\b409\b/.test(message)) {
    return 'This job is already saved to the selected dashboard.';
  }

  if (/REQUEST_TIMEOUT/.test(message)) {
    return 'JobStride took too long to respond. Please try saving again.';
  }

  if (/SERVER_ERROR|\b5\d\d\b/.test(message)) {
    return 'JobStride had trouble saving this job. Please try again in a moment.';
  }

  if (/NETWORK_ERROR|failed to fetch|network/i.test(message)) {
    return 'Could not reach JobStride. Check your connection and try again.';
  }

  return 'Failed to save job. Please try again.';
};

const isDuplicateSaveResult = (value: any): boolean =>
  Boolean(value && typeof value === 'object' && value.duplicate === true);

const showContentToast = (
  type: 'success' | 'error',
  title: string,
  message: string,
) => {
  const existingToast = document.querySelector('.job-tracker-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `job-tracker-toast jobstride-toast jobstride-toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon =
    type === 'success'
      ? '<path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />'
      : '<path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />';

  toast.innerHTML = `
    <div class="jobstride-toast-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">${icon}</svg>
    </div>
    <div class="jobstride-toast-content">
      <div class="jobstride-toast-title">${escapeContentHtml(title)}</div>
      <div class="jobstride-toast-message">${escapeContentHtml(message)}</div>
    </div>
    <button class="jobstride-toast-close jobstride-icon-button" aria-label="Dismiss notification">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  `;

  document.body.appendChild(toast);

  const closeBtn = toast.querySelector('.jobstride-toast-close');
  closeBtn?.addEventListener('click', () => {
    toast.classList.add('jobstride-toast--hiding');
    setTimeout(() => toast.remove(), 300);
  });
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('jobstride-toast--hiding');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

/*******************************
 *  Modal Functionality
 *******************************/
async function initializeModalFunctionality(modal: HTMLElement): Promise<void> {
  const form = modal.querySelector('#job-form-modal') as HTMLFormElement;
  const dashboardSelect = modal.querySelector(
    '#dashboardName',
  ) as HTMLSelectElement;

  if (!form || !dashboardSelect) return;

  dashboardSelect.innerHTML =
    '<option value="" disabled selected>Loading dashboards...</option>';

  try {
    const dashboards = await window.Auth.getUserDashboards();

    if (dashboards === null) {
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>Please login to extension</option>';
      return;
    }

    if (dashboards.length) {
      dashboardSelect.innerHTML =
        '<option value="" disabled>Select a dashboard...</option>' +
        dashboards
          .map(
            (d: Dashboard) =>
              `<option value="${escapeContentHtml(d.id)}">${escapeContentHtml(d.name)}</option>`,
          )
          .join('');

      dashboardSelect.value = dashboards[0]?.id || '';
    } else {
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>No dashboards found</option>';
    }
  } catch (error: any) {
    dashboardSelect.innerHTML = `<option value="" disabled selected>Error: ${escapeContentHtml(error.message || 'loading dashboards')}</option>`;
  }

  if (form.dataset.jobstrideSubmitBound === 'true') {
    return;
  }

  form.dataset.jobstrideSubmitBound = 'true';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Saving...';

    try {
      const jobData: JobApplication = {
        dashboard_id: getModalFormControl<HTMLSelectElement>(
          modal,
          '#dashboardName',
        ).value.trim(),
        company: getModalFormControl<HTMLInputElement>(
          modal,
          '#company',
        ).value.trim(),
        position: getModalFormControl<HTMLInputElement>(
          modal,
          '#position',
        ).value.trim(),
        location: getModalFormControl<HTMLInputElement>(
          modal,
          '#location',
        ).value.trim(),
        url: getModalFormControl<HTMLInputElement>(modal, '#url').value.trim(),
        salary_range: getModalFormControl<HTMLInputElement>(
          modal,
          '#salaryRange',
        ).value.trim(),
        description: getModalFormControl<HTMLTextAreaElement>(
          modal,
          '#jobDescription',
        ).value.trim(),
        status: 'saved',
        applied_date: null,
      };

      const savedJob = await window.Auth.saveJob(jobData);

      if (isDuplicateSaveResult(savedJob)) {
        showContentToast(
          'success',
          'Already saved',
          'This job is already in the selected dashboard.',
        );
      } else {
        showContentToast(
          'success',
          'Success!',
          'Job information saved successfully',
        );
      }
      closeJobTrackerModal(modal);
    } catch (error) {
      if (isContentAuthError(error)) {
        try {
          await window.Auth.openWebAppLogin();
        } catch {}

        showContentToast(
          'error',
          'Authentication Required',
          'Please log in to JobStride in the opened tab, then try again.',
        );
        return;
      }

      showContentToast('error', 'Error', getContentSaveErrorMessage(error));
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = originalHtml || 'Save job';
    }
  });
}

function openJobTrackerModal(modal: HTMLElement): void {
  modal.classList.add('is-open');
}

function closeJobTrackerModal(modal: HTMLElement): void {
  modal.classList.remove('is-open');
}

function removeJobTrackerUi(): void {
  document.getElementById('job-tracker-btn')?.remove();
  document.getElementById('job-tracker-modal')?.remove();
}

/*******************************
 *  Utility: Convert HTML to Text
 *******************************/
function convertHtmlToText(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  ['script', 'style', 'svg'].forEach((tag) => {
    tempDiv.querySelectorAll(tag).forEach((el) => el.remove());
  });

  const blockElements = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'div',
    'section',
  ];
  blockElements.forEach((tag) => {
    tempDiv.querySelectorAll(tag).forEach((el) => {
      el.insertAdjacentText('beforebegin', '\n\n');
      el.insertAdjacentText('afterend', '\n\n');
    });
  });

  tempDiv.querySelectorAll('ul, ol').forEach((list) => {
    list.insertAdjacentText('beforebegin', '\n');
    const isOrdered = list.tagName.toLowerCase() === 'ol';
    let counter = 1;

    list.querySelectorAll('li').forEach((li) => {
      const liText = li.textContent?.trim() || '';
      if (!liText.startsWith('•') && !liText.match(/^\d+\./)) {
        const prefix = isOrdered ? `${counter}. ` : '• ';
        li.insertAdjacentText('beforebegin', `${prefix}`);
      } else {
        li.insertAdjacentText('beforebegin', '');
      }
      li.insertAdjacentText('afterend', '\n');
      if (isOrdered) counter++;
    });
    list.insertAdjacentText('afterend', '\n');
  });

  tempDiv.querySelectorAll('br').forEach((br) => {
    br.insertAdjacentText('beforebegin', '\n');
  });

  const text =
    tempDiv.textContent
      ?.replace(/\t+/g, ' ')
      .replace(/\r?\n/g, '\n')
      .replace(/[ ]{2,}/g, ' ')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => line !== '•')
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/•\s*•/g, '•')
      .trim() || '';
  return text;
}

window.convertHtmlToText = convertHtmlToText;

function getModalFormControl<
  T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
>(modal: HTMLElement, selector: string): T {
  const control = modal.querySelector<T>(selector);
  if (!control) {
    throw new Error(`Missing modal form control: ${selector}`);
  }

  return control;
}

function createFloatingButton(jobSite: JobSite): void {
  if (document.getElementById('job-tracker-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'job-tracker-btn';
  button.type = 'button';
  button.setAttribute('aria-label', 'Track this job');
  button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 7V6a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M5 7h14v11.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <span class="jobstride-floating-label">Track this job</span>
  `;
  document.body.appendChild(button);

  const modal = window.createModalForm();

  button.addEventListener('click', async () => {
    let jobDetails: JobDetails;

    try {
      jobDetails = await Promise.resolve(jobSite.extractJobDetails());
    } catch {
      jobDetails = {
        company: '',
        position: '',
        location: '',
        url: window.location.href,
        jobDescription: '',
        salaryRange: '',
      };
    }

    getModalFormControl<HTMLInputElement>(modal, '#position').value =
      jobDetails.position || '';
    getModalFormControl<HTMLInputElement>(modal, '#company').value =
      jobDetails.company || '';
    getModalFormControl<HTMLInputElement>(modal, '#location').value =
      jobDetails.location || '';
    getModalFormControl<HTMLInputElement>(modal, '#url').value =
      jobDetails.url || '';
    getModalFormControl<HTMLTextAreaElement>(modal, '#jobDescription').value =
      jobDetails.jobDescription || '';
    getModalFormControl<HTMLInputElement>(modal, '#salaryRange').value =
      jobDetails.salaryRange || '';

    openJobTrackerModal(modal);
  });

  const closeBtn = modal.querySelector(
    '.jobstride-dialog-close',
  ) as HTMLElement;
  closeBtn.addEventListener('click', () => {
    closeJobTrackerModal(modal);
  });

  const cancelBtn = modal.querySelector('.jobstride-dialog-cancel');
  cancelBtn?.addEventListener('click', () => {
    closeJobTrackerModal(modal);
  });

  window.addEventListener('click', (event: MouseEvent) => {
    if (event.target === modal) {
      closeJobTrackerModal(modal);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeJobTrackerModal(modal);
    }
  });

  initializeModalFunctionality(modal);
}

/*******************************
 *  Main Execution
 *******************************/
function initializeJobTracker(): void {
  const checkId = ++jobTrackerCheckId;
  const checkedUrl = window.location.href;
  let jobSite: JobSite | null = null;
  const hostname = window.location.hostname;

  const JOB_SITE_CONFIG: Record<string, SiteConfig> = {
    greenhouse: {
      domains: ['job-boards.greenhouse.io', 'boards.greenhouse.io'],
      handler: () => new (window as any).Greenhouse(),
      site: 'greenhouse',
    },
    linkedin: {
      domains: ['linkedin.com'],
      handler: () => new (window as any).LinkedIn(),
      site: 'linkedin',
    },
    indeed: {
      domains: ['indeed.com'],
      handler: () => new (window as any).Indeed(),
      site: 'indeed',
    },
    ashby: {
      domains: ['ashbyhq.com', 'jobs.ashbyhq.com'],
      handler: () => new (window as any).Ashby(),
      site: 'ashby',
    },
    lever: {
      domains: ['jobs.lever.co'],
      handler: () => new (window as any).Lever(),
      site: 'lever',
    },
    workday: {
      domains: ['myworkdayjobs.com'],
      handler: () => new (window as any).Workday(),
      site: 'workday',
    },
    rippling: {
      domains: ['ats.rippling.com', 'rippling.com'],
      handler: () => new (window as any).Rippling(),
      site: 'rippling',
    },
  };

  const matchingSite = Object.entries(JOB_SITE_CONFIG).find(([_, config]) =>
    config.domains.some((domain) => hostname.includes(domain)),
  )?.[0];

  if (matchingSite) {
    const config = JOB_SITE_CONFIG[matchingSite];
    if (config) {
      jobSite = config.handler();
      document.body.setAttribute('data-site', config.site);
    }
  }

  if (!jobSite) {
    removeJobTrackerUi();
    return;
  }

  const site = jobSite;
  site
    .isJobPage()
    .then((isJobPage) => {
      if (
        checkId !== jobTrackerCheckId ||
        checkedUrl !== window.location.href
      ) {
        return;
      }

      if (!isJobPage) {
        removeJobTrackerUi();
        return;
      }

      createFloatingButton(site);
    })
    .catch(() => {
      if (
        checkId === jobTrackerCheckId &&
        checkedUrl === window.location.href
      ) {
        removeJobTrackerUi();
      }
    });
}

let jobTrackerCheckId = 0;
let routeCheckScheduled = false;
let lastKnownUrl = window.location.href;

function checkForClientSideNavigation(): void {
  if (window.location.href === lastKnownUrl) {
    return;
  }

  lastKnownUrl = window.location.href;
  scheduleJobTrackerRouteCheck();
}

function scheduleJobTrackerRouteCheck(): void {
  if (routeCheckScheduled) {
    return;
  }

  routeCheckScheduled = true;
  setTimeout(() => {
    routeCheckScheduled = false;
    initializeJobTracker();
  }, 0);
}

function watchClientSideNavigation(): void {
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = (...args: Parameters<History['pushState']>) => {
    originalPushState(...args);
    checkForClientSideNavigation();
  };

  window.history.replaceState = (
    ...args: Parameters<History['replaceState']>
  ) => {
    originalReplaceState(...args);
    checkForClientSideNavigation();
  };

  window.addEventListener('popstate', checkForClientSideNavigation);
  window.addEventListener('hashchange', checkForClientSideNavigation);
  setInterval(checkForClientSideNavigation, 500);
}

const observer = new MutationObserver((mutations) => {
  if (document.getElementById('job-tracker-btn')) {
    return;
  }

  const relevantChange = mutations.some((mutation) =>
    Array.from(mutation.addedNodes).some((node) => {
      if (node.nodeType !== 1) return false;
      const element = node as Element;
      return (
        element.matches?.(
          '.job-view-layout, .jobs-search__job-details, .job-details-jobs-container, .jobsearch-ViewJobLayout-jobDisplay, .job-posting, .ashby-job-posting, .ashby-job-posting-header, ._container_ud4nd_29, [data-automation-id="jobPostingDetails"], [data-testid="breadcrumb"], .ATS_htmlPreview',
        ) ||
        element.querySelector?.(
          '.job-view-layout, .jobs-search__job-details, .job-details-jobs-container, .jobsearch-ViewJobLayout-jobDisplay, .job-posting, .ashby-job-posting, .ashby-job-posting-header, ._container_ud4nd_29, [data-automation-id="jobPostingDetails"], [data-testid="breadcrumb"], .ATS_htmlPreview',
        )
      );
    }),
  );

  if (relevantChange) {
    initializeJobTracker();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
});

watchClientSideNavigation();
initializeJobTracker();
