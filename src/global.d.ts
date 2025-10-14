interface EnvConfig {
  API_BASE_URL: string;
  WEB_APP_URL: string;
}

interface JobDetails {
  company: string;
  position: string;
  location: string;
  url: string;
  jobDescription: string;
  salaryRange?: string;
}

interface JobSelectors {
  jobPage: string;
  company: string;
  title: string;
  location: string;
  description: string;
  salary?: string;
}

interface Dashboard {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface JobApplication {
  dashboard_id: string;
  company: string;
  position: string;
  location: string;
  url: string;
  salary_range: string;
  description: string;
  status: 'saved' | 'applied' | 'interview' | 'rejected' | 'offered';
  applied_date: string | null;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

interface ChromeMessage {
  type: string;
  config?: any;
  token?: string;
}

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

interface JobSiteHandler {
  getSelectors(): JobSelectors;
  isJobPage(): Promise<boolean>;
  extractJobDetails(): JobDetails;
}

interface SiteConfig {
  domains: string[];
  handler: () => any;
  site: string;
}

interface SavedFormData {
  dashboardName?: string;
  company?: string;
  position?: string;
  location?: string;
  jobDescription?: string;
  url?: string;
  salaryRange?: string;
}

interface Window {
  AUTH_CONFIG: {
    apiBaseUrl: string;
    webAppUrl?: string;
  };
  Auth: {
    checkAuthStatus(): Promise<boolean>;
    getUserDashboards(): Promise<Dashboard[] | null>;
    initiateGithubLogin(): Promise<string>;
    handleGithubCallback(code: string): Promise<string>;
  };
  JobSite: any;
  Indeed: any;
  LinkedIn: any;
  Greenhouse: any;
  Ashby: any;
  Lever: any;
  Workday: any;
  Rippling: any;
  createModalForm: () => HTMLElement;
  convertHtmlToText: (html: string) => string;
  Utils: {
    convertHtmlToMarkdown: (html: string) => string;
    convertHtmlToText: (html: string) => string;
  };
}
