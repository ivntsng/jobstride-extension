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

const API_ORIGINS = new Set([
  'https://api.jobstride.app',
  'http://localhost:8080',
  'https://localhost:8080',
]);
const WEB_APP_ORIGINS = new Set([
  'https://jobstride.app',
  'http://localhost:5173',
  'https://localhost:5173',
]);

const DEFAULT_API_ORIGIN = 'https://api.jobstride.app';
const DEFAULT_WEB_APP_ORIGIN = 'https://jobstride.app';
const SUPABASE_STORAGE_KEY = 'sb-bxxojrwocxrehaodlesq-auth-token';

void chrome.storage.session
  .setAccessLevel({
    accessLevel: 'TRUSTED_CONTEXTS',
  })
  .catch(() => undefined);

chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) =>
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  return true;
});

async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
): Promise<BackgroundResponse> {
  switch (message?.type) {
    case 'CHECK_AUTH_STATUS': {
      const auth = await ensureAuth(message.webAppUrl);
      return { success: true, data: { authenticated: auth !== null } };
    }
    case 'GET_DASHBOARDS': {
      const data = await fetchApi(message.apiBaseUrl, message.webAppUrl, {
        path: '/dashboards/',
        method: 'GET',
      });
      return { success: true, data };
    }
    case 'CREATE_DASHBOARD': {
      const name = typeof message.name === 'string' ? message.name.trim() : '';
      if (!name) {
        throw new Error('Dashboard name is required');
      }

      const data = await fetchApi(message.apiBaseUrl, message.webAppUrl, {
        path: '/dashboards/',
        method: 'POST',
        body: { name },
      });
      return { success: true, data };
    }
    case 'SAVE_JOB': {
      const jobData = normalizeJobApplication(message.jobData);
      const data = await fetchApi(message.apiBaseUrl, message.webAppUrl, {
        path: '/jobs',
        method: 'POST',
        body: jobData,
      });
      return { success: true, data };
    }
    case 'OPEN_LOGIN': {
      await clearStoredAuth();
      const webAppOrigin = getAllowedWebAppOrigin(message.webAppUrl);
      await chrome.tabs.create({ url: `${webAppOrigin}/login` });
      return { success: true };
    }
    case 'LOGOUT': {
      await clearStoredAuth();
      return { success: true };
    }
    case 'SYNC_WEB_APP_AUTH': {
      if (!isAllowedWebAppSender(sender)) {
        throw new Error('Auth sync sender is not allowed');
      }

      const auth = normalizeStoredAuth(message.auth);
      if (!auth) {
        throw new Error('Auth payload is invalid');
      }

      await storeAuth(auth);
      return { success: true };
    }
    default:
      return { success: false, error: 'Unsupported message type' };
  }
}

