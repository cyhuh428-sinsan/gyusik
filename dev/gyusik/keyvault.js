/*
규식이 (Gyusik) - GPL-3.0-or-later (see NOTICE.md)
Keeps the AI key encrypted in the browser: AES-GCM with a non-extractable key held in IndexedDB; only the
ciphertext goes to localStorage. This stops the key from sitting in plain text in the storage / profile
backups. It does NOT protect against someone using the same browser profile, or a script running on this
page, so shared PCs should not save the key. Needs a secure context (https or localhost).
*/
const DB = "gyusik-vault", STORE = "k", CT_KEY = "gyusik.ai.key.enc", LEGACY_KEY = "gyusik.ai.key";

export const vaultAvailable = typeof window !== "undefined" && !!(window.isSecureContext && window.crypto && window.crypto.subtle && window.indexedDB);

function openDb() {
	return new Promise((resolve, reject) => {
		let r = indexedDB.open(DB, 1);
		r.onupgradeneeded = () => r.result.createObjectStore(STORE);
		r.onsuccess = () => resolve(r.result);
		r.onerror = () => reject(r.error);
	});
}
function idb(db, mode, fn) {
	return new Promise((resolve, reject) => {
		let req = fn(db.transaction(STORE, mode).objectStore(STORE));
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function aesKey(create) {
	let db = await openDb();
	let k = await idb(db, "readonly", (s) => s.get("aes"));
	if (!k && create) {
		k = await crypto.subtle.generateKey({name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]);
		await idb(db, "readwrite", (s) => s.put(k, "aes"));
	}
	return k || null;
}
const b64 = (u8) => btoa(String.fromCharCode.apply(null, u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function sealKey(text) {
	if (!vaultAvailable) { return false; }
	let k = await aesKey(true), iv = crypto.getRandomValues(new Uint8Array(12));
	let ct = new Uint8Array(await crypto.subtle.encrypt({name: "AES-GCM", iv}, k, new TextEncoder().encode(text)));
	localStorage.setItem(CT_KEY, JSON.stringify({iv: b64(iv), ct: b64(ct)}));
	localStorage.removeItem(LEGACY_KEY);
	return true;
}

export function forgetKey() {
	try { localStorage.removeItem(CT_KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
}

/** The saved key, or "". A key saved in plain text by an older version is encrypted on the spot. */
export async function openKey() {
	try {
		let legacy = localStorage.getItem(LEGACY_KEY);
		if (legacy) {
			if (vaultAvailable) { await sealKey(legacy); } else { localStorage.removeItem(LEGACY_KEY); }
			return vaultAvailable ? legacy : "";
		}
		let raw = localStorage.getItem(CT_KEY);
		if (!raw || !vaultAvailable) { return ""; }
		let k = await aesKey(false);
		if (!k) { return ""; }
		let o = JSON.parse(raw);
		return new TextDecoder().decode(await crypto.subtle.decrypt({name: "AES-GCM", iv: unb64(o.iv)}, k, unb64(o.ct)));
	} catch (e) { return ""; }
}
