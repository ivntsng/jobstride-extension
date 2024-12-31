window.AUTH_CONFIG = {
  apiBaseUrl: "http://localhost:8080",
};

window.Auth = {
  checkAuthStatus: async function () {
    const token = await chrome.storage.local.get("token");
    return !!token.token;
  },

  getUserDashboards: async function () {
    const { token } = await chrome.storage.local.get("token");
    if (!token) return null;

    try {
      const response = await fetch(
        `${window.AUTH_CONFIG.apiBaseUrl}/api/dashboards`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch dashboards");
      return await response.json();
    } catch (error) {
      console.error("Error fetching dashboards:", error);
      return null;
    }
  },

  initiateGithubLogin: async function () {
    try {
      const response = await fetch(
        `${window.AUTH_CONFIG.apiBaseUrl}/auth/github/client-id`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
      const { client_id } = await response.json();

      // Open GitHub login in a new window/tab
      const width = 600;
      const height = 800;
      const left = screen.width / 2 - width / 2;
      const top = screen.height / 2 - height / 2;

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=http://localhost:5173/auth/callback&scope=user:email`;

      return new Promise((resolve, reject) => {
        const authWindow = window.open(
          authUrl,
          "GitHub Auth",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for messages from the auth window
        window.addEventListener("message", async (event) => {
          if (event.origin === window.AUTH_CONFIG.apiBaseUrl) {
            if (event.data.type === "github-auth-success") {
              const token = await window.Auth.handleGithubCallback(
                event.data.code
              );
              window.removeEventListener("message", authListener);
              authWindow.close();
              resolve(token);
            } else if (event.data.type === "github-auth-error") {
              window.removeEventListener("message", authListener);
              authWindow.close();
              reject(new Error(event.data.error));
            }
          }
        });
      });
    } catch (error) {
      console.error("Failed to initiate GitHub login:", error);
      throw error;
    }
  },

  handleGithubCallback: async function (code) {
    try {
      const response = await fetch(
        `${window.AUTH_CONFIG.apiBaseUrl}/auth/github/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        }
      );

      if (!response.ok) throw new Error("Failed to exchange code for token");

      const { token } = await response.json();
      await chrome.storage.local.set({ token });
      return token;
    } catch (error) {
      console.error("Error handling GitHub callback:", error);
      throw error;
    }
  },
};
