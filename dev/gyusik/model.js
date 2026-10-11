/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Pattern model: turns RegExr's flat lexer tokens into a tree, and describes the tree in Korean.
The tree feeds the explanation list, the one-sentence summary, the railroad diagram and the diagnostics.
All positions (i, end) are indexes into the pattern string WITHOUT the surrounding slashes.
*/

import ExpressionLexer from "../src/ExpressionLexer.js";
import profiles from "../src/profiles/profiles.js";
import {lessonFor} from "./reference.js";

const lexer = new ExpressionLexer();

const QUANTS = {plus: [1, -1], star: [0, -1], opt: [0, 1]};
const OPENERS_SKIP = {open: 1, close: 1};
const FLAG_TYPES = {global:"g", caseinsensitive:"i", multiline:"m", dotall:"s", unicode:"u", sticky:"y", extended:"x", ungreedy:"U"};

export const FLAG_NAMES = {
	g: "모두 찾기", i: "대소문자 무시", m: "여러 줄", s: "점이 줄바꿈 포함", u: "유니코드", y: "고정 위치", x: "공백 무시", U: "게으르게"
};

/** Parses a pattern. Returns {ast, errors, groups, source}. */
export function analyze(pattern, flags, engine) {
	lexer.profile = engine === "pcre" ? profiles.pcre : profiles.js;
	let src = "/" + pattern + "/" + flags;
	let token = lexer.parse(src);
	let errors = [], groupCount = 0, groupNames = {};

	let root = {kind: "alt", branches: [{kind: "seq", items: []}], i: 0, end: pattern.length, frame: null};
	let stack = [root];
	let cur = () => { let f = stack[stack.length - 1]; return f.branches[f.branches.length - 1]; };
	let text = (t) => pattern.substr(t.i - 1, t.l);

	for (let t = token; t; t = t.next) {
		if (t.error) { errors.push({id: t.error.id, warning: !!t.error.warning || t.error.id === "fwdslash", i: t.i - 1, l: t.l, token: t}); }
		let type = t.type;
		if (OPENERS_SKIP[type] || FLAG_TYPES[type]) { continue; }
		if (t.i - 1 >= pattern.length) { continue; }
		let seq = cur();

		if (type === "alt") {
			stack[stack.length - 1].branches.push({kind: "seq", items: []});
			continue;
		}
		if (t.clss === "group" && t.close !== undefined && type !== "groupclose") {
			let g = {kind: "alt", branches: [{kind: "seq", items: []}], i: t.i - 1, openLen: t.l, gtype: type, num: t.capture ? t.num : null, name: t.name || null, end: null};
			if (t.capture) { groupCount++; if (t.name) { groupNames[t.name] = t.num; } }
			stack.push(g);
			continue;
		}
		if (type === "groupclose") {
			if (stack.length > 1) {
				let g = stack.pop();
				g.end = t.i - 1 + t.l;
				cur().items.push({kind: "group", gtype: g.gtype, num: g.num, name: g.name, body: g, i: g.i, end: g.end, openLen: g.openLen});
			}
			continue;
		}
		if (type === "set" || type === "setnot") {
			let close = t.close ? t.close.i : null; // t.close is the closing token; .i counts the leading "/"
			let end = close !== null ? close : pattern.length;
			seq.items.push({kind: "set", negate: type === "setnot", i: t.i - 1, end: end, parts: splitSet(pattern.substring(t.i - 1 + t.l, end - 1 + (close !== null ? 0 : 1)))});
			// skip the tokens inside the set; they are described by `parts`.
			let setStart = t;
			while (t.next && !(t.next.type === "setclose" && t.next.open && t.next.open.i === setStart.i)) { t = t.next; }
			if (t.next) { t = t.next; }
			continue;
		}
		if (QUANTS[type] || type === "quant") {
			let q = QUANTS[type] || [t.min, t.max];
			let last = seq.items[seq.items.length - 1];
			if (last && last.kind === "lit" && last.text.length > 1) {
				// the quantifier binds to the last character only.
				let ch = last.text.slice(-1);
				last.text = last.text.slice(0, -1);
				last.end -= 1;
				last = {kind: "lit", text: ch, i: last.end, end: last.end + 1};
				seq.items.push(last);
			}
			if (last) {
				seq.items[seq.items.length - 1] = {kind: "quant", min: q[0], max: q[1], lazy: false, possessive: false, node: last, qi: t.i - 1, i: last.i, end: t.i - 1 + t.l};
			}
			continue;
		}
		if (type === "lazy" || type === "possessive") {
			let last = seq.items[seq.items.length - 1];
			if (last && last.kind === "quant") { last[type] = true; last.end = t.i - 1 + t.l; }
			continue;
		}
		if (type === "char") {
			let last = seq.items[seq.items.length - 1];
			let ch = text(t);
			if (last && last.kind === "lit" && last.end === t.i - 1) { last.text += ch; last.end += t.l; }
			else { seq.items.push({kind: "lit", text: ch, i: t.i - 1, end: t.i - 1 + t.l}); }
			continue;
		}
		seq.items.push({kind: "leaf", type, text: text(t), i: t.i - 1, end: t.i - 1 + t.l, token: t});
	}
	// unclosed groups: close them at the end so the tree stays usable.
	while (stack.length > 1) {
		let g = stack.pop();
		g.end = pattern.length;
		cur().items.push({kind: "group", gtype: g.gtype, num: g.num, name: g.name, body: g, i: g.i, end: g.end, openLen: g.openLen});
	}
	return {ast: root, errors, groupCount, groupNames, pattern, flags, engine};
}

/** Splits the inside of [...] into readable parts: single chars, ranges (a-z) and escapes (\d). */
function splitSet(s) {
	let parts = [], i = 0;
	while (i < s.length) {
		let a = s[i], len = 1;
		if (a === "\\" && i + 1 < s.length) { len = 2; if (/[uxcpP]/.test(s[i + 1])) { let m = /^\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|p\{[^}]*\}|P\{[^}]*\}|c.)/.exec(s.substr(i)); if (m) { len = m[0].length; } } }
		let first = s.substr(i, len);
		if (s[i + len] === "-" && i + len + 1 < s.length) {
			let j = i + len + 1, len2 = s[j] === "\\" ? 2 : 1;
			parts.push({range: true, from: first, to: s.substr(j, len2)});
			i = j + len2;
		} else {
			parts.push({range: false, text: first});
			i += len;
		}
	}
	return parts;
}

function chName(c) {
	if (c === " ") { return "공백"; }
	let m = {"\\n": "줄바꿈", "\\t": "탭", "\\r": "캐리지 리턴", "\\d": "숫자", "\\w": "글자·숫자·밑줄", "\\s": "공백 문자", "\\D": "숫자가 아닌 글자", "\\W": "글자·숫자·밑줄이 아닌 글자", "\\S": "공백이 아닌 글자"};
	if (m[c]) { return m[c]; }
	if (c.length === 2 && c[0] === "\\") { return "\"" + c[1] + "\""; }
	return /^[\w가-힣]$/.test(c) ? c : "\"" + c + "\"";
}

export function setKo(n) {
	let items = n.parts.map((p) => p.range ? chName(p.from) + "~" + chName(p.to) : chName(p.text));
	return items.join(", ") + (n.negate ? " 외의 글자 하나" : " 중 한 글자");
}

export function quantKo(n, flags) {
	let min = n.min, max = n.max, s;
	if (min === 0 && max === 1) { s = "있어도 되고 없어도 됨"; }
	else if (min === 0 && max === -1) { s = "0번 이상"; }
	else if (min === 1 && max === -1) { s = "1번 이상"; }
	else if (min === max) { s = min + "번"; }
	else if (max === -1) { s = min + "번 이상"; }
	else { s = min + "~" + max + "번"; }
	if (n.lazy) { s += ", 가능한 적게"; }
	else if (n.possessive) { s += ", 되돌리지 않고 최대한"; }
	return s;
}

const LEAF_KO = {
	dot: (f) => f.s ? "줄바꿈을 포함한 아무 글자 하나" : "줄바꿈을 뺀 아무 글자 하나",
	digit: () => "숫자", notdigit: () => "숫자가 아닌 글자",
	word: () => "글자·숫자·밑줄(_)", notword: () => "글자·숫자·밑줄이 아닌 글자",
	whitespace: () => "공백 문자(스페이스, 탭, 줄바꿈)", notwhitespace: () => "공백이 아닌 글자",
	wordboundary: () => "단어의 경계", notwordboundary: () => "단어 경계가 아닌 자리",
	bof: (f) => f.m ? "줄의 시작" : "문자열의 시작", eof: (f) => f.m ? "줄의 끝" : "문자열의 끝",
	esc_9: () => "탭 문자", esc_10: () => "줄바꿈", esc_13: () => "캐리지 리턴", esc_12: () => "폼 피드", esc_11: () => "세로 탭", esc_0: () => "널 문자",
	numref: (f, n) => "그룹 " + n.text.replace(/\D/g, "") + "과 같은 내용", namedref: (f, n) => "이름 붙은 그룹 " + n.text + "과 같은 내용",
	unicodecat: (f, n) => "유니코드 분류 " + n.text, notunicodecat: (f, n) => "유니코드 분류 " + n.text + " 제외",
	comment: () => "주석 (매칭에 영향 없음)", mode: (f, n) => "플래그 변경 " + n.text,
	alt: () => "또는"
};

