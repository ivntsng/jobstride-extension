#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const BUILD_TARGETS = {
  production: {
    apiBaseUrl: 'https://api.jobstride.app',
    webAppUrl: 'https://jobstride.app',
    apiOrigins: ['https://api.jobstride.app'],
    webAppOrigins: ['https://jobstride.app'],
    hostPermissions: ['https://jobstride.app/*', 'https://api.jobstride.app/*'],
    webAppMatches: ['https://jobstride.app/*'],
    stripGeneratedMetadata: true,
  },
  development: {
    apiBaseUrl: 'https://api.jobstride.app',
    webAppUrl: 'https://jobstride.app',
    apiOrigins: ['https://api.jobstride.app'],
    webAppOrigins: ['https://jobstride.app'],
    hostPermissions: ['https://jobstride.app/*', 'https://api.jobstride.app/*'],
    webAppMatches: ['https://jobstride.app/*'],
    stripGeneratedMetadata: false,
  },
  local: {
    apiBaseUrl: 'http://localhost:8080',
    webAppUrl: 'http://localhost:5173',
    apiOrigins: [
      'https://api.jobstride.app',
      'http://localhost:8080',
      'https://localhost:8080',
    ],
    webAppOrigins: [
      'https://jobstride.app',
      'http://localhost:5173',
      'https://localhost:5173',
    ],
    hostPermissions: [
      'http://localhost:8080/*',
      'https://localhost:8080/*',
      'http://localhost:5173/*',
      'https://localhost:5173/*',
      'https://jobstride.app/*',
      'https://api.jobstride.app/*',
    ],
    webAppMatches: [
      'https://jobstride.app/*',
      'http://localhost:5173/*',
      'https://localhost:5173/*',
    ],
    stripGeneratedMetadata: false,
  },
};

function getBuildTarget() {
  const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
  const target = (
    targetArg?.split('=')[1] ||
    process.env.JOBSTRIDE_BUILD_TARGET ||
    'production'
  ).toLowerCase();

  if (!Object.prototype.hasOwnProperty.call(BUILD_TARGETS, target)) {
    throw new Error(
      `Unknown build target "${target}". Use "production", "development", or "local".`,
    );
  }

  return target;
}

const buildTarget = getBuildTarget();
const buildConfig = BUILD_TARGETS[buildTarget];

console.log(`Building Extension (${buildTarget})...`);

if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}

console.log('Compiling...');
execSync('npx tsc', { stdio: 'inherit' });

console.log('Copying static files and generating manifest...');

function normalizePath(p) {
  return typeof p === 'string' && p.startsWith('src/') ? p.slice(4) : p;
}

const manifestPath = 'manifest.json';
if (!fs.existsSync(manifestPath)) {
  throw new Error('manifest.json not found at project root');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
manifest.host_permissions = buildConfig.hostPermissions;

if (manifest.action?.default_popup) {
  manifest.action.default_popup = normalizePath(manifest.action.default_popup);
}

if (manifest.background?.service_worker) {
  manifest.background.service_worker = normalizePath(
    manifest.background.service_worker,
  );
}

if (Array.isArray(manifest.content_scripts)) {
  manifest.content_scripts = manifest.content_scripts.map((cs) => ({
    ...cs,
    matches:
      Array.isArray(cs.js) && cs.js.includes('src/content/authSync.js')
        ? buildConfig.webAppMatches
        : cs.matches,
    js: Array.isArray(cs.js) ? cs.js.map(normalizePath) : cs.js,
    css: Array.isArray(cs.css) ? cs.css.map(normalizePath) : cs.css,
  }));
}

if (Array.isArray(manifest.web_accessible_resources)) {
  manifest.web_accessible_resources = manifest.web_accessible_resources.map(
    (war) => ({
      ...war,
      resources: Array.isArray(war.resources)
        ? war.resources.map(normalizePath)
        : war.resources,
    }),
  );
}

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(
  'dist/manifest.json',
  JSON.stringify(manifest, null, 2),
  'utf-8',
);

const cssDirs = [
  { src: 'src/shared/styles', dest: 'dist/shared/styles' },
  { src: 'src/content/styles', dest: 'dist/content/styles' },
  { src: 'src/popup/styles', dest: 'dist/popup/styles' },
];

cssDirs.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    files.forEach((file) => {
      if (file.endsWith('.css')) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    });
  }
});

const iconDirs = [{ src: 'icons', dest: 'dist/icons' }];

iconDirs.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    files.forEach((file) => {
      if (
        file.endsWith('.png') ||
        file.endsWith('.svg') ||
        file.endsWith('.ico')
      ) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    });
  }
});

const htmlMap = [
  { src: 'src/popup/popup.html', dest: 'dist/popup/popup.html' },
];

htmlMap.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
});

function replaceConstInFile(file, constName, value) {
  if (!fs.existsSync(file)) {
    throw new Error(`Build config target not found: ${file}`);
  }

  const source = fs.readFileSync(file, 'utf-8');
  const pattern = new RegExp(`const ${constName} = (["']).*?\\1;`);
  const replacement = `const ${constName} = ${JSON.stringify(value)};`;
  const updated = source.replace(pattern, replacement);

  if (updated === source) {
    throw new Error(`Could not replace ${constName} in ${file}`);
  }

  fs.writeFileSync(file, updated, 'utf-8');
}

function patchCompiledBuildConfig() {
  replaceConstInFile(
    'dist/config/env.js',
    'JOBSTRIDE_DEFAULT_API_BASE_URL',
    buildConfig.apiBaseUrl,
  );
  replaceConstInFile(
    'dist/config/env.js',
    'JOBSTRIDE_DEFAULT_WEB_APP_URL',
    buildConfig.webAppUrl,
  );
  replaceConstInFile(
    'dist/background/background.js',
    'API_ORIGIN_LIST',
    buildConfig.apiOrigins.join('|'),
  );
  replaceConstInFile(
    'dist/background/background.js',
    'WEB_APP_ORIGIN_LIST',
    buildConfig.webAppOrigins.join('|'),
  );
  replaceConstInFile(
    'dist/services/auth.js',
    'AUTH_ALLOWED_WEB_APP_ORIGIN_LIST',
    buildConfig.webAppOrigins.join('|'),
  );
}

function walkFiles(dir, callback) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function stripGeneratedMetadata() {
  walkFiles('dist', (file) => {
    if (/\.d\.ts(?:\.map)?$/.test(file) || /\.js\.map$/.test(file)) {
      fs.rmSync(file);
      return;
    }

    if (file.endsWith('.js')) {
      const source = fs.readFileSync(file, 'utf-8');
      const updated = source.replace(/\n?\/\/# sourceMappingURL=.*\.js\.map\s*$/u, '');

      if (updated !== source) {
        fs.writeFileSync(file, updated, 'utf-8');
      }
    }
  });
}

patchCompiledBuildConfig();

if (buildConfig.stripGeneratedMetadata) {
  stripGeneratedMetadata();
}

console.log('Build complete! Extension ready in dist/ directory');
console.log('Load the dist/ directory as an unpacked extension in Chrome');
