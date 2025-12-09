interface AuthService {
  checkAuthStatus(): Promise<boolean>;
  getUserDashboards(): Promise<Dashboard[] | null>;
  openWebAppLogin(): Promise<void>;
  logout(): Promise<void>;
}

class Auth implements AuthService {
  async checkAuthStatus(): Promise<boolean> {
    try {
      const chromeToken = await chrome.storage.local.get('token');
      if (chromeToken.token) return true;

      if (chrome.tabs) {
        const webAppUrl = (window as any).AUTH_CONFIG?.webAppUrl || '';
        if (!webAppUrl) return false;

        const tabs = await chrome.tabs.query({ url: `${webAppUrl}/*` });

        for (const tab of tabs) {
          if (tab.id) {
            try {
              const token = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => localStorage.getItem('token'),
              });

              if (token[0]?.result) {
                await chrome.storage.local.set({ token: token[0].result });
                return true;
              }
            } catch (_scriptError) {
              // Could not access web app localStorage
            }
          }
        }
      }

      return false;
    } catch (_error) {
      return false;
    }
  }

  async getUserDashboards(): Promise<any[] | null> {
    const chromeToken = await chrome.storage.local.get('token');

    if (!chromeToken.token) {
      return null;
    }

    return await new Promise<any[]>((resolve, reject) => {
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
          reject(chrome.runtime.lastError);
        } else if (!response || !response.success) {
          reject(new Error(response?.error || 'Failed to fetch dashboards'));
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

    if (chrome.tabs) {
      await chrome.tabs.create({ url: webAppUrl });
    } else {
      window.open(webAppUrl, '_blank');
    }
  }

  async logout(): Promise<void> {
    await chrome.storage.local.remove('token');
  }
}

// Create the auth service
const authService = new Auth();

// Make Auth available globally for backward compatibility
window.Auth = authService;
