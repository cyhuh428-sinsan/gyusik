/*
규식이 (Gyusik) - https://github.com/cyhuh428-sinsan/gyusik
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

"My patterns": saved on this device (browser storage) and exchanged as a .json file.
Files from other people are untrusted: every field is type-checked and size-limited on import,
and an imported pattern is never run until the user opens it.
*/

const KEY = "gyusik.saved";
const FORMAT = "gyusik-patterns";
const MAX = {name: 100, pattern: 5000, text: 200000, tag: 30, tags: 10, testText: 2000, tests: 200, items: 2000};

function readAll() {
	try {
		let a = JSON.parse(localStorage.getItem(KEY) || "[]");
		return Array.isArray(a) ? a : [];
	} catch (e) { return []; }
}

function writeAll(list) {
	try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Newest first. */
export function listPatterns() { return readAll().sort((a, b) => b.updated - a.updated); }

export function getPattern(id) { return readAll().find((p) => p.id === id) || null; }

/** Creates (no id) or updates (id) a record. Returns the saved record, or null if the browser refused to store it. */
export function savePattern(rec) {
	let list = readAll(), now = Date.now();
	let clean = {
		id: rec.id || newId(),
		name: String(rec.name || "이름 없는 패턴").slice(0, MAX.name),
		pattern: String(rec.pattern || ""),
		flags: String(rec.flags || ""),
		engine: rec.engine === "pcre" ? "pcre" : "js",
		text: String(rec.text || ""),
		tests: (rec.tests || []).map((t) => ({text: String(t.text), expect: t.expect === "nomatch" ? "nomatch" : "match"})),
		tags: (rec.tags || []).map((t) => String(t).trim()).filter(Boolean).slice(0, MAX.tags),
		updated: now
	};
	let i = list.findIndex((p) => p.id === clean.id);
	if (i === -1) { clean.created = now; list.push(clean); } else { clean.created = list[i].created || now; list[i] = clean; }
	return writeAll(list) ? clean : null;
}

export function deletePattern(id) { writeAll(readAll().filter((p) => p.id !== id)); }

/** JSON text for a file download: all patterns, or just the given ids. */
export function exportJson(ids) {
	let list = listPatterns().filter((p) => !ids || ids.indexOf(p.id) !== -1);
	return JSON.stringify({format: FORMAT, version: 1, exported: new Date().toISOString(), patterns: list}, null, 2);
}

function sanitize(p) {
	if (!p || typeof p !== "object") { return null; }
	if (typeof p.pattern !== "string" || p.pattern.length > MAX.pattern) { return null; }
	let str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
	let tests = Array.isArray(p.tests) ? p.tests.slice(0, MAX.tests).filter((t) => t && typeof t.text === "string").map((t) => ({text: t.text.slice(0, MAX.testText), expect: t.expect === "nomatch" ? "nomatch" : "match"})) : [];
	let tags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string").map((t) => t.trim().slice(0, MAX.tag)).filter(Boolean).slice(0, MAX.tags) : [];
	let flags = str(p.flags, 10).replace(/[^gimsuyxU]/g, "");
	return {name: str(p.name, MAX.name) || "가져온 패턴", pattern: p.pattern, flags, engine: p.engine === "pcre" ? "pcre" : "js", text: str(p.text, MAX.text), tests, tags};
}

/** Imports a file's text. Returns {added, skipped} or {error}. Duplicates (same name, pattern, flags, engine) are skipped. */
export function importJson(text) {
	let data;
	if (typeof text !== "string" || text.length > 20 * 1024 * 1024) { return {error: "파일이 너무 큽니다."}; }
	try { data = JSON.parse(text); } catch (e) { return {error: "JSON 파일이 아닙니다."}; }
	if (!data || data.format !== FORMAT || !Array.isArray(data.patterns)) { return {error: "규식이에서 내보낸 파일이 아닙니다."}; }
	if (data.patterns.length > MAX.items) { return {error: "패턴이 너무 많습니다 (최대 " + MAX.items + "개)."}; }
	let list = readAll(), added = 0, skipped = 0, bad = 0, now = Date.now();
	data.patterns.forEach((raw) => {
		let c = sanitize(raw);
		if (!c) { bad++; return; }
		if (list.some((x) => x.name === c.name && x.pattern === c.pattern && x.flags === c.flags && x.engine === c.engine)) { skipped++; return; }
		c.id = newId();
		c.created = c.updated = now + added; // keep the file's order when sorted newest first
		list.push(c);
		added++;
	});
	if (added && !writeAll(list)) { return {error: "브라우저 저장 공간이 부족해 저장하지 못했습니다."}; }
	return {added, skipped, bad};
}
