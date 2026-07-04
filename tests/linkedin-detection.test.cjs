const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const sourceFiles = [
  'src/content/sites/base.ts',
  'src/content/sites/linkedin.ts',
];

function createElement({
  textContent = '',
  innerHTML = textContent,
  attributes = {},
}) {
  return {
    textContent,
    innerHTML,
    getAttribute(name) {
      return attributes[name] || null;
    },
  };
}

function createDocument({
  renderedSelectors = [],
  selectorElements = {},
  selectorAllElements = {},
}) {
  const selectorSet = new Set(renderedSelectors);

  return {
    querySelector(selector) {
      for (const part of selector.split(',')) {
        const normalizedSelector = part.trim();
        const element = selectorElements[normalizedSelector];

        if (element) {
          return element;
        }

        if (selectorSet.has(normalizedSelector)) {
          return {};
        }
      }

      return null;
    },
    querySelectorAll(selector) {
      return selectorAllElements[selector] || [];
    },
  };
}

function createDocumentFromHtml(html) {
  const scriptElements = Array.from(
    html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ).map((match) =>
    createElement({
      textContent: match[1],
    }),
  );

  return createDocument({
    selectorAllElements: {
      'script[type="application/ld+json"], code': scriptElements,
    },
  });
}

function loadLinkedIn({
  url,
  renderedSelectors = [],
  selectorElements = {},
  selectorAllElements = {},
  fetchHtml = '',
}) {
  const parsedUrl = new URL(url);
  const document = createDocument({
    renderedSelectors,
    selectorElements,
    selectorAllElements,
  });
  const window = {
    convertHtmlToText: (html) => html.replace(/<[^>]*>/g, '').trim(),
    document,
    location: {
      href: parsedUrl.href,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
    },
  };
  const context = {
    DOMParser: class {
      parseFromString(html) {
        return createDocumentFromHtml(html);
      }
    },
    URL,
    document,
    fetch: async () => ({
      ok: Boolean(fetchHtml),
      text: async () => fetchHtml,
    }),
    setTimeout: (callback) => callback(),
    window,
  };

  window.window = window;
  vm.createContext(context);

  for (const sourceFile of sourceFiles) {
    const source = fs.readFileSync(path.join(projectRoot, sourceFile), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.None,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;

    vm.runInContext(compiled, context, { filename: sourceFile });
  }

  return new context.window.LinkedIn();
}

async function isLinkedInJobPage(url, renderedSelectors) {
  const linkedIn = loadLinkedIn({ url, renderedSelectors });
  return linkedIn.isJobPage();
}

async function extractLinkedInJobDetails(
  url,
  selectorElements = {},
  options = {},
) {
  const linkedIn = loadLinkedIn({ url, selectorElements, ...options });
  return linkedIn.extractJobDetails();
}

async function run() {
  assert.equal(
    await isLinkedInJobPage(
      'https://www.linkedin.com/jobs/search-results/?currentJobId=4340113946&eBP=NOT_ELIGIBLE_FOR_CHARGING',
      ['.jobs-search__job-details'],
    ),
    true,
    'detects search-results job detail panes',
  );

  assert.equal(
    await isLinkedInJobPage(
      'https://www.linkedin.com/jobs/search-results/?currentJobId=4340113946&eBP=NOT_ELIGIBLE_FOR_CHARGING',
      [],
    ),
    true,
    'detects selected LinkedIn job URLs before details finish rendering',
  );

  assert.equal(
    await isLinkedInJobPage(
      'https://www.linkedin.com/jobs/search/?currentJobId=4404372669',
      ['.job-view-layout'],
    ),
    true,
    'keeps detecting the existing search URL layout',
  );

  assert.equal(
    await isLinkedInJobPage(
      'https://www.linkedin.com/jobs/search/?keywords=software%20engineer',
      [],
    ),
    false,
    'does not show the button on generic LinkedIn job searches',
  );

  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await extractLinkedInJobDetails(
          'https://www.linkedin.com/jobs/search-results/?currentJobId=4416711521',
          {
            '.job-details-jobs-unified-top-card__company-name': createElement({
              textContent: 'Acme Systems',
            }),
            '.job-details-jobs-unified-top-card__job-title': createElement({
              textContent: 'Senior Full Stack Engineer',
            }),
            '.job-details-jobs-unified-top-card__primary-description-container .tvm__text':
              createElement({
                textContent: 'San Francisco, CA',
              }),
            '.jobs-description-content__text': createElement({
              innerHTML: '<p>Build production web applications.</p>',
            }),
          },
        ),
      ),
    ),
    {
      company: 'Acme Systems',
      position: 'Senior Full Stack Engineer',
      location: 'San Francisco, CA',
      url: 'https://www.linkedin.com/jobs/search-results/?currentJobId=4416711521',
      jobDescription: 'Build production web applications.',
      salaryRange: '',
    },
    'extracts details from LinkedIn search-results top card variants',
  );

  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await extractLinkedInJobDetails(
          'https://www.linkedin.com/jobs/view/4388580908/',
          {
            '.top-card-layout__title': createElement({
              textContent: 'DevSecOps Service Engineer',
            }),
            '.topcard__org-name-link': createElement({
              textContent: 'CloudFit Software',
            }),
            '.topcard__flavor--bullet': createElement({
              textContent: 'Lynchburg, VA',
            }),
            '.description__text .show-more-less-html__markup': createElement({
              innerHTML:
                '<p>CloudFit Software is seeking DevSecOps Engineers.</p><p>The salary range for this role is $55,000 - $112,500 + benefits.</p>',
            }),
          },
        ),
      ),
    ),
    {
      company: 'CloudFit Software',
      position: 'DevSecOps Service Engineer',
      location: 'Lynchburg, VA',
      url: 'https://www.linkedin.com/jobs/view/4388580908/',
      jobDescription:
        'CloudFit Software is seeking DevSecOps Engineers.The salary range for this role is $55,000 - $112,500 + benefits.',
      salaryRange: '$55,000 - $112,500',
    },
    'extracts details from public LinkedIn jobs/view pages',
  );

  const structuredJobPosting = {
    '@type': 'JobPosting',
    identifier: {
      value: '4416711521',
    },
    title: 'Backend Engineer',
    hiringOrganization: {
      name: 'Structured Data Co.',
    },
    jobLocation: {
      address: {
        addressLocality: 'Austin',
        addressRegion: 'TX',
        addressCountry: 'US',
      },
    },
    description: '<p>Own API services.</p>',
  };

  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await extractLinkedInJobDetails(
          'https://www.linkedin.com/jobs/search-results/?currentJobId=4416711521',
          {},
          {
            selectorAllElements: {
              'script[type="application/ld+json"], code': [
                createElement({
                  textContent: JSON.stringify(structuredJobPosting),
                }),
              ],
            },
          },
        ),
      ),
    ),
    {
      company: 'Structured Data Co.',
      position: 'Backend Engineer',
      location: 'Austin, TX, US',
      url: 'https://www.linkedin.com/jobs/search-results/?currentJobId=4416711521',
      jobDescription: 'Own API services.',
      salaryRange: '',
    },
    'extracts details from LinkedIn structured job data',
  );

  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await extractLinkedInJobDetails(
          'https://www.linkedin.com/jobs/view/4388580908/',
          {},
          {
            selectorAllElements: {
              'script[type="application/ld+json"], code': [
                createElement({
                  innerHTML: `<!--${JSON.stringify(structuredJobPosting)}-->`,
                }),
              ],
            },
          },
        ),
      ),
    ),
    {
      company: 'Structured Data Co.',
      position: 'Backend Engineer',
      location: 'Austin, TX, US',
      url: 'https://www.linkedin.com/jobs/view/4388580908/',
      jobDescription: 'Own API services.',
      salaryRange: '',
    },
    'extracts details from LinkedIn comment-wrapped code payloads',
  );

  const fetchedJobPosting = {
    '@type': 'JobPosting',
    identifier: {
      value: '4416711521',
    },
    title: 'Full Stack Engineer',
    hiringOrganization: {
      name: 'Fetched Jobs Inc.',
    },
    jobLocation: {
      address: {
        addressLocality: 'Seattle',
        addressRegion: 'WA',
        addressCountry: 'US',
      },
    },
    description: '<p>Build customer-facing features.</p>',
  };

  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await extractLinkedInJobDetails(
          'https://www.linkedin.com/jobs/search-results/?currentJobId=4416711521',
          {},
          {
            fetchHtml: `<script type="application/ld+json">${JSON.stringify(
              fetchedJobPosting,
            )}</script>`,
          },
        ),
      ),
    ),
    {
      company: 'Fetched Jobs Inc.',
      position: 'Full Stack Engineer',
      location: 'Seattle, WA, US',
      url: 'https://www.linkedin.com/jobs/search-results/?currentJobId=4416711521',
      jobDescription: 'Build customer-facing features.',
      salaryRange: '',
    },
    'fetches canonical LinkedIn job details when the search-results pane is empty',
  );
}

run().catch((error) => {
  if (error instanceof Error && error.stack) {
    process.stderr.write(`${error.stack}\n`);
  } else {
    process.stderr.write(`${error}\n`);
  }
  process.exitCode = 1;
});
