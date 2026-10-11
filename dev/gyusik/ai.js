/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Direct AI connection for "make a regex from a Korean sentence" (online only).
Two protocols: OpenAI-compatible (/chat/completions) and Anthropic-compatible (/v1/messages).
The only thing sent is what the user typed (sentence, engine, example strings), never the test text or saved patterns.
Nothing here runs unless the user presses the button, and never when external traffic is blocked.
*/

export const PROVIDERS = [
	{id: "claude", name: "Claude", protocol: "anthropic", base: "https://api.anthropic.com", model: "claude-sonnet-5-5"},
	{id: "openai", name: "OpenAI", protocol: "openai", base: "https://api.openai.com/v1", model: ""},
	{id: "gemini", name: "Gemini", protocol: "openai", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: ""},
	{id: "upstage", name: "Upstage", protocol: "openai", base: "https://api.upstage.ai/v1", model: "solar-pro4"},
	{id: "openrouter", name: "OpenRouter", protocol: "openai", base: "https://openrouter.ai/api/v1", model: ""},
	{id: "omniroute", name: "OmniRoute", protocol: "openai", base: "https://omniroute.sinsan.kr/v1", model: ""},
	{id: "mediabridge", name: "Media Bridge", protocol: "openai", base: "https://media-bridge.sinsan.kr/v1", model: "", keyOptional: true},
	{id: "custom", name: "직접 추가", protocol: "openai", base: "", model: "", custom: true}
];

/** Reasoning levels shown in Korean with the raw value. OpenAI-compatible APIs only take low/medium/high. */
export const LEVELS = [
	{id: "", ko: "자동 (제공자 기본값)", protocols: ["openai", "anthropic"]},
	{id: "low", ko: "낮음", protocols: ["openai", "anthropic"]},
	{id: "medium", ko: "보통", protocols: ["openai", "anthropic"]},
	{id: "high", ko: "높음", protocols: ["openai", "anthropic"]},
	{id: "xhigh", ko: "매우 높음", protocols: ["anthropic"]},
	{id: "max", ko: "최고", protocols: ["anthropic"]}
];

const SETTINGS_KEY = "gyusik.ai", KEY_KEY = "gyusik.ai.key";

// Inside the installed (Electron) app the preload script provides window.gyusikHost: the administrator
// policy, and key storage encrypted with the Windows credential store. In a browser both are absent.
const host = typeof window !== "undefined" ? window.gyusikHost : null;
export const policy = (host && host.info && host.info.policy) || {blockExternal: false, allowedHosts: null};
export const hasSecureKeyStore = !!(host && host.getKey);
/** Installed app: tell it which single AI server may be contacted (everything else stays blocked). */
export function registerHost(s) {
	if (!host || !host.allowHost) { return; }
	let h = "";
	try { h = new URL(s.base).host; } catch (e) {}
	host.allowHost(h);
}
export const getStoredKey = () => (hasSecureKeyStore ? host.getKey() : Promise.resolve(""));
const DEFAULTS = {provider: "claude", protocol: "anthropic", base: "https://api.anthropic.com", model: "claude-sonnet-5-5", effort: "", saveKey: false, block: false};
let sessionKey = "";

export function loadSettings() {
	let s = {};
	try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {}; } catch (e) {}
	s = Object.assign({}, DEFAULTS, s);
	let key = sessionKey;
	if (!hasSecureKeyStore) { try { key = key || localStorage.getItem(KEY_KEY) || ""; } catch (e) {} }
	s.key = key;
	if (policy.blockExternal) { s.block = true; } // the administrator's switch cannot be turned off by the user
	return s;
}

export function saveSettings(s) {
	let copy = Object.assign({}, s);
	delete copy.key;
	sessionKey = s.key || "";
	registerHost(s);
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(copy));
		if (hasSecureKeyStore) { host.setKey(s.saveKey ? s.key : ""); localStorage.removeItem(KEY_KEY); }
		else if (s.saveKey && s.key) { localStorage.setItem(KEY_KEY, s.key); } else { localStorage.removeItem(KEY_KEY); }
	} catch (e) {}
}

export function levelsFor(protocol) { return LEVELS.filter((l) => l.protocols.indexOf(protocol) !== -1); }

/** Why the AI can't be used right now, or "" when it can. */
export function unavailableReason(s) {
	if (s.block || policy.blockExternal) { return policy.blockExternal ? "관리자 정책으로 외부 통신이 꺼져 있습니다." : "관리자 설정으로 외부 통신이 꺼져 있습니다."; }
	if (Array.isArray(policy.allowedHosts)) {
		let h = ""; try { h = new URL(s.base).host.toLowerCase(); } catch (e) {}
		if (!policy.allowedHosts.includes(h)) { return "관리자 정책이 허용하지 않은 서버입니다. 허용된 서버: " + (policy.allowedHosts.join(", ") || "없음"); }
	}
	if (typeof navigator !== "undefined" && navigator.onLine === false) { return "인터넷에 연결되지 않았습니다."; }
	if (!s.base) { return "설정에서 AI 서버 주소를 입력하세요."; }
	if (!s.model) { return "설정에서 모델을 고르세요."; }
	let p = PROVIDERS.find((x) => x.id === s.provider);
	if (!s.key && !(p && p.keyOptional)) { return "설정에서 API 키를 입력하세요."; }
	return "";
}

