window.AUTH_CONFIG = window.AUTH_CONFIG || { apiBaseUrl: '', webAppUrl: '', supabaseStorageKey: '' };

let _currentToken: string | null = null;

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
  toast.className = `job-tracker-toast ${type}`;

  const icon = type === 'success' ? '✓' : '✕';
  const iconColor = type === 'success' ? '#10b981' : '#ef4444';

  toast.innerHTML = `
    <div class="toast-icon" style="color: ${iconColor}">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;

  document.body.appendChild(toast);

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn?.addEventListener('click', () => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  });
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, _sender, _sendResponse) => {
    if (message.type === 'AUTH_STATE_CHANGED') {
      _currentToken = message.token || null;
      const modal = document.getElementById('job-tracker-modal');
      if (modal) {
        initializeModalFunctionality(modal);
      }
    }
  },
);

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
          .map((d: Dashboard) => `<option value="${d.id}">${d.name}</option>`)
          .join('');

      dashboardSelect.value = dashboards[0]?.id || '';
    } else {
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>No dashboards found</option>';
    }
  } catch (error: any) {
    dashboardSelect.innerHTML = `<option value="" disabled selected>Error: ${error.message || 'loading dashboards'}</option>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Saving...';

    try {
      // Get access token using Auth service
      const accessToken = await window.Auth.getAccessToken();

      if (!accessToken) {
        showContentToast(
          'error',
          'Authentication Required',
          'Please login via the extension popup first',
        );
        return;
      }

      const jobData: JobApplication = {
        dashboard_id: (
          document.getElementById('dashboardName') as HTMLSelectElement
        ).value.trim(),
        company: (
          document.getElementById('company') as HTMLInputElement
        ).value.trim(),
        position: (
          document.getElementById('position') as HTMLInputElement
        ).value.trim(),
        location: (
          document.getElementById('location') as HTMLInputElement
        ).value.trim(),
        url: (document.getElementById('url') as HTMLInputElement).value.trim(),
        salary_range: (
          document.getElementById('salaryRange') as HTMLInputElement
        ).value.trim(),
        description: (
          document.getElementById('jobDescription') as HTMLTextAreaElement
        ).value.trim(),
        status: 'saved',
        applied_date: null,
      };

      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_REQUEST',
        config: {
          url: `${window.AUTH_CONFIG.apiBaseUrl}/jobs`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(jobData),
        },
      });

      if (!response.success) {
        if (
          response.error &&
          (response.error.includes('token') ||
            response.error.includes('auth') ||
            response.error.includes('expired'))
        ) {
          // Trigger a re-login or token refresh
          await chrome.runtime.sendMessage({ type: 'REFRESH_TOKEN' });
          showContentToast(
            'error',
            'Session Expired',
            'Your session has expired. Please login again.',
          );
          return;
        }

        throw new Error(response.error || 'Failed to save job');
      }

      showContentToast(
        'success',
        'Success!',
        'Job information saved successfully',
      );
      (modal as HTMLElement).style.display = 'none';
    } catch (_error) {
      showContentToast(
        'error',
        'Error',
        'Failed to save job. Please try again.',
      );
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.textContent = originalText || 'Save';
    }
  });
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

function createFloatingButton(jobSite: JobSite): void {
  if (document.getElementById('job-tracker-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'job-tracker-btn';
  button.textContent = 'Track This Job';
  document.body.appendChild(button);

  const modal = window.createModalForm();

  button.addEventListener('click', () => {
    const jobDetails = jobSite.extractJobDetails();

    (modal.querySelector('#position') as HTMLInputElement).value =
      jobDetails.position || '';
    (modal.querySelector('#company') as HTMLInputElement).value =
      jobDetails.company || '';
    (modal.querySelector('#location') as HTMLInputElement).value =
      jobDetails.location || '';
    (modal.querySelector('#url') as HTMLInputElement).value =
      jobDetails.url || '';
    (modal.querySelector('#jobDescription') as HTMLTextAreaElement).value =
      jobDetails.jobDescription || '';
    (modal.querySelector('#salaryRange') as HTMLInputElement).value =
      jobDetails.salaryRange || '';

    modal.style.display = 'block';
  });

  const closeBtn = modal.querySelector('.close') as HTMLElement;
  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };

  window.onclick = (event: MouseEvent) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };

  initializeModalFunctionality(modal);
}

/*******************************
 *  Main Execution
 *******************************/
function initializeJobTracker(): void {
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

  if (jobSite) {
    const site = jobSite;
    site.isJobPage().then((isJobPage) => {
      if (isJobPage) {
        createFloatingButton(site);
      }
    });
  }
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

initializeJobTracker();
