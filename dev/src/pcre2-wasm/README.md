# Notes

- Updated from the original source at: <https://www.npmjs.com/package/@stephen-riley/pcre2-wasm>
- Remove some node dependencies so it runs in-browser.
- Export the library so we can `import` it.

(The notes above come from the RegExr `pcre-worker` branch, gskinner.com, 2023.)

## Licences

- `LICENSE`: MIT, the pcre2-wasm wrapper (J. Stephen Riley).
- `LICENCE.PCRE2.md`: BSD-3-Clause WITH PCRE2-exception, the PCRE2 library compiled into `libpcre2.wasm`
  (text taken from https://github.com/PCRE2Project/pcre2 on 2026-10-11).

## 규식이 changes (cyhuh428-sinsan, 2026-10-11)

- `libpcre2.js`: the wasm URL is resolved against the worker script's directory instead of the
  hard-coded `http://localhost:3000/libpcre2.wasm`; the Node `fs`/`path` imports are stubbed;
  `Module.loaded` now rejects when the wasm can't be fetched or compiled instead of never settling.
- `PCRE.js`: Node's `Buffer` replaced with a small UTF-16LE encoder (no Node polyfills needed);
  `matchAll` steps past empty matches (it looped forever on patterns like `a*`); an offset equal to
  the subject length is accepted, so empty matches at the end and empty subjects work.

- `libpcre2.wasm`: replaced with the file from the npm package `@stephen-riley/pcre2-wasm@1.2.4`
  (587,702 bytes, sha256 `5ea911abcd37c06419eb506a97a4d1b9b6f340478b17e8398cd878b64d0dc99e`).
  The copy in the RegExr `pcre-worker` branch had been committed as text and lost 16 CR bytes, so
  `WebAssembly.validate` rejected it. It must stay a binary file in git (`*.wasm binary` in `.gitattributes`).
