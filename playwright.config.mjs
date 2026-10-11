import {defineConfig, devices} from "@playwright/test";

// 브라우저 E2E: 빌드 결과(build/)를 로컬 서버로 띄워 Chromium, Firefox, WebKit(Safari 계열)에서 같은 시험을 돌린다.
// 먼저 `npx gulp deploy` 로 build/ 를 만들어야 한다. 실행: npm run test:e2e
export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30000,
	expect: {timeout: 8000},
	fullyParallel: true,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", {open: "never"}]] : "list",
	use: {baseURL: "http://localhost:4173", viewport: {width: 1920, height: 1080}, trace: "retain-on-failure", locale: "ko-KR"},
	webServer: {command: "node tests/e2e/serve.mjs build 4173", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI, timeout: 20000},
	projects: [
		{name: "chromium", use: {...devices["Desktop Chrome"], viewport: {width: 1920, height: 1080}}},
		{name: "firefox", use: {...devices["Desktop Firefox"], viewport: {width: 1920, height: 1080}}},
		{name: "webkit", use: {...devices["Desktop Safari"], viewport: {width: 1920, height: 1080}}}
	]
});
