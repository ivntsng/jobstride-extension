const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'),
);
const modalSource = fs.readFileSync(
  path.join(projectRoot, 'src/content/utils/modal.ts'),
  'utf8',
);
const contentScriptSource = fs.readFileSync(
  path.join(projectRoot, 'src/content/contentScript.ts'),
  'utf8',
);

const expectedBoardMatches = [
  '*://*.linkedin.com/*',
  '*://*.indeed.com/*',
  '*://*.ashbyhq.com/*',
  '*://*.greenhouse.io/*',
  '*://*.lever.co/*',
  '*://*.myworkdayjobs.com/*',
  '*://*.rippling.com/*',
];
const legacyContentClasses = [
  'modal-content',
  'modal-header',
  'form-group',
  'form-actions',
  'btn-primary',
  'toast-icon',
  'toast-content',
  'toast-title',
  'toast-message',
  'toast-close',
  'hiding',
];

assert.deepEqual(
  manifest.host_permissions,
  ['https://jobstride.app/*', 'https://api.jobstride.app/*'],
  'default manifest host permissions must stay production-only',
);

assert.deepEqual(
  manifest.content_scripts[0].matches,
  ['https://jobstride.app/*'],
  'default auth-sync content script matches must stay production-only',
);

for (const match of expectedBoardMatches) {
  const contentScript = manifest.content_scripts.find((script) =>
    script.matches.includes(match),
  );

  assert.ok(contentScript, `missing content script for ${match}`);
  assert.ok(
    contentScript.css.includes('src/shared/styles/jobstride-ui.css'),
    `${match} must inject the shared JobStride UI stylesheet`,
  );
  assert.ok(
    contentScript.css.includes('src/content/styles/contentStyle.css'),
    `${match} must inject the content UI stylesheet`,
  );
}

for (const className of legacyContentClasses) {
  assert.equal(
    modalSource.includes(className),
    false,
    `content modal must not use legacy class "${className}"`,
  );
}

for (const className of legacyContentClasses) {
  assert.equal(
    contentScriptSource.includes(`"${className}"`) ||
      contentScriptSource.includes(`'${className}'`) ||
      contentScriptSource.includes(` ${className}`),
    false,
    `content script must not use legacy class "${className}"`,
  );
}

function createClassList() {
  const classes = new Set();

  return {
    add(className) {
      classes.add(className);
    },
    remove(className) {
      classes.delete(className);
    },
    contains(className) {
      return classes.has(className);
    },
  };
}

