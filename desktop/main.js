/*
규식이 (Gyusik) - https://github.com/cyhuh428-sinsan/gyusik
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Windows installer app (Electron). The site is bundled inside the app and served from app://gyusik/.
Network rule: every request that is not app:// is cancelled unless the administrator policy allows
its host (see policy.js). The only thing that ever needs the network is the AI feature the user
configures by hand, and the administrator can switch that off for the whole machine.
*/

const {app, BrowserWindow, protocol, session, ipcMain, safeStorage, dialog, shell, Menu} = require("electron");
const path = require("path");
const fs = require("fs");
const {loadPolicy, isAllowed} = require("./policy");

const SMOKE = process.argv.includes("--smoke");
const SITE = path.join(__dirname, "site");
const ORIGIN = "app://gyusik";

// no background traffic from the browser engine itself
app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-component-update");
app.commandLine.appendSwitch("disable-features", "OptimizationHints,MediaRouter,AutofillServerCommunication,CertificateTransparencyComponentUpdater");
app.commandLine.appendSwitch("no-pings");

if (SMOKE) { app.setPath("userData", fs.mkdtempSync(path.join(require("os").tmpdir(), "gyusik-smoke-"))); }
if (!SMOKE && !app.requestSingleInstanceLock()) { app.quit(); }

protocol.registerSchemesAsPrivileged([{scheme: "app", privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true}}]);

const MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".wasm": "application/wasm", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8"};

// same policy as the web server (web/nginx.conf); connect-src is narrowed by the request filter below.
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https: http:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

let policy = null, win = null;
const userHosts = new Set(); // the single AI host the user configured (set from the settings screen)
const blocked = []; // hosts the app tried to reach and was not allowed to (shown in the smoke test)

function resourcesPath() { return app.isPackaged ? process.resourcesPath : path.join(__dirname); }

