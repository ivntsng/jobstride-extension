interface AuthService {
  checkAuthStatus(): Promise<boolean>;
  getUserDashboards(): Promise<Dashboard[] | null>;
  initiateGithubLogin(): Promise<string>;
  handleGithubCallback(code: string): Promise<string>;
}

class Auth implements AuthService {
  async checkAuthStatus(): Promise<boolean> {
    try {
      // First check chrome.storage
      const chromeToken = await chrome.storage.local.get('token');
      if (chromeToken.token) return true;

      // Then check localStorage from the main web app
      // We need to execute this in the context of the web app
      const result = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const webAppUrl = (window as any).AUTH_CONFIG?.webAppUrl || '';
      if (result[0]?.url?.includes(webAppUrl)) {
        const [tab] = result;
        if (tab.id) {
          const token = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
          func: () => localStorage.getItem('token'),
        });

          if (token[0]?.result) {
            // If found in localStorage, save to chrome.storage
            await chrome.storage.local.set({ token: token[0].result });
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  }

  async getUserDashboards(): Promise<any[] | null> {
    try {
      const chromeToken = await chrome.storage.local.get('token');
      console.log('Retrieved token:', chromeToken.token ? 'exists' : 'missing');

      if (!chromeToken.token) {
        return null;
      }

      return new Promise<any[]>((resolve, reject) => {
        const message = {
          type: 'FETCH_REQUEST',
          config: {
            url: `${(window as any).AUTH_CONFIG.apiBaseUrl}/dashboards/`,
            method: 'GET',
            headers: {
              Authorization: `Bearer ${chromeToken.token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        };

        chrome.runtime.sendMessage(message, (response: any) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else if (!response || !response.success) {
            reject(new Error(response?.error || 'Failed to fetch dashboards'));
          } else {
            resolve(response.data || []);
          }
        });
      });
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      return [];
    }
  }

  async initiateGithubLogin(): Promise<string> {
    try {
      const response = await fetch(
        `${(window as any).AUTH_CONFIG.apiBaseUrl}/auth/github/client-id`,
        {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
      const { client_id } = await response.json();

      // Open GitHub login in a new window/tab
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${(window as any).AUTH_CONFIG.webAppUrl}/auth/callback&scope=user:email`;

      return new Promise<string>((resolve, reject) => {
        const authWindow = window.open(authUrl, 'GitHub Auth');

        // Listen for messages from the auth window
        const authListener = async (event: MessageEvent) => {
          if (event.origin === (window as any).AUTH_CONFIG.apiBaseUrl) {
            if (event.data.type === 'github-auth-success') {
              const token = await this.handleGithubCallback(event.data.code);
              window.removeEventListener('message', authListener);
              authWindow?.close();
              resolve(token);
            } else if (event.data.type === 'github-auth-error') {
              window.removeEventListener('message', authListener);
              authWindow?.close();
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', authListener);
      });
    } catch (error) {
      console.error('Failed to initiate GitHub login:', error);
      throw error;
    }
  }

  async handleGithubCallback(code: string): Promise<string> {
    try {
      const response = await fetch(
        `${(window as any).AUTH_CONFIG.apiBaseUrl}/auth/github/callback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        }
      );

      if (!response.ok) throw new Error('Failed to exchange code for token');

      const { token } = await response.json();
      await chrome.storage.local.set({ token });
      return token;
    } catch (error) {
      console.error('Error handling GitHub callback:', error);
      throw error;
    }
  }
}

// Create the auth service
const authService = new Auth();

// Make Auth available globally for backward compatibility
window.Auth = authService;
