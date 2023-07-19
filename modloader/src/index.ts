// Define some basic hooks and the interface for them
// Keep in mind that this can be easily detected by Gimkit, but it likely won't be part of their cheat detector because this is not a cheat.

import setupCore from './core';
import setupParcel from './parcel';
import setupUI from './ui';
import setupGame from './game';
import setupGraphics from './graphics';
import Mod from './mod';

declare var gimhook: any;

globalThis.gimhook = {
	_finishedLoadingGimhook: false,
	_shouldLoadMods: true,
	_openModSelectionDialog: () => {},
	_onInstallStatus: (status: boolean, name: string, message: string) => {},
	_onRemoveStatus: (status: boolean, name: string, message: string) => {},
	_onDatabaseUpdate: (database: any) => {}
}

// do some electron-specific stuff if we're using electron

if (navigator.userAgent.includes("gimhook")) {
	// @ts-ignore
	
	const { ipcRenderer } = require('electron');

	// On the electron app, we need to overwrite window.open so it doesn't open a new electron window when you click things on the Gimkit dashboard.
	// @ts-ignore
	window.open = (url: string) => {
		// if the URL is external, open it in a new browser window

		if (new URL(url).host !== "gimkit.com") {
			ipcRenderer.send("open-external", url);
			return;
		}

		location.href = url;
	};

	document.addEventListener("click", (e: any) => {
		const link = e.target.closest("a");

		if (!link) {
			return;
		}

		e.preventDefault();

		window.open(link.href);
	});

	gimhook._openModSelectionDialog = () => {
		ipcRenderer.send("select-mods");
	};

	gimhook._removeMod = (name: string) => {
		ipcRenderer.send("remove-mod", name);
	};

	gimhook._enableMod = (name: string) => {
		ipcRenderer.send("enable-mod", name);
	};

	gimhook._disableMod = (name: string) => {
		ipcRenderer.send("disable-mod", name);
	};

	gimhook._createMod = (metadata: any) => {
		return new Mod(metadata);
	};

	ipcRenderer.on("install-status", (event: Event, status: boolean, name: string, message: string) => {
		gimhook._onInstallStatus(status, name, message);
	});

	ipcRenderer.on("remove-status", (event: Event, status: boolean, name: string, message: string) => {
		gimhook._onRemoveStatus(status, name, message);
	});

	ipcRenderer.on("database-update", (event: Event, database: any) => {
		gimhook._onDatabaseUpdate(database);
	});
}

// load all of the gimhook modules

console.log("Gimhook: loading core module...");

setupCore();

console.log("Gimhook: loading parcel module...");

setupParcel();

console.log("Gimhook: loading UI module...");

setupUI();

console.log("Gimhook: loading game module...");

setupGame();

console.log("Gimhook: loading graphics module...");

setupGraphics();

// Don't load mods if this is the UI, otherwise there could be some really dangerous mods

const currentURL = new URL(location.href);

if (currentURL.protocol === "file:" || !(["/host", "/join"].includes(currentURL.pathname))) {
	gimhook._shouldLoadMods = false;
}

gimhook._finishedLoadingGimhook = true;
