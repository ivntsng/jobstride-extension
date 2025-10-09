window.AUTH_CONFIG = window.AUTH_CONFIG || { apiBaseUrl: '' };

const showPopupToast = (type: 'success' | 'error', title: string, message: string) => {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

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

document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('job-form') as HTMLFormElement;
  const dashboardSelect = document.getElementById('dashboardName') as HTMLSelectElement;

  if (!form || !dashboardSelect) return;

  const savedData = await chrome.storage.local.get('formData');
  if (savedData.formData) {
    const formData = savedData.formData as SavedFormData;
    Object.keys(formData).forEach((id) => {
      const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (element && formData[id as keyof SavedFormData]) {
        element.value = formData[id as keyof SavedFormData] || '';
      }
    });
  }

  form.addEventListener('input', async (e) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (target.id) {
      const formData = (await chrome.storage.local.get('formData')).formData as SavedFormData || {};
      formData[target.id as keyof SavedFormData] = target.value;
      await chrome.storage.local.set({ formData });
    }
  });

  dashboardSelect.addEventListener('change', async (e) => {
    const target = e.target as HTMLSelectElement;
    const formData = (await chrome.storage.local.get('formData')).formData as SavedFormData || {};
    formData.dashboardName = target.value;
    await chrome.storage.local.set({ formData });
  });

  const isAuthenticated = await window.Auth.checkAuthStatus();
  if (!isAuthenticated) {
    form.style.display = 'none';
    const loginButton = document.createElement('button');
    loginButton.textContent = 'Login with GitHub';
    loginButton.className = 'btn-primary';
    loginButton.onclick = async () => {
      try {
        const token = await window.Auth.initiateGithubLogin();
        if (token) {
          await chrome.storage.local.set({ token });
          window.location.reload();
        }
      } catch (error) {
        console.error('Login failed:', error);
        showPopupToast('error', 'Login Failed', 'Please try again.');
      }
    };
    document.querySelector('.card')?.appendChild(loginButton);
    return;
  }

  dashboardSelect.innerHTML = '<option value="" disabled selected>Loading dashboards...</option>';

  try {
    const dashboards = await window.Auth.getUserDashboards();
    console.log('Received dashboards:', dashboards);
    if (dashboards?.length) {
      dashboardSelect.innerHTML = dashboards
        .map((d: Dashboard) => `<option value="${d.id}">${d.name}</option>`)
        .join('');

      const savedData = await chrome.storage.local.get('formData');
      if (savedData.formData && savedData.formData.dashboardName) {
        dashboardSelect.value = savedData.formData.dashboardName;
      }

      form.style.display = 'block';
    } else {
      console.log('No dashboards found or dashboards is null');
      dashboardSelect.innerHTML = '<option value="" disabled selected>No dashboards found</option>';
    }
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    dashboardSelect.innerHTML = '<option value="" disabled selected>Error loading dashboards</option>';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Saving...';

    const jobData: JobApplication = {
      dashboard_id: (document.getElementById('dashboardName') as HTMLSelectElement).value.trim(),
      company: (document.getElementById('company') as HTMLInputElement).value.trim(),
      position: (document.getElementById('position') as HTMLInputElement).value.trim(),
      location: (document.getElementById('location') as HTMLInputElement).value.trim(),
      url: (document.getElementById('url') as HTMLInputElement).value.trim(),
      salary_range: (document.getElementById('salaryRange') as HTMLInputElement).value.trim(),
      description: (document.getElementById('jobDescription') as HTMLTextAreaElement).value.trim(),
      status: 'saved',
      applied_date: null,
    };

    try {
      const response = await fetch(`${window.AUTH_CONFIG.apiBaseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await chrome.storage.local.get('token')).token}`,
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to save job');
      }

      const savedJob = await response.json();
      console.log('Job saved successfully:', savedJob);

      showPopupToast('success', 'Success!', 'Job information saved successfully');

      await chrome.storage.local.remove('formData');
      form.reset();
    } catch (error) {
      console.error('Error saving job:', error);
      showPopupToast('error', 'Error', 'Failed to save job. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.textContent = originalText || 'Save';
    }
  });

  const modal = document.getElementById('createDashboardModal') as HTMLElement;
  const closeModal = modal?.querySelector('.close-modal') as HTMLElement;
  const dashboardForm = document.getElementById('dashboard-form') as HTMLFormElement;

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  if (dashboardForm) {
    dashboardForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = dashboardForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Creating...';

      const newDashboardName = (document.getElementById('newDashboardName') as HTMLInputElement).value.trim();

      try {
        const response = await fetch(`${window.AUTH_CONFIG.apiBaseUrl}/dashboards/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await chrome.storage.local.get('token')).token}`,
          },
          body: JSON.stringify({ name: newDashboardName }),
        });

        if (!response.ok) throw new Error('Failed to create dashboard');

        const newDashboard = await response.json();

        const option = new Option(newDashboard.name, newDashboard.id);
        dashboardSelect.add(option);
        dashboardSelect.value = newDashboard.id;

        modal.style.display = 'none';
        dashboardForm.reset();

        showPopupToast('success', 'Dashboard Created', `"${newDashboard.name}" has been created successfully`);
      } catch (error) {
        console.error('Error creating dashboard:', error);
        showPopupToast('error', 'Error', 'Failed to create dashboard. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalText || 'Create Dashboard';
      }
    });
  }
});
