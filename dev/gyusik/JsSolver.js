/*
규식이 (Gyusik) - https://github.com/cyhuh428-sinsan/gyusik
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Runs JavaScript RegExp in a throw-away Web Worker so a catastrophic pattern can't freeze the page.
Same interface and result shape as PcreSolver: solve(req, callback) with
  req = {pattern, flags, text, tool?:{id:"replace"|"list", input}} or {pattern, flags, mode:"tests", tests:[{id,text}]}; result = {time, error, matches:[{i, l, groups:[{s, i, l}]}]}.
Only the latest request reports; a request running longer than TIMEOUT is killed and reported as "timeout".
*/

const WORKER_SRC = `
onmessage = function (e) {
	var d = e.data, matches = [], error = null, re, m, last = -1;
	try { re = new RegExp(d.pattern, d.flags.indexOf("d") === -1 ? d.flags + "d" : d.flags); }
	catch (err) { try { re = new RegExp(d.pattern, d.flags); } catch (err2) { postMessage({error: {id: "regexparse", message: String(err2.message || err2)}}); return; } }
	postMessage("start");
	if (d.mode === "tests") {
		var res = [];
		for (var t = 0; t < d.tests.length; t++) {
			re.lastIndex = 0;
			m = re.exec(d.tests[t].text);
			res.push(m ? {id: d.tests[t].id, i: m.index, l: m[0].length} : {id: d.tests[t].id});
		}
		postMessage({matches: res});
		return;
	}
	var global = re.global || re.sticky;
	while ((m = re.exec(d.text))) {
		var groups = [];
		for (var g = 1; g < m.length; g++) {
			var ix = m.indices && m.indices[g];
			groups.push(m[g] === undefined ? {s: undefined} : {s: m[g], i: ix ? ix[0] : -1, l: m[g].length});
		}
		matches.push({i: m.index, l: m[0].length, groups: groups});
		if (!re.global) { break; }
		if (m[0].length === 0) { error = {id: "infinite", warning: true}; re.lastIndex++; }
		if (matches.length >= 5000) { error = {id: "toomany", warning: true}; break; }
	}
	var toolResult;
	if (d.tool && d.tool.input != null && (d.tool.id === "replace" || d.tool.id === "list")) {
		try { toolResult = d.tool.id === "replace" ? d.text.replace(re, d.tool.input) : getList(d.text, d.pattern, d.flags, d.tool.input); }
		catch (err3) { toolResult = null; }
	}
	postMessage({error: error, matches: matches, tool: toolResult});
};
// same approach as the RegExr "List" tool: run the pattern one match at a time and keep the formatted piece.
function getList(source, pattern, flags, str) {
	var result = "", repl, ref, trimR = 0, regex;
	try { regex = new RegExp(pattern, flags.replace("g", "")); } catch (e) { return null; }
	if (str.search(/\\$[&1-9\\x60']/) === -1) { trimR = str.length; str = "$&" + str; }
	do {
		ref = source.replace(regex, "\\b");
		var index = ref.indexOf("\\b"), empty = ref.length > source.length;
		if (index === -1) { break; }
		repl = source.replace(regex, str);
		result += repl.substr(index, repl.length - ref.length + 1);
		source = ref.substr(index + (empty ? 2 : 1));
	} while (source.length);
	if (trimR) { result = result.substr(0, result.length - trimR); }
	return result;
}`;

// like the original RegExr tools, the boxes accept \n, \r, \t and \\
const unesc = (str) => str.replace(/\\([nrt\\])/g, (m, c) => ({n: "\n", r: "\r", t: "\t", "\\": "\\"}[c]));

export default class JsSolver {
	constructor() {
		this._url = URL.createObjectURL(new Blob([WORKER_SRC], {type: "text/javascript"}));
		this._seq = 0;
		this._worker = null;
	}

	solve(req, callback) {
		let seq = ++this._seq;
		this._kill();
		let worker = this._worker = new Worker(this._url), start = 0;
		let done = (result) => {
			if (seq !== this._seq) { return; }
			this._kill();
			callback(result);
		};
		worker.onmessage = (evt) => {
			if (seq !== this._seq) { return; }
			if (evt.data === "start") {
				start = performance.now();
				this._timer = setTimeout(() => done({error: {id: "timeout"}, matches: []}), JsSolver.TIMEOUT);
				return;
			}
			let r = evt.data;
			done({time: r.error && !r.error.warning ? null : performance.now() - start, error: r.error, matches: r.matches || [], tool: req.tool ? {id: req.tool.id, result: r.tool} : undefined});
		};
		worker.onerror = (evt) => { evt.preventDefault(); done({error: {id: "regexparse", message: evt.message}, matches: []}); };
		worker.postMessage({pattern: req.pattern, flags: req.flags, text: req.text, mode: req.mode, tests: req.tests, tool: req.tool ? {id: req.tool.id, input: req.tool.input == null ? null : unesc(req.tool.input)} : null});
	}

	_kill() {
		clearTimeout(this._timer);
		if (this._worker) { this._worker.terminate(); this._worker = null; }
	}
}

JsSolver.TIMEOUT = 1000;
