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
        const result = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        const webAppUrl = (window as any).AUTH_CONFIG?.webAppUrl || '';
        if (result[0]?.url?.includes(webAppUrl)) {
          const [tab] = result;
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
            } catch (scriptError) {
              console.log('Could not access web app localStorage:', scriptError);
            }
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
      throw error;
    }
  }

  async openWebAppLogin(): Promise<void> {
    try {
      const webAppUrl = (window as any).AUTH_CONFIG?.webAppUrl;
      if (!webAppUrl) {
        throw new Error('Web app URL not configured');
      }

      if (chrome.tabs) {
        await chrome.tabs.create({ url: webAppUrl });
      } else {
        window.open(webAppUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to open web app login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await chrome.storage.local.remove('token');
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }
}

// Create the auth service
const authService = new Auth();

// Make Auth available globally for backward compatibility
window.Auth = authService;
