/*
규식이 (Gyusik) - https://github.com/cyhuh428-sinsan/gyusik
Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Korean regex reference / cheat sheet, written from scratch for 규식이.
Each entry: s = what you type, name, desc, ex = [pattern, what it does] (optional),
lesson = id of the lesson that teaches it, js / pcre = false when that engine does not support it
(omitted = supported). Notes about engine differences are in "note".
*/

export const REF_GROUPS = [
	{
		id: "char", title: "글자", items: [
			{s: "abc", name: "글자 그대로", desc: "적은 글자를 순서대로 찾습니다. 대소문자를 구분합니다.", ex: ["고양이", "\"고양이\"라는 글자"], lesson: "l1"},
			{s: ".", name: "아무 글자 하나", desc: "줄바꿈을 뺀 아무 글자 한 개와 일치합니다. s 플래그를 켜면 줄바꿈도 포함합니다.", ex: ["c.t", "cat, cot, cut"], lesson: "l2"},
			{s: "\\.", name: "이스케이프", desc: "특별한 뜻이 있는 기호( . * + ? ( ) [ ] { } | ^ $ \\ )를 글자 그대로 찾으려면 앞에 역슬래시를 붙입니다.", ex: ["3\\.14", "글자 점이 있는 3.14"], lesson: "l2"},
			{s: "\\d  \\D", name: "숫자 / 숫자가 아닌 글자", desc: "\\d 는 숫자 한 글자, 대문자 \\D 는 그 반대입니다.", note: "JavaScript에서 \\d 는 0~9만 뜻합니다. Python은 다른 나라 숫자도 포함합니다.", ex: ["\\d{3}", "숫자 3개"], lesson: "l3"},
			{s: "\\w  \\W", name: "글자·숫자·밑줄", desc: "\\w 는 영문, 숫자, 밑줄(_) 한 글자입니다. 한글은 포함하지 않습니다.", note: "한글까지 포함하려면 [\\w가-힣] 처럼 씁니다.", ex: ["\\w+", "영문 단어"], lesson: "l11"},
			{s: "\\s  \\S", name: "공백 / 공백이 아닌 글자", desc: "\\s 는 스페이스, 탭, 줄바꿈 같은 공백 문자 한 글자입니다.", ex: ["\\s+", "공백 덩어리"], lesson: "l3"},
			{s: "\\n  \\t  \\r", name: "줄바꿈, 탭, 캐리지 리턴", desc: "눈에 보이지 않는 글자를 적는 방법입니다. Windows 줄바꿈은 \\r\\n 입니다.", lesson: "l2"},
			{s: "\\uAC00", name: "유니코드 글자", desc: "코드 번호로 글자를 적습니다. \\uAC00 은 \"가\"입니다.", ex: ["\\uAC00", "가"]},
			{s: "\\p{L}", name: "유니코드 분류", desc: "글자(L), 숫자(N), 구두점(P) 같은 분류로 찾습니다. \\p{Script=Hangul} 은 한글입니다.", note: "JavaScript에서는 u 플래그가 필요합니다.", ex: ["\\p{Script=Hangul}+", "한글 덩어리(u 플래그)"], lesson: "l11"}
		]
	},
	{
		id: "set", title: "문자 집합", items: [
			{s: "[abc]", name: "여러 글자 중 하나", desc: "대괄호 안의 글자 중 한 글자와 일치합니다.", ex: ["[회흰]색", "회색, 흰색"], lesson: "l3"},
			{s: "[a-z]", name: "범위", desc: "작은 글자에서 큰 글자 순서로 범위를 씁니다. [0-9], [A-Za-z], [가-힣], [ㄱ-ㅎ] 등.", note: "[A-z] 는 대문자와 소문자 사이의 기호까지 포함하니 [A-Za-z] 로 쓰세요. 한글은 끝이 \"힣\"입니다.", ex: ["[가-힣]+", "완성형 한글"], lesson: "l3"},
			{s: "[^abc]", name: "그 외의 글자", desc: "맨 앞의 ^ 는 \"여기 적은 글자가 아닌 것\"이라는 뜻입니다.", ex: ["[^0-9]", "숫자가 아닌 글자"], lesson: "l3"},
			{s: "[\\d\\s]", name: "집합 안의 이름", desc: "집합 안에서도 \\d, \\w, \\s 를 쓸 수 있습니다.", lesson: "l3"}
		]
	},
	{
		id: "quant", title: "반복", items: [
			{s: "?", name: "있어도 되고 없어도 됨", desc: "바로 앞의 글자(또는 묶음)가 0번 또는 1번 나옵니다.", ex: ["colou?r", "color, colour"], lesson: "l4"},
			{s: "*", name: "0번 이상", desc: "없어도 되고 여러 번 나와도 됩니다.", ex: ["ab*", "a, ab, abbb"], lesson: "l4"},
			{s: "+", name: "1번 이상", desc: "최소 한 번은 나와야 합니다.", ex: ["\\d+", "숫자 덩어리"], lesson: "l4"},
			{s: "{n}", name: "정확히 n번", desc: "예: {4} 는 정확히 4번입니다.", ex: ["\\d{4}", "숫자 4개"], lesson: "l4"},
			{s: "{n,m}", name: "n번 이상 m번 이하", desc: "{2,} 는 2번 이상, {2,4} 는 2~4번입니다.", ex: ["[가-힣]{2,5}", "한글 2~5글자"], lesson: "l4"},
			{s: "*?  +?  ??", name: "적게 (게으른)", desc: "반복 기호 뒤에 ? 를 붙이면 가능한 한 적게 일치합니다. 기본은 가능한 한 많이(탐욕적)입니다.", ex: ["<b>.+?</b>", "첫 번째 </b>에서 멈춤"], lesson: "l7"},
			{s: "*+  ++  ?+", name: "소유 수량자", desc: "한 번 잡은 것을 되돌려 주지 않습니다. 느려지는 패턴을 막는 데 쓰입니다.", js: false, note: "JavaScript에서는 쓸 수 없습니다.", lesson: "l10"}
		]
	},
	{
		id: "anchor", title: "위치", items: [
			{s: "^", name: "시작", desc: "문자열의 시작입니다. m 플래그를 켜면 각 줄의 시작입니다.", ex: ["^010", "010으로 시작"], lesson: "l5"},
			{s: "$", name: "끝", desc: "문자열의 끝입니다. m 플래그를 켜면 각 줄의 끝입니다.", ex: ["\\.jpg$", ".jpg로 끝"], lesson: "l5"},
			{s: "\\b  \\B", name: "단어의 경계 / 경계가 아닌 자리", desc: "영문·숫자 단어의 앞뒤 자리입니다.", note: "한글은 단어로 취급하지 않아 한글에는 잘 맞지 않습니다.", ex: ["\\bcat\\b", "단어 cat"], lesson: "l5"},
			{s: "\\A  \\z", name: "문자열 전체의 처음 / 끝", desc: "m 플래그와 상관없이 항상 문자열 전체의 처음과 끝입니다.", js: false, lesson: "l5"}
		]
	},
	{
		id: "group", title: "묶음과 선택", items: [
			{s: "(abc)", name: "그룹", desc: "여러 글자를 한 묶음으로 만들고 번호를 붙여 기억합니다. 반복 기호를 묶음 전체에 붙일 수 있습니다.", ex: ["(ab)+", "ab, abab, ababab"], lesson: "l6"},
			{s: "a|b", name: "또는", desc: "둘 중 하나와 일치합니다. 괄호가 없으면 패턴 전체를 나눕니다.", note: "^a|b$ 는 \"a로 시작\" 또는 \"b로 끝\"입니다. 전체를 맞추려면 ^(a|b)$ 로 씁니다.", ex: ["^(고양이|강아지)$", "둘 중 하나"], lesson: "l6"},
			{s: "(?:abc)", name: "기억하지 않는 묶음", desc: "묶기만 하고 번호를 붙이지 않습니다.", lesson: "l6"},
			{s: "(?<이름>abc)", name: "이름 붙은 그룹", desc: "그룹에 이름을 붙입니다. 치환에서 $<이름> (JavaScript) 또는 ${이름} (PCRE2)로 꺼냅니다.", note: "PCRE2·Python은 (?P<이름>…) 도 씁니다. JavaScript는 (?P<…>) 를 쓸 수 없습니다.", ex: ["(?<year>\\d{4})", "이름이 year인 그룹"], lesson: "l9"},
			{s: "\\1  \\k<이름>", name: "앞의 그룹과 같은 내용", desc: "앞에서 잡은 그룹과 똑같은 글자를 다시 찾습니다.", ex: ["(\\w)\\1", "같은 글자가 연달아(aa, 11)"], lesson: "l6"},
			{s: "(?>abc)", name: "원자 그룹", desc: "한 번 일치하면 되돌리지 않는 묶음입니다.", js: false, lesson: "l10"}
		]
	},
	{
		id: "look", title: "앞뒤 살피기", items: [
			{s: "(?=abc)", name: "뒤에 있어야 함", desc: "이 자리 뒤에 abc가 있어야 합니다. abc는 결과에 포함되지 않습니다.", ex: ["\\d+(?=원)", "원이 붙은 숫자"], lesson: "l8"},
			{s: "(?!abc)", name: "뒤에 없어야 함", desc: "이 자리 뒤에 abc가 없어야 합니다.", ex: ["foo(?!bar)", "bar가 안 붙은 foo"], lesson: "l8"},
			{s: "(?<=abc)", name: "앞에 있어야 함", desc: "이 자리 앞에 abc가 있어야 합니다.", note: "PCRE2는 길이가 정해진 것만 허용합니다.", ex: ["(?<=\\$)\\d+", "$ 뒤의 숫자"], lesson: "l8"},
			{s: "(?<!abc)", name: "앞에 없어야 함", desc: "이 자리 앞에 abc가 없어야 합니다.", lesson: "l8"}
		]
	},
	{
		id: "flag", title: "플래그", items: [
			{s: "g", name: "모두 찾기", desc: "첫 번째 일치에서 멈추지 않고 모든 일치를 찾습니다.", lesson: "l1"},
			{s: "i", name: "대소문자 무시", desc: "A와 a를 같게 봅니다. 한글에는 영향이 없습니다."},
			{s: "m", name: "여러 줄", desc: "^ 와 $ 가 각 줄의 시작과 끝이 됩니다.", lesson: "l5"},
			{s: "s", name: "점이 줄바꿈 포함", desc: ". 이 줄바꿈도 한 글자로 봅니다."},
			{s: "u", name: "유니코드", desc: "\\p{…} 와 이모지 같은 큰 글자를 올바르게 다룹니다.", pcre: false},
			{s: "y", name: "고정 위치", desc: "마지막으로 끝난 자리에서 바로 이어서 일치해야 합니다.", pcre: false},
			{s: "x", name: "공백 무시", desc: "패턴 안의 공백과 줄바꿈을 무시해 길게 풀어 쓸 수 있습니다.", js: false}
		]
	}
];

/** Which lesson teaches a pattern piece (used by the explanation rows). */
export function lessonFor(kind, type, gtype) {
	if (kind === "lit") { return "l1"; }
	if (kind === "set") { return "l3"; }
	if (kind === "quant") { return "l4"; }
	if (kind === "group") { return /look/.test(gtype || "") ? "l8" : gtype === "atomic" ? "l10" : "l6"; }
	if (kind === "leaf") {
		if (type === "dot" || type === "escchar") { return "l2"; }
		if (/^(digit|notdigit|word|notword|whitespace|notwhitespace)$/.test(type)) { return "l3"; }
		if (/^(bof|eof|wordboundary|notwordboundary)$/.test(type)) { return "l5"; }
		if (/^(numref|namedref|alt)$/.test(type)) { return "l6"; }
	}
	return null;
}
