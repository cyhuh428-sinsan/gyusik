// electron-builder 패키징 직후 실행: 규식이 아이콘과 파일 정보를 실행 파일(규식이.exe)에 넣는다.
// (signAndEditExecutable=false 로 두었기 때문에 electron-builder 가 직접 하지 않는다. winCodeSign 도구 내려받기가 필요 없는 rcedit 패키지를 쓴다.)
const path = require("path");
const fs = require("fs");

exports.default = async function afterPack(context) {
	if (context.electronPlatformName !== "win32") { return; }
	const {rcedit} = await import("rcedit");
	const exe = path.join(context.appOutDir, context.packager.appInfo.productFilename + ".exe");
	if (!fs.existsSync(exe)) { throw new Error("after-pack: executable not found: " + exe); }
	await rcedit(exe, {
		icon: path.join(__dirname, "..", "icons", "icon.ico"),
		"version-string": {
			ProductName: "규식이",
			FileDescription: "규식이: 정규식 작업대",
			OriginalFilename: path.basename(exe),
			LegalCopyright: "GPL-3.0, based on RegExr (C) 2017 gskinner.com, inc."
		}
	});
	console.log("  • icon embedded  file=" + path.basename(exe) + " arch=" + context.arch);
};
