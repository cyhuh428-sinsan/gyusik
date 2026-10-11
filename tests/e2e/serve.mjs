// 아주 작은 정적 서버 (E2E용): node serve.mjs <폴더> <포트>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "build"), port = +process.argv[3] || 4173;
const types = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".map": "application/json"};

http.createServer((req, res) => {
	let rel = decodeURIComponent(req.url.split("?")[0]);
	if (rel.endsWith("/")) { rel += "index.html"; }
	const file = path.join(root, rel);
	if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
	fs.readFile(file, (err, data) => {
		if (err) { res.writeHead(404); res.end("not found"); return; }
		res.writeHead(200, {"content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store"});
		res.end(data);
	});
}).listen(port, "127.0.0.1", () => console.log("serving " + root + " on " + port));
