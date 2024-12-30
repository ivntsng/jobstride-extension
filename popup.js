// popup.js

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("job-form");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Gather form data
    const dashboardName = document.getElementById("dashboardName").value.trim();
    const company = document.getElementById("company").value.trim();
    const position = document.getElementById("position").value.trim();
    const location = document.getElementById("location").value.trim();
    const applied = document.getElementById("applied").checked;
    const url = document.getElementById("url").value.trim();
    const salaryRange = document.getElementById("salaryRange").value.trim();

    // Create a job object
    const jobData = {
      dashboardName,
      company,
      position,
      location,
      applied,
      url,
      salaryRange,
      createdAt: new Date().toISOString(),
    };

    // Save to Chrome storage (local or sync)
    // We'll use local here, but you can also use chrome.storage.sync
    chrome.storage.local.get({ jobs: [] }, function (result) {
      const jobs = result.jobs;
      jobs.push(jobData);

      chrome.storage.local.set({ jobs }, function () {
        console.log("Job data saved:", jobData);
        alert("Job info saved successfully!");
        // Optionally clear the form
        form.reset();
      });
    });
  });
});