function createNode(tagName, documentRef) {
  return {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    id: '',
    type: '',
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    classList: createClassList(),
    children: [],
    parentElement: null,
    setAttribute(name, value) {
      this.attributes = this.attributes || {};
      this.attributes[name] = value;
    },
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);

      if (child.id) {
        documentRef.elementsById.set(child.id, child);
      }

      return child;
    },
    remove() {
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter(
          (child) => child !== this,
        );
      }

      if (this.id) {
        documentRef.elementsById.delete(this.id);
      }
    },
    addEventListener() {},
    matches() {
      return false;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createFormModal() {
  const controls = {
    '#dashboardName': createNode('select', { elementsById: new Map() }),
    '#job-form-modal': createNode('form', { elementsById: new Map() }),
    '.jobstride-dialog-close': createNode('button', {
      elementsById: new Map(),
    }),
    '.jobstride-dialog-cancel': createNode('button', {
      elementsById: new Map(),
    }),
  };

  controls['#job-form-modal'].querySelector = () =>
    createNode('button', { elementsById: new Map() });

  return {
    classList: createClassList(),
    querySelector(selector) {
      return controls[selector] || null;
    },
  };
}

function createDocument() {
  const documentRef = {
    elementsById: new Map(),
    body: null,
    createElement(tagName) {
      return createNode(tagName, documentRef);
    },
    getElementById(id) {
      return documentRef.elementsById.get(id) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  documentRef.body = createNode('body', documentRef);
  return documentRef;
}

function createContentContext(initialUrl) {
  const document = createDocument();
  const timers = [];
  const intervals = [];
  const eventListeners = {};
  const window = {
    document,
    Auth: {
      getUserDashboards: async () => [],
      saveJob: async () => ({}),
    },
    addEventListener(type, listener) {
      eventListeners[type] = eventListeners[type] || [];
      eventListeners[type].push(listener);
    },
    dispatchEvent(event) {
      for (const listener of eventListeners[event.type] || []) {
        listener(event);
      }
    },
    createModalForm: createFormModal,
  };

  const setLocation = (url) => {
    const parsedUrl = new URL(url, window.location?.href || initialUrl);
    window.location = {
      href: parsedUrl.href,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
    };
  };

  setLocation(initialUrl);
  window.history = {
    pushState(_state, _title, url) {
      if (url) setLocation(url);
    },
    replaceState(_state, _title, url) {
      if (url) setLocation(url);
    },
  };
  window.window = window;

  class MockMutationObserver {
    observe() {}
    disconnect() {}
  }

  const context = {
    URL,
    document,
    window,
    MutationObserver: MockMutationObserver,
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    setInterval(callback) {
      intervals.push(callback);
      return intervals.length;
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
  };

  context.__setLocation = setLocation;
  context.__flushTimers = async () => {
    while (timers.length) {
      const callback = timers.shift();
      callback();
      await Promise.resolve();
    }

    await Promise.resolve();
  };
  context.__runIntervals = async () => {
    for (const callback of intervals) {
      callback();
      await context.__flushTimers();
    }
  };

  return context;
}

function loadContentScript(initialUrl) {
  const context = createContentContext(initialUrl);
  vm.createContext(context);

  for (const sourceFile of [
    'src/content/sites/base.ts',
    'src/content/sites/linkedin.ts',
    'src/content/contentScript.ts',
  ]) {
    const compiled = ts.transpileModule(
      fs.readFileSync(path.join(projectRoot, sourceFile), 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.None,
          target: ts.ScriptTarget.ES2020,
        },
      },
    ).outputText;

    vm.runInContext(compiled, context, { filename: sourceFile });
  }

  return context;
}

async function assertLinkedInSpaRouteChangeCreatesButton() {
  const context = loadContentScript('https://www.linkedin.com/feed/');
  await context.__flushTimers();

  assert.equal(
    context.document.getElementById('job-tracker-btn'),
    null,
    'does not create the floating button on a non-job LinkedIn page',
  );

  context.__setLocation(
    'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4318507203&originToLandingJobPostings=4318298829%2C4405879336%2C4318507203%2C4413207130%2C4408354505',
  );
  await context.__runIntervals();
  await context.__flushTimers();

  assert.ok(
    context.document.getElementById('job-tracker-btn'),
    'creates the floating button after LinkedIn routes to a selected job without a refresh',
  );
}

async function assertLinkedInJobsLandingRouteCreatesButton() {
  const context = loadContentScript('https://www.linkedin.com/jobs/');
  await context.__flushTimers();

  assert.equal(
    context.document.getElementById('job-tracker-btn'),
    null,
    'does not create the floating button on the generic LinkedIn jobs landing page',
  );

  context.__setLocation(
    'https://www.linkedin.com/jobs/search-results/?currentJobId=4239979661&eBP=CwEAAAGegVXWLcgCKl3Q89qark_pBjFHE9nxv6vsGwKzVxqt4gpB8xjgAJ0jM6HahS9B5fVzGTgaavCV_LT_dzYNmwdDJ-dMytpgf7aVl-H3_aa4Sr2kfKSG9iu5mGZKl0e9rkTrXQs9fFZxnc074SBc8OrlvJCkQkHzSVUuuMNDDrcyZo4v1FnA_Xp6VUiL-gkvNarQWkQcJKZiEUKvv83gDVkYESzd6glv50AkgxZ8AqWhKA-ZLBTqO5Bz_jiAAXiIaNXkjeh7rVQgVzNJEUxrK0q3a-ZZUVKybnHCsWaL6_syOgsBndM&refId=icjP32BdZS8ymlSKGhfGHw%3D%3D&trackingId=FOPt1Y6wr5igvm%2BNQimWaA%3D%3D&keywords=full-time%20Software%20Engineer%20or%20Full%20Stack%20Engineer%20or%20Back%20End%20Developer%2C%20on-site%20or%20hybrid%20or%20remote&origin=PREFERENCES_LANDING&geoId=90000084',
  );
  await context.__runIntervals();
  await context.__flushTimers();

  assert.ok(
    context.document.getElementById('job-tracker-btn'),
    'creates the floating button after LinkedIn jobs landing routes to search results with a selected job',
  );
}

async function assertLinkedInRouteAwayRemovesButton() {
  const context = loadContentScript(
    'https://www.linkedin.com/jobs/search-results/?currentJobId=4239979661',
  );
  await context.__flushTimers();

  assert.ok(
    context.document.getElementById('job-tracker-btn'),
    'creates the floating button on a selected LinkedIn job',
  );

  context.__setLocation('https://www.linkedin.com/feed/');
  await context.__runIntervals();
  await context.__flushTimers();

  assert.equal(
    context.document.getElementById('job-tracker-btn'),
    null,
    'removes the floating button after LinkedIn routes away from a job page',
  );
}

Promise.all([
  assertLinkedInSpaRouteChangeCreatesButton(),
  assertLinkedInJobsLandingRouteCreatesButton(),
  assertLinkedInRouteAwayRemovesButton(),
]).catch((error) => {
  if (error instanceof Error && error.stack) {
    process.stderr.write(`${error.stack}\n`);
  } else {
    process.stderr.write(`${error}\n`);
  }
  process.exitCode = 1;
});
