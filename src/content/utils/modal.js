function createModalForm() {
  const modal = document.createElement("div");
  modal.id = "job-tracker-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Track This Job</h2>
      <form id="job-form-modal">
        <div class="form-group">
          <label for="dashboardName">Dashboard Name</label>
          <input type="text" id="dashboardName" placeholder="e.g. Tech Applications" required />
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
          <textarea id="jobDescription" rows="6" placeholder="Job description and requirements"></textarea>
        </div>
        <div class="form-group">
          <label for="url">Job URL</label>
          <input type="url" id="url" placeholder="https://example.com/job-post" />
        </div>
        <div class="form-group">
          <label for="salaryRange">Salary Range</label>
          <input type="text" id="salaryRange" placeholder="$80k - $100k" />
        </div>
        <button type="submit" class="btn-primary">Save</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

export { createModalForm };
