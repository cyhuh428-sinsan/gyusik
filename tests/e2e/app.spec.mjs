// 규식이 - 브라우저 E2E: 화면과 엔진(JS, PCRE2 wasm)이 실제로 동작하는지, 인터넷 없이도 되는지, 레이아웃이 깨지지 않는지.
import {test, expect} from "@playwright/test";

const SAMPLE = "010-1234-5678\n010-123-5678\n010-9876-5432\n연락처: 010-5555-0000";

async function open(page, {text = SAMPLE, pattern = "", engine} = {}) {
	await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
	await page.goto("/");
	await expect(page.locator("#statusbar")).toBeVisible();
	if (engine) { await page.selectOption("#engine", engine); }
	if (text !== null) { await page.fill("#text", text); }
	if (pattern) { await page.fill("#pattern", pattern); }
}

test("처음 열면 오류 없이 뜬다 (콘솔 오류 0, 외부 요청 0)", async ({page}) => {
	const errors = [], external = [];
	page.on("pageerror", (e) => errors.push(String(e)));
	page.on("console", (m) => { if (m.type() === "error") { errors.push(m.text()); } });
	page.on("request", (r) => { if (!/^(http:\/\/localhost:4173|data:|blob:)/.test(r.url())) { external.push(r.url()); } });
	await page.goto("/");
	await expect(page.locator("#statusbar")).toBeVisible();
	await page.fill("#pattern", "\\d+");
	await expect(page.locator("#count")).toContainText("일치");
	expect(errors).toEqual([]);
	expect(external).toEqual([]);
});

test("패턴을 쓰면 한 줄 요약, 선로도, 일치 개수가 함께 갱신된다", async ({page}) => {
	await open(page, {pattern: "^(010)-(\\d{4})-(\\d{4})$"});
	// 기본 플래그(g, m)로 두 줄이 일치한다
	await expect(page.locator("#summary")).toContainText("다음 순서와 일치합니다");
	await expect(page.locator("#summary")).toContainText("그룹 1");
	await expect(page.locator("#count")).toContainText("2개 일치");
	await expect(page.locator("#rr")).toContainText("줄의 시작");
	await page.locator("#flags .flag", {hasText: "여러 줄"}).click(); // m 끄기: ^ $ 가 전체 텍스트 기준이 되어 일치가 사라진다
	await expect(page.locator("#count")).toContainText("0개 일치");
	await expect(page.locator("#rr")).toContainText("4번");
});

test("플래그를 켜고 끄면 결과가 바뀐다 (대소문자 무시)", async ({page}) => {
	await open(page, {text: "Cat cat CAT", pattern: "cat"});
	await expect(page.locator("#count")).toContainText("1개 일치");
	await page.locator("#flags .flag", {hasText: "대소문자 무시"}).click();
	await expect(page.locator("#count")).toContainText("3개 일치");
});

test("PCRE2(wasm) 엔진: JavaScript에 없는 문법이 PCRE2에서만 동작한다", async ({page}) => {
	await open(page, {text: "aaab", pattern: "a++b"});
	// JavaScript에서는 a++ 가 문법 오류라 일치가 없고 진단이 1건 뜬다
	await expect(page.locator("#count")).toContainText("0개 일치");
	await expect(page.locator("#bDiag")).toHaveText("1");
	await page.selectOption("#engine", "pcre");
	await expect(page.locator("#count")).toContainText("1개 일치");
	await expect(page.locator("#bDiag")).toHaveText("0");
});

test("진단: 잘못된 패턴은 오류 배지와 설명을 보여 준다", async ({page}) => {
	await open(page, {pattern: "(abc"});
	await page.locator('[data-tab="diag"]').click();
	await expect(page.locator("#bDiag")).not.toHaveText("0");
	await expect(page.locator("#panel")).toContainText("여는 괄호");
});

// 입력이 충분히 길어야 어느 엔진에서든 1초 제한을 넘긴다(WebKit은 40자도 0.6초에 끝낸다)
test("느려지는 패턴은 멈추지 않고 안내한다", async ({page}) => {
	await open(page, {text: "a".repeat(60) + "!", pattern: "(a+)+$"});
	await expect(page.locator("#runError")).toBeVisible({timeout: 15000});
	// 화면은 계속 반응한다
	await page.fill("#pattern", "a+");
	await expect(page.locator("#runError")).toBeHidden({timeout: 15000});
	await expect(page.locator("#count")).toContainText("일치");
});

test("테스트 케이스: 추가하면 통과/실패가 표시된다", async ({page}) => {
	await open(page, {pattern: "^\\d{3}-\\d{4}-\\d{4}$"});
	await page.locator('[data-view="tests"]').click();
	await page.locator("#addTest").click();
	await expect(page.locator("#tests")).toBeVisible();
	await expect(page.locator("#bTests")).toBeVisible();
});

test("치환: $1 형식으로 결과를 만든다", async ({page}) => {
	await open(page, {text: "2026-10-12", pattern: "(\\d{4})-(\\d{2})-(\\d{2})"});
	await page.locator('[data-view="replace"]').click();
	await page.fill("#toolInput", "$3/$2/$1");
	await expect(page.locator("#toolOut")).toContainText("12/10/2026");
});

