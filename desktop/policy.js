/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Administrator policy for the installed app. A closed-network administrator can put a policy.json here:
  %ProgramData%\Gyusik\policy.json        (editable by administrators, read-only for users)
or next to the installed app: resources\policy.json
The first file found wins. Without a policy file the defaults apply.

By default the app contacts NOTHING outside itself. The one exception is the AI server the user types into
the settings screen ("한국어 문장으로 만들기"): that single host is allowed, and only if the policy allows it.

  {
    "blockExternal": true,                 // true: the app never sends any request outside itself
    "allowedHosts": ["llm.example.local"]  // the user may point the AI feature only at these hosts
                                           // missing: the user may use any host
  }
*/

const fs = require("fs");
const path = require("path");

const DEFAULTS = {blockExternal: false, allowedHosts: null, source: null};

function candidates(resourcesPath) {
	let list = [];
	if (process.env.ProgramData) { list.push(path.join(process.env.ProgramData, "Gyusik", "policy.json")); }
	if (resourcesPath) { list.push(path.join(resourcesPath, "policy.json")); }
	return list;
}

/** Validates untrusted JSON: only the known fields, only the expected types. */
function sanitize(raw) {
	let p = Object.assign({}, DEFAULTS);
	if (!raw || typeof raw !== "object") { return p; }
	p.blockExternal = raw.blockExternal === true;
	if (Array.isArray(raw.allowedHosts)) {
		p.allowedHosts = raw.allowedHosts.filter((h) => typeof h === "string" && /^[A-Za-z0-9.-]{1,253}(:\d{1,5})?$/.test(h)).map((h) => h.toLowerCase());
	}
	return p;
}

function loadPolicy(resourcesPath) {
	for (let file of candidates(resourcesPath)) {
		try {
			if (!fs.existsSync(file)) { continue; }
			let p = sanitize(JSON.parse(fs.readFileSync(file, "utf8")));
			p.source = file;
			return p;
		} catch (e) {
			// an unreadable policy must not silently open the network: fail closed.
			return {blockExternal: true, allowedHosts: [], source: file + " (읽을 수 없어 외부 통신을 막았습니다)"};
		}
	}
	return Object.assign({}, DEFAULTS);
}

/** May the app contact this URL? Internal schemes are always fine; external hosts only if the user picked them (userHosts). */
function isAllowed(policy, urlString, userHosts) {
	let u;
	try { u = new URL(urlString); } catch (e) { return false; }
	if (u.protocol === "app:" || u.protocol === "devtools:" || u.protocol === "blob:" || u.protocol === "data:" || u.protocol === "chrome-extension:") { return true; }
	if (u.protocol !== "https:" && u.protocol !== "http:") { return false; }
	if (policy.blockExternal) { return false; }
	let host = u.host.toLowerCase();
	if (!userHosts || !userHosts.has(host)) { return false; }
	if (Array.isArray(policy.allowedHosts)) { return policy.allowedHosts.includes(host) || policy.allowedHosts.includes(u.hostname.toLowerCase()); }
	return true;
}

module.exports = {loadPolicy, isAllowed, sanitize};
