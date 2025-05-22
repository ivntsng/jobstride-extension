window.createModalForm = function () {
  const modal = document.createElement("div");
  modal.id = "job-tracker-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Track This Job</h2>
        <button class="close">&times;</button>
      </div>
      <form id="job-form-modal">
        <div class="form-group">
          <label for="dashboardName">Select Dashboard</label>
          <select id="dashboardName" required>
            <option value="" disabled selected>Choose a dashboard...</option>
          </select>
        </div>
        <div class="form-group">
          <label for="company">Company</label>
          <input type="text" id="company" placeholder="e.g. Google" required />
        </div>
        <div class="form-group">
          <label for="position">Position</label>
          <input type="text" id="position" placeholder="e.g. Frontend Engineer" required />
        </div>
        <div class="form-group">
          <label for="location">Location</label>
          <input type="text" id="location" placeholder="e.g. San Francisco" required />
        </div>
        <div class="form-group">
          <label for="jobDescription">Job Description</label>
          <textarea id="jobDescription" placeholder="Job description and requirements"></textarea>
        </div>
        <div class="form-group">
          <label for="url">Job URL</label>
          <input type="url" id="url" placeholder="https://example.com/job-post" />
        </div>
        <div class="form-group">
          <label for="salaryRange">Salary Range</label>
          <input type="text" id="salaryRange" placeholder="$80k - $100k" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
};
