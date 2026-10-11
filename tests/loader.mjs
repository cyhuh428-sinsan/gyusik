// Lets node's test runner import the app's browser-style ES modules (extensionless imports, no "type":"module").
import {existsSync, statSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import path from "node:path";

export async function resolve(specifier, context, next) {
	if ((specifier.startsWith(".") || specifier.startsWith("/")) && context.parentURL && context.parentURL.includes("/dev/")) {
		const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
		for (const c of [base, base + ".js", path.join(base, "index.js")]) {
			if (existsSync(c) && statSync(c).isFile()) { return {url: pathToFileURL(c).href, shortCircuit: true, format: "module"}; }
		}
	}
	return next(specifier, context);
}
export async function load(url, context, next) {
	if (url.includes("/dev/") && url.endsWith(".js")) { return next(url, {...context, format: "module"}); }
	return next(url, context);
}