/** Korean text for a node. flags is a map like {i:true, m:true}. */
export function nodeKo(n, flags, short) {
	switch (n.kind) {
		case "lit": return "\"" + n.text + "\" 그대로";
		case "set": return setKo(n);
		case "quant": return nodeKo(n.node, flags, true) + " (" + quantKo(n, flags) + ")";
		case "group": return groupKo(n, flags, short);
		case "leaf": {
			let fn = LEAF_KO[n.type];
			if (fn) { return fn(flags, n); }
			if (n.type === "escchar" || n.type === "eschexadecimal" || n.type === "escunicodeu" || n.type === "escoctal") { return "\"" + unescape1(n.text) + "\" 그대로"; }
			return n.text;
		}
		default: return "";
	}
}

function unescape1(s) {
	if (/^\\u[0-9a-fA-F]{4}$/.test(s)) { return String.fromCharCode(parseInt(s.slice(2), 16)); }
	if (/^\\x[0-9a-fA-F]{2}$/.test(s)) { return String.fromCharCode(parseInt(s.slice(2), 16)); }
	return s.length === 2 ? s[1] : s;
}

const GROUP_LABEL = {
	group: (n) => "그룹 " + n.num, namedgroup: (n) => "그룹 " + n.num + " (" + n.name + ")", noncapgroup: () => "묶음 (저장 안 함)",
	atomic: () => "되돌리지 않는 묶음", poslookahead: () => "뒤에 다음이 있어야 함 (앞보기)", neglookahead: () => "뒤에 다음이 없어야 함 (앞보기)",
	poslookbehind: () => "앞에 다음이 있어야 함 (뒤보기)", neglookbehind: () => "앞에 다음이 없어야 함 (뒤보기)"
};

export function groupLabel(n) { return (GROUP_LABEL[n.gtype] || (() => "묶음"))(n); }

function groupKo(n, flags, short) {
	let body = altKo(n.body, flags);
	if (!short) { return groupLabel(n) + ": " + body; }
	// inside a longer sentence: show the contents too when they are short.
	return groupLabel(n) + (body.length <= 40 ? " [" + body + "]" : "");
}

export function seqKo(seq, flags) {
	return seq.items.map((it) => nodeKo(it, flags, true)).join(" → ") || "(비어 있음)";
}

export function altKo(alt, flags) {
	return alt.branches.map((b) => seqKo(b, flags)).join("  또는  ");
}

/** One-sentence structural summary of the whole pattern. */
export function summary(model, flagMap) {
	if (!model.pattern) { return "정규식을 입력하면 여기에 한 줄 요약이 나옵니다."; }
	let alt = model.ast;
	if (alt.branches.length > 1) { return "다음 중 하나와 일치합니다: " + alt.branches.map((b) => "[" + seqKo(b, flagMap) + "]").join(" 또는 "); }
	return "다음 순서와 일치합니다: " + seqKo(alt.branches[0], flagMap);
}

/** Flat list of rows for the explanation panel: {depth, code, ko, i, end, group}. */
export function explainRows(model, flagMap) {
	let rows = [];
	let walkSeq = (seq, depth) => seq.items.forEach((it) => walk(it, depth));
	let walkAlt = (alt, depth) => alt.branches.forEach((b, bi) => {
		if (bi > 0) { rows.push({depth, code: "|", ko: "또는", i: b.items.length ? b.items[0].i - 1 : alt.end, end: b.items.length ? b.items[0].i : alt.end, group: null, plain: true}); }
		walkSeq(b, depth);
	});
	let walk = (n, depth) => {
		let code = model.pattern.substring(n.i, n.end);
		if (n.kind === "group") {
			rows.push({depth, code: model.pattern.substr(n.i, n.openLen) + "…)", ko: groupLabel(n), i: n.i, end: n.end, group: n.num, lesson: lessonFor("group", null, n.gtype)});
			walkAlt(n.body, depth + 1);
		} else if (n.kind === "quant" && n.node.kind === "group") {
			rows.push({depth, code: code.length > 14 ? code.slice(0, 12) + "…" : code, ko: groupLabel(n.node) + " — " + quantKo(n, flagMap), i: n.i, end: n.end, group: n.node.num, lesson: n.lazy ? "l7" : lessonFor("group", null, n.node.gtype)});
			walkAlt(n.node.body, depth + 1);
		} else {
			rows.push({depth, code, ko: nodeKo(n, flagMap), i: n.i, end: n.end, group: null, lesson: n.kind === "quant" && n.lazy ? "l7" : lessonFor(n.kind, n.type, n.gtype)});
		}
	};
	walkAlt(model.ast, 0);
	return rows;
}
