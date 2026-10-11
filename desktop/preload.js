/*
규식이 (Gyusik) - Licensed under GPL-3.0 (see LICENSE, NOTICE.md).
Runs in an isolated context: the page gets only these few, fixed capabilities.
*/
const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("gyusikHost", {
	desktop: true,
	info: ipcRenderer.sendSync("host:info"),
	// the AI key is encrypted with the Windows credential store (Electron safeStorage)
	allowHost: (host) => ipcRenderer.invoke("net:allow", String(host || "")),
	getKey: () => ipcRenderer.invoke("secret:get"),
	setKey: (key) => ipcRenderer.invoke("secret:set", String(key || "")),
	// save a text file through the system "Save as" dialog
	saveFile: (name, text) => ipcRenderer.invoke("file:save", String(name || "규식이.json"), String(text || ""))
});
