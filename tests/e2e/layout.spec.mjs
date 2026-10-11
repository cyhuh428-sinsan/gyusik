// 규식이 - 고정 크기 화면, 선로도 탭, 배율, 전체화면 팝업.
import {test, expect} from "@playwright/test";

const WORDS = ["보험돈", "월", "매달", "일괄", "일시불", "추납", "선납", "연체", "미납", "밀", "결제", "결재", "송금", "이체", "처리", "지불", "카드", "추가", "인출", "낼", "내"];
// 아주 큰 선로도가 나오는 패턴
const BIG = "(?:" + WORDS.join("|") + ")\\s*(?:" + WORDS.join("|") + ")\\s*(?:" + WORDS.slice(0, 12).join("|") + ")";
const SAMPLE = "010-1234-5678\n010-123-5678\n010-9876-5432\n연락처: 010-5555-0000";

async function open(page, pattern = "^(010)-(\\d{4})-(\\d{4})$") {
	await page.addInitScript(() => {
		try {
			if (sessionStorage.getItem("seeded")) { return; }
			sessionStorage.setItem("seeded", "1");
			localStorage.clear();
			const list = [];
			for (let i = 0; i < 30; i++) { list.push({id: "p" + i, name: "패턴 " + i, pattern: "^[a-z]{" + (i + 1) + "}$", flags: "", engine: "js", text: "", tests: [], tags: ["시험"], updated: Date.now() - i, created: Date.now()}); }
			localStorage.setItem("gyusik.saved", JSON.stringify(list));
		} catch (e) {}
	});
	await page.goto("/");
	await expect(page.locator("#statusbar")).toBeVisible();
	await page.fill("#text", SAMPLE);
	await page.fill("#pattern", pattern);
}

const pageOverflow = (page) => page.evaluate(() => ({v: document.documentElement.scrollHeight - window.innerHeight, h: document.documentElement.scrollWidth - document.documentElement.clientWidth}));
const box = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return {h: Math.round(r.height), top: Math.round(r.top), scrollH: e.scrollHeight, clientH: e.clientHeight, scrollW: e.scrollWidth, clientW: e.clientWidth}; }, sel);

test("선로도는 테스트 텍스트·테스트 케이스·치환·추출과 같은 탭 줄의 첫 탭이다", async ({page}) => {
	await open(page);
	const tabs = await page.locator("#viewText").locator("xpath=ancestor::*[contains(@class,'pane')][1]").locator(".segb").allInnerTexts();
	expect(tabs.map((t) => t.replace(/\s+\d+(\/\d+)?$/, "").trim())).toEqual(["선로도", "테스트 텍스트", "테스트 케이스", "치환", "추출"]);
	// 별도의 선로도 영역은 없다: 선로도는 탭 안에 있다
	expect(await page.evaluate(() => !!document.getElementById("rr").closest("#viewRr"))).toBe(true);
	await expect(page.locator("#viewRr")).toBeHidden();
	await page.locator("[data-view=rr]").click();
	await expect(page.locator("#viewRr")).toBeVisible();
	await expect(page.locator("#viewText")).toBeHidden();
	await expect(page.locator("#rr")).toContainText("줄의 시작");
});

test("선로도 탭: 큰 그림은 안에서 스크롤되고 배율 버튼·맞춤이 동작한다", async ({page}) => {
	await open(page, BIG);
	await page.locator("[data-view=rr]").click();
	const before = await box(page, "#rr");
	expect(before.scrollH).toBeGreaterThan(before.clientH); // 세로 스크롤이 있다
	expect(await pageOverflow(page)).toEqual({v: 0, h: expect.any(Number)});
	await page.locator("#rrIn").click();
	await expect(page.locator("#rrPct")).toHaveText("120%");
	await page.locator("#rrOut").click();
	await page.locator("#rrOut").click();
	await expect(page.locator("#rrPct")).toHaveText("83%");
	await page.locator("#rrPct").click();
	await expect(page.locator("#rrPct")).toHaveText("100%");
	await page.locator("#rrFit").click();
	const pct = parseInt(await page.locator("#rrPct").innerText(), 10);
	expect(pct).toBeLessThan(100);
	const fit = await box(page, "#rr");
	expect(fit.scrollH).toBeLessThanOrEqual(fit.clientH + 2); // 스크롤바 없이 전체가 보인다
	expect(fit.scrollW).toBeLessThanOrEqual(fit.clientW + 2);
});

test("선로도 탭: 영역 크기는 그림의 크기와 상관없이 고정이다 (패턴 입력칸 높이가 같을 때)", async ({page}) => {
	await open(page, "a");
	await page.locator("[data-view=rr]").click();
	const small = await box(page, "#rr");
	await page.fill("#pattern", "(?:a|b|c|d|e|f|g|h)+x{2,5}(?:ab|cd|ef)*");
	await expect(page.locator("#rr .rr-node").nth(8)).toBeVisible();
	const bigger = await box(page, "#rr");
	expect(bigger.h).toBe(small.h);
	expect(bigger.top).toBe(small.top);
});

