import { setOption } from "./database";

const { app, shell, BrowserWindow, ipcMain, dialog } = require('electron');
const { getDatabase, loadDatabase, rebuildPreload, getPreload, installMod, removeMod, disableMod, enableMod } = require('./database');
const { enableLogging, disableLogging, log } = require('./logging');
const path = require('path');

let debugMode = false;

if (process.env.HTTP_PROXY) {
	app.commandLine.appendSwitch("proxy-server", process.env.HTTP_PROXY);
}

if (process.env.HTTPS_PROXY) {
	app.commandLine.appendSwitch("proxy-server", process.env.HTTPS_PROXY);
}

loadDatabase();
rebuildPreload();

process.argv.forEach(arg => {
	if (arg === "--debug-mode") {
		debugMode = true;
	}
});

if (debugMode) {
	enableLogging();
	log("info", "Debug mode is enabled");
}

const createWindow = () => {
	const window = new BrowserWindow({
		width: 1280,
		height: 720,
		title: "Gimhook",
		show: false,
		webPreferences: {
			contextIsolation: false, // We need to disable context isolation so that gimhook will actually work
			preload: getPreload()
		}
	});

	setTimeout(() => {
		window.webContents.send("database-update", getDatabase());
		window.show();
	}, 500);

	ipcMain.on("open-external", (event, url) => {
		shell.openExternal(url);
	});

	ipcMain.on("select-mods", async (event) => {
		// Don't allow mods to trigger mod-manager-related events

		if (!window.webContents.getURL().startsWith("file://")) {
			log("warn", "select-mods event triggered, but this isn't the Gimhook UI. THIS SHOULD NEVER HAPPEN!");
			return;
		}

		const response = await dialog.showOpenDialog({ properties: ["openFile", "multiSelections"] });

		if (response.canceled) {
			log("info", "Mod selection cancelled");
			return;
		}

		response.filePaths.forEach(filename => {
			installMod(window, filename);
		});
	});

	ipcMain.on("remove-mod", (event, name) => {
		// Don't allow mods to trigger mod-manager-related events

		if (!window.webContents.getURL().startsWith("file://")) {
			log("warn", "remove-mod event triggered, but this isn't the Gimhook UI. THIS SHOULD NEVER HAPPEN!");
			return;
		}

		removeMod(window, name);
	});

	ipcMain.on("enable-mod", (event, name) => {
		// Don't allow mods to trigger mod-manager-related events

		if (!window.webContents.getURL().startsWith("file://")) {
			log("warn", "enable-mod event triggered, but this isn't the Gimhook UI. THIS SHOULD NEVER HAPPEN!");
			return;
		}

		enableMod(window, name);
	});

	ipcMain.on("disable-mod", (event, name) => {
		// Don't allow mods to trigger mod-manager-related events

		if (!window.webContents.getURL().startsWith("file://")) {
			log("warn", "disable-mod event triggered, but this isn't the Gimhook UI. THIS SHOULD NEVER HAPPEN!");
			return;
		}

		disableMod(window, name);
	});

	ipcMain.on("set-option", (event, modName, key, value) => {
		// Don't allow mods to trigger mod-manager-related events

		if (!window.webContents.getURL().startsWith("file://")) {
			log("warn", "set-option event triggered, but this isn't the Gimhook UI. THIS SHOULD NEVER HAPPEN!");
			return;
		}

		setOption(modName, key, value);
	});

	window.on("page-title-updated", (e) => {
		e.preventDefault();
	});

	window.removeMenu();

	if (debugMode) {
		window.openDevTools();
	}

	window.loadFile(path.join(__dirname, "./ui/index.html"));
};

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});