/*
규식이 (Gyusik) - https://github.com/cyhuh428-sinsan/gyusik
Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Lesson content (Korean). Plain words first, the technical term in parentheses.
Each task: cases = strings the pattern must find (expect true) or must skip (expect false).
A case "finds" a string when the pattern matches anywhere in it, like the workbench test cases.
"examples" are shown as live railroad diagrams.
A case may also carry "found": the pattern must then match exactly that text (first match), not just match somewhere.
A task may carry "must": {re, msg}: the typed pattern has to contain syntax matching re (used for syntax-specific tasks).
*/

const T = (text, expect, found) => (found === undefined ? {text, expect} : {text, expect, found});

export const LESSONS = [
	{
		id: "l1", title: "글자 그대로 찾기", term: "리터럴",
		body: [
			"<p>정규식에서 가장 쉬운 패턴은 <b>찾고 싶은 글자를 그대로 쓰는 것</b>입니다. <code>고양이</code> 라고 쓰면 \"고양이\"라는 글자가 들어 있는 곳을 찾습니다.</p>",
			"<p>패턴은 글자 하나하나를 <b>순서대로</b> 확인합니다. <code>abc</code> 는 a, b, c가 이 순서로 붙어 있을 때만 일치합니다. <code>acb</code> 나 <code>a-b-c</code> 에는 일치하지 않습니다.</p>",
			"<p>기본적으로 <b>대소문자를 구분</b>합니다. <code>cat</code> 은 \"Cat\"에 일치하지 않습니다. 구분하지 않으려면 작업대의 <code>i</code> 플래그를 켜세요.</p>"
		],
		examples: [{pattern: "고양이", note: "\"고양이\"가 이 순서로 있으면 일치"}],
		tasks: [
			{id: "l1t1", prompt: "\"고양이\"가 들어 있는 줄은 찾고, 들어 있지 않은 줄은 건너뛰세요.", cases: [T("회색 고양이", true), T("고양이", true), T("검은 고양이가 잔다", true), T("강아지", false), T("고 양 이", false)], hint: "찾고 싶은 글자를 그대로 쓰면 됩니다.", solution: "고양이"},
			{id: "l1t2", prompt: "\"2026\"이 들어 있는 줄만 찾으세요.", cases: [T("2026-10-11", true), T("제 2026 호", true), T("2025-10-11", false), T("20-26", false)], hint: "숫자도 글자와 똑같이 그대로 씁니다.", solution: "2026"}
		],
		next: "아무 글자나 하나, 점 <code>.</code> 을 배웁니다."
	},
	{
		id: "l2", title: "아무 글자 하나", term: "점 .",
		body: [
			"<p>글자가 정확히 정해지지 않았을 때는 <b>점(<code>.</code>)</b>을 씁니다. 점은 <b>아무 글자 하나</b>와 일치합니다. <code>c.t</code> 는 cat, cot, cut처럼 가운데가 무엇이든 되는 세 글자와 일치합니다.</p>",
			"<p>점은 한 글자만 대신합니다. 글자가 없거나 둘 이상이면 일치하지 않아서, <code>c.t</code> 는 \"ct\"나 \"coat\"에는 일치하지 않습니다.</p>",
			"<p><b>진짜 점을 찾고 싶다면</b> 앞에 역슬래시를 붙여 <code>\\.</code> 로 씁니다. 이처럼 특별한 뜻이 있는 기호를 글자 그대로 쓰게 만드는 것을 <b>이스케이프</b>라고 합니다. 파일 이름이나 도메인을 다룰 때 가장 자주 하는 실수가 이 부분입니다.</p>"
		],
		examples: [{pattern: "c.t", note: "가운데는 아무 글자 하나"}, {pattern: "3\\.14", note: "\\. 은 글자 점 그대로"}],
		tasks: [
			{id: "l2t1", prompt: "cat, cot, cut처럼 가운데만 다른 세 글자는 찾고, 글자 수가 다른 것은 건너뛰세요.", cases: [T("cat", true), T("cot", true), T("cut", true), T("ct", false), T("coat", false)], hint: "가운데 글자 하나를 점으로 바꿉니다.", solution: "c.t"},
			{id: "l2t2", prompt: "소수점이 있는 \"3.14\"만 찾고, \"3814\"는 건너뛰세요.", cases: [T("3.14", true), T("원주율은 3.14", true), T("3814", false), T("3-14", false)], hint: "점은 아무 글자와 일치하니, 글자 점은 \\. 로 씁니다.", solution: "3\\.14"}
		],
		next: "후보 글자 중 하나를 고르는 <code>[ ]</code> 를 배웁니다."
	},
	{
		id: "l3", title: "여러 글자 중 하나", term: "문자 집합 [ ]",
		body: [
			"<p>대괄호 <code>[ ]</code> 안에 글자를 늘어놓으면 <b>그중 한 글자</b>와 일치합니다. <code>[회흰]색</code> 은 \"회색\" 또는 \"흰색\"입니다.</p>",
			"<p>글자를 하나씩 쓰기 번거로울 때는 <b>범위</b>를 씁니다. <code>[0-9]</code> 는 숫자 하나, <code>[a-z]</code> 는 소문자 하나, <code>[가-힣]</code> 은 완성된 한글 한 글자입니다. 범위는 작은 것에서 큰 것 순서로 써야 합니다.</p>",
			"<p>맨 앞에 <code>^</code> 를 붙이면 <b>뜻이 반대</b>가 됩니다. <code>[^0-9]</code> 는 숫자가 <b>아닌</b> 글자 하나입니다. (대괄호 안의 <code>^</code> 는 아래 5강의 \"시작\"과 다른 뜻입니다.)</p>",
			"<p>자주 쓰는 집합에는 짧은 이름이 있습니다: <code>\\d</code> 는 숫자, <code>\\w</code> 는 글자·숫자·밑줄, <code>\\s</code> 는 공백 문자입니다. 대문자로 쓰면 반대(<code>\\D</code> 숫자가 아닌 글자)입니다.</p>"
		],
		examples: [{pattern: "[회흰]색", note: "회 또는 흰 한 글자 + 색"}, {pattern: "[^0-9]", note: "숫자가 아닌 글자 하나"}],
		tasks: [
			{id: "l3t1", prompt: "\"회색\"과 \"흰색\"은 찾고, \"검은색\"은 건너뛰세요.", cases: [T("회색", true), T("흰색", true), T("검은색", false)], hint: "첫 글자 자리에 올 수 있는 글자를 대괄호에 넣으세요.", solution: "[회흰]색"},
			{id: "l3t2", prompt: "알파벳 한 글자 뒤에 숫자 한 글자가 오는 \"A1\", \"b7\"은 찾고 \"AB\", \"12\"는 건너뛰세요. (대소문자 모두 허용)", cases: [T("A1", true), T("b7", true), T("Z9", true), T("AB", false), T("12", false)], hint: "[A-Za-z] 다음에 숫자 한 글자를 씁니다.", solution: "[A-Za-z][0-9]"},
			{id: "l3t3", prompt: "숫자가 하나도 없는 줄은 건너뛰고, 숫자가 아닌 글자가 있는 줄을 찾으세요.", cases: [T("abc", true), T("12a", true), T("1234", false), T("0", false)], hint: "[^0-9] 는 숫자가 아닌 글자 하나입니다.", solution: "[^0-9]"}
		],
		next: "몇 번 반복할지 정하는 <code>?  *  +  { }</code> 를 배웁니다."
	},
	{
		id: "l4", title: "몇 번 반복할지", term: "수량자",
		body: [
			"<p>글자나 집합 <b>바로 뒤</b>에 기호를 붙이면 그것이 몇 번 나올지 정할 수 있습니다.</p>",
			"<ul><li><code>?</code> 없거나 한 번 (있어도 되고 없어도 됨)</li><li><code>*</code> 없거나 여러 번 (0번 이상)</li><li><code>+</code> 한 번 이상</li><li><code>{4}</code> 정확히 4번</li><li><code>{2,4}</code> 2번 이상 4번 이하</li><li><code>{2,}</code> 2번 이상</li></ul>",
			"<p>기호는 <b>바로 앞의 한 글자</b>(또는 한 묶음)에만 적용됩니다. <code>ab+</code> 는 \"abab\"가 아니라 \"a 뒤에 b가 여러 개\"(ab, abb, abbb…)입니다. 여러 글자를 한꺼번에 반복하려면 6강의 묶음을 씁니다.</p>",
			"<p><code>.*</code> 는 \"아무 글자나 얼마든지\"라서 자주 쓰이지만 너무 많이 일치하기 쉽습니다. 이 문제는 7강(많이 vs 적게)에서 다룹니다.</p>"
		],
		examples: [{pattern: "colou?r", note: "u는 있어도 되고 없어도 됨"}, {pattern: "\\d{3}-\\d{4}", note: "숫자 3개, 하이픈, 숫자 4개"}],
		tasks: [
			{id: "l4t1", prompt: "미국식 \"color\"와 영국식 \"colour\"를 모두 찾으세요. \"colr\"은 건너뜁니다.", cases: [T("color", true), T("colour", true), T("colr", false), T("colouur", false)], hint: "있어도 되고 없어도 되는 글자 뒤에 ? 를 붙입니다.", solution: "colou?r"},
			{id: "l4t2", prompt: "숫자가 정확히 4개 이어진 곳(예: 연도)을 찾으세요. 숫자가 3개뿐인 줄은 건너뜁니다.", cases: [T("2026", true), T("1999년", true), T("202", false), T("abc", false)], hint: "\\d 뒤에 {4} 를 붙입니다.", solution: "\\d{4}"},
			{id: "l4t3", prompt: "\"a\" 뒤에 \"b\"가 한 번 이상 이어지는 곳을 찾으세요.", cases: [T("ab", true), T("abbbb", true), T("xabbx", true), T("a", false), T("bbb", false)], hint: "b 뒤에 + 를 붙입니다.", solution: "ab+"}
		],
		next: "글자의 <b>위치</b>를 정하는 <code>^</code> 와 <code>$</code> 를 배웁니다."
	},
	{
		id: "l5", title: "위치 정하기", term: "앵커 ^ $",
		body: [
			"<p>지금까지의 패턴은 줄 <b>어디에서든</b> 일치하면 찾아냅니다. 그래서 \"숫자 4개\"를 찾는 <code>\\d{4}</code> 는 \"20260\"이나 \"abc12345xyz\"에서도 찾아냅니다.</p>",
			"<p><code>^</code> 는 <b>시작</b>, <code>$</code> 는 <b>끝</b> 위치를 뜻합니다. 글자가 아니라 자리를 가리킵니다. <code>^010</code> 은 \"010으로 시작\", <code>\\.jpg$</code> 는 \".jpg로 끝\"입니다.</p>",
			"<p>둘을 함께 쓰면 <b>전체가 정확히 일치</b>해야 합니다. 입력값이 형식에 맞는지 검사할 때(전화번호, 우편번호 등) 거의 항상 <code>^</code> 와 <code>$</code> 로 감쌉니다. 빠뜨리면 \"abc010-1234xyz\" 같은 값도 통과합니다.</p>",
			"<p>그 밖에 <code>\\b</code> 는 <b>단어의 경계</b>입니다. <code>\\bcat\\b</code> 는 \"cat\"은 찾고 \"concatenate\" 속의 cat은 건너뜁니다.</p>"
		],
		examples: [{pattern: "^010", note: "010으로 시작"}, {pattern: "^\\d{5}$", note: "숫자 5개로만 이루어진 전체"}],
		tasks: [
			{id: "l5t1", prompt: "\"010\"으로 <b>시작하는</b> 줄만 찾으세요.", cases: [T("010-1234-5678", true), T("0101", true), T("번호 010-1234", false), T("110", false)], hint: "패턴 맨 앞에 ^ 를 붙입니다.", solution: "^010"},
			{id: "l5t2", prompt: "\".jpg\"로 <b>끝나는</b> 파일 이름만 찾으세요.", cases: [T("photo.jpg", true), T("a.b.jpg", true), T("photo.jpg.bak", false), T("jpg", false)], hint: "점은 \\. 로 쓰고, 맨 뒤에 $ 를 붙입니다.", solution: "\\.jpg$"},
			{id: "l5t3", prompt: "숫자 5개로만 이루어진 우편번호만 찾으세요. 더 길거나 글자가 섞이면 건너뜁니다.", cases: [T("12345", true), T("06236", true), T("123456", false), T("12a45", false), T("a12345", false)], hint: "^ 와 $ 로 감싸고 \\d{5} 를 가운데 넣습니다.", solution: "^\\d{5}$"}
		],
		next: "여러 글자를 한 묶음으로 다루는 <code>( )</code> 와 <code>|</code> 를 배웁니다."
	},
	{
		id: "l6", title: "묶고 선택하기", term: "그룹 ( ), 선택 |",
		body: [
			"<p>괄호 <code>( )</code> 는 여러 글자를 <b>하나의 묶음</b>으로 만듭니다. 묶음 뒤에 반복 기호를 붙이면 묶음 전체가 반복됩니다. <code>(ab)+</code> 는 ab, abab, ababab…입니다. (4강의 <code>ab+</code> 와 비교해 보세요.)</p>",
			"<p><code>|</code> 는 <b>또는</b>입니다. <code>고양이|강아지</code> 는 둘 중 하나를 찾습니다. 괄호와 함께 쓰면 범위를 정할 수 있어서 <code>(cat|dog)s?</code> 처럼 일부만 선택하게 할 수 있습니다.</p>",
			"<p><b>조심하세요:</b> <code>|</code> 는 괄호가 없으면 패턴 <b>전체</b>를 나눕니다. <code>^a|b$</code> 는 \"a로 시작하거나 b로 끝남\"이지 \"a 또는 b 하나만\"이 아닙니다. 전체를 맞추려면 <code>^(a|b)$</code> 로 씁니다.</p>",
			"<p>괄호로 묶은 부분은 <b>그룹</b>으로 번호가 붙어 기억됩니다(첫 괄호가 1번). 작업대에서 그룹마다 색이 다르게 보이고, 치환할 때 <code>$1</code> 로 다시 꺼내 쓸 수 있습니다. 기억하지 않고 묶기만 하려면 <code>(?:...)</code> 로 씁니다.</p>"
		],
		examples: [{pattern: "(ab)+", note: "ab 묶음이 한 번 이상"}, {pattern: "^(고양이|강아지)$", note: "둘 중 하나와 전체 일치"}],
		tasks: [
			{id: "l6t1", prompt: "\"고양이\" 또는 \"강아지\"가 들어 있는 줄을 찾으세요. \"토끼\"는 건너뜁니다.", cases: [T("고양이", true), T("강아지", true), T("검은 고양이", true), T("토끼", false)], hint: "두 단어를 | 로 이어 씁니다.", solution: "고양이|강아지"},
			{id: "l6t2", prompt: "\"ab\"가 한 번 이상 <b>반복되기만 하는</b> 줄을 찾으세요. 전체가 맞아야 합니다.", cases: [T("ab", true), T("abab", true), T("ababab", true), T("aabb", false), T("abb", false), T("", false)], hint: "^(ab)+$ 처럼 묶음 전체를 반복시킵니다.", solution: "^(ab)+$"},
			{id: "l6t3", prompt: "\"cat\", \"cats\", \"dog\", \"dogs\" <b>정확히 그 단어</b>만 찾으세요. \"catdog\"은 건너뜁니다.", cases: [T("cat", true), T("cats", true), T("dog", true), T("dogs", true), T("catdog", false), T("bird", false)], hint: "^(cat|dog)s?$ 처럼 선택을 괄호로 묶고 전체를 ^ $ 로 감쌉니다.", solution: "^(cat|dog)s?$"}
		],
		next: "<b>많이 vs 적게</b>, 즉 수량자가 얼마나 잡을지를 배웁니다."
	}
	,
	{
		id: "l7", title: "많이 vs 적게", term: "탐욕적·게으른 수량자",
		body: [
			"<p>4강의 <code>+  *  {n,}</code> 는 <b>가능한 한 많이</b> 일치하려고 합니다. 이를 <b>탐욕적</b>(greedy)이라고 합니다. 그래서 <code>&lt;b&gt;.+&lt;/b&gt;</code> 를 \"&lt;b&gt;굵게&lt;/b&gt; 그리고 &lt;b&gt;기울임&lt;/b&gt;\"에 쓰면, 첫 &lt;b&gt;부터 <b>마지막</b> &lt;/b&gt;까지 통째로 잡습니다.</p>",
			"<p>수량자 뒤에 <code>?</code> 를 붙이면 <b>가능한 한 적게</b> 일치하는 <b>게으른</b>(lazy) 수량자가 됩니다. <code>.+?</code> 는 뒤의 조건이 처음 맞는 곳에서 멈춥니다. 그래서 <code>&lt;b&gt;.+?&lt;/b&gt;</code> 는 &lt;b&gt;굵게&lt;/b&gt; 하나만 잡습니다.</p>",
			"<ul><li><code>*?</code> <code>+?</code> <code>??</code> <code>{2,}?</code> 처럼 모든 수량자 뒤에 붙일 수 있습니다.</li><li>같은 뜻으로 <code>[^\"]*</code> 처럼 \"여는 기호가 아닌 것\"만 허용하는 방법도 있고, 이쪽이 더 빠르고 안전한 경우가 많습니다.</li></ul>",
			"<p>이번 실습은 <b>무엇이 일치했는지</b>까지 확인합니다. 결과 줄에 일치한 부분이 표시됩니다.</p>"
		],
		examples: [{pattern: "<b>.+</b>", note: "많이: 마지막 </b>까지"}, {pattern: "<b>.+?</b>", note: "적게: 처음 </b>에서 멈춤"}],
		tasks: [
			{id: "l7t1", prompt: "첫 번째 <code>&lt;b&gt;…&lt;/b&gt;</code> 하나만 찾으세요. 두 번째 것까지 이어서 잡으면 안 됩니다.", cases: [T("<b>굵게</b> 그리고 <b>기울임</b>", true, "<b>굵게</b>"), T("<b>가</b><b>나</b><b>다</b>", true, "<b>가</b>")], hint: ".+ 뒤에 ? 를 붙여 게으르게 만듭니다.", solution: "<b>.+?</b>"},
			{id: "l7t2", prompt: "큰따옴표로 감싼 첫 번째 말 하나만, 따옴표까지 포함해서 찾으세요.", cases: [T("그는 \"사과\"와 \"배\"를 샀다", true, "\"사과\""), T("\"a\" \"b\"", true, "\"a\"")], hint: "\".*?\" 처럼 게으르게 쓰거나 \"[^\"]*\" 로 따옴표가 아닌 글자만 허용합니다.", solution: "\".*?\""},
			{id: "l7t3", prompt: "숫자가 이어져 있어도 <b>맨 앞 2개만</b> 찾으세요.", cases: [T("12345", true, "12"), T("9876", true, "98")], hint: "\\d{2,} 는 많이 잡습니다. 게으르게 만들거나 정확히 2개를 지정합니다.", solution: "\\d{2}"}
		],
		next: "일치하는 글자 자체가 아니라 <b>앞뒤 조건</b>만 보는 방법을 배웁니다."
	},
	{
		id: "l8", title: "앞뒤 살피기", term: "전후방 탐색",
		body: [
			"<p>\"1000원\"에서 <b>숫자만</b> 찾고 싶은데 \"원\"은 결과에 넣고 싶지 않을 때가 있습니다. <b>앞뒤 살피기</b>는 글자를 소비하지 않고 \"이 자리 앞(뒤)에 무엇이 있는지\"만 확인합니다. 조건이 맞아도 그 글자는 결과에 포함되지 않습니다.</p>",
			"<ul><li><code>(?=원)</code> <b>뒤에</b> \"원\"이 있어야 함 (앞보기)</li><li><code>(?!원)</code> 뒤에 \"원\"이 <b>없어야</b> 함</li><li><code>(?&lt;=\\$)</code> <b>앞에</b> \"$\"가 있어야 함 (뒤보기)</li><li><code>(?&lt;!\\$)</code> 앞에 \"$\"가 <b>없어야</b> 함</li></ul>",
			"<p>예: <code>\\d+(?=원)</code> 은 \"1000원\"에서 <b>1000</b>만 잡습니다. \"1000달러\"는 잡지 않습니다.</p>",
			"<p>모든 엔진이 지원하지만 <b>뒤보기</b>는 엔진마다 제한이 다릅니다(9강). 지원하지 않는 곳에서는 대신 그룹으로 감싸 꺼내 쓰는 방법을 씁니다.</p>"
		],
		examples: [{pattern: "\\d+(?=원)", note: "뒤에 원이 있는 숫자"}, {pattern: "(?<=\\$)\\d+", note: "앞에 $가 있는 숫자"}],
		tasks: [
			{id: "l8t1", prompt: "\"원\"이 뒤에 붙은 숫자만, <b>숫자만</b> 찾으세요. \"원\"은 결과에 넣지 않습니다.", cases: [T("가격은 1000원입니다", true, "1000"), T("500원", true, "500"), T("30달러", false)], hint: "\\d+ 뒤에 (?=원) 을 붙입니다.", solution: "\\d+(?=원)"},
			{id: "l8t2", prompt: "\"$\" 바로 뒤의 숫자만 찾으세요. \"$\"는 결과에 넣지 않습니다.", cases: [T("cost $42", true, "42"), T("cost 42", false), T("$7 and $15", true, "7")], hint: "앞보기는 (?<=...) 입니다. $ 는 \\$ 로 씁니다.", solution: "(?<=\\$)\\d+"},
			{id: "l8t3", prompt: "\"foo\"를 찾되, 바로 뒤에 \"bar\"가 이어지는 것은 건너뛰세요.", cases: [T("foo", true, "foo"), T("foobaz", true, "foo"), T("foobar", false)], hint: "(?!bar) 는 \"뒤에 bar가 없어야 함\"입니다.", solution: "foo(?!bar)"}
		],
		next: "같은 패턴도 <b>엔진마다 다르게</b> 동작할 수 있습니다."
	},
	{
		id: "l9", title: "엔진마다 다른 점", term: "JavaScript · PCRE2 · Python",
		body: [
			"<p>정규식의 기본 문법은 어디서나 비슷하지만, 프로그래밍 언어와 도구마다 <b>구현(엔진)</b>이 달라서 세부가 다릅니다. 규식이는 <b>JavaScript</b>와 <b>PCRE2</b>를 지원하고, 상단의 엔진 선택으로 바꿔 가며 같은 패턴을 시험할 수 있습니다.</p>",
			"<table class=\"lntbl\"><tr><th>항목</th><th>JavaScript</th><th>PCRE2 (PHP, 여러 도구)</th><th>Python</th></tr>" +
			"<tr><td>이름 붙은 그룹</td><td><code>(?&lt;year&gt;\\d{4})</code></td><td><code>(?&lt;year&gt;…)</code> 와 <code>(?P&lt;year&gt;…)</code> 둘 다</td><td><code>(?P&lt;year&gt;…)</code></td></tr>" +
			"<tr><td>소유 수량자·원자 그룹</td><td>없음</td><td><code>a++</code> <code>(?&gt;…)</code></td><td>3.11부터</td></tr>" +
			"<tr><td>플래그 쓰는 법</td><td><code>/패턴/gi</code></td><td>코드의 옵션 또는 <code>(?i)</code></td><td><code>re.I</code> 또는 <code>(?i)</code></td></tr>" +
			"<tr><td><code>\\d</code> 가 뜻하는 것</td><td>0~9만</td><td>기본은 0~9 (옵션으로 확장)</td><td>다른 나라 숫자도 포함</td></tr>" +
			"<tr><td>뒤보기 <code>(?&lt;=…)</code></td><td>길이 제한 없음</td><td>길이가 정해져야 함</td><td>길이가 정해져야 함</td></tr></table>",
			"<p><b>이 표는 큰 줄기만 보여줍니다.</b> 버전에 따라 달라질 수 있으니, 중요한 패턴은 실제로 쓸 엔진에서 꼭 시험하세요.</p>",
			"<p>패턴을 옮길 때 가장 자주 부딪히는 것은 <b>이름 붙은 그룹의 표기</b>입니다. 작업대는 JavaScript에서 <code>(?P&lt;이름&gt;…)</code> 를 쓰면 오류로 알려주고 고치는 방법을 안내합니다.</p>"
		],
		examples: [{pattern: "(?<year>\\d{4})-(?<month>\\d{2})", note: "JavaScript 방식의 이름 붙은 그룹"}],
		tasks: [
			{id: "l9t1", prompt: "\"2026-10\"에서 연도와 월을 <b>이름 붙은 그룹</b>(<code>year</code>, <code>month</code>)으로 잡으세요. JavaScript 문법으로 쓰세요.", cases: [T("2026-10", true, "2026-10"), T("26-10", false)], must: {re: "\\(\\?<year>\\\\d\\{4\\}\\)|\\(\\?<year>", msg: "(?<year>…) 처럼 이름 붙은 그룹을 쓰세요."}, hint: "(?<year>\\d{4})-(?<month>\\d{2}) 형태입니다. P는 붙이지 않습니다.", solution: "(?<year>\\d{4})-(?<month>\\d{2})"},
			{id: "l9t2", prompt: "JavaScript에서 <code>\\d</code> 는 0~9만 뜻합니다. 아라비아 숫자 \"٣٤٥\"는 건너뛰고 \"345\"는 찾으세요.", cases: [T("345", true, "345"), T("٣٤٥", false)], hint: "\\d+ 로 충분합니다. (Python에서는 결과가 다릅니다.)", solution: "\\d+"}
		],
		next: "일치하지 않는 입력에서 <b>매우 느려지는</b> 패턴을 알아봅니다."
	},
	{
		id: "l10", title: "느려지는 패턴", term: "재앙적 백트래킹 (ReDoS)",
		body: [
			"<p>정규식 엔진은 일치하지 않으면 <b>다른 경우를 되돌아가서</b>(백트래킹) 다시 시도합니다. 대부분은 순식간이지만, 어떤 패턴은 일치하지 않는 입력에서 경우의 수가 <b>폭발적으로</b> 늘어 몇 초, 몇 분이 걸립니다.</p>",
			"<p>가장 흔한 원인은 <b>반복 안에 반복</b>입니다. <code>(a+)+$</code> 는 \"aaaa…a\"가 끝까지 맞을 때는 빠르지만, 맨 끝에 \"b\"가 하나 붙으면 <code>a</code> 를 나누는 방법을 전부 시도하느라 입력 길이가 늘수록 시간이 2배씩 늘어납니다.</p>",
			"<p>서버가 사용자 입력을 이런 패턴으로 검사하면 요청 하나로 서버를 멈출 수 있습니다. 이것을 <b>ReDoS</b>(정규식 서비스 거부 공격)라고 부릅니다.</p>",
			"<p><b>피하는 방법</b></p><ul><li>같은 글자를 겹쳐서 반복하지 않기: <code>(a+)+</code> → <code>a+</code></li><li>\"아무 글자\" 대신 가능한 글자만: <code>.*</code> → <code>[^,]*</code></li><li><code>(a|a)*</code>, <code>(a|aa)+</code> 처럼 겹치는 선택지 피하기</li><li>입력 길이를 먼저 제한하기</li></ul>",
			"<p>작업대의 진단 탭은 반복 안의 반복을 찾아 \"느려질 수 있습니다\"라고 알려줍니다. 규식이는 너무 오래 걸리면 실행을 중단해서 화면이 멈추지 않습니다. 아래 실습에서 이를 직접 확인할 수 있습니다.</p>"
		],
		examples: [{pattern: "(a+)+$", note: "반복 안의 반복: 위험"}, {pattern: "a+$", note: "같은 뜻, 안전"}],
		tasks: [
			{id: "l10t1", prompt: "\"a\"로 <b>끝나는</b> 줄을 찾으세요(a가 하나 이상 이어진 채로 끝). <code>(a+)+$</code> 는 같은 뜻이지만 마지막 줄에서 너무 오래 걸립니다. <b>빠른 패턴</b>으로 바꿔 보세요.", cases: [T("aaaa", true), T("baaa", true), T("aaab", false), T("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab", false)], hint: "반복 안의 반복이 필요 없습니다. a+ 에 $ 만 붙이면 됩니다.", solution: "a+$"},
			{id: "l10t2", prompt: "쉼표가 아닌 글자가 이어진 한 칸(필드)을 찾되, 쉼표가 없는 긴 줄에서도 빨라야 합니다.", cases: [T("가,나,다", true, "가"), T(",,,", false), T("x".repeat(40), true, "x".repeat(40))], hint: "[^,]+ 는 \"쉼표가 아닌 글자\"만 허용해서 되돌아갈 일이 거의 없습니다.", solution: "[^,]+"}
		],
		next: "마지막으로, <b>한글</b>을 정확하게 다루는 방법을 배웁니다."
	},
	{
		id: "l11", title: "한글 다루기", term: "한글 범위 · 자모 · 초성",
		body: [
			"<p>한글은 정규식에서 몇 가지 알아둘 점이 있습니다. 규식이를 만든 이유이기도 합니다.</p>",
			"<p><b>1) 완성된 글자는 <code>[가-힣]</code></b> 입니다. \"가\"부터 \"힣\"까지 완성형 한글 11,172자를 모두 포함합니다. 끝을 \"힝\"으로 쓰는 실수가 흔한데, 그러면 일부 글자가 빠집니다.</p>",
			"<p><b>2) 자음·모음 낱자는 별도</b>입니다. \"ㄱ\", \"ㅏ\" 같은 낱자는 <code>[ㄱ-ㅎ]</code> (자음), <code>[ㅏ-ㅣ]</code> (모음)으로 따로 씁니다. <code>[가-힣]</code> 에는 들어 있지 않아서, \"ㅎㅎㅎ\"는 한글 이름 검사를 통과하지 못합니다. 초성 검색(예: \"ㅎㄱㄷ\")은 <code>[ㄱ-ㅎ]</code> 를 씁니다.</p>",
			"<p><b>3) JavaScript의 <code>\\w</code> 와 <code>\\b</code> 는 한글을 글자로 보지 않습니다.</b> <code>\\w</code> 는 영문·숫자·밑줄뿐이라, \"한글abc\"에서 <code>\\w+</code> 는 abc만 잡습니다. 한글까지 단어로 보려면 <code>[\\w가-힣]</code> 처럼 직접 범위를 씁니다.</p>",
			"<p><b>4) 같은 \"한\"이 두 가지로 저장될 수 있습니다.</b> 완성형(NFC)은 글자 하나, 자모 분리형(NFD, Mac에서 파일 이름 등)은 \"ㅎ+ㅏ+ㄴ\" 세 개입니다. 눈에는 같아 보여도 <code>[가-힣]</code> 에 걸리지 않습니다. 작업대는 테스트 텍스트에 자모 분리 한글이 있으면 알려주고 한 번에 바꿔 줍니다.</p>"
		],
		examples: [{pattern: "^[가-힣]{2,5}$", note: "한글 이름 2~5자"}, {pattern: "^[ㄱ-ㅎ]+$", note: "초성만"}],
		tasks: [
			{id: "l11t1", prompt: "<b>완성된 한글로만</b> 이루어진 2~5글자 이름만 찾으세요. 영문, 숫자, 자음·모음 낱자가 섞이면 건너뜁니다.", cases: [T("홍길동", true), T("김철수", true), T("Hong", false), T("홍길동1", false), T("ㅎㅎ", false), T("홍", false)], hint: "^[가-힣]{2,5}$ 로 전체를 감쌉니다.", solution: "^[가-힣]{2,5}$"},
			{id: "l11t2", prompt: "<b>초성(자음)만</b> 입력한 줄만 찾으세요. 완성된 글자나 모음이 섞이면 건너뜁니다.", cases: [T("ㅎㄱㄷ", true), T("ㄱㄴ", true), T("홍길동", false), T("ㅏㅓ", false), T("ㄱa", false)], hint: "^[ㄱ-ㅎ]+$ 입니다.", solution: "^[ㄱ-ㅎ]+$"},
			{id: "l11t3", prompt: "한글이 섞인 문장에서 <b>영문 단어만</b> 찾으세요.", cases: [T("한글 abc 입니다", true, "abc"), T("이메일은 hello 입니다", true, "hello"), T("전부 한글", false)], hint: "[A-Za-z]+ 처럼 영문 범위를 씁니다.", solution: "[A-Za-z]+"}
		],
		next: "1~11강을 모두 마쳤습니다. 작업대에서 직접 패턴을 만들어 보세요."
	}
];
