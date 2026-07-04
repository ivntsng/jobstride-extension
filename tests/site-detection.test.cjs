const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

function createElement({ textContent = '', attributes = {} } = {}) {
  return {
    textContent,
    getAttribute(name) {
      return attributes[name] || null;
    },
  };
}

function createDocument({
  renderedSelectors = [],
  selectorAllElements = {},
} = {}) {
  const selectorSet = new Set(renderedSelectors);

  return {
    readyState: 'complete',
    body: {},
    querySelector(selector) {
      for (const part of selector.split(',')) {
        const normalizedSelector = part.trim();
        if (selectorSet.has(normalizedSelector)) {
          return createElement();
        }
      }

      return null;
    },
    querySelectorAll(selector) {
      return selectorAllElements[selector] || [];
    },
  };
}

function loadSite({ sourceFile, className, url, documentOptions = {} }) {
  const parsedUrl = new URL(url);
  const document = createDocument(documentOptions);
  const window = {
    document,
    location: {
      href: parsedUrl.href,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
  };

  class MockMutationObserver {
    observe() {}
    disconnect() {}
  }

  const context = {
    JSON,
    URL,
    document,
    window,
    MutationObserver: MockMutationObserver,
    setTimeout: window.setTimeout,
  };

  window.window = window;
  vm.createContext(context);

  for (const file of ['src/content/sites/base.ts', sourceFile]) {
    const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.None,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;

    vm.runInContext(compiled, context, { filename: file });
  }

  return new context.window[className]();
}

async function run() {
  {
    const ashby = loadSite({
      sourceFile: 'src/content/sites/ashby.ts',
      className: 'Ashby',
      url: 'https://jobs.ashbyhq.com/acme',
      documentOptions: {
        renderedSelectors: ['h1', 'h2'],
      },
    });

    assert.equal(
      await ashby.isJobPage(),
      false,
      'does not treat generic Ashby headings as a job posting',
    );
  }

  {
    const ashby = loadSite({
      sourceFile: 'src/content/sites/ashby.ts',
      className: 'Ashby',
      url: 'https://jobs.ashbyhq.com/acme/123e4567-e89b-12d3-a456-426614174000',
    });

    assert.equal(
      await ashby.isJobPage(),
      true,
      'detects Ashby UUID job posting URLs',
    );
  }

  {
    const ashby = loadSite({
      sourceFile: 'src/content/sites/ashby.ts',
      className: 'Ashby',
      url: 'https://jobs.ashbyhq.com/acme',
      documentOptions: {
        selectorAllElements: {
          'script[type="application/ld+json"]': [
            createElement({
              textContent: JSON.stringify({ '@type': 'JobPosting' }),
            }),
          ],
        },
      },
    });

    assert.equal(
      await ashby.isJobPage(),
      true,
      'detects Ashby JobPosting structured data',
    );
  }

  {
    const indeed = loadSite({
      sourceFile: 'src/content/sites/indeed.ts',
      className: 'Indeed',
      url: 'https://www.indeed.com/',
    });

    assert.equal(
      await indeed.isJobPage(),
      false,
      'resolves false on Indeed pages with no job detail container',
    );
  }

  {
    const lever = loadSite({
      sourceFile: 'src/content/sites/lever.ts',
      className: 'Lever',
      url: 'https://jobs.lever.co/acme',
    });

    assert.equal(
      await lever.isJobPage(),
      false,
      'resolves false on Lever pages with no posting container',
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
