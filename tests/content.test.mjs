// 규식이 - lessons and reference: every lesson answer must pass its own checks, and every cross-link must exist.
import test from "node:test";
import assert from "node:assert/strict";
import {LESSONS} from "../dev/gyusik/lessons.js";
import {REF_GROUPS, lessonFor} from "../dev/gyusik/reference.js";
import {analyze, explainRows} from "../dev/gyusik/model.js";

// same rule as the lesson screen: "found" = the first match must be exactly that text, otherwise just match / no match
function grade(re, c) {
	const m = re.exec(c.text);
	if (c.found !== undefined) { return !!m && m[0] === c.found; }
	return !!m === c.expect;
}

test("lessons: 11 lessons, 29 tasks, unique ids", () => {
	assert.equal(LESSONS.length, 11);
	const ids = LESSONS.flatMap((l) => l.tasks.map((t) => t.id));
	assert.equal(ids.length, 29);
	assert.equal(new Set(ids).size, ids.length);
	assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
});

test("lessons: each lesson has the parts the screen needs", () => {
	for (const l of LESSONS) {
		assert.ok(l.title && l.term && l.next, l.id);
		assert.ok(l.body.length > 0 && l.examples.length > 0 && l.tasks.length > 0, l.id);
		for (const t of l.tasks) {
			assert.ok(t.prompt && t.hint && t.solution, t.id);
			assert.ok(t.cases.some((c) => c.expect), t.id + " needs a case that must be found");
			assert.ok(t.cases.some((c) => !c.expect || c.found !== undefined), t.id + " needs a case that must be skipped, or an exact-text check");
		}
	}
});

test("lessons: every task's own solution passes every one of its cases", () => {
	for (const l of LESSONS) {
		for (const t of l.tasks) {
			const re = new RegExp(t.solution);
			for (const c of t.cases) { assert.ok(grade(re, c), t.id + ": " + t.solution + " vs " + JSON.stringify(c.text)); }
			if (t.must) { assert.ok(new RegExp(t.must.re).test(t.solution), t.id + " solution must satisfy its 'must' rule"); }
		}
	}
});

test("lessons: tasks cannot be passed by an empty or a match-everything pattern", () => {
	for (const l of LESSONS) {
		for (const t of l.tasks) {
			for (const lazy of ["", ".*", "[\\s\\S]*"]) {
				const re = new RegExp(lazy);
				assert.ok(!t.cases.every((c) => grade(re, c)), t.id + " passes with " + JSON.stringify(lazy));
			}
		}
	}
});

test("lessons: example patterns are valid and error-free", () => {
	for (const l of LESSONS) {
		for (const e of l.examples) { // a warning such as "unescaped /" is fine here: lesson patterns are not written inside /…/
			assert.deepEqual(analyze(e.pattern, "", "js").errors.filter((x) => !x.warning), [], l.id + ": " + e.pattern); }
	}
});

test("reference: entries are complete and their examples parse", () => {
	let n = 0;
	for (const g of REF_GROUPS) {
		for (const it of g.items) {
			n++;
			assert.ok(it.name && it.desc, g.id + "/" + (it.s || it.name));
		}
	}
	assert.ok(n >= 40, "reference has " + n + " entries");
});

test("reference: every lesson link points to a real lesson", () => {
	const ids = new Set(LESSONS.map((l) => l.id));
	for (const g of REF_GROUPS) { for (const it of g.items) { if (it.lesson) { assert.ok(ids.has(it.lesson), it.name + " -> " + it.lesson); } } }
	for (const [kind, type, gtype] of [["lit"], ["set"], ["quant"], ["group", "", "lookahead"], ["group", "", "atomic"], ["group", "", "capture"], ["leaf", "dot"], ["leaf", "digit"], ["leaf", "bof"], ["leaf", "numref"]]) {
		const l = lessonFor(kind, type, gtype);
		assert.ok(l && ids.has(l), kind + "/" + type + " -> " + l);
	}
});

test("explanation rows link to lessons that exist", () => {
	const ids = new Set(LESSONS.map((l) => l.id));
	const rows = explainRows(analyze("^(a|b)+\\d{2,3}[xyz](?=q)$", "", "js"), {});
	assert.ok(rows.length > 5);
	for (const r of rows) { if (r.lesson) { assert.ok(ids.has(r.lesson), r.code + " -> " + r.lesson); } }
});
