const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const authSource = fs.readFileSync(
  path.join(projectRoot, 'src/services/auth.ts'),
  'utf8',
);
const compiledAuth = ts.transpileModule(authSource, {
  compilerOptions: {
    module: ts.ModuleKind.None,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const storageKey = 'sb-bxxojrwocxrehaodlesq-auth-token';
const futureExpiresAt = Math.floor(Date.now() / 1000) + 3600;
const pastExpiresAt = Math.floor(Date.now() / 1000) - 3600;

function createWebStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] || null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function loadAuth({
  localStorageValues = {},
  sessionStorageValues = {},
  runtimeResponse = { success: true },
} = {}) {
  let lastRuntimeMessage = null;
  const localStorage = createWebStorage(localStorageValues);
  const sessionStorage = createWebStorage(sessionStorageValues);
  const window = {
    AUTH_CONFIG: {
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      supabaseStorageKey: storageKey,
    },
    localStorage,
    sessionStorage,
  };
  const chromeApi = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        lastRuntimeMessage = message;
        const response =
          typeof runtimeResponse === 'function'
            ? runtimeResponse(message)
            : runtimeResponse;
        callback(response);
      },
    },
  };
  const context = {
    Array,
    Date,
    JSON,
    Number,
    RegExp,
    Set,
    URL,
    chrome: chromeApi,
    localStorage,
    sessionStorage,
    window,
  };

  vm.createContext(context);
  vm.runInContext(compiledAuth, context, { filename: 'src/services/auth.ts' });

  return {
    Auth: context.window.Auth,
    getLastRuntimeMessage: () => lastRuntimeMessage,
  };
}

async function run() {
  {
    const { Auth, getLastRuntimeMessage } = loadAuth({
      sessionStorageValues: {
        [storageKey]: JSON.stringify({
          access_token: 'session-token',
          refresh_token: 'must-not-sync',
          expires_at: futureExpiresAt,
        }),
      },
    });

    assert.equal(await Auth.syncAuthFromCurrentPage(), true);
    assert.equal(getLastRuntimeMessage().type, 'SYNC_WEB_APP_AUTH');
    assert.equal(getLastRuntimeMessage().auth.accessToken, 'session-token');
    assert.equal(getLastRuntimeMessage().auth.expiresAt, futureExpiresAt);
    assert.equal(getLastRuntimeMessage().auth.refresh_token, undefined);
  }

  {
    const { Auth, getLastRuntimeMessage } = loadAuth({
      localStorageValues: {
        'sb-other-project-auth-token': JSON.stringify({
          value: {
            access_token: 'discovered-token',
            expires_at: futureExpiresAt,
          },
        }),
      },
    });

    assert.equal(await Auth.syncAuthFromCurrentPage(), false);
    assert.equal(getLastRuntimeMessage(), null);
  }

  {
    const { Auth, getLastRuntimeMessage } = loadAuth({
      localStorageValues: {
        [storageKey]: JSON.stringify({
          access_token: 'expired-token',
          expires_at: pastExpiresAt,
        }),
      },
    });

    assert.equal(await Auth.syncAuthFromCurrentPage(), false);
    assert.equal(getLastRuntimeMessage(), null);
  }

  {
    const { Auth, getLastRuntimeMessage } = loadAuth({
      runtimeResponse: {
        success: true,
        data: { authenticated: true },
      },
    });

    assert.equal(await Auth.checkAuthStatus(), true);
    assert.equal(getLastRuntimeMessage().type, 'CHECK_AUTH_STATUS');
    assert.equal(getLastRuntimeMessage().webAppUrl, 'https://jobstride.app');
  }

  {
    const dashboards = [{ id: 'dashboard-1', name: 'Applications' }];
    const { Auth, getLastRuntimeMessage } = loadAuth({
      runtimeResponse: {
        success: true,
        data: dashboards,
      },
    });

    assert.deepEqual(await Auth.getUserDashboards(), dashboards);
    assert.equal(getLastRuntimeMessage().type, 'GET_DASHBOARDS');
    assert.equal(
      getLastRuntimeMessage().apiBaseUrl,
      'https://api.jobstride.app',
    );
    assert.equal(getLastRuntimeMessage().accessToken, undefined);
    assert.equal(getLastRuntimeMessage().headers, undefined);
  }

  {
    const jobData = {
      dashboard_id: 'dashboard-1',
      company: 'Acme',
      position: 'Engineer',
      location: 'Remote',
      url: 'https://example.com/job',
      salary_range: '',
      description: 'Build things',
      status: 'saved',
      applied_date: null,
    };
    const { Auth, getLastRuntimeMessage } = loadAuth({
      runtimeResponse: { success: true, data: { id: 'job-1' } },
    });

    await Auth.saveJob(jobData);
    assert.equal(getLastRuntimeMessage().type, 'SAVE_JOB');
    assert.deepEqual(getLastRuntimeMessage().jobData, jobData);
    assert.equal(getLastRuntimeMessage().accessToken, undefined);
    assert.equal(getLastRuntimeMessage().headers, undefined);
  }

  {
    const { Auth, getLastRuntimeMessage } = loadAuth({
      runtimeResponse: {
        success: true,
        data: { id: 'dashboard-2', name: 'Frontend roles' },
      },
    });

    assert.deepEqual(await Auth.createDashboard('Frontend roles'), {
      id: 'dashboard-2',
      name: 'Frontend roles',
    });
    assert.equal(getLastRuntimeMessage().type, 'CREATE_DASHBOARD');
    assert.equal(getLastRuntimeMessage().name, 'Frontend roles');
    assert.equal(getLastRuntimeMessage().accessToken, undefined);
  }
}

run().catch((error) => {
  if (error instanceof Error && error.stack) {
    process.stderr.write(`${error.stack}\n`);
  } else {
    process.stderr.write(`${error}\n`);
  }
  process.exitCode = 1;
});
