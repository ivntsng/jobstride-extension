#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("Building Extension...");

if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true });
}

console.log("Compiling...");
execSync("npx tsc", { stdio: "inherit" });

console.log("Copying static files and generating manifest...");

function normalizePath(p) {
  return typeof p === "string" && p.startsWith("src/") ? p.slice(4) : p;
}

const manifestPath = "manifest.json";
if (!fs.existsSync(manifestPath)) {
  throw new Error("manifest.json not found at project root");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

if (manifest.action && manifest.action.default_popup) {
  manifest.action.default_popup = normalizePath(manifest.action.default_popup);
}

if (manifest.background && manifest.background.service_worker) {
  manifest.background.service_worker = normalizePath(
    manifest.background.service_worker
  );
}

if (Array.isArray(manifest.content_scripts)) {
  manifest.content_scripts = manifest.content_scripts.map((cs) => ({
    ...cs,
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
    })
  );
}

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(
  "dist/manifest.json",
  JSON.stringify(manifest, null, 2),
  "utf-8"
);

const cssDirs = [
  { src: "src/content/styles", dest: "dist/content/styles" },
  { src: "src/popup/styles", dest: "dist/popup/styles" },
];

cssDirs.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    files.forEach((file) => {
      if (file.endsWith(".css")) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    });
  }
});

const htmlMap = [
  { src: "src/popup/popup.html", dest: "dist/popup/popup.html" },
];

htmlMap.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
});

console.log("Build complete! Extension ready in dist/ directory");
console.log("Load the dist/ directory as an unpacked extension in Chrome");
