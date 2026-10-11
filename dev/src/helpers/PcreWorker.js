/*
RegExr: Learn, Build, & Test RegEx
Copyright (C) 2017  gskinner.com, inc.
Modified for 규식이 (Gyusik) by cyhuh428-sinsan, 2026-10-11 (see NOTICE.md).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
Runs PCRE2 (compiled to WebAssembly) inside a Web Worker, so PCRE needs no server.
Built to deploy/pcre-worker.js; libpcre2.wasm is loaded from the same directory.
Based on RegExWorker.js from the RegExr pcre-worker branch.

Messages in:  {id, pattern, flags, text, tests, mode, tool:{id, input}}
Messages out: {type:"start", id} once matching begins (after the wasm is ready),
              then {type:"result", id, mode, error, matches, tool}.
*/

import PCRE from "../pcre2-wasm/dist/PCRE";

let ready = null;

function init() {
	// compile the wasm only once; it's slow and memory hungry.
	if (!ready) { ready = PCRE.init(); }
	return ready;
}

onmessage = function (evt) {
	let o = evt.data;
	init().then(() => {
		postMessage({type: "start", id: o.id});
		postMessage(Object.assign({type: "result", id: o.id}, solve(o)));
	}, (reason) => {
		// detail is for debugging only; the user sees the "pcreload" text.
		postMessage({type: "result", id: o.id, mode: o.mode, error: {id: "pcreload", detail: String(reason && reason.message || reason)}});
	});
};

function execError(e) {
	return {id: "pcreexec", message: "PCRE2: " + (e && e.message || e)};
}

function solve(o) {
	let mode = o.mode, tool = o.tool, error = null, matches = [], toolResult, re;
	let global = o.flags.indexOf("g") !== -1;

	// PCRE has no "g" flag: global matching is matchAll / a global substitute.
	try { re = new PCRE(o.pattern, o.flags.replace("g", "")); }
	catch (e) { return {mode, error: execError(e)}; }

	try {
		if (mode === "tests") {
			let tests = o.tests;
			for (let i = 0, l = tests.length; i < l; i++) {
				let test = tests[i], m = re.match(test.text);
				matches[i] = m ? {i: m[0].start, l: m[0].end - m[0].start, id: test.id} : {id: test.id};
			}
		} else {
			let text = o.text, found = global ? re.matchAll(text) : [re.match(text)];
			found.forEach((m) => {
				if (!m) { return; }
				if (global && m[0].end === m[0].start) { error = {id: "infinite", warning: true}; }
				let groups = [];
				for (let g = 1; g < m.length; g++) {
					let grp = m[g];
					// unset groups come back with negative offsets; report them like JS does (undefined).
					groups.push(grp.start < 0 ? {s: undefined} : {s: grp.match, i: grp.start, l: grp.end - grp.start});
				}
				matches.push({i: m[0].start, l: m[0].end - m[0].start, groups});
			});

			if (tool && tool.input != null) {
				if (tool.id === "replace") {
					toolResult = substitute(re, text, tool.input, global);
				} else if (tool.id === "list") {
					toolResult = getList(re, text, tool.input);
				}
			}
		}
	} catch (e) {
		error = execError(e);
	} finally {
		re.destroy();
	}

	return {mode, error, matches, tool: toolResult};
}

function substitute(re, subject, replacement, global) {
	let result = global ? re.substituteAll(subject, replacement) : re.substitute(subject, replacement);
	return (typeof result === "string") ? result : null; // a number is a PCRE2 error code.
}

// same approach as BrowserSolver._getList, using PCRE2 substitution syntax ($0 instead of $&).
function getList(re, source, str) {
	let result = "", repl, ref, trimR = 0;
	if (str.search(/\$(\d|\{)/) === -1) {
		trimR = str.length;
		str = "$0" + str;
	}
	do {
		ref = substitute(re, source, "\b", false); // bell char - just a placeholder to find
		if (ref == null) { break; }
		let index = ref.indexOf("\b"), empty = (ref.length > source.length);
		if (index === -1) { break; }
		repl = substitute(re, source, str, false);
		if (repl == null) { break; }
		result += repl.substr(index, repl.length - ref.length + 1);
		source = ref.substr(index + (empty ? 2 : 1));
	} while (source.length);
	if (trimR) { result = result.substr(0, result.length - trimR); }
	return result;
}
