/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Rule-based diagnostics and suggestions. No network and no AI: everything runs on the pattern tree.
Each item: {level: "error"|"warn"|"tip", title, why, how, fix?, i?, end?}
  fix = {label, pattern?: newPattern, flags?: newFlags} - applying it replaces the pattern / flags.
Messages follow "what is wrong / why / how to fix".
*/

const ERRORS_KO = {
	groupopen: ["여는 괄호 ( 가 닫히지 않았습니다", "짝이 되는 닫는 괄호 ) 가 없습니다.", "닫는 괄호 )를 추가하세요."],
	groupclose: ["닫는 괄호 ) 에 짝이 없습니다", "여는 괄호 ( 없이 닫는 괄호가 나왔습니다.", "괄호를 지우거나, 글자 )를 찾으려면 \\) 로 쓰세요."],
	setopen: ["대괄호 [ 가 닫히지 않았습니다", "문자 집합을 닫는 ] 가 없습니다.", "닫는 대괄호 ]를 추가하세요."],
	rangerev: ["범위가 거꾸로 되어 있습니다", "범위의 앞 글자가 뒤 글자보다 뒤에 있습니다. (예: z-a)", "앞뒤를 바꿔 a-z 처럼 쓰세요."],
	quanttarg: ["반복 기호를 붙일 대상이 없습니다", "*, +, ?, {n} 은 앞에 있는 글자나 묶음을 반복시키는데, 앞에 반복할 것이 없습니다.", "반복할 글자를 앞에 두거나, 기호 자체를 찾으려면 \\* 처럼 쓰세요."],
	quantrev: ["반복 횟수의 최소가 최대보다 큽니다", "{3,1} 처럼 앞 숫자가 뒤 숫자보다 큽니다.", "{1,3} 처럼 작은 수를 앞에 쓰세요."],
	esccharopen: ["역슬래시 \\ 뒤에 아무것도 없습니다", "\\ 는 다음 글자와 함께 쓰는 기호입니다.", "역슬래시 자체를 찾으려면 \\\\ 로 쓰세요."],
	esccharbad: ["알 수 없는 이스케이프입니다", "\\ 뒤의 글자가 이 엔진에서 의미를 가지지 않습니다.", "엔진 설명서의 이스케이프 목록을 확인하세요."],
	unicodebad: ["알 수 없는 유니코드 분류입니다", "\\p{...} 안의 이름을 찾을 수 없습니다.", "\\p{L}(글자), \\p{Nd}(숫자) 같은 올바른 이름을 쓰세요."],
	unmatchedref: ["없는 그룹을 가리킵니다", "역참조가 가리키는 그룹이 패턴에 없습니다.", "그룹 번호나 이름을 확인하세요."],
	badname: ["그룹 이름이 숫자로 시작합니다", "그룹 이름은 숫자로 시작할 수 없습니다.", "(?<year>...) 처럼 글자로 시작하게 바꾸세요."],
	dupname: ["그룹 이름이 겹칩니다", "같은 이름의 그룹이 둘 이상입니다.", "이름을 서로 다르게 바꾸세요."],
	notsupported: ["이 엔진이 지원하지 않는 문법입니다", "선택한 엔진(JavaScript 또는 PCRE2)에서는 이 표기를 쓸 수 없습니다.", "엔진을 바꾸거나 다른 표기로 바꾸세요."],
	fwdslash: ["이스케이프하지 않은 슬래시가 있습니다", "이 화면에서는 문제없지만, 코드에 /패턴/ 형식으로 붙여 넣으면 슬래시가 패턴의 끝으로 해석됩니다.", "코드 리터럴로 쓸 때는 \\/ 로 쓰세요."],
	jsfuture: ["일부 브라우저에서 지원하지 않을 수 있는 문법입니다", "아직 모든 브라우저가 지원하지 않는 기능입니다.", "배포 대상 브라우저에서 동작하는지 확인하세요."],
	extraelse: ["조건 그룹에 else가 둘 이상입니다", "(?(조건)가|나) 에서 | 는 한 번만 쓸 수 있습니다.", "| 를 하나만 남기세요."]
};

function walk(alt, visit, parents) {
	parents = parents || [];
	visit(alt, parents);
	alt.branches.forEach((b) => b.items.forEach((it) => {
		visit(it, parents.concat([alt]));
		if (it.kind === "group") { walk(it.body, visit, parents.concat([alt, it])); }
		if (it.kind === "quant" && it.node.kind === "group") { walk(it.node.body, visit, parents.concat([alt, it, it.node])); }
	}));
}