async function fetchApi(
  apiBaseUrl: unknown,
  webAppUrl: unknown,
  request: {
    path: '/dashboards/' | '/jobs';
    method: 'GET' | 'POST';
    body?: unknown;
  },
): Promise<any> {
  const auth = await ensureAuth(webAppUrl);
  if (!auth) {
    throw new Error('AUTH_REQUIRED');
  }

  const apiOrigin = getAllowedApiOrigin(apiBaseUrl);
  const init: RequestInit = {
    method: request.method,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  if (request.body) {
    init.body = JSON.stringify(request.body);
  }

  const response = await fetch(`${apiOrigin}${request.path}`, init);

  if (response.status === 401 || response.status === 403) {
    await clearStoredAuth();
    throw new Error('AUTH_REQUIRED');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function ensureAuth(webAppUrl: unknown): Promise<StoredAuth | null> {
  const storedAuth = await getStoredAuth();
  if (storedAuth) {
    return storedAuth;
  }

  const webAppOrigin = getAllowedWebAppOrigin(webAppUrl);
  const syncedAuth = await extractAuthFromWebAppTabs(webAppOrigin);
  if (!syncedAuth) {
    return null;
  }

  await storeAuth(syncedAuth);
  return syncedAuth;
}

async function getStoredAuth(): Promise<StoredAuth | null> {
  const stored = await chrome.storage.session.get('auth');
  return normalizeStoredAuth(stored.auth);
}

async function storeAuth(auth: StoredAuth): Promise<void> {
  await chrome.storage.session.set({ auth });
  await chrome.storage.local.remove('auth');
}

async function clearStoredAuth(): Promise<void> {
  await chrome.storage.session.remove('auth');
  await chrome.storage.local.remove('auth');
}

function normalizeStoredAuth(value: unknown): StoredAuth | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const auth = value as {
    accessToken?: unknown;
    expiresAt?: unknown;
    syncedAt?: unknown;
  };
  const expiresAt =
    typeof auth.expiresAt === 'number'
      ? auth.expiresAt
      : Number(auth.expiresAt);

  if (
    typeof auth.accessToken !== 'string' ||
    !auth.accessToken ||
    !Number.isFinite(expiresAt) ||
    isTokenExpired(expiresAt)
  ) {
    return null;
  }

  const normalized: StoredAuth = {
    accessToken: auth.accessToken,
    expiresAt,
  };

  if (typeof auth.syncedAt === 'number' && Number.isFinite(auth.syncedAt)) {
    normalized.syncedAt = auth.syncedAt;
  }

  return normalized;
}

function isTokenExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt - 60;
}

function getAllowedApiOrigin(apiBaseUrl: unknown): string {
  if (typeof apiBaseUrl === 'string') {
    try {
      const origin = new URL(apiBaseUrl).origin;
      if (API_ORIGINS.has(origin)) {
        return origin;
      }
    } catch {}
  }

  return DEFAULT_API_ORIGIN;
}

function getAllowedWebAppOrigin(webAppUrl: unknown): string {
  if (typeof webAppUrl === 'string') {
    try {
      const origin = new URL(webAppUrl).origin;
      if (WEB_APP_ORIGINS.has(origin)) {
        return origin;
      }
    } catch {}
  }

  return DEFAULT_WEB_APP_ORIGIN;
}

function isAllowedWebAppSender(sender: chrome.runtime.MessageSender): boolean {
  const senderUrl = sender.url || sender.tab?.url || '';
  try {
    return WEB_APP_ORIGINS.has(new URL(senderUrl).origin);
  } catch {
    return false;
  }
}

async function extractAuthFromWebAppTabs(
  webAppOrigin: string,
): Promise<StoredAuth | null> {
  const tabs = await chrome.tabs.query({ url: `${webAppOrigin}/*` });

  for (const tab of tabs) {
    if (!tab.id) continue;

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (configuredKey: string) => {
          const isSupabaseAuthStorageKey = (key: string) =>
            /^sb-[a-z0-9-]+-auth-token$/i.test(key);

          const readStorage = (storage: Storage) => {
            if (!isSupabaseAuthStorageKey(configuredKey)) {
              return [];
            }

            const value = storage.getItem(configuredKey);
            return value ? [value] : [];
          };

          return [...readStorage(localStorage), ...readStorage(sessionStorage)];
        },
        args: [SUPABASE_STORAGE_KEY],
      });

      const values = Array.isArray(result[0]?.result) ? result[0].result : [];
      const auth = getAuthFromSessionValues(values);
      if (auth) {
        return auth;
      }
    } catch {}
  }

  return null;
}

function getAuthFromSessionValues(sessionValues: unknown[]): StoredAuth | null {
  for (const sessionStr of sessionValues) {
    if (typeof sessionStr !== 'string') continue;

    try {
      const auth = findSessionValue(JSON.parse(sessionStr));
      if (auth && !isTokenExpired(auth.expiresAt)) {
        return auth;
      }
    } catch {}
  }

  return null;
}

function findSessionValue(value: unknown, depth = 0): StoredAuth | null {
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
        accessToken: candidate.access_token,
        expiresAt,
        syncedAt: Date.now(),
      };
    }
  }

  return (
    findSessionValue(candidate.session, depth + 1) ||
    findSessionValue(candidate.currentSession, depth + 1) ||
    findSessionValue(candidate.value, depth + 1)
  );
}

function normalizeJobApplication(value: unknown): JobApplication {
  if (!value || typeof value !== 'object') {
    throw new Error('Job payload is invalid');
  }

  const job = value as Partial<JobApplication>;
  const normalized: JobApplication = {
    dashboard_id: normalizeRequiredString(job.dashboard_id, 'dashboard_id'),
    company: normalizeRequiredString(job.company, 'company'),
    position: normalizeRequiredString(job.position, 'position'),
    location: normalizeOptionalString(job.location),
    url: normalizeRequiredString(job.url, 'url'),
    salary_range: normalizeOptionalString(job.salary_range),
    description: normalizeOptionalString(job.description),
    status: 'saved',
    applied_date: null,
  };

  return normalized;
}

function normalizeRequiredString(value: unknown, field: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`${field} is required`);
  }

  return normalized;
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
