export interface EnvConfig {
  API_BASE_URL: string;
  WEB_APP_URL: string;
}

export interface JobDetails {
  company: string;
  position: string;
  location: string;
  url: string;
  jobDescription: string;
  salaryRange?: string;
}

export interface JobSelectors {
  jobPage: string;
  company: string;
  title: string;
  location: string;
  description: string;
  salary?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobApplication {
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ChromeMessage {
  type: string;
  config?: any;
  token?: string;
}

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

export interface JobSiteHandler {
  getSelectors(): JobSelectors;
  isJobPage(): Promise<boolean>;
  extractJobDetails(): JobDetails;
}

export interface SiteConfig {
  domains: string[];
  handler: () => any;
  site: string;
}

export interface SavedFormData {
  dashboardName?: string;
  company?: string;
  position?: string;
  location?: string;
  jobDescription?: string;
  url?: string;
  salaryRange?: string;
}

declare global {
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
    createModalForm: () => HTMLElement;
    convertHtmlToText: (html: string) => string;
    Utils: {
      convertHtmlToMarkdown: (html: string) => string;
      convertHtmlToText: (html: string) => string;
    };
  }
}
