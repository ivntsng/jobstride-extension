const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const backgroundSource = fs.readFileSync(
  path.join(projectRoot, 'src/background/background.ts'),
  'utf8',
);
const compiledBackground = ts.transpileModule(backgroundSource, {
  compilerOptions: {
    module: ts.ModuleKind.None,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const futureExpiresAt = Math.floor(Date.now() / 1000) + 3600;
const pastExpiresAt = Math.floor(Date.now() / 1000) - 3600;

function loadBackground({
  tabs = [],
  extractedValues = [],
  fetchResponse = { ok: true, status: 200, json: async () => ({ ok: true }) },
  fetchImpl = async () => fetchResponse,
  executeScript = async () => [{ result: extractedValues }],
  timerSetTimeout = setTimeout,
  timerClearTimeout = clearTimeout,
  sessionAuth,
} = {}) {
  const sessionStore = {};
  const localStore = {};
  const calls = {
    fetch: [],
    executeScript: [],
    tabsQuery: [],
    tabsCreate: [],
    localRemove: [],
    sessionSetAccessLevel: [],
  };
  let listener = null;

  if (sessionAuth) {
    sessionStore.auth = sessionAuth;
  }

  const context = {
    Array,
    AbortController,
    Date,
    Error,
    JSON,
    Number,
    Set,
    URL,
    clearTimeout: timerClearTimeout,
    setTimeout: timerSetTimeout,
    chrome: {
      runtime: {
        onMessage: {
          addListener(callback) {
            listener = callback;
          },
        },
      },
      storage: {
        session: {
          setAccessLevel: async (options) => {
            calls.sessionSetAccessLevel.push(options);
          },
          get: async (key) => ({ [key]: sessionStore[key] }),
          set: async (value) => Object.assign(sessionStore, value),
          remove: async (key) => {
            delete sessionStore[key];
          },
        },
        local: {
          remove: async (key) => {
            calls.localRemove.push(key);
            delete localStore[key];
          },
        },
      },
      tabs: {
        create: async (details) => {
          calls.tabsCreate.push(details);
          return { id: 99, ...details };
        },
        query: async (query) => {
          calls.tabsQuery.push(query);
          return tabs;
        },
      },
      scripting: {
        executeScript: async (details) => {
          calls.executeScript.push(details);
          return await executeScript(details);
        },
      },
    },
    fetch: async (...args) => {
      calls.fetch.push(args);
      return await fetchImpl(...args);
    },
  };

  vm.createContext(context);
  vm.runInContext(compiledBackground, context, {
    filename: 'src/background/background.ts',
  });

  return {
    calls,
    sessionStore,
    sendMessage(message, sender = {}) {
      return new Promise((resolve) => {
        const keepOpen = listener(message, sender, resolve);
        if (!keepOpen) {
          resolve(undefined);
        }
      });
    },
  };
}

async function run() {
  {
    const background = loadBackground();
    const response = await background.sendMessage({ type: 'FETCH_REQUEST' });

    assert.equal(background.calls.sessionSetAccessLevel.length, 1);
    assert.equal(
      background.calls.sessionSetAccessLevel[0].accessLevel,
      'TRUSTED_CONTEXTS',
    );
    assert.equal(response.success, false);
    assert.equal(response.error, 'Unsupported message type');
    assert.equal(background.calls.fetch.length, 0);
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'malformed-expiry-token',
        expiresAt: 'not-a-number',
      },
    });
    const response = await background.sendMessage({
      type: 'CHECK_AUTH_STATUS',
      webAppUrl: 'https://jobstride.app',
    });

    assert.equal(response.success, true);
    assert.equal(response.data.authenticated, false);
    assert.equal(background.calls.fetch.length, 0);
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: true,
        status: 200,
        json: async () => [{ id: 'dashboard-1' }],
      },
    });
    const response = await background.sendMessage({
      type: 'GET_DASHBOARDS',
      apiBaseUrl: 'https://evil.example',
      webAppUrl: 'https://jobstride.app',
    });

    assert.equal(response.success, true);
    assert.deepEqual(JSON.parse(JSON.stringify(response.data)), [
      { id: 'dashboard-1' },
    ]);
    assert.equal(
      background.calls.fetch[0][0],
      'https://api.jobstride.app/dashboards/',
    );
    assert.equal(
      background.calls.fetch[0][1].headers.Authorization,
      'Bearer stored-access-token',
    );
  }

  {
    const background = loadBackground();
    const response = await background.sendMessage(
      {
        type: 'SYNC_WEB_APP_AUTH',
        auth: {
          accessToken: 'bad-sender-token',
          expiresAt: futureExpiresAt,
        },
      },
      { url: 'https://evil.example' },
    );

    assert.equal(response.success, false);
    assert.equal(background.sessionStore.auth, undefined);
  }

  {
    const background = loadBackground();
    const response = await background.sendMessage(
      {
        type: 'SYNC_WEB_APP_AUTH',
        auth: {
          accessToken: 'web-app-token',
          expiresAt: futureExpiresAt,
        },
      },
      { url: 'https://jobstride.app/dashboard' },
    );

    assert.equal(response.success, true);
    assert.equal(background.sessionStore.auth.accessToken, 'web-app-token');
    assert.equal(background.calls.localRemove.includes('auth'), true);
  }

  {
    const background = loadBackground({
      tabs: [{ id: 7 }],
      extractedValues: [
        JSON.stringify({
          access_token: 'expired-token',
          refresh_token: 'expired-refresh-token',
          expires_at: pastExpiresAt,
        }),
        JSON.stringify({
          access_token: 'safe-access-token',
          refresh_token: 'must-not-be-stored',
          expires_at: futureExpiresAt,
        }),
      ],
      fetchResponse: {
        ok: true,
        status: 200,
        json: async () => ({ id: 'job-1' }),
      },
    });
    const response = await background.sendMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      jobData: {
        dashboard_id: 'dashboard-1',
        company: 'Acme',
        position: 'Engineer',
        location: 'Remote',
        url: '',
        salary_range: '',
        description: '',
        status: 'saved',
        applied_date: null,
      },
    });

    assert.equal(response.success, true);
    assert.equal(response.data.id, 'job-1');
    assert.equal(background.sessionStore.auth.accessToken, 'safe-access-token');
    assert.equal(background.sessionStore.auth.refresh_token, undefined);
    assert.equal(background.calls.tabsQuery[0].url, 'https://jobstride.app/*');
    assert.equal(
      background.calls.fetch[0][0],
      'https://api.jobstride.app/jobs/',
    );
    assert.equal(
      background.calls.fetch[0][1].headers.Authorization,
      'Bearer safe-access-token',
    );
    assert.deepEqual(JSON.parse(background.calls.fetch[0][1].body), {
      dashboard_id: 'dashboard-1',
      company: 'Acme',
      position: 'Engineer',
      location: 'Remote',
      url: '',
      salary_range: '',
      description: '',
      status: 'saved',
      applied_date: null,
    });
  }

  {
    const background = loadBackground({
      tabs: [
        { id: 8, url: 'https://jobstride.app/dashboard/dashboard-1' },
        { id: 9, url: 'https://jobstride.app/dashboard/dashboard-2' },
      ],
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: true,
        status: 201,
        json: async () => ({ id: 'job-1', dashboard_id: 'dashboard-1' }),
      },
    });
    const response = await background.sendMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      jobData: {
        dashboard_id: 'dashboard-1',
        company: 'Acme',
        position: 'Engineer',
        location: '',
        url: '',
        salary_range: '',
        description: '',
        status: 'applied',
        applied_date: '2026-01-01',
      },
    });

    assert.equal(response.success, true);
    assert.equal(response.data.id, 'job-1');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(background.calls.tabsQuery[0].url, 'https://jobstride.app/*');
    assert.equal(background.calls.executeScript.length, 1);
    assert.equal(background.calls.executeScript[0].target.tabId, 8);
    assert.equal(background.calls.executeScript[0].world, 'MAIN');
    assert.equal(JSON.parse(background.calls.fetch[0][1].body).status, 'saved');
    assert.equal(
      JSON.parse(background.calls.fetch[0][1].body).applied_date,
      null,
    );
  }

  {
    let resolveNotification;
    let markNotificationStarted;
    const notificationStarted = new Promise((resolve) => {
      markNotificationStarted = resolve;
    });
    const background = loadBackground({
      tabs: [{ id: 8, url: 'https://jobstride.app/dashboard/dashboard-1' }],
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: true,
        status: 201,
        json: async () => ({ id: 'job-1', dashboard_id: 'dashboard-1' }),
      },
      executeScript: async () => {
        markNotificationStarted();
        return await new Promise((resolve) => {
          resolveNotification = resolve;
        });
      },
    });

    let saveResponded = false;
    const saveResponse = background
      .sendMessage({
        type: 'SAVE_JOB',
        apiBaseUrl: 'https://api.jobstride.app',
        webAppUrl: 'https://jobstride.app',
        jobData: {
          dashboard_id: 'dashboard-1',
          company: 'Acme',
          position: 'Engineer',
          location: '',
          url: 'https://example.com/job',
          salary_range: '',
          description: '',
          status: 'saved',
          applied_date: null,
        },
      })
      .then((response) => {
        saveResponded = true;
        return response;
      });

    await notificationStarted;
    await Promise.resolve();
    assert.equal(
      saveResponded,
      false,
      'save response waits for dashboard notification delivery',
    );

    resolveNotification([]);
    const response = await saveResponse;
    assert.equal(response.success, true);
    assert.equal(response.data.id, 'job-1');
  }

  {
    const background = loadBackground({
      tabs: [{ id: 8, url: 'https://jobstride.app/dashboard/dashboard-1' }],
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: true,
        status: 201,
        json: async () => ({ id: 'job-1', dashboard_id: 'dashboard-1' }),
      },
      executeScript: async () => new Promise(() => {}),
    });

    const saveResponse = background.sendMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      jobData: {
        dashboard_id: 'dashboard-1',
        company: 'Acme',
        position: 'Engineer',
        location: '',
        url: 'https://example.com/job',
        salary_range: '',
        description: '',
        status: 'saved',
        applied_date: null,
      },
    });

    const response = await Promise.race([
      saveResponse,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('save waited for dashboard notification')),
          50,
        ),
      ),
    ]);

    assert.equal(response.success, true);
    assert.equal(response.data.id, 'job-1');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(background.calls.executeScript.length, 1);
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: false,
        status: 409,
        json: async () => ({ detail: 'URL already exists' }),
      },
    });
    const response = await background.sendMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      jobData: {
        dashboard_id: 'dashboard-1',
        company: 'Acme',
        position: 'Engineer',
        location: '',
        url: 'https://example.com/job',
        salary_range: '',
        description: '',
        status: 'saved',
        applied_date: null,
      },
    });

    assert.equal(response.success, true);
    assert.equal(response.data.duplicate, true);
    assert.equal(response.data.message, 'URL already exists');
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Dashboard not found' }),
      },
    });
    const response = await background.sendMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      jobData: {
        dashboard_id: 'missing-dashboard',
        company: 'Acme',
        position: 'Engineer',
        location: '',
        url: '',
        salary_range: '',
        description: '',
        status: 'saved',
        applied_date: null,
      },
    });

    assert.equal(response.success, false);
    assert.equal(response.error, 'DASHBOARD_NOT_FOUND: Dashboard not found');
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: false,
        status: 422,
        json: async () => ({ errors: { company: ['Missing'] } }),
      },
    });
    const response = await background.sendMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      jobData: {
        dashboard_id: 'dashboard-1',
        company: 'Acme',
        position: 'Engineer',
        location: '',
        url: '',
        salary_range: '',
        description: '',
        status: 'saved',
        applied_date: null,
      },
    });

    assert.equal(response.success, false);
    assert.equal(response.error, 'VALIDATION_ERROR: company: Missing');
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: false,
        status: 503,
        json: async () => ({ message: 'Try again later' }),
      },
    });
    const response = await background.sendMessage({
      type: 'SAVE_JOB',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
      jobData: {
        dashboard_id: 'dashboard-1',
        company: 'Acme',
        position: 'Engineer',
        location: '',
        url: '',
        salary_range: '',
        description: '',
        status: 'saved',
        applied_date: null,
      },
    });

    assert.equal(response.success, false);
    assert.equal(response.error, 'SERVER_ERROR: Try again later');
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'stored-access-token',
        expiresAt: futureExpiresAt,
      },
      fetchImpl: async (_url, init) =>
        await new Promise((_, reject) => {
          if (init.signal?.aborted) {
            reject(new Error('aborted'));
            return;
          }

          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
      timerSetTimeout(callback) {
        queueMicrotask(callback);
        return 1;
      },
      timerClearTimeout() {},
    });

    const response = await Promise.race([
      background.sendMessage({
        type: 'SAVE_JOB',
        apiBaseUrl: 'https://api.jobstride.app',
        webAppUrl: 'https://jobstride.app',
        jobData: {
          dashboard_id: 'dashboard-1',
          company: 'Acme',
          position: 'Engineer',
          location: '',
          url: 'https://example.com/job',
          salary_range: '',
          description: '',
          status: 'saved',
          applied_date: null,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API request did not time out')), 50),
      ),
    ]);

    assert.equal(response.success, false);
    assert.equal(response.error, 'REQUEST_TIMEOUT');
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'expired-api-token',
        expiresAt: futureExpiresAt,
      },
      fetchResponse: {
        ok: false,
        status: 401,
        json: async () => ({}),
      },
    });
    const response = await background.sendMessage({
      type: 'GET_DASHBOARDS',
      apiBaseUrl: 'https://api.jobstride.app',
      webAppUrl: 'https://jobstride.app',
    });

    assert.equal(response.success, false);
    assert.equal(response.error, 'AUTH_REQUIRED');
    assert.equal(background.sessionStore.auth, undefined);
  }

  {
    const background = loadBackground({
      sessionAuth: {
        accessToken: 'login-clears-token',
        expiresAt: futureExpiresAt,
      },
    });
    const response = await background.sendMessage({
      type: 'OPEN_LOGIN',
      webAppUrl: 'https://evil.example',
    });

    assert.equal(response.success, true);
    assert.equal(background.sessionStore.auth, undefined);
    assert.equal(
      background.calls.tabsCreate[0].url,
      'https://jobstride.app/login',
    );
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