const trimBase = (b) => b.replace(/\/+$/, "");

function headers(s) {
	if (s.protocol === "anthropic") {
		return {"content-type": "application/json", "x-api-key": s.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true"};
	}
	let h = {"content-type": "application/json"};
	if (s.key) { h.authorization = "Bearer " + s.key; }
	return h;
}

export class AiError extends Error {}

function explain(e, status, body) {
	if (e) {
		if (e.name === "AbortError") { return "응답이 너무 오래 걸려 중단했습니다."; }
		return "서버에 연결하지 못했습니다. 인터넷, 주소를 확인하세요. 설치형이 아닌 웹 화면에서는 서버가 브라우저의 직접 호출(CORS)을 허용하지 않아도 이렇게 보입니다.";
	}
	let detail = "";
	try { let j = JSON.parse(body); detail = (j.error && (j.error.message || j.error)) || j.message || ""; } catch (x) { detail = (body || "").slice(0, 200); }
	if (typeof detail !== "string") { detail = JSON.stringify(detail); }
	if (status === 401 || status === 403) { return "키가 올바르지 않거나 권한이 없습니다. (" + status + ")"; }
	if (status === 404) { return "주소나 모델 이름을 찾을 수 없습니다. (404) " + detail; }
	if (status === 429) { return "사용 한도를 넘었습니다. 잠시 뒤에 다시 시도하세요. (429)"; }
	return "서버 오류 (" + status + ") " + detail;
}

async function call(url, init, timeout) {
	let ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeout || 60000), res;
	try { res = await fetch(url, Object.assign({signal: ctl.signal}, init)); }
	catch (e) { throw new AiError(explain(e)); }
	finally { clearTimeout(timer); }
	let body = await res.text();
	if (!res.ok) { throw new AiError(explain(null, res.status, body)); }
	try { return JSON.parse(body); } catch (e) { throw new AiError("서버 응답을 해석하지 못했습니다."); }
}

/** Lists model ids from the server. */
export async function listModels(s) {
	let url = trimBase(s.base) + (s.protocol === "anthropic" ? "/v1/models?limit=100" : "/models");
	let j = await call(url, {method: "GET", headers: headers(s)}, 20000);
	let list = (j.data || j.models || []).map((m) => (typeof m === "string" ? m : m.id || m.name)).filter(Boolean);
	return list.map((id) => String(id).replace(/^models\//, "")).sort();
}

const SYSTEM = "You write regular expressions for a regex tool. Reply with ONLY one JSON object and nothing else: " +
	"{\"pattern\": string, \"flags\": string, \"explanation_ko\": string}. " +
	"Rules: pattern has no enclosing slashes; use the syntax of the engine named by the user; flags use only the letters the engine allows; " +
	"add ^ and $ when the request is about validating a whole value; avoid nested unbounded quantifiers like (a+)+; " +
	"explanation_ko is one short Korean sentence. If the request cannot be expressed as a regex, still return the closest pattern and say so in explanation_ko.";

export function buildPrompt(sentence, engine, pos, neg) {
	let lines = ["엔진: " + (engine === "pcre" ? "PCRE2" : "JavaScript RegExp (허용 플래그: gimsuy)"), "요청: " + sentence];
	if (pos.length) { lines.push("일치해야 하는 예시:", ...pos.map((x) => "- " + x)); }
	if (neg.length) { lines.push("일치하면 안 되는 예시:", ...neg.map((x) => "- " + x)); }
	return lines.join("\n");
}

function extractJson(text) {
	let t = String(text).replace(/```(?:json)?/gi, "");
	let a = t.indexOf("{"), b = t.lastIndexOf("}");
	if (a === -1 || b <= a) { throw new AiError("AI 응답에서 정규식을 찾지 못했습니다."); }
	let o;
	try { o = JSON.parse(t.slice(a, b + 1)); } catch (e) { throw new AiError("AI 응답을 해석하지 못했습니다."); }
	if (!o || typeof o.pattern !== "string" || !o.pattern) { throw new AiError("AI 응답에 pattern이 없습니다."); }
	return {pattern: o.pattern, flags: typeof o.flags === "string" ? o.flags : "", explanation: typeof o.explanation_ko === "string" ? o.explanation_ko : ""};
}

/** Asks the model. Returns {pattern, flags, explanation, model}. */
export async function askForRegex(s, sentence, engine, pos, neg) {
	let user = buildPrompt(sentence, engine, pos, neg), base = trimBase(s.base), text;
	if (s.protocol === "anthropic") {
		let body = {model: s.model, max_tokens: 4096, system: SYSTEM, messages: [{role: "user", content: user}]};
		if (s.effort) { body.output_config = {effort: s.effort}; }
		let j = await call(base + "/v1/messages", {method: "POST", headers: headers(s), body: JSON.stringify(body)});
		text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
		if (j.stop_reason === "refusal") { throw new AiError("모델이 이 요청에 답하지 않았습니다."); }
	} else {
		let body = {model: s.model, messages: [{role: "system", content: SYSTEM}, {role: "user", content: user}]};
		if (s.effort) { body.reasoning_effort = s.effort; }
		let j = await call(base + "/chat/completions", {method: "POST", headers: headers(s), body: JSON.stringify(body)});
		text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
	}
	let r = extractJson(text || "");
	r.model = s.model;
	return r;
}
