interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    app_metadata: {
      provider: string;
    };
  };
}

interface StoredAuth {
  accessToken: string;
  expiresAt: number;
}

interface AuthService {
  checkAuthStatus(): Promise<boolean>;
  getUserDashboards(): Promise<Dashboard[] | null>;
  openWebAppLogin(): Promise<void>;
  logout(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

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

  private parseSupabaseSession(sessionStr: string): SupabaseSession | null {
    try {
      const session = JSON.parse(sessionStr);
      if (session?.access_token && session?.expires_at) {
        return session as SupabaseSession;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const stored = await chrome.storage.local.get('auth');
      const auth = stored.auth as StoredAuth | undefined;

      if (auth?.accessToken && !this.isTokenExpired(auth.expiresAt)) {
        return auth.accessToken;
      }

      const freshAuth = await this.extractAuthFromWebApp();
      if (freshAuth) {
        return freshAuth.accessToken;
      }

      return null;
    } catch {
      return null;
    }
  }

  private async extractAuthFromWebApp(): Promise<StoredAuth | null> {
    if (!chrome.tabs) return null;

    const webAppUrl = (window as any).AUTH_CONFIG?.webAppUrl || '';
    if (!webAppUrl) return null;

    const storageKey = this.getSupabaseStorageKey();

    try {
      const tabs = await chrome.tabs.query({ url: `${webAppUrl}/*` });

      for (const tab of tabs) {
        if (tab.id) {
          try {
            const result = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (key: string) => localStorage.getItem(key),
              args: [storageKey],
            });

            const sessionStr = result[0]?.result;
            if (sessionStr) {
              const session = this.parseSupabaseSession(sessionStr);
              if (session && !this.isTokenExpired(session.expires_at)) {
                const auth: StoredAuth = {
                  accessToken: session.access_token,
                  expiresAt: session.expires_at,
                };
                await chrome.storage.local.set({ auth });
                return auth;
              }
            }
          } catch {}
        }
      }
    } catch {}

    return null;
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      const stored = await chrome.storage.local.get('auth');
      const auth = stored.auth as StoredAuth | undefined;

      if (auth?.accessToken && !this.isTokenExpired(auth.expiresAt)) {
        return true;
      }

      const freshAuth = await this.extractAuthFromWebApp();
      return freshAuth !== null;
    } catch {
      return false;
    }
  }

  async getUserDashboards(): Promise<any[] | null> {
    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      return null;
    }

    return await new Promise<any[]>((resolve, reject) => {
      const message = {
        type: 'FETCH_REQUEST',
        config: {
          url: `${(window as any).AUTH_CONFIG.apiBaseUrl}/dashboards/`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      };

      chrome.runtime.sendMessage(message, (response: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (!response || !response.success) {
          const error = new Error(
            response?.error || 'Failed to fetch dashboards',
          );
          if (
            response?.error?.includes('401') ||
            response?.error?.includes('403')
          ) {
            chrome.storage.local.remove('auth');
          }
          reject(error);
        } else {
          resolve(response.data || []);
        }
      });
    });
  }

  async openWebAppLogin(): Promise<void> {
    const webAppUrl = (window as any).AUTH_CONFIG?.webAppUrl;
    if (!webAppUrl) {
      throw new Error('Web app URL not configured');
    }

    await chrome.storage.local.remove('auth');

    if (chrome.tabs) {
      await chrome.tabs.create({ url: `${webAppUrl}/login` });
    } else {
      window.open(`${webAppUrl}/login`, '_blank');
    }
  }

  async logout(): Promise<void> {
    await chrome.storage.local.remove('auth');
  }
}

// Create the auth service
const authService = new Auth();

// Make Auth available globally for backward compatibility
window.Auth = authService;