test("만들기: 예시로 후보를 만들고 작업대로 보낸다", async ({page}) => {
	await open(page, {text: null});
	await page.locator('[data-mode="make"]').click();
	await page.fill("#mkPos", "010-1234-5678\n010-9876-5432");
	await page.fill("#mkNeg", "010-123-5678");
	await page.locator("#mkGo").click();
	await expect(page.locator("#mkList")).toContainText("모두 통과");
	await page.locator("#mkList .send").first().click();
	await expect(page.locator("#pattern")).toHaveValue(/\\d\{3\}-\\d\{4\}-\\d\{4\}/);
	await expect(page.locator("#summary")).toContainText("다음 순서와 일치합니다");
});

test("배우기: 1강 실습을 정답으로 풀면 통과 표시가 뜬다", async ({page}) => {
	await open(page, {text: null});
	await page.locator('[data-mode="learn"]').click();
	await expect(page.locator("#lnBody h2")).toContainText("글자 그대로 찾기");
	await page.locator("#lnBody .tin").first().fill("고양이");
	await expect(page.locator("#lnBody .task").first().locator(".taskdone")).toBeVisible();
	// 틀린 패턴은 통과하지 못한다
	await page.locator("#lnBody .tin").first().fill("강아지");
	await expect(page.locator("#lnBody .task").first().locator(".taskdone")).toBeHidden();
});

test("내 패턴: 저장하면 목록에 나타나고 새로고침해도 남는다", async ({page}) => {
	await page.goto("/");
	await page.fill("#pattern", "^\\d{5}$");
	await page.fill("#saveName", "우편번호 시험");
	await page.locator("#saveBtn").click();
	await page.locator('[data-mode="mine"]').click();
	await expect(page.locator("#myList")).toContainText("우편번호 시험");
	await page.reload();
	await page.locator('[data-mode="mine"]').click();
	await expect(page.locator("#myList")).toContainText("우편번호 시험");
	await expect(page.locator("#myList")).toContainText("^\\d{5}$");
});

test("인터넷이 없어도 핵심 기능이 동작한다 (외부 요청을 모두 막은 상태)", async ({page, context}) => {
	await context.route((url) => /^https?:$/.test(url.protocol) && url.hostname !== "localhost", (route) => route.abort());
	await context.setOffline(false);
	await open(page, {pattern: "\\d{4}"});
	await expect(page.locator("#count")).toContainText("일치");
	await page.selectOption("#engine", "pcre");
	await expect(page.locator("#count")).toContainText("일치");
	await page.locator('[data-mode="make"]').click();
	await page.locator('[data-mode="learn"]').click();
	await expect(page.locator("#lnBody")).toContainText("글자 그대로 찾기");
});

test("설정: 키는 암호화해서 저장하고 평문으로 남기지 않는다", async ({page, browserName}) => {
	test.skip(browserName === "webkit", "WebKit 테스트 브라우저의 IndexedDB 제한 때문에 건너뜀");
	await page.goto("/");
	await page.locator("#openSettings").click();
	await page.fill("#setKey", "sk-test-SECRET-123");
	if (!(await page.locator("#setSaveKey").isChecked())) { await page.locator("#setSaveKey").check(); }
	await expect.poll(() => page.evaluate(() => localStorage.getItem("gyusik.ai.key.enc") !== null)).toBe(true);
	const plain = await page.evaluate(() => Object.keys(localStorage).some((k) => String(localStorage.getItem(k)).includes("sk-test-SECRET")));
	expect(plain).toBe(false);
	await page.reload();
	await page.locator("#openSettings").click();
	await expect(page.locator("#setKey")).toHaveValue("sk-test-SECRET-123");
	await page.locator("#setSaveKey").uncheck();
	await expect.poll(() => page.evaluate(() => localStorage.getItem("gyusik.ai.key.enc"))).toBeNull();
});

for (const size of [{w: 1920, h: 1080}, {w: 1366, h: 768}, {w: 1024, h: 768}, {w: 390, h: 844}]) {
	test("레이아웃 " + size.w + "x" + size.h + ": 모든 화면에서 가로로 넘치지 않는다", async ({page}) => {
		await page.setViewportSize({width: size.w, height: size.h});
		await open(page, {pattern: "^(010)-(\\d{4})-(\\d{4})$"});
		for (const mode of ["bench", "make", "learn", "mine"]) {
			await page.locator('[data-mode="' + mode + '"]').click();
			const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
			expect(over, mode + " overflows horizontally by " + over + "px").toBeLessThanOrEqual(1);
		}
		await page.locator("#openSettings").click();
		const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(over, "settings overflows").toBeLessThanOrEqual(1);
	});
}

test("화면 안쪽 여백: 가장자리가 상하좌우 같은 간격이다 (1920x1080)", async ({page}) => {
	await open(page, {pattern: "a"});
	const box = await page.evaluate(() => {
		const p = document.querySelector(".wb .pane").getBoundingClientRect();
		const top = document.querySelector(".top").getBoundingClientRect();
		return {left: p.left, topGap: p.top - top.bottom};
	});
	expect(Math.abs(box.left - box.topGap)).toBeLessThanOrEqual(2);
});
