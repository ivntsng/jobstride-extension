abstract class JobSite {
  abstract getSelectors(): JobSelectors;

  isJobPage(): Promise<boolean> {
    return Promise.resolve(false);
  }

  extractJobDetails(): JobDetails {
    return {
      company: '',
      position: '',
      location: '',
      url: window.location.href,
      jobDescription: '',
    };
  }
}

window.JobSite = JobSite;
