/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Railroad diagram: builds DOM (no SVG) from the pattern tree. Every node carries data-i / data-end
(its range in the pattern) and data-group, so hovering links the diagram to the pattern and the explanation.
*/

import {nodeKo, setKo, quantKo, groupLabel} from "./model.js";

function el(tag, cls, text) {
	let e = document.createElement(tag);
	if (cls) { e.className = cls; }
	if (text != null) { e.textContent = text; }
	return e;
}

function tag(e, n, group) {
	e.dataset.i = n.i;
	e.dataset.end = n.end;
	if (group != null) { e.dataset.group = group; }
	return e;
}

function terminal(label, cls, n, title) {
	let e = tag(el("span", "rr-node " + cls, label), n);
	if (title) { e.title = title; }
	return e;
}

function build(n, ctx) {
	switch (n.kind) {
		case "lit": return terminal("\"" + n.text + "\"", "lit", n);
		case "set": return terminal(setKo(n), "set", n);
		case "leaf": {
			let anchor = /^(bof|eof|wordboundary|notwordboundary)$/.test(n.type);
			return terminal(nodeKo(n, ctx.flags), anchor ? "anchor" : "cls", n, n.text);
		}
		case "group": return groupBox(n, ctx, null);
		case "quant": {
			let inner = n.node.kind === "group" ? groupBox(n.node, ctx, n) : build(n.node, ctx);
			let wrap = tag(el("span", "rr-q"), n, n.node.kind === "group" ? n.node.num : null);
			wrap.appendChild(inner);
			wrap.appendChild(el("span", "rr-qlabel", quantKo(n, ctx.flags)));
			if (n.min === 0) { wrap.classList.add("skip"); }
			if (n.max === -1 || n.max > 1) { wrap.classList.add("loop"); }
			return wrap;
		}
	}
	return el("span");
}

function groupBox(g, ctx, quant) {
	let box = tag(el("span", "rr-grp" + (g.num ? " g" + (((g.num - 1) % 6) + 1) : " plain")), g, g.num);
	if (quant) { box.dataset.end = g.end; }
	box.appendChild(el("small", "rr-grplabel", groupLabel(g)));
	box.appendChild(alt(g.body, ctx));
	return box;
}

function seq(s, ctx) {
	let row = el("span", "rr-seq");
	if (!s.items.length) { row.appendChild(el("span", "rr-node empty", "(비어 있음)")); }
	s.items.forEach((it) => row.appendChild(el("span", "rr-item")).appendChild(build(it, ctx)));
	return row;
}

function alt(a, ctx) {
	if (a.branches.length === 1) { return seq(a.branches[0], ctx); }
	let col = el("span", "rr-alt");
	a.branches.forEach((b) => col.appendChild(seq(b, ctx)));
	return col;
}

/** Renders the diagram into `host`. */
export function renderRailroad(host, model, flags) {
	host.textContent = "";
	if (!model.pattern) { host.appendChild(el("p", "empty", "정규식을 입력하면 구조가 그림으로 나옵니다.")); return; }
	let ctx = {flags};
	let line = el("div", "rr-line");
	line.appendChild(el("span", "rr-end"));
	line.appendChild(el("span", "rr-item")).appendChild(alt(model.ast, ctx));
	line.appendChild(el("span", "rr-end"));
	host.appendChild(line);
}
