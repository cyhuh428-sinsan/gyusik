/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

"Make from examples": builds regex candidates from positive / negative example strings and from a library
of common Korean formats. Pure rules, no network, no AI. Candidates are our own patterns (never user input),
so they are safe to score on the main thread with the JavaScript engine.
*/

export const LIBRARY = [
	{name: "휴대폰 번호", pattern: "^01[016789]-?\\d{3,4}-?\\d{4}$", note: "하이픈은 있어도 없어도 됩니다."},
	{name: "일반 전화번호", pattern: "^0\\d{1,2}-\\d{3,4}-\\d{4}$"},
	{name: "사업자등록번호", pattern: "^\\d{3}-\\d{2}-\\d{5}$", note: "형식만 확인합니다. 검증 숫자는 계산하지 않습니다."},
	{name: "우편번호 (5자리)", pattern: "^\\d{5}$"},
	{name: "날짜 (연-월-일)", pattern: "^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$", note: "2월 30일처럼 달력에 없는 날짜는 정규식만으로 거르기 어렵습니다. 코드에서 한 번 더 확인하세요."},
	{name: "시각 (시:분)", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$"},
	{name: "이메일", pattern: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", note: "흔한 형식만 다룹니다. 모든 이메일 규격을 완벽히 검증하지는 않습니다."},
	{name: "한글 이름 (2~5자)", pattern: "^[가-힣]{2,5}$"},
	{name: "한글만", pattern: "^[가-힣]+$"},
	{name: "초성만", pattern: "^[ㄱ-ㅎ]+$"},
	{name: "숫자 (천 단위 콤마)", pattern: "^\\d{1,3}(,\\d{3})*$"},
	{name: "URL (http/https)", pattern: "^https?://[^\\s/$.?#][^\\s]*$"},
	{name: "IPv4 주소", pattern: "^((25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1?\\d?\\d)$"}
];

const BACKSLASH = "\\";
const SPECIAL = "\\^$.*+?()[]{}|/"; // "-" needs no escape outside a character class
const escLit = (c) => SPECIAL.indexOf(c) !== -1 ? BACKSLASH + c : c;

/** Splits a string into runs: {k: "d"|"l"|"h"|"s"|"x", text}. "x" = a single literal character. */
function runs(str) {
	let out = [], k;
	for (let c of str) {
		k = /\d/.test(c) ? "d" : /[A-Za-z]/.test(c) ? "l" : /[가-힣]/.test(c) ? "h" : /\s/.test(c) ? "s" : "x";
		let last = out[out.length - 1];
		if (last && last.k === k && k !== "x") { last.text += c; } else { out.push({k, text: c}); }
	}
	return out;
}

const sig = (rs) => rs.map((r) => r.k === "x" ? "x:" + r.text : r.k).join("|");

function cls(k, texts) {
	if (k === "d") { return BACKSLASH + "d"; }
	if (k === "h") { return "[가-힣]"; }
	if (k === "s") { return BACKSLASH + "s"; }
	let all = texts.join("");
	if (/^[a-z]+$/.test(all)) { return "[a-z]"; }
	if (/^[A-Z]+$/.test(all)) { return "[A-Z]"; }
	return "[A-Za-z]";
}

function quant(min, max, loose) {
	if (loose) { return min === 1 && max === 1 ? "" : "+"; }
	if (min === max) { return min === 1 ? "" : "{" + min + "}"; }
	return "{" + min + "," + max + "}";
}

/** One pattern body for a group of examples that share the same run structure. */
function body(group, loose) {
	let cols = group[0].map((_, i) => group.map((rs) => rs[i]));
	return cols.map((col) => {
		if (col[0].k === "x") { return escLit(col[0].text); }
		let lens = col.map((r) => r.text.length);
		return cls(col[0].k, col.map((r) => r.text)) + quant(Math.min(...lens), Math.max(...lens), loose);
	}).join("");
}

function test(pattern, s) {
	try { return new RegExp(pattern).test(s); } catch (e) { return false; }
}

function score(pattern, pos, neg) {
	let missed = pos.filter((s) => !test(pattern, s));
	let leaked = neg.filter((s) => test(pattern, s));
	return {pass: pos.length - missed.length + neg.length - leaked.length, total: pos.length + neg.length, missed, leaked};
}

/** Returns candidates sorted best-first: {title, source, pattern, pass, total, missed, leaked, note}. */
export function generate(pos, neg) {
	pos = pos.filter((s) => s !== "");
	neg = neg.filter((s) => s !== "");
	let list = [];
	if (!pos.length) { return list; }
	let add = (c) => {
		if (list.some((x) => x.pattern === c.pattern)) { return; }
		list.push(Object.assign(c, score(c.pattern, pos, neg)));
	};

	// 1) generalize the positive examples
	let groups = {};
	pos.forEach((s) => { let rs = runs(s); (groups[sig(rs)] = groups[sig(rs)] || []).push(rs); });
	let keys = Object.keys(groups);
	if (keys.length <= 4) {
		[false, true].forEach((loose) => {
			let parts = keys.map((k) => body(groups[k], loose));
			let p = parts.length === 1 ? "^" + parts[0] + "$" : "^(?:" + parts.join("|") + ")$";
			add({title: loose ? "느슨" : "엄격", source: "예시에서 일반화", pattern: p,
				note: loose ? "숫자·글자 묶음의 길이를 따지지 않고 1개 이상이면 통과시킵니다." : "예시에서 본 길이 범위만 허용합니다."});
		});
	} else {
		add({title: "느슨", source: "예시에서 일반화", pattern: "^[" + BACKSLASH + "s" + BACKSLASH + "S]+$", note: "예시의 모양이 제각각이라 구조를 뽑지 못했습니다. 비슷한 예시끼리 모아 다시 시도해 보세요."});
	}

	// 2) library formats that accept every positive example
	LIBRARY.forEach((l) => {
		if (pos.every((s) => test(l.pattern, s))) {
			add({title: l.name, source: "패턴 라이브러리", pattern: l.pattern, note: l.note || ""});
		}
	});

	return list.sort((a, b) => (b.pass - a.pass) || (a.source === b.source ? 0 : a.source === "패턴 라이브러리" ? -1 : 1));
}