function serveFile(request) {
	let u = new URL(request.url);
	let rel = decodeURIComponent(u.pathname);
	if (rel === "/" || rel === "") { rel = "/index.html"; }
	let file = path.normalize(path.join(SITE, rel));
	// never serve anything outside the bundled site folder
	if (file !== SITE && !file.startsWith(SITE + path.sep)) { return new Response("forbidden", {status: 403}); }
	try {
		let body = fs.readFileSync(file);
		return new Response(body, {status: 200, headers: {"content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "content-security-policy": CSP, "x-content-type-options": "nosniff", "cache-control": "no-cache"}});
	} catch (e) {
		return new Response("not found", {status: 404});
	}
}

function setupSession(ses) {
	ses.setPermissionRequestHandler((wc, permission, cb) => cb(false));
	ses.setPermissionCheckHandler(() => false);

	ses.webRequest.onBeforeRequest((details, cb) => {
		if (isAllowed(policy, details.url, userHosts)) { return cb({}); }
		try { blocked.push(new URL(details.url).host); } catch (e) { blocked.push(details.url.slice(0, 80)); }
		cb({cancel: true});
	});

	// calls to the user's own AI server come from app://, so the server's answers need CORS headers
	ses.webRequest.onHeadersReceived((details, cb) => {
		if (/^app:/i.test(details.url)) { return cb({}); }
		let h = {};
		for (let k of Object.keys(details.responseHeaders || {})) { if (!/^access-control-/i.test(k)) { h[k] = details.responseHeaders[k]; } }
		h["access-control-allow-origin"] = [ORIGIN];
		h["access-control-allow-headers"] = ["authorization, content-type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access"];
		h["access-control-allow-methods"] = ["GET, POST, OPTIONS"];
		let out = {responseHeaders: h};
		if (details.method === "OPTIONS") { out.statusLine = "HTTP/1.1 200 OK"; }
		cb(out);
	});
}

function senderOk(event) {
	// (the origin of a custom scheme such as app:// is the string "null" in Node, so compare scheme and host)
	try { let u = new URL(event.senderFrame.url); return u.protocol === "app:" && u.host === "gyusik"; } catch (e) { return false; }
}

function setupIpc() {
	// not secret, and the preload script asks before the page has loaded (so the sender URL is not set yet)
	ipcMain.on("host:info", (event) => {
		event.returnValue = {version: app.getVersion(), platform: process.platform, policy: {blockExternal: policy.blockExternal, allowedHosts: policy.allowedHosts, source: policy.source}};
	});
	// the settings screen tells us which AI server the user typed in; that one host becomes reachable
	ipcMain.handle("net:allow", (event, host) => {
		if (!senderOk(event)) { return false; }
		userHosts.clear();
		host = String(host || "").toLowerCase();
		if (/^[a-z0-9.-]{1,253}(:\d{1,5})?$/.test(host)) { userHosts.add(host); return true; }
		return false;
	});
	const keyFile = () => path.join(app.getPath("userData"), "ai-key.bin");
	ipcMain.handle("secret:get", (event) => {
		if (!senderOk(event) || !safeStorage.isEncryptionAvailable()) { return ""; }
		try { return safeStorage.decryptString(fs.readFileSync(keyFile())); } catch (e) { return ""; }
	});
	ipcMain.handle("secret:set", (event, key) => {
		if (!senderOk(event) || !safeStorage.isEncryptionAvailable()) { return false; }
		try {
			if (!key) { fs.rmSync(keyFile(), {force: true}); return true; }
			fs.writeFileSync(keyFile(), safeStorage.encryptString(String(key)));
			return true;
		} catch (e) { return false; }
	});
	ipcMain.handle("file:save", async (event, name, text) => {
		if (!senderOk(event)) { return false; }
		let r = await dialog.showSaveDialog(win, {defaultPath: String(name).replace(/[\\/:*?"<>|]/g, "_"), filters: [{name: "JSON", extensions: ["json"]}]});
		if (r.canceled || !r.filePath) { return false; }
		fs.writeFileSync(r.filePath, text, "utf8");
		return true;
	});
}

function createWindow() {
	win = new BrowserWindow({
		width: 1280, height: 860, minWidth: 720, minHeight: 520, show: false, title: "규식이", backgroundColor: "#101319",
		webPreferences: {preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, devTools: !app.isPackaged || SMOKE}
	});
	win.once("ready-to-show", () => { if (!SMOKE) { win.show(); } });
	// the page may never navigate away or open windows; links go to the system browser only when the network is allowed
	win.webContents.setWindowOpenHandler(({url}) => {
		if (/^https:/i.test(url) && !policy.blockExternal) { shell.openExternal(url); }
		return {action: "deny"};
	});
	win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(ORIGIN + "/")) { e.preventDefault(); } });
	win.loadURL(ORIGIN + "/index.html");
	return win;
}

/** --smoke: load the app, exercise it, print one JSON line, exit 0 (all good) or 1. */
async function smoke() {
	let wc = win.webContents;
	await new Promise((r) => wc.once("did-finish-load", r));
	let script = `(async () => {
		const wait = (ms) => new Promise((r) => setTimeout(r, ms));
		const out = {title: document.title, host: typeof window.gyusikHost, policy: window.gyusikHost && window.gyusikHost.info && window.gyusikHost.info.policy};
		await wait(800);
		out.jsMatches = window.gyusik && window.gyusik.result ? window.gyusik.result.matches.length : null;
		const e = document.getElementById("engine"); e.value = "pcre"; e.dispatchEvent(new Event("change"));
		await wait(2500);
		out.pcreMatches = window.gyusik.result ? window.gyusik.result.matches.length : null;
		out.pcreError = window.gyusik.result && window.gyusik.result.error ? window.gyusik.result.error.id : null;
		try { await fetch("https://example.com/", {mode: "no-cors"}); out.externalFetch = "ALLOWED"; } catch (err) { out.externalFetch = "blocked"; }
		const r = await fetch("app://gyusik/index.html"); out.csp = (r.headers.get("content-security-policy") || "").slice(0, 40);
		const t = await fetch("app://gyusik/../main.js").then((x) => x.status).catch(() => "err"); out.traversal = t;
		out.hasNode = typeof require !== "undefined" || typeof process !== "undefined";
		await window.gyusikHost.allowHost("allowed.invalid:8443");
		try { await fetch("https://allowed.invalid:8443/", {mode: "no-cors"}); } catch (err) { /* DNS fails, but it must not be "blocked by us" */ }
		try { await fetch("https://other.invalid/", {mode: "no-cors"}); } catch (err) {}
		return out;
	})()`;
	let out = await wc.executeJavaScript(script);
	out.blockedHosts = Array.from(new Set(blocked));
	let ok = out.title.includes("규식이") && out.host === "object" && out.jsMatches === 2 && out.pcreMatches === 2 && !out.pcreError && out.externalFetch === "blocked" && out.blockedHosts.includes("example.com") && out.blockedHosts.includes("other.invalid") && !out.blockedHosts.includes("allowed.invalid:8443") && out.traversal !== 200 && !out.hasNode;
	out.ok = ok;
	console.log("SMOKE " + JSON.stringify(out));
	app.exit(ok ? 0 : 1);
}

app.whenReady().then(() => {
	Menu.setApplicationMenu(null);
	policy = loadPolicy(resourcesPath());
	protocol.handle("app", serveFile);
	setupSession(session.defaultSession);
	setupIpc();
	createWindow();
	if (SMOKE) { smoke().catch((e) => { console.log("SMOKE error " + e.message); app.exit(1); }); }
});

app.on("second-instance", () => { if (win) { if (win.isMinimized()) { win.restore(); } win.focus(); } });
app.on("window-all-closed", () => app.quit());
