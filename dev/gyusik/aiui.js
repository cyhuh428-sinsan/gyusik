/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

UI for the AI connection: the settings screen and "make from a Korean sentence" (online only).
The AI answer is never trusted: it is compiled, scored against the user's examples on this device,
and run through the same diagnostics as any other pattern before it is shown.
*/

import {PROVIDERS, levelsFor, loadSettings, saveSettings, unavailableReason, listModels, askForRegex, AiError, policy, hasSecureKeyStore, canKeepKey, getStoredKey, registerHost} from "./ai.js";
import {analyze, summary} from "./model.js";
import {diagnose} from "./diagnose.js";

export function initAi(ctx) {
	let $ = ctx.$, esc = ctx.esc, s = loadSettings();

	// ---------- settings ----------

	let prov = $("setProvider");
	PROVIDERS.forEach((p) => { let o = document.createElement("option"); o.value = p.id; o.textContent = p.name; prov.appendChild(o); });

	function fillEffort() {
		let sel = $("setEffort");
		sel.textContent = "";
		levelsFor(s.protocol).forEach((l) => { let o = document.createElement("option"); o.value = l.id; o.textContent = l.ko + (l.id ? " (" + l.id + ")" : ""); sel.appendChild(o); });
		if (!levelsFor(s.protocol).some((l) => l.id === s.effort)) { s.effort = ""; }
		sel.value = s.effort;
		$("setEffortNote").textContent = s.protocol === "openai" ? "OpenAI 호환 방식은 낮음·보통·높음만 보낼 수 있습니다. 모델이 지원하지 않으면 '자동'을 고르세요." : "Anthropic 호환 방식은 모델이 지원하는 등급을 그대로 보냅니다. 오류가 나면 '자동'을 고르세요.";
	}

	function paintSettings() {
		let p = PROVIDERS.find((x) => x.id === s.provider) || PROVIDERS[0];
		prov.value = p.id;
		$("setProtocol").value = s.protocol;
		$("setProtocol").disabled = !p.custom;
		$("setBase").value = s.base;
		$("setKey").value = s.key || "";
		$("setSaveKey").checked = !!s.saveKey;
		$("setModel").value = s.model;
		$("setBlock").checked = !!s.block;
		$("setBlock").disabled = !!policy.blockExternal; // set by the administrator policy, not changeable here
		["setProvider", "setProtocol", "setBase", "setKey", "setSaveKey", "setModel", "setEffort", "setCheck"].forEach((id) => { $(id).disabled = !!s.block || (id === "setProtocol" && !p.custom); });
		fillEffort();
		$("setKey").placeholder = p.keyOptional ? "(없어도 됩니다)" : "";
	}

	function commit() { saveSettings(s); paintNl(); }

	prov.onchange = () => {
		let p = PROVIDERS.find((x) => x.id === prov.value);
		s.provider = p.id;
		s.protocol = p.protocol;
		if (!p.custom) { s.base = p.base; }
		s.model = p.model;
		$("setModels").textContent = "";
		$("setStatus").textContent = "";
		paintSettings();
		commit();
	};
	$("setProtocol").onchange = () => { s.protocol = $("setProtocol").value; fillEffort(); commit(); };
	$("setBase").oninput = () => { s.base = $("setBase").value.trim(); commit(); };
	$("setKey").oninput = () => { s.key = $("setKey").value.trim(); commit(); };
	$("setSaveKey").onchange = () => { s.saveKey = $("setSaveKey").checked; commit(); };
	$("setModel").oninput = () => { s.model = $("setModel").value.trim(); commit(); };
	$("setEffort").onchange = () => { s.effort = $("setEffort").value; commit(); };
	$("setBlock").onchange = () => { s.block = $("setBlock").checked; paintSettings(); commit(); };
	$("setCheck").onclick = async () => {
		let st = $("setStatus");
		let why = unavailableReason(Object.assign({}, s, {model: s.model || "-"}));
		if (why) { st.textContent = why; return; }
		st.textContent = "확인 중…";
		try {
			let list = await listModels(s);
			let dl = $("setModels");
			dl.textContent = "";
			list.forEach((id) => { let o = document.createElement("option"); o.value = id; dl.appendChild(o); });
			st.textContent = "연결됨 · 모델 " + list.length + "개";
		} catch (e) { st.textContent = e instanceof AiError ? e.message : "연결 확인에 실패했습니다."; }
	};

	// ---------- sentence -> regex ----------

	function paintNl() {
		let p = PROVIDERS.find((x) => x.id === s.provider);
		let why = unavailableReason(s), warn = $("nlWarn");
		$("nlModel").textContent = (p ? p.name : "") + " · " + (s.model || "모델 미선택") + " · 추론 " + (levelsFor(s.protocol).find((l) => l.id === s.effort) || {ko: "자동"}).ko;
		warn.hidden = !why;
		warn.innerHTML = why ? "<span>" + esc(why) + " 이 기능을 쓸 수 없는 동안에는 <b>예시로 만들기</b>를 쓰세요.</span><button type=\"button\" id=\"nlToEx\">예시로 만들기</button>" : "";
		if (why) { $("nlToEx").onclick = ctx.showExamples; }
		$("nlGo").disabled = !!why;
		let host = "";
		try { host = new URL(s.base).host; } catch (e) { host = s.base; }
		$("nlSend").textContent = "보내는 내용: 문장, 엔진 이름, 예시 " + ctx.exampleCount() + "개 → " + host + ". 테스트 텍스트와 저장한 패턴은 보내지 않습니다.";
	}

	function cardHtml(r, st, flags) {
		let pos = ctx.lines($("mkPos")), neg = ctx.lines($("mkNeg"));
		let ok = null, missed = [], leaked = [];
		if (st.engine === "js") {
			try {
				let re = new RegExp(r.pattern, flags.replace(/[gy]/g, ""));
				missed = pos.filter((x) => !re.test(x));
				leaked = neg.filter((x) => re.test(x));
				ok = {pass: pos.length + neg.length - missed.length - leaked.length, total: pos.length + neg.length};
			} catch (e) { return "<div class=\"cand\"><div class=\"hd\"><span class=\"chip ai\">AI</span><b>" + esc(s.model) + "</b></div><pre>" + esc(r.pattern) + "</pre><p class=\"bad\">이 엔진에서 해석되지 않는 패턴입니다: " + esc(e.message) + "</p></div>"; }
		}
		let model = analyze(r.pattern, flags, st.engine);
		let warns = diagnose(model, {}, st.engine).filter((d) => d.level !== "tip");
		let hasErr = model.errors.some((e) => !e.warning);
		let line = ok ? "<span class=\"" + (ok.pass === ok.total ? "ok" : "bad") + "\">기기에서 검증: " + (ok.pass === ok.total ? "예시 " + ok.total + "개 모두 통과" : ok.pass + "/" + ok.total + " 통과") + "</span>" : "<span class=\"src\">예시 검증은 JavaScript 엔진에서만 합니다. 작업대에서 확인하세요.</span>";
		let fails = (missed.length ? "일치해야 하는데 안 된 예: " + missed.map((x) => "\"" + esc(x) + "\"").join(", ") : "") + (leaked.length ? " 일치하면 안 되는데 된 예: " + leaked.map((x) => "\"" + esc(x) + "\"").join(", ") : "");
		return "<div class=\"cand" + (ok && ok.pass === ok.total && !hasErr ? " best" : "") + "\"><div class=\"hd\"><span class=\"chip ai\">AI</span><b>" + esc(s.model) + "</b><span class=\"src\">한국어 문장에서 생성</span></div>" +
			"<pre>" + esc(r.pattern) + (flags ? "  /" + esc(flags) : "") + "</pre>" + (r.explanation ? "<p>" + esc(r.explanation) + "</p>" : "") +
			"<p>" + esc(summary(model, {})) + "</p>" +
			(warns.length || hasErr ? "<div class=\"warns\">" + (hasErr ? "<p>문법 오류가 있습니다. 작업대에서 확인하세요.</p>" : "") + warns.map((d) => "<p>" + esc(d.title) + ": " + esc(d.how) + "</p>").join("") + "</div>" : "") +
			(fails ? "<p class=\"src\">" + fails + "</p>" : "") +
			"<div class=\"ft\">" + line + "<button type=\"button\" class=\"send\">작업대로 보내기</button></div></div>";
	}

	$("nlGo").onclick = async () => {
		let sentence = $("nlSentence").value.trim(), st = ctx.getState(), status = $("nlStatus");
		if (!sentence) { status.textContent = "문장을 먼저 쓰세요."; return; }
		let why = unavailableReason(s);
		if (why) { paintNl(); return; }
		status.textContent = "만드는 중…";
		$("nlGo").disabled = true;
		try {
			let r = await askForRegex(s, sentence, st.engine, ctx.lines($("mkPos")), ctx.lines($("mkNeg")));
			let flags = st.engine === "js" ? r.flags.split("").filter((c, i, a) => "gimsuy".indexOf(c) !== -1 && a.indexOf(c) === i).join("") : r.flags.split("").filter((c, i, a) => "gimsx".indexOf(c) !== -1 && a.indexOf(c) === i).join("");
			let host = $("mkList");
			let first = host.querySelector(".empty");
			if (first) { host.textContent = ""; }
			host.insertAdjacentHTML("afterbegin", cardHtml(r, st, flags));
			host.firstElementChild.querySelector(".send").onclick = () => ctx.sendToBench(r.pattern, flags);
			$("mkCount").textContent = "후보 " + host.querySelectorAll(".cand").length + "개";
			status.textContent = "";
		} catch (e) {
			status.textContent = e instanceof AiError ? e.message : "AI 호출에 실패했습니다.";
		}
		$("nlGo").disabled = !!unavailableReason(s);
	};
	$("nlToSettings").onclick = ctx.showSettings;
	window.addEventListener("online", paintNl);
	window.addEventListener("offline", paintNl);

	{
		let hint = $("setSaveKey").parentElement.querySelector(".hint");
		if (hasSecureKeyStore) { hint.textContent = "Windows 사용자 계정에 암호화되어 저장됩니다. 끄면 앱을 닫을 때까지만 기억합니다."; }
		else if (canKeepKey) { hint.textContent = "이 브라우저에 암호화해 저장합니다. 같은 브라우저 계정을 쓰는 사람은 이 키를 쓸 수 있으니 공용 PC에서는 끄세요. 끄면 탭을 닫을 때까지만 기억합니다."; }
		else { hint.textContent = "이 주소(http)에서는 브라우저가 암호화 저장을 지원하지 않아 저장하지 않습니다. https 또는 설치형 앱에서 사용하세요. 이번 탭을 닫을 때까지만 기억합니다."; $("setSaveKey").disabled = true; }
		getStoredKey().then((k) => { if (k && !s.key) { s.key = k; s.saveKey = true; paintSettings(); paintNl(); } });
	}
	if (policy.blockExternal) { $("setBlock").parentElement.querySelector(".hint").textContent = "관리자 정책(" + (window.gyusikHost.info.policy.source || "policy.json") + ")으로 켜져 있어 바꿀 수 없습니다."; }
	registerHost(s);
	paintSettings();
	paintNl();
	return {refresh: paintNl, settings: () => s};
}
