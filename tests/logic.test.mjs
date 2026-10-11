// 규식이 - model / diagnose / generate: the logic behind the explanation, the mistake finder and the pattern generator.
import test from "node:test";
import assert from "node:assert/strict";
import {analyze, summary, explainRows} from "../dev/gyusik/model.js";
import {diagnose} from "../dev/gyusik/diagnose.js";
import {generate, LIBRARY} from "../dev/gyusik/generate.js";

const flagMap = (f) => { const m = {}; for (const c of f) { m[c] = 1; } return m; };
const titles = (p, f = "", e = "js") => diagnose(analyze(p, f, e), flagMap(f), e).map((d) => d.level + ":" + d.title);
const hasTitle = (p, re, f = "", e = "js") => titles(p, f, e).some((t) => re.test(t));

test("model: summary describes the pattern in Korean, in order", () => {
	const s = summary(analyze("^(010)-(\\d{4})$", "", "js"), {});
	assert.match(s, /^다음 순서와 일치합니다: 문자열의 시작/);
	assert.match(s, /그룹 1/);
	assert.match(s, /숫자 \(4번\)/);
	assert.match(s, /문자열의 끝$/);
});

test("model: alternation is described as 'or'", () => {
	assert.match(summary(analyze("cat|dog", "", "js"), {}), /^다음 중 하나와 일치합니다: \["cat" 그대로\] 또는 \["dog" 그대로\]$/);
});

test("model: empty pattern shows the guide text", () => {
	assert.match(summary(analyze("", "", "js"), {}), /정규식을 입력하면/);
});

test("model: groups are counted and named groups are collected", () => {
	const m = analyze("(?<year>\\d{4})-(\\d{2})", "", "js");
	assert.equal(m.groupCount, 2);
	assert.ok(m.groupNames.year !== undefined);
});

test("model: m flag changes what ^ and $ mean", () => {
	assert.match(summary(analyze("^a$", "m", "js"), flagMap("m")), /줄의 시작/);
	assert.match(summary(analyze("^a$", "", "js"), {}), /문자열의 시작/);
});

test("model: explainRows covers every piece, with nesting depth for group contents", () => {
	const rows = explainRows(analyze("a(b)", "", "js"), {});
	assert.deepEqual(rows.map((r) => r.code), ["a", "(…)", "b"]);
	assert.deepEqual(rows.map((r) => r.depth), [0, 0, 1]);
});

test("model: lexer errors are reported with a position", () => {
	const m = analyze("(abc", "", "js");
	assert.ok(m.errors.some((e) => e.id === "groupopen"));
});

test("diagnose: unclosed group and bracket are errors", () => {
	assert.ok(hasTitle("(abc", /^error:여는 괄호/));
	assert.ok(hasTitle("[a-z", /^error:대괄호/));
});

test("diagnose: quantifier with nothing to repeat is an error", () => {
	assert.ok(hasTitle("a**", /^error:반복 기호를 붙일 대상이 없습니다/));
});

test("diagnose: Python-style named group is rejected in JavaScript but not in PCRE2", () => {
	assert.ok(hasTitle("(?P<n>a)", /\(\?P<이름>…\) 는 JavaScript에서 쓸 수 없습니다/));
	assert.ok(!hasTitle("(?P<n>a)", /JavaScript에서 쓸 수 없습니다/, "", "pcre"));
});

test("diagnose: nested unbounded repetition is flagged as a slowdown risk", () => {
	assert.ok(hasTitle("(a+)+$", /^warn:반복 안에 반복이 있어 느려질 수 있습니다/));
});

test("diagnose: a clean anchored pattern has no findings; an unanchored one gets a tip", () => {
	assert.deepEqual(titles("^\\d{3}-\\d{4}$"), []);
	assert.ok(hasTitle("\\d+", /^tip:시작 \^ 과 끝 \$ 이 없습니다/));
});

test("diagnose: empty pattern has no findings", () => {
	assert.deepEqual(titles(""), []);
});

test("generate: infers a strict pattern from examples and ranks it first", () => {
	const g = generate(["010-1234-5678", "010-9876-5432"], ["010-123-5678"]);
	assert.equal(g[0].pattern, "^\\d{3}-\\d{4}-\\d{4}$");
	assert.equal(g[0].pass, g[0].total);
});

test("generate: every candidate really reports how many examples it passes", () => {
	const pos = ["010-1234-5678", "010-9876-5432"], neg = ["010-123-5678", "abc"];
	for (const c of generate(pos, neg)) {
		const ok = pos.filter((s) => new RegExp(c.pattern).test(s)).length + neg.filter((s) => !new RegExp(c.pattern).test(s)).length;
		assert.equal(c.pass, ok, c.pattern);
		assert.equal(c.total, pos.length + neg.length);
	}
});

test("generate: no examples, no candidates", () => {
	assert.deepEqual(generate([], ["x"]), []);
	assert.deepEqual(generate(["", ""], []), []);
});

test("generate: a library format is offered when it fits the examples", () => {
	const g = generate(["서울", "부산"], []);
	assert.ok(g.some((c) => c.source === "패턴 라이브러리" && c.title.includes("한글")));
});

// one sample that must match and one that must not, for each library format
const SAMPLES = {
	"휴대폰 번호": ["010-1234-5678", "010-12-345"],
	"일반 전화번호": ["02-123-4567", "02-12-45"],
	"사업자등록번호": ["123-45-67890", "123-456-7890"],
	"우편번호 (5자리)": ["06236", "6236"],
	"날짜 (연-월-일)": ["2026-10-12", "2026-13-01"],
	"시각 (시:분)": ["23:59", "24:00"],
	"이메일": ["a.b@example.co.kr", "a@b"],
	"한글 이름 (2~5자)": ["홍길동", "홍"],
	"한글만": ["가나다", "가나a"],
	"초성만": ["ㄱㄴㄷ", "ㄱ가"],
	"숫자 (천 단위 콤마)": ["1,234,567", "1,23"],
	"URL (http/https)": ["https://example.com/a?b=1", "ftp://x.com"],
	"IPv4 주소": ["192.168.0.1", "256.1.1.1"]
};
test("library: every format is covered and behaves on a match and a non-match", () => {
	assert.deepEqual(Object.keys(SAMPLES).sort(), LIBRARY.map((l) => l.name).sort());
	for (const l of LIBRARY) {
		const re = new RegExp(l.pattern), [yes, no] = SAMPLES[l.name];
		assert.ok(re.test(yes), l.name + " should match " + yes);
		assert.ok(!re.test(no), l.name + " should not match " + no);
	}
});