test("선로도 탭: Ctrl+휠로 배율이 바뀌고 새로고침해도 기억한다", async ({page, browserName}) => {
	test.skip(browserName === "webkit", "WebKit 자동화에서는 Ctrl+휠 이벤트를 만들 수 없음");
	await open(page, BIG);
	await page.locator("[data-view=rr]").click();
	await page.locator("#rr").hover();
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, -300);
	await page.keyboard.up("Control");
	await expect.poll(async () => parseInt(await page.locator("#rrPct").innerText(), 10)).toBeGreaterThan(100);
	await page.locator("#rrIn").click();
	const pct = await page.locator("#rrPct").innerText();
	await page.reload();
	await page.fill("#pattern", "a+");
	await page.locator("[data-view=rr]").click();
	await expect(page.locator("#rrPct")).toHaveText(pct);
});

test("전체화면 팝업: 화면을 꽉 채우고, 전체가 보이게 맞춰 열리고, Esc로 닫힌다", async ({page}) => {
	await open(page, BIG);
	await page.locator("[data-view=rr]").click();
	await page.locator("#rrPct").click(); // 탭의 배율은 100%
	await page.locator("#rrFull").click();
	const dlg = page.locator("#rrDialog");
	await expect(dlg).toBeVisible();
	const r = await page.evaluate(() => { const d = document.getElementById("rrDialog").getBoundingClientRect(); return {w: Math.round(d.width), h: Math.round(d.height), iw: window.innerWidth, ih: window.innerHeight}; });
	expect(r.w).toBe(r.iw);
	expect(r.h).toBe(r.ih);
	const big = await box(page, "#rrBig");
	expect(big.scrollH).toBeLessThanOrEqual(big.clientH + 2);
	expect(big.scrollW).toBeLessThanOrEqual(big.clientW + 2);
	await expect(page.locator("#rrBig .rr-node").first()).toBeVisible();
	await page.locator("#rrdPct").click();
	await page.locator("#rrdIn").click();
	await expect(page.locator("#rrdPct")).toHaveText("120%");
	await page.keyboard.press("Escape");
	await expect(dlg).toBeHidden();
	await expect(page.locator("#rrPct")).toHaveText("100%"); // 팝업의 배율이 탭에 영향을 주지 않는다
	await page.locator("#rrFull").click();
	await page.locator("#rrdClose").click();
	await expect(dlg).toBeHidden();
});

test("전체화면 팝업: 패턴이 비어 있으면 열리지 않는다", async ({page}) => {
	await open(page, "");
	await page.locator("[data-view=rr]").click();
	await page.locator("#rrFull").click();
	await expect(page.locator("#rrDialog")).toBeHidden();
});

for (const size of [{w: 1920, h: 1080}, {w: 1600, h: 900}, {w: 1366, h: 768}, {w: 1280, h: 720}]) {
	test("화면 전체 스크롤 없음 " + size.w + "x" + size.h + ": 모든 화면과 탭", async ({page}) => {
		await page.setViewportSize({width: size.w, height: size.h});
		await open(page, BIG);
		const where = [];
		const check = async (name) => { const o = await pageOverflow(page); if (o.v > 1 || o.h > 1) { where.push(name + " (v=" + o.v + ", h=" + o.h + ")"); } };
		for (const v of ["rr", "text", "tests", "replace", "list"]) { await page.locator("[data-view=" + v + "]").click(); await check("작업대/" + v); }
		for (const t of ["explain", "diag", "tips", "ref"]) { await page.locator("[data-tab=" + t + "]").click(); await check("작업대 옆 패널/" + t); }
		await page.locator("[data-mode=make]").click();
		await page.fill("#mkPos", "010-1234-5678\n010-9876-5432");
		await page.locator("#mkGo").click();
		await expect(page.locator("#mkList")).toContainText("통과");
		await check("만들기");
		await page.locator("[data-mode=learn]").click(); await check("배우기 1강");
		await page.evaluate(() => document.querySelectorAll(".lnitem")[8].click()); await check("배우기 9강");
		await page.locator("[data-mode=mine]").click(); await check("내 패턴(30개)");
		await page.locator("#openSettings").click(); await check("설정");
		expect(where, "페이지 전체가 스크롤되는 화면").toEqual([]);
	});
}

test("고정 크기: 후보 영역은 비어 있을 때와 채워졌을 때 높이가 같고, 내 패턴 목록과 강의는 안에서 스크롤된다", async ({page}) => {
	await open(page);
	await page.locator("[data-mode=make]").click();
	const empty = await box(page, ".mk > .pane:last-child");
	await page.fill("#mkPos", "010-1234-5678\n010-9876-5432\n02-123-4567");
	await page.fill("#mkNeg", "010-123-5678");
	await page.locator("#mkGo").click();
	await expect(page.locator("#mkList")).toContainText("통과");
	const filled = await box(page, ".mk > .pane:last-child");
	expect(filled.h).toBe(empty.h);
	// 만들기 두 영역은 높이가 같다
	expect((await box(page, ".mk > .pane:first-child")).h).toBe(empty.h);

	await page.locator("[data-mode=mine]").click();
	const mine = await box(page, "#myList");
	expect(mine.scrollH).toBeGreaterThan(mine.clientH); // 30개는 목록 안에서 스크롤
	expect((await pageOverflow(page)).v).toBeLessThanOrEqual(1);

	await page.locator("[data-mode=learn]").click();
	const lesson = await box(page, "#lnBody");
	expect(lesson.scrollH).toBeGreaterThan(lesson.clientH); // 1강 본문은 안에서 스크롤
	await page.locator("#lnBody").hover();
	await page.mouse.wheel(0, 400);
	await expect.poll(() => page.evaluate(() => document.getElementById("lnBody").scrollTop)).toBeGreaterThan(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
