function createModalForm(): HTMLElement {
  const modal = document.createElement('div');
  modal.id = 'job-tracker-modal';
  modal.className = 'jobstride-dialog';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'job-tracker-modal-title');
  modal.innerHTML = `
    <div class="jobstride-dialog-panel">
      <div class="jobstride-dialog-header">
        <div class="jobstride-brand">
          <span class="jobstride-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 7V6a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M5 7h14v11.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              <path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </span>
          <div class="jobstride-title-group">
            <h2 id="job-tracker-modal-title" class="jobstride-title">JobStride</h2>
            <p class="jobstride-subtitle">Track this job</p>
          </div>
        </div>
        <button class="jobstride-dialog-close jobstride-icon-button" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <form id="job-form-modal" class="jobstride-form">
        <div class="jobstride-dialog-body">
          <div class="jobstride-form-grid">
            <div class="jobstride-field">
              <label class="jobstride-label" for="dashboardName">Select Dashboard</label>
              <select id="dashboardName" class="jobstride-control jobstride-select" required>
                <option value="" disabled selected>Choose a dashboard...</option>
              </select>
            </div>
            <div class="jobstride-field">
              <label class="jobstride-label" for="company">Company</label>
              <input type="text" id="company" class="jobstride-control" placeholder="e.g. Acme Inc." required />
            </div>
            <div class="jobstride-field">
              <label class="jobstride-label" for="position">Position</label>
              <input type="text" id="position" class="jobstride-control" placeholder="e.g. Senior Product Manager" required />
            </div>
            <div class="jobstride-field">
              <label class="jobstride-label" for="location">Location</label>
              <input type="text" id="location" class="jobstride-control" placeholder="e.g. Remote or New York, NY" />
            </div>
            <div class="jobstride-field jobstride-field--full">
              <label class="jobstride-label" for="jobDescription">Job Description</label>
              <textarea id="jobDescription" class="jobstride-control jobstride-textarea" placeholder="Add notes about the role, requirements, etc."></textarea>
            </div>
            <div class="jobstride-field jobstride-field--full">
              <label class="jobstride-label" for="url">Job URL</label>
              <input type="url" id="url" class="jobstride-control" placeholder="https://jobboard.com/jobs/12345" />
            </div>
            <div class="jobstride-field jobstride-field--full">
              <label class="jobstride-label" for="salaryRange">Salary Range</label>
              <input type="text" id="salaryRange" class="jobstride-control" placeholder="e.g. $120,000 - $150,000" />
            </div>
          </div>
        </div>
        <div class="jobstride-dialog-footer">
          <button type="button" class="jobstride-dialog-cancel jobstride-button jobstride-button--secondary">Cancel</button>
          <button type="submit" class="jobstride-button jobstride-button--primary">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 4.5h12v15l-6-3.5-6 3.5v-15Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            </svg>
            Save job
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

// Make it available globally
window.createModalForm = createModalForm;
