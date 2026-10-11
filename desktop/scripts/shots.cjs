/*
규식이 - visual check tool. Renders the app at a real 1920 x 1080 and saves one PNG per screen.
  SHOT_URL=<url> SHOT_OUT=<folder> [SHOT_W=1920 SHOT_H=1080] node node_modules/electron/cli.js scripts/shots.cjs
Example: SHOT_URL=http://localhost:3350/ SHOT_OUT=../shots node node_modules/electron/cli.js scripts/shots.cjs
Used to review the design at the team's standard resolution (the Browser pane cannot render 1920 x 1080 faithfully).
*/
const {app, BrowserWindow} = require("electron");
const fs = require("fs");
const path = require("path");

app.disableHardwareAcceleration(); // software rendering: capturePage can fail on some GPU setups

// Electron/Chromium treats extra path-like command-line arguments as files to open and can crash on them,
// so the settings come from environment variables.
const url = process.env.SHOT_URL || "http://localhost:3350/";
const out = path.resolve(process.env.SHOT_OUT || "shots");
const W = +process.env.SHOT_W || 1920, H = +process.env.SHOT_H || 1080;
const LOG = process.env.SHOT_LOG;
const log = (m) => { if (LOG) { fs.appendFileSync(LOG, m + "\n"); } console.log(m); };
process.on("uncaughtException", (e) => log("uncaught: " + (e && e.stack || e)));
process.on("unhandledRejection", (e) => log("unhandled: " + (e && e.stack || e)));

const SAMPLE_SAVED = `localStorage.setItem("gyusik.saved", JSON.stringify([
 {id:"a1",name:"휴대폰 번호",pattern:"^01[016789]-?\\\\d{3,4}-?\\\\d{4}$",flags:"",engine:"js",text:"",tests:[{text:"010-1234-5678",expect:"match"},{text:"010-12-345",expect:"nomatch"}],tags:["전화","검증"],updated:Date.now(),created:Date.now()},
 {id:"a2",name:"날짜 (연-월-일)",pattern:"^\\\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\\\d|3[01])$",flags:"",engine:"js",text:"",tests:[],tags:["날짜"],updated:Date.now()-1000,created:Date.now()},
 {id:"a3",name:"한글 이름",pattern:"^[가-힣]{2,5}$",flags:"",engine:"pcre",text:"",tests:[{text:"홍길동",expect:"match"}],tags:[],updated:Date.now()-2000,created:Date.now()}]));`;

// each shot: [file name, script run in the page first]
const SHOTS = [
	["01-workbench", `document.querySelector('[data-mode=bench]').click(); document.querySelector('[data-tab=explain]').click();`],
	["02-workbench-tests", `document.querySelector('[data-view=tests]').click();`],
	["03-workbench-replace", `document.querySelector('[data-view=replace]').click();`],
	["04-workbench-diagnose", `document.querySelector('[data-view=text]').click(); document.querySelector('[data-tab=diag]').click();`],
	["05-workbench-reference", `document.querySelector('[data-tab=ref]').click();`],
	["06-make-examples", `document.querySelector('[data-mode=make]').click(); document.getElementById('mkTabEx').click(); document.getElementById('mkGo').click();`],
	["07-make-sentence", `document.getElementById('mkTabNl').click();`],
	["08-learn-4", `document.querySelector('[data-mode=learn]').click(); document.querySelectorAll('.lnitem')[3].click();`],
	["09-learn-9", `document.querySelectorAll('.lnitem')[8].click();`],
	["10-mine", `document.querySelector('[data-mode=mine]').click();`],
	["11-settings", `document.getElementById('openSettings').click();`]
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
	log("shots: " + url + " -> " + out + " " + W + "x" + H);
	fs.mkdirSync(out, {recursive: true});
	const win = new BrowserWindow({width: W, height: H, useContentSize: true, show: false, backgroundColor: "#0D1015", webPreferences: {backgroundThrottling: false}});
	await win.loadURL(url);
	const run = (js) => win.webContents.executeJavaScript(js);
	await run(`localStorage.clear(); ${SAMPLE_SAVED} location.reload(); 1`);
	await sleep(3000);
	for (const [name, js] of SHOTS) {
		await run(js);
		await sleep(1200);
		const img = await win.webContents.capturePage();
		fs.writeFileSync(path.join(out, name + ".png"), img.toPNG());
		log("saved " + name + " " + img.getSize().width + "x" + img.getSize().height);
	}
	app.quit();
}).catch((e) => { log("shots failed: " + (e && e.stack || e)); app.exit(1); });
