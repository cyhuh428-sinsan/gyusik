// Copies the web build (../build) into ./site, the folder the app serves. Run `npx gulp deploy` in the repo root first.
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "..", "build");
const dst = path.join(__dirname, "..", "site");
if (!fs.existsSync(path.join(src, "index.html"))) { console.error("build/index.html not found. Run `npx gulp deploy` in the repo root first."); process.exit(1); }
fs.rmSync(dst, {recursive: true, force: true});
fs.mkdirSync(dst, {recursive: true});
// only what the app needs: the main page and deploy/ (the original RegExr page and its assets are left out)
fs.copyFileSync(path.join(src, "index.html"), path.join(dst, "index.html"));
fs.cpSync(path.join(src, "deploy"), path.join(dst, "deploy"), {recursive: true});
// index.html in the web build points to "deploy/..." relative to the site root, which is exactly this layout.
console.log("site ready:", fs.readdirSync(dst).join(", "));
