window.AUTH_CONFIG = window.AUTH_CONFIG || {
  apiBaseUrl: '',
  webAppUrl: '',
  supabaseStorageKey: '',
};

const isAuthError = (error: any): boolean => {
  if (!error) return false;

  const message = error.message || error.error || String(error);
  const authPatterns = [
    /AUTH_REQUIRED/,
    /\b401\b/,
    /\b403\b/,
    /unauthorized/i,
    /unauthenticated/i,
    /forbidden/i,
    /invalid.?token/i,
    /token.?expired/i,
    /auth.*failed/i,
  ];

  return authPatterns.some((pattern) => pattern.test(message));
};

const escapePopupHtml = (value: string): string =>
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

const showPopupToast = (
  type: 'success' | 'error',
  title: string,
  message: string,
) => {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast jobstride-toast jobstride-toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon =
    type === 'success'
      ? '<path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />'
      : '<path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />';

  toast.innerHTML = `
    <div class="toast-icon jobstride-toast-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">${icon}</svg>
    </div>
    <div class="toast-content jobstride-toast-content">
      <div class="toast-title jobstride-toast-title">${escapePopupHtml(title)}</div>
      <div class="toast-message jobstride-toast-message">${escapePopupHtml(message)}</div>
    </div>
    <button class="toast-close jobstride-toast-close jobstride-icon-button" aria-label="Dismiss notification">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
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

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('job-form') as HTMLFormElement;
  const dashboardSelect = document.getElementById(
    'dashboardName',
  ) as HTMLSelectElement;

  if (!form || !dashboardSelect) return;

  document
    .querySelector('.close-popup')
    ?.addEventListener('click', () => window.close());

  const savedData = await chrome.storage.local.get('formData');
  if (savedData.formData) {
    const formData = savedData.formData as SavedFormData;
    Object.keys(formData).forEach((id) => {
      const element = document.getElementById(id) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
      if (element && formData[id as keyof SavedFormData]) {
        element.value = formData[id as keyof SavedFormData] || '';
      }
    });
  }

  form.addEventListener('input', async (e) => {
    const target = e.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    if (target.id) {
      const formData =
        ((await chrome.storage.local.get('formData'))
          .formData as SavedFormData) || {};
      formData[target.id as keyof SavedFormData] = target.value;
      await chrome.storage.local.set({ formData });
    }
  });

  dashboardSelect.addEventListener('change', async (e) => {
    const target = e.target as HTMLSelectElement;
    const formData =
      ((await chrome.storage.local.get('formData'))
        .formData as SavedFormData) || {};
    formData.dashboardName = target.value;
    await chrome.storage.local.set({ formData });
  });

  const isAuthenticated = await window.Auth.checkAuthStatus();
  if (!isAuthenticated) {
    form.style.display = 'none';
    const loginContainer = document.createElement('div');
    loginContainer.className = 'jobstride-empty-state';
    loginContainer.innerHTML = `
      <span class="jobstride-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M6 11h12v8H6v-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </span>
      <h2 class="jobstride-empty-title">Login Required</h2>
      <p class="jobstride-empty-copy">
        Please visit JobStride to log in, then reopen this extension.
      </p>
      <button id="open-web-app" class="btn-primary jobstride-button jobstride-button--primary jobstride-button--block">Open JobStride</button>
    `;
    document.querySelector('.card')?.appendChild(loginContainer);

    const openWebAppBtn = document.getElementById('open-web-app');
    openWebAppBtn?.addEventListener('click', async () => {
      try {
        await window.Auth.openWebAppLogin();
        // Show success message after opening the tab
        loginContainer.innerHTML = `
          <span class="jobstride-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <h2 class="jobstride-empty-title">Tab Opened</h2>
          <p class="jobstride-empty-copy">
            Please log in to JobStride in the new tab, then reopen this extension.
          </p>
          <button id="close-after-login" class="btn-primary jobstride-button jobstride-button--primary jobstride-button--block">Close</button>
        `;
        document
          .getElementById('close-after-login')
          ?.addEventListener('click', () => window.close());
      } catch (_error) {
        showPopupToast(
          'error',
          'Error',
          'Failed to open web app. Please try again.',
        );
      }
    });
    return;
  }

  dashboardSelect.innerHTML =
    '<option value="" disabled selected>Loading dashboards...</option>';

  try {
    const dashboards = await window.Auth.getUserDashboards();

    if (dashboards === null) {
      // User is not authenticated, log them out and show login
      await window.Auth.logout();
      window.location.reload();
      return;
    }

    if (dashboards.length > 0) {
      dashboardSelect.innerHTML = dashboards
        .map(
          (d: Dashboard) =>
            `<option value="${escapePopupHtml(d.id)}">${escapePopupHtml(d.name)}</option>`,
        )
        .join('');

      const savedData = await chrome.storage.local.get('formData');
      if (savedData.formData?.dashboardName) {
        dashboardSelect.value = savedData.formData.dashboardName;
      }

      form.style.display = '';
    } else {
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>No dashboards found</option>';
    }
  } catch (error: any) {
    // If there's an authentication error, log out and force re-login
    if (isAuthError(error)) {
      await window.Auth.logout();
      window.location.reload();
    } else {
      dashboardSelect.innerHTML =
        '<option value="" disabled selected>Error loading dashboards</option>';
      showPopupToast(
        'error',
        'Error',
        'Failed to load dashboards. Please try again.',
      );
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Saving...';

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

    try {
      await window.Auth.saveJob(jobData);

      showPopupToast(
        'success',
        'Success!',
        'Job information saved successfully',
      );

      await chrome.storage.local.remove('formData');
      form.reset();
    } catch (error) {
      if (isAuthError(error)) {
        await window.Auth.logout();
        window.location.reload();
        return;
      }

      showPopupToast('error', 'Error', 'Failed to save job. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = originalHtml || 'Save job';
    }
  });

  const modal = document.getElementById('createDashboardModal') as HTMLElement;
  const closeModal = modal?.querySelector('.close-modal') as HTMLElement;
  const openCreateDashboard = document.getElementById(
    'open-create-dashboard',
  ) as HTMLButtonElement | null;
  const dashboardForm = document.getElementById(
    'dashboard-form',
  ) as HTMLFormElement;

  const closeDashboardModal = () => {
    modal?.classList.remove('is-open');
  };

  openCreateDashboard?.addEventListener('click', () => {
    modal?.classList.add('is-open');
    (
      document.getElementById('newDashboardName') as HTMLInputElement | null
    )?.focus();
  });

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      closeDashboardModal();
    });
  }

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeDashboardModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('is-open')) {
      closeDashboardModal();
    }
  });

  if (dashboardForm) {
    dashboardForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = dashboardForm.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Creating...';

      const newDashboardName = (
        document.getElementById('newDashboardName') as HTMLInputElement
      ).value.trim();

      try {
        const newDashboard =
          await window.Auth.createDashboard(newDashboardName);

        const option = new Option(newDashboard.name, newDashboard.id);
        dashboardSelect.add(option);
        dashboardSelect.value = newDashboard.id;

        closeDashboardModal();
        dashboardForm.reset();

        showPopupToast(
          'success',
          'Dashboard Created',
          `"${newDashboard.name}" has been created successfully`,
        );
      } catch (error) {
        if (isAuthError(error)) {
          await window.Auth.logout();
          window.location.reload();
          return;
        }

        showPopupToast(
          'error',
          'Error',
          'Failed to create dashboard. Please try again.',
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalHtml || 'Create dashboard';
      }
    });
  }
});