function replaceRange(pattern, i, end, text) { return pattern.substring(0, i) + text + pattern.substring(end); }

export function diagnose(model, flagMap, engine) {
	let out = [], pattern = model.pattern, flagStr = model.flags;
	if (!pattern) { return out; }

	// 1) lexer errors / warnings
	model.errors.forEach((e) => {
		let m = ERRORS_KO[e.id];
		if (!m) { m = [e.id, "엔진이 이 부분을 처리하지 못했습니다.", "해당 부분의 문법을 확인하세요."]; }
		out.push({level: e.warning ? "warn" : "error", title: m[0], why: m[1], how: m[2], i: e.i, end: e.i + e.l});
	});

	let hasBof = false, hasEof = false, anyQuant = false;

	walk(model.ast, (n, parents) => {
		if (n.kind === "leaf") {
			if (n.type === "bof") { hasBof = true; }
			if (n.type === "eof") { hasEof = true; }
		}

		// 2) '.' between literal characters: probably meant a literal dot (www.naver.com)
		if (n.kind === "alt") {
			n.branches.forEach((b) => b.items.forEach((it, k) => {
				let prev = b.items[k - 1], next = b.items[k + 1];
				if (it.kind === "leaf" && it.type === "dot" && prev && next && prev.kind === "lit" && next.kind === "lit" && /[A-Za-z0-9]$/.test(prev.text) && /^[A-Za-z0-9]/.test(next.text)) {
					out.push({level: "warn", title: "점(.)이 아무 글자와 일치합니다", why: "\"" + prev.text + "." + next.text + "\" 의 . 은 점이 아니라 '아무 글자 하나'라서, 점 대신 다른 글자가 와도 일치합니다.", how: "글자 점을 찾으려면 \\. 로 쓰세요.", i: it.i, end: it.end, fix: {label: "\\. 로 바꾸기", pattern: replaceRange(pattern, it.i, it.end, "\\.")}});
				}
			}));
			// 3) alternation precedence: ^a|b$
			if (n.branches.length > 1 && parents.length === 0) {
				let first = n.branches[0].items[0], lastB = n.branches[n.branches.length - 1], last = lastB.items[lastB.items.length - 1];
				if ((first && first.kind === "leaf" && first.type === "bof") || (last && last.kind === "leaf" && last.type === "eof")) {
					let wrapped = "^(?:" + pattern.replace(/^\^/, "").replace(/\$$/, "") + ")$";
					out.push({level: "warn", title: "| 의 범위를 확인하세요", why: "| 는 가장 바깥에서 패턴 전체를 나눕니다. ^a|b$ 는 \"a로 시작\" 또는 \"b로 끝남\"으로 해석되고, \"a 또는 b와 전체가 일치\"가 아닙니다.", how: "전체를 묶으세요: ^(?:...|...)$", fix: (first && first.type === "bof" && last && last.type === "eof") ? {label: "^(?:…)$ 로 묶기", pattern: wrapped} : undefined});
				}
			}
		}

		// 4) character set mistakes
		if (n.kind === "set") {
			n.parts.forEach((p) => {
				if (!p.range) { return; }
				if (p.from === "A" && p.to === "z") {
					out.push({level: "warn", title: "[A-z] 범위에 기호가 섞입니다", why: "대문자 Z와 소문자 a 사이에는 [ \\ ] ^ _ ` 같은 기호 6개가 있어서 함께 일치합니다.", how: "A-Za-z 로 쓰세요.", i: n.i, end: n.end, fix: {label: "A-Za-z 로 바꾸기", pattern: replaceRange(pattern, n.i, n.end, pattern.substring(n.i, n.end).replace("A-z", "A-Za-z"))}});
				}
				if (p.from === "가" && p.to.length === 1 && p.to >= "힝" && p.to < "힣") {
					out.push({level: "warn", title: "한글 범위의 끝이 빠졌습니다", why: "완성형 한글의 마지막 글자는 '힣'입니다. 이 범위는 끝쪽 글자 일부(힞~힣)를 놓칩니다.", how: "가-힣 으로 쓰세요.", i: n.i, end: n.end, fix: {label: "가-힣 으로 바꾸기", pattern: replaceRange(pattern, n.i, n.end, pattern.substring(n.i, n.end).replace("가-" + p.to, "가-힣"))}});
				}
				if (p.from === "0" && p.to === "9" && engine === "js" && n.parts.length === 1 && !n.negate) {
					out.push({level: "tip", title: "[0-9] 는 \\d 로 줄일 수 있습니다", why: "JavaScript에서 \\d 는 [0-9] 와 같은 뜻입니다.", how: "\\d 로 쓰면 더 짧고 읽기 쉽습니다.", i: n.i, end: n.end, fix: {label: "\\d 로 바꾸기", pattern: replaceRange(pattern, n.i, n.end, "\\d")}});
				}
			});
		}

		// 5) quantifier hints and catastrophic backtracking
		if (n.kind === "quant") {
			anyQuant = true;
			let suffix = (n.lazy || n.possessive) ? 1 : 0;
			let raw = pattern.substring(n.qi, n.end - suffix); // the quantifier itself, without ? / + after it
			let short = n.min === 1 && n.max === -1 ? "+" : n.min === 0 && n.max === -1 ? "*" : n.min === 0 && n.max === 1 ? "?" : null;
			if (/^\{/.test(raw) && short) {
				out.push({level: "tip", title: raw + " 는 " + short + " 로 줄일 수 있습니다", why: "같은 뜻의 짧은 표기가 있습니다.", how: short + " 로 쓰세요.", i: n.qi, end: n.end, fix: {label: short + " 로 바꾸기", pattern: replaceRange(pattern, n.qi, n.qi + raw.length, short)}});
			}
			if ((n.max === -1 || n.max > 1) && n.node.kind === "group") {
				let inner = false;
				walk(n.node.body, (x) => { if (x.kind === "quant" && (x.max === -1 || x.max > 1)) { inner = true; } });
				if (inner && !n.possessive) {
					out.push({level: "warn", title: "반복 안에 반복이 있어 느려질 수 있습니다", why: "(a+)+ 처럼 반복 안에 반복이 있으면, 일치하지 않는 긴 입력에서 처리 시간이 폭발적으로 늘어납니다(ReDoS).", how: "안쪽과 바깥쪽 반복 중 하나를 없애거나, 같은 뜻의 단순한 패턴(예: a+)으로 바꾸세요. 입력 길이를 제한하는 것도 방법입니다.", i: n.i, end: n.end});
				}
			}
		}
	});

	// 7) no anchors
	if (!hasBof && !hasEof) {
		out.push({level: "tip", title: "시작 ^ 과 끝 $ 이 없습니다", why: "텍스트의 일부분만 맞아도 일치로 처리됩니다. 예를 들어 입력값이 \"abc123-4567xyz\" 여도 통과합니다.", how: "입력값 전체를 검증하려면 ^ 와 $ 로 감싸세요.", fix: {label: "^…$ 로 감싸기", pattern: "^" + pattern + "$"}});
	}

	// 8) multiline flag together with anchors
	if (flagMap.m && (hasBof || hasEof)) {
		out.push({level: "warn", title: "m 플래그가 켜져 있습니다", why: "^ 와 $ 가 줄마다 적용되어, 여러 줄 입력 중 한 줄만 맞아도 통과합니다.", how: "입력값 전체를 검증하려면 m 을 끄세요. 여러 줄을 한꺼번에 시험하려는 것이라면 그대로 두어도 됩니다.", fix: {label: "m 끄기", flags: flagStr.replace("m", "")}});
	}

	// engine hint: PCRE named group syntax in JS
	if (engine === "js" && /\(\?P</.test(pattern)) {
		let i = pattern.indexOf("(?P<");
		out.push({level: "error", title: "(?P<이름>…) 는 JavaScript에서 쓸 수 없습니다", why: "PCRE2·Python 방식의 이름 붙은 그룹 문법입니다.", how: "JavaScript에서는 (?<이름>…) 으로 쓰세요.", i, end: i + 4, fix: {label: "(?<이름> 으로 바꾸기", pattern: pattern.replace(/\(\?P</g, "(?<")}});
	}

	return out;
}

export function sortDiagnostics(list) {
	let rank = {error: 0, warn: 1, tip: 2};
	return list.slice().sort((a, b) => rank[a.level] - rank[b.level]);
}
