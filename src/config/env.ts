const defaultConfig: EnvConfig = {
  API_BASE_URL: 'https://nextstep-backend.vercel.app',
  WEB_APP_URL: 'https://nextstep-app.vercel.app',
};

function getEnvVar(key: keyof EnvConfig, defaultValue: string): string {
  return defaultValue;
}

const envConfig: EnvConfig = {
  API_BASE_URL: getEnvVar('API_BASE_URL', defaultConfig.API_BASE_URL),
  WEB_APP_URL: getEnvVar('WEB_APP_URL', defaultConfig.WEB_APP_URL),
};

if (typeof window !== 'undefined') {
  window.AUTH_CONFIG = {
    apiBaseUrl: envConfig.API_BASE_URL,
  } as any;
  (window as any).AUTH_CONFIG.webAppUrl = envConfig.WEB_APP_URL;
}
