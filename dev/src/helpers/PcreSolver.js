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

import Utils from "../utils/Utils";

/*
Solves PCRE patterns in a long-lived worker running PCRE2 as WebAssembly (see PcreWorker.js).
Unlike BrowserSolver, the worker is kept alive because loading the wasm is expensive.
Only one request runs at a time; while it runs, newer requests replace each other and only
the latest one is solved. Results for superseded requests are dropped.
*/
export default class PcreSolver {

	constructor() {
		this._reqId = 0;
		this._worker = null;
		this._running = null;
		this._pending = null;
	}

	solve(o, callback) {
		this._callback = callback;
		this._pending = o;
		this._next();
	}

	_next() {
		if (this._running || !this._pending) { return; }
		if (!this._worker) { this._createWorker(); }

		let o = this._running = this._pending, tool = o.tool;
		this._pending = null;
		o._pcreId = ++this._reqId;

		// covers loading the wasm on first use; the per-match timeout starts once the worker reports "start".
		this._loadTimeoutId = setTimeout(() => this._fail({id: "pcreload"}), PcreSolver.LOAD_TIMEOUT);

		this._worker.postMessage({
			id: o._pcreId,
			pattern: o.pattern,
			flags: o.flags,
			text: o.text,
			tests: o.tests,
			mode: o.mode,
			tool: tool && {id: tool.id, input: tool.input == null ? null : Utils.unescSubstStr(tool.input)}
		});
	}

	_createWorker() {
		let meta = document.querySelector("meta[name='pcre-worker']");
		let worker = this._worker = new Worker((meta && meta.content) || "pcre-worker.js");
		worker.onmessage = (evt) => this._handleMessage(evt.data);
		worker.onerror = (evt) => {
			evt.preventDefault();
			this._fail({id: "pcreload"});
		};
	}

	_handleMessage(data) {
		let req = this._running;
		if (!req || data.id !== req._pcreId) { return; }

		clearTimeout(this._loadTimeoutId);
		if (data.type === "start") {
			this._startTime = Utils.now();
			this._timeoutId = setTimeout(() => this._fail({id: "timeout"}), PcreSolver.TIMEOUT);
			return;
		}

		clearTimeout(this._timeoutId);
		this._running = null;
		if (!this._pending) { this._complete(req, data.error, data.matches, data.tool); }
		this._next();
	}

	_fail(error) {
		// the worker is stuck or broken: drop it, a new one is created for the next request.
		clearTimeout(this._loadTimeoutId);
		clearTimeout(this._timeoutId);
		if (this._worker) { this._worker.terminate(); }
		this._worker = null;

		let req = this._running;
		this._running = null;
		if (req && !this._pending) { this._complete(req, error); }
		this._next();
	}

	_complete(req, error, matches, toolResult) {
		let result = {
			time: error ? null : Utils.now()-this._startTime,
			error,
			mode: req.mode,
			matches: matches || [] // a failed run (load error, timeout) has no matches; callers iterate this
		};

		let tool = req.tool;
		if (tool) {
			result.tool = { id: tool.id };
			if (!error || error.warning && tool.input != null) {
				result.tool.result = toolResult;
			}
		}
		this._callback(result);
	}
}

PcreSolver.TIMEOUT = 250; // same limit as the JS engine (see the "timeout" error text).
PcreSolver.LOAD_TIMEOUT = 15000;
