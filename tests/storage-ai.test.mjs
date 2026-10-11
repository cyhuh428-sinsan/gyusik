// 규식이 - saved patterns (browser storage, untrusted import files) and the AI client (against a local mock server).
import test, {beforeEach, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {savePattern, listPatterns, getPattern, deletePattern, exportJson, importJson} from "../dev/gyusik/saved.js";
import {PROVIDERS, levelsFor, unavailableReason, listModels, askForRegex, buildPrompt, AiError} from "../dev/gyusik/ai.js";

beforeEach(() => { localStorage.clear(); });

const rec = (o) => Object.assign({name: "휴대폰", pattern: "^01\\d$", flags: "g", engine: "js", text: "010", tests: [{text: "010", expect: "match"}], tags: ["전화"]}, o);

test("saved: create, read, update, delete", () => {
	const a = savePattern(rec());
	assert.ok(a.id && a.created);
	assert.equal(getPattern(a.id).name, "휴대폰");
	const b = savePattern(rec({id: a.id, name: "바뀜"}));
	assert.equal(b.id, a.id);
	assert.equal(b.created, a.created);
	assert.equal(listPatterns().length, 1);
	deletePattern(a.id);
	assert.equal(listPatterns().length, 0);
});

test("saved: list is newest first", () => {
	const a = savePattern(rec({name: "A"}));
	const list = JSON.parse(localStorage.getItem("gyusik.saved"));
	list[0].updated = 1;
	localStorage.setItem("gyusik.saved", JSON.stringify(list));
	savePattern(rec({name: "B"}));
	assert.deepEqual(listPatterns().map((p) => p.name), ["B", "A"]);
	assert.ok(a);
});

test("saved: values are normalized when saving", () => {
	const a = savePattern(rec({engine: "weird", tests: [{text: "x", expect: "??"}], tags: [" a ", "", "b"], name: ""}));
	assert.equal(a.engine, "js");
	assert.equal(a.tests[0].expect, "match");
	assert.deepEqual(a.tags, ["a", "b"]);
	assert.equal(a.name, "이름 없는 패턴");
});

test("saved: broken storage does not crash", () => {
	localStorage.setItem("gyusik.saved", "{not json");
	assert.deepEqual(listPatterns(), []);
	localStorage.setItem("gyusik.saved", JSON.stringify({a: 1}));
	assert.deepEqual(listPatterns(), []);
});

test("saved: export then import round-trips, and importing twice adds nothing new", () => {
	savePattern(rec({name: "A"})); savePattern(rec({name: "B", pattern: "x+"}));
	const file = exportJson();
	localStorage.clear();
	assert.deepEqual(importJson(file), {added: 2, skipped: 0, bad: 0});
	assert.deepEqual(importJson(file), {added: 0, skipped: 2, bad: 0});
	assert.equal(listPatterns().length, 2);
});

test("saved: export of chosen ids only", () => {
	const a = savePattern(rec({name: "A"})); savePattern(rec({name: "B", pattern: "x+"}));
	assert.equal(JSON.parse(exportJson([a.id])).patterns.length, 1);
});

test("saved: import rejects files that are not ours", () => {
	assert.ok(importJson("not json").error);
	assert.ok(importJson(JSON.stringify({format: "other", patterns: []})).error);
	assert.ok(importJson(JSON.stringify({format: "gyusik-patterns", patterns: "x"})).error);
	assert.ok(importJson(12345).error);
});

test("saved: import cleans hostile content and never keeps unexpected fields", () => {
	const evil = {format: "gyusik-patterns", version: 1, patterns: [
		{name: "<img src=x onerror=alert(1)>", pattern: "a+", flags: "gg<>", engine: "js", text: "", tests: [], tags: ["<b>"], __proto__: {polluted: 1}, extra: "x"},
		{name: "no pattern"},
		null,
		{name: "long", pattern: "a".repeat(6000)}
	]};
	const r = importJson(JSON.stringify(evil));
	assert.equal(r.added, 1);
	assert.ok(r.bad >= 2);
	const [p] = listPatterns();
	assert.ok(!/[<>]/.test(p.flags));
	assert.equal(p.extra, undefined);
	assert.equal({}.polluted, undefined);
});

// ---- AI client ------------------------------------------------------------------------------------------------------

test("ai: providers list covers the agreed set with valid protocols", () => {
	const ids = PROVIDERS.map((p) => p.id);
	for (const id of ["claude", "openai", "gemini", "upstage", "omniroute", "mediabridge", "openrouter", "custom"]) { assert.ok(ids.includes(id), id); }
	for (const p of PROVIDERS) { assert.ok(["openai", "anthropic"].includes(p.protocol), p.id); }
});

test("ai: reasoning levels depend on the protocol", () => {
	assert.ok(levelsFor("anthropic").length > 0);
	assert.ok(levelsFor("openai").length > 0);
});

test("ai: unavailableReason explains each missing piece", () => {
	const ok = {base: "https://x.test", model: "m", key: "k", provider: "custom", protocol: "openai", block: false};
	assert.equal(unavailableReason(ok), "");
	assert.match(unavailableReason({...ok, block: true}), /외부 통신이 꺼져/);
	assert.match(unavailableReason({...ok, base: ""}), /서버 주소/);
	assert.match(unavailableReason({...ok, model: ""}), /모델/);
	assert.match(unavailableReason({...ok, key: ""}), /API 키/);
});

test("ai: prompt carries the engine, the request and the examples", () => {
	const p = buildPrompt("전화번호", "pcre", ["010-1"], ["abc"]);
	assert.match(p, /PCRE2/); assert.match(p, /전화번호/); assert.match(p, /- 010-1/); assert.match(p, /- abc/);
	assert.match(buildPrompt("x", "js", [], []), /JavaScript/);
});

let last, reply = {status: 200, body: {}};
const server = http.createServer((req, res) => {
	let body = ""; req.on("data", (c) => body += c);
	req.on("end", () => { last = {url: req.url, method: req.method, headers: req.headers, body: body ? JSON.parse(body) : null}; res.writeHead(reply.status, {"content-type": "application/json"}); res.end(typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body)); });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
after(() => server.close());

test("ai: Anthropic-compatible request and answer", async () => {
	reply = {status: 200, body: {content: [{type: "text", text: "```json\n{\"pattern\":\"^\\\\d+$\",\"flags\":\"\",\"explanation_ko\":\"숫자만\"}\n```"}]}};
	const r = await askForRegex({base, protocol: "anthropic", key: "sk-ant", model: "claude-x", effort: "high"}, "숫자만", "js", [], []);
	assert.equal(last.url, "/v1/messages");
	assert.equal(last.headers["x-api-key"], "sk-ant");
	assert.ok(last.headers["anthropic-version"]);
	assert.equal(last.body.model, "claude-x");
	assert.deepEqual(last.body.output_config, {effort: "high"});
	assert.deepEqual(r, {pattern: "^\\d+$", flags: "", explanation: "숫자만", model: "claude-x"});
});

test("ai: OpenAI-compatible request and answer", async () => {
	reply = {status: 200, body: {choices: [{message: {content: "{\"pattern\":\"a+\",\"flags\":\"g\",\"explanation_ko\":\"a 반복\"}"}}]}};
	const r = await askForRegex({base: base + "/v1/", protocol: "openai", key: "sk-oa", model: "gpt-x", effort: ""}, "a", "js", ["a"], []);
	assert.equal(last.url, "/v1/chat/completions");
	assert.equal(last.headers.authorization, "Bearer sk-oa");
	assert.equal(last.body.reasoning_effort, undefined);
	assert.equal(last.body.messages[0].role, "system");
	assert.equal(r.pattern, "a+");
});

test("ai: key is optional for providers that do not need one", async () => {
	reply = {status: 200, body: {choices: [{message: {content: "{\"pattern\":\"b\"}"}}]}};
	await askForRegex({base, protocol: "openai", key: "", model: "m"}, "b", "js", [], []);
	assert.equal(last.headers.authorization, undefined);
});

test("ai: model list from both protocols is cleaned and sorted", async () => {
	reply = {status: 200, body: {data: [{id: "models/b"}, {id: "a"}, "c"]}};
	assert.deepEqual(await listModels({base, protocol: "openai", key: "k"}), ["a", "b", "c"]);
	assert.equal(last.url, "/models");
	await listModels({base, protocol: "anthropic", key: "k"});
	assert.match(last.url, /^\/v1\/models/);
});

test("ai: errors are explained in Korean and never leak the key", async () => {
	const s = {base, protocol: "openai", key: "sk-SECRET", model: "m"};
	for (const [status, re] of [[401, /키가 올바르지 않거나/], [404, /찾을 수 없습니다/], [429, /한도/], [500, /서버 오류 \(500\)/]]) {
		reply = {status, body: {error: {message: "boom"}}};
		await assert.rejects(() => askForRegex(s, "x", "js", [], []), (e) => e instanceof AiError && re.test(e.message) && !e.message.includes("sk-SECRET"));
	}
});

test("ai: unusable answers are rejected with a clear message", async () => {
	const s = {base, protocol: "openai", key: "k", model: "m"};
	for (const [content, re] of [["그냥 말만 합니다", /찾지 못했습니다/], ["{\"pattern\": }", /해석하지 못했습니다/], ["{\"flags\":\"g\"}", /pattern이 없습니다/]]) {
		reply = {status: 200, body: {choices: [{message: {content}}]}};
		await assert.rejects(() => askForRegex(s, "x", "js", [], []), (e) => e instanceof AiError && re.test(e.message));
	}
	reply = {status: 200, body: "not json at all"};
	await assert.rejects(() => askForRegex(s, "x", "js", [], []), /해석하지 못했습니다/);
});

test("ai: a refusal from the model is reported", async () => {
	reply = {status: 200, body: {stop_reason: "refusal", content: []}};
	await assert.rejects(() => askForRegex({base, protocol: "anthropic", key: "k", model: "m"}, "x", "js", [], []), /답하지 않았습니다/);
});

test("ai: an unreachable server gives the connection message", async () => {
	await assert.rejects(() => askForRegex({base: "http://127.0.0.1:9", protocol: "openai", key: "k", model: "m"}, "x", "js", [], []), /서버에 연결하지 못했습니다/);
});
