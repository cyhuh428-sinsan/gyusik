import {register} from "node:module";
// the app is written for a browser: give it the few globals it touches at import time.
const mem = new Map();
globalThis.localStorage = {getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), get length() { return mem.size; }, key: (i) => [...mem.keys()][i]};
globalThis.window = globalThis.window || {location: {hostname: "test"}, addEventListener() {}, localStorage: globalThis.localStorage};
globalThis.document = globalThis.document || {querySelector: () => null, createElement: () => ({})};
register("./loader.mjs", import.meta.url);
