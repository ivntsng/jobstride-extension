interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  expires_in?: number;
  token_type?: string;
  user?: {
    id: string;
    email: string;
    app_metadata?: {
      provider: string;
    };
  };
}

interface StoredAuth {
  accessToken: string;
  expiresAt: number;
  syncedAt?: number;
}

interface BackgroundResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthService {
  checkAuthStatus(): Promise<boolean>;
  getUserDashboards(): Promise<Dashboard[] | null>;
  openWebAppLogin(): Promise<void>;
  logout(): Promise<void>;
  syncAuthFromCurrentPage(): Promise<boolean>;
  saveJob(jobData: JobApplication): Promise<any>;
  createDashboard(name: string): Promise<Dashboard>;
}

const AUTH_ALLOWED_WEB_APP_ORIGINS = new Set([
  'https://jobstride.app',
  'http://localhost:5173',
  'https://localhost:5173',
]);

class Auth implements AuthService {
  private getSupabaseStorageKey(): string {
    return (
      (window as any).AUTH_CONFIG?.supabaseStorageKey ||
      'sb-bxxojrwocxrehaodlesq-auth-token'
    );
  }

  private isTokenExpired(expiresAt: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now >= expiresAt - 60;
  }

  private getAllowedWebAppOrigin(url: string): string | null {
    try {
      const origin = new URL(url).origin;
      return AUTH_ALLOWED_WEB_APP_ORIGINS.has(origin) ? origin : null;
    } catch {
      return null;
    }
  }

  private getConfiguredWebAppOrigin(): string {
    return (
      this.getAllowedWebAppOrigin(
        (window as any).AUTH_CONFIG?.webAppUrl || '',
      ) || 'https://jobstride.app'
    );
  }

  private getConfiguredApiBaseUrl(): string {
    return (
      (window as any).AUTH_CONFIG?.apiBaseUrl || 'https://api.jobstride.app'
    );
  }

  private getSupabaseStorageKeys(): string[] {
    const configuredKey = this.getSupabaseStorageKey();

    if (!/^sb-[a-z0-9-]+-auth-token$/i.test(configuredKey)) {
      return [];
    }

    return [configuredKey];
  }

  private getWebStorage(storageName: 'localStorage' | 'sessionStorage') {
    try {
      return window[storageName];
    } catch {
      return null;
    }
  }

  private findSessionValue(value: unknown, depth = 0): SupabaseSession | null {
    if (!value || typeof value !== 'object' || depth > 3) {
      return null;
    }

    const candidate = value as {
      access_token?: unknown;
      expires_at?: unknown;
      session?: unknown;
      currentSession?: unknown;
      value?: unknown;
    };

    if (typeof candidate.access_token === 'string') {
      const expiresAt =
        typeof candidate.expires_at === 'number'
          ? candidate.expires_at
          : Number(candidate.expires_at);

      if (Number.isFinite(expiresAt)) {
        return {
          ...(value as SupabaseSession),
          expires_at: expiresAt,
        };
      }
    }

    return (
      this.findSessionValue(candidate.session, depth + 1) ||
      this.findSessionValue(candidate.currentSession, depth + 1) ||
      this.findSessionValue(candidate.value, depth + 1)
    );
  }

  private parseSupabaseSession(sessionStr: string): SupabaseSession | null {
    try {
      return this.findSessionValue(JSON.parse(sessionStr));
    } catch {
      return null;
    }
  }

  private readAuthFromWebStorage(storage: Storage | null): StoredAuth | null {
    if (!storage) return null;

    for (const key of this.getSupabaseStorageKeys()) {
      const sessionStr = storage.getItem(key);
      if (!sessionStr) continue;

      const session = this.parseSupabaseSession(sessionStr);
      if (session && !this.isTokenExpired(session.expires_at)) {
        return {
          accessToken: session.access_token,
          expiresAt: session.expires_at,
          syncedAt: Date.now(),
        };
      }
    }

    return null;
  }

  private sendBackgroundMessage<T = any>(
    message: Record<string, unknown>,
  ): Promise<BackgroundResponse<T>> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response: BackgroundResponse<T>) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message || 'Unknown error',
          });
          return;
        }

        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  async checkAuthStatus(): Promise<boolean> {
    const response = await this.sendBackgroundMessage<{
      authenticated: boolean;
    }>({
      type: 'CHECK_AUTH_STATUS',
      webAppUrl: this.getConfiguredWebAppOrigin(),
    });

    return Boolean(response.success && response.data?.authenticated);
  }

  async getUserDashboards(): Promise<Dashboard[] | null> {
    const response = await this.sendBackgroundMessage<Dashboard[]>({
      type: 'GET_DASHBOARDS',
      apiBaseUrl: this.getConfiguredApiBaseUrl(),
      webAppUrl: this.getConfiguredWebAppOrigin(),
    });

    if (!response.success) {
      if (response.error === 'AUTH_REQUIRED') {
        return null;
      }
      throw new Error(response.error || 'Failed to fetch dashboards');
    }

    return response.data || [];
  }

  async openWebAppLogin(): Promise<void> {
    const response = await this.sendBackgroundMessage({
      type: 'OPEN_LOGIN',
      webAppUrl: this.getConfiguredWebAppOrigin(),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to open web app');
    }
  }

  async logout(): Promise<void> {
    await this.sendBackgroundMessage({ type: 'LOGOUT' });
  }

  async syncAuthFromCurrentPage(): Promise<boolean> {
    const auth =
      this.readAuthFromWebStorage(this.getWebStorage('localStorage')) ||
      this.readAuthFromWebStorage(this.getWebStorage('sessionStorage'));

    if (!auth) {
      return false;
    }

    const response = await this.sendBackgroundMessage({
      type: 'SYNC_WEB_APP_AUTH',
      auth,
    });

    return response.success;
  }

  async saveJob(jobData: JobApplication): Promise<any> {
    const response = await this.sendBackgroundMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: this.getConfiguredApiBaseUrl(),
      webAppUrl: this.getConfiguredWebAppOrigin(),
      jobData,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to save job');
    }

    return response.data;
  }

  async createDashboard(name: string): Promise<Dashboard> {
    const response = await this.sendBackgroundMessage<Dashboard>({
      type: 'CREATE_DASHBOARD',
      apiBaseUrl: this.getConfiguredApiBaseUrl(),
      webAppUrl: this.getConfiguredWebAppOrigin(),
      name,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to create dashboard');
    }

    if (!response.data) {
      throw new Error('Dashboard response was empty');
    }

    return response.data;
  }
}

const authService = new Auth();

window.Auth = authService;
