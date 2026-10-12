// 규식이 아이콘 생성기: desktop/icons/icon.svg 에서 모든 크기의 PNG/ICO를 만든다.
//   node tools/make-icons.cjs
// 결과: desktop/icons/{icon.png,icon.ico}, dev/gyusik/icons/{favicon.svg,favicon.ico,apple-touch-icon.png,icon-192.png,icon-512.png}
// (Playwright의 Chromium으로 SVG를 그리므로 `npx playwright install chromium` 이 먼저 필요하다)
const fs = require("fs");
const path = require("path");
const {chromium} = require("@playwright/test");

const root = path.join(__dirname, "..");
const svgPath = path.join(root, "desktop", "icons", "icon.svg");
const webDir = path.join(root, "dev", "gyusik", "icons");
const svg = fs.readFileSync(svgPath, "utf8");

// 32비트 DIB(비트맵) 아이콘 항목: 작은 크기는 PNG 압축 대신 이 전통적인 형식으로 넣어야 Windows 셸과 오래된 API가 제대로 읽는다.
// rgba: 위에서 아래로 정렬된 RGBA 바이트. ICO 의 DIB 는 아래에서 위로, BGRA 순서이고 뒤에 AND 마스크가 붙는다.
function dibFromRgba(size, rgba) {
	const header = Buffer.alloc(40);
	header.writeUInt32LE(40, 0); header.writeInt32LE(size, 4); header.writeInt32LE(size * 2, 8);
	header.writeUInt16LE(1, 12); header.writeUInt16LE(32, 14); header.writeUInt32LE(0, 16);
	const pixels = Buffer.alloc(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const s = ((size - 1 - y) * size + x) * 4, d = (y * size + x) * 4; // 행 순서를 뒤집는다
			pixels[d] = rgba[s + 2]; pixels[d + 1] = rgba[s + 1]; pixels[d + 2] = rgba[s]; pixels[d + 3] = rgba[s + 3];
		}
	}
	const maskRow = Math.ceil(size / 32) * 4;
	return Buffer.concat([header, pixels, Buffer.alloc(maskRow * size)]);
}

// 이미지 항목들을 하나의 ICO로 묶는다. 각 항목은 {size, data} (data: PNG 또는 DIB 바이트)
function buildIco(entries) {
	const head = Buffer.alloc(6);
	head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
	let offset = 6 + 16 * entries.length;
	const dirs = [], datas = [];
	for (const {size, data: png} of entries) {
		const d = Buffer.alloc(16);
		d.writeUInt8(size >= 256 ? 0 : size, 0); d.writeUInt8(size >= 256 ? 0 : size, 1);
		d.writeUInt8(0, 2); d.writeUInt8(0, 3);
		d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
		d.writeUInt32LE(png.length, 8); d.writeUInt32LE(offset, 12);
		offset += png.length;
		dirs.push(d); datas.push(png);
	}
	return Buffer.concat([head, ...dirs, ...datas]);
}

(async () => {
	const browser = await chromium.launch();
	const page = await (await browser.newContext({deviceScaleFactor: 1})).newPage();
	const uri = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
	const render = async (size) => {
		await page.setViewportSize({width: size, height: size});
		await page.setContent("<html><body style=\"margin:0;background:transparent\"><img src=\"" + uri + "\" width=\"" + size + "\" height=\"" + size + "\" style=\"display:block\"></body></html>");
		await page.waitForFunction(() => document.images[0].complete);
		return page.screenshot({omitBackground: true, clip: {x: 0, y: 0, width: size, height: size}});
	};
	const cache = {};
	const png = async (s) => (cache[s] = cache[s] || (await render(s)));
	// 같은 크기를 캔버스에 그려 RGBA 픽셀을 얻는다(DIB 용)
	const rgbaOf = async (size) => {
		const arr = await page.evaluate(async ([src, s]) => {
			const img = new Image(); img.src = src; await img.decode();
			const c = document.createElement("canvas"); c.width = c.height = s;
			const g = c.getContext("2d"); g.drawImage(img, 0, 0, s, s);
			return Array.from(g.getImageData(0, 0, s, s).data);
		}, [uri, size]);
		return Buffer.from(arr);
	};
	// 256 픽셀은 PNG, 그보다 작은 크기는 DIB
	const entry = async (size) => ({size, data: size >= 256 ? await png(size) : dibFromRgba(size, await rgbaOf(size))});

	fs.mkdirSync(webDir, {recursive: true});
	// 설치형(Electron)
	fs.writeFileSync(path.join(root, "desktop", "icons", "icon.png"), await png(512));
	fs.writeFileSync(path.join(root, "desktop", "icons", "icon.ico"), buildIco(await Promise.all([16, 24, 32, 48, 64, 128, 256].map(entry))));
	// 웹
	fs.writeFileSync(path.join(webDir, "favicon.svg"), svg);
	fs.writeFileSync(path.join(webDir, "favicon.ico"), buildIco(await Promise.all([16, 32, 48].map(entry))));
	fs.writeFileSync(path.join(webDir, "apple-touch-icon.png"), await png(180));
	fs.writeFileSync(path.join(webDir, "icon-192.png"), await png(192));
	fs.writeFileSync(path.join(webDir, "icon-512.png"), await png(512));
	await browser.close();
	console.log("icons written to desktop/icons and dev/gyusik/icons");
})();
