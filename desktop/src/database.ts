const { app } = require('electron');
const { log } = require('./logging');
const fs = require('fs');
const path = require('path');

let database = {
	files: [],
	modNames: [],
	enabledMods: [],
	mods: [],
	modOptions: {}
};

export function getDatabase() {
	return database;
}

const gimhookDirectory = path.join(app.getPath("appData"), "gimhook");
const gimhookModDirectory = path.join(gimhookDirectory, "mods");

export function rebuildPreload() {
	// This works by concatenating all of the mods to the end of the base modloader.
	// It actually works surprisingly well!

	log("info", "Rebuilding preload.js...");

	let modloader = fs.readFileSync(path.join(__dirname, "modloader.js"), "utf-8");

	modloader += "if (gimhook._shouldLoadMods) {\nlet mod = null;\n"

	database.enabledMods.forEach(modName => {
		const metadata = {
			name: modName,
			options: typeof database.modOptions === "undefined" ? {} : database.modOptions[modName]
		};

		modloader += `mod = gimhook._createMod(${JSON.stringify(metadata)});\n`;
		modloader += "console.log(`Gimhook: loading ${mod.name}...`);\n";
		modloader += fs.readFileSync(path.join(gimhookModDirectory, `${modName}.js`), "utf-8");
		modloader += "\n";
	});

	modloader += "}\nconsole.log(\"Gimhook: Finished loading Gimhook!\");\n"

	fs.writeFileSync(path.join(gimhookDirectory, "preload.js"), modloader);
}

function updateDatabase() {
	// Write the updated database to mods.json

	log("info", "Writing mods.json...");

	fs.writeFileSync(path.join(gimhookDirectory, "mods.json"), JSON.stringify(database, null, "\t"));

	// Rebuild preload.js

	rebuildPreload();
}

export function loadDatabase() {
	// Create the gimhook config directory if it doesn't already exist

	if (!fs.existsSync(gimhookDirectory)) {
		log("info", `Creating ${gimhookDirectory}...`);
		fs.mkdirSync(gimhookDirectory);
	}

	// Create the mod directory if it doesn't already exist

	if (!fs.existsSync(gimhookModDirectory)) {
		log("info", `Creating ${gimhookModDirectory}...`);
		fs.mkdirSync(gimhookModDirectory);
	}

	// If mods.json already exists, load it

	if (fs.existsSync(path.join(gimhookDirectory, "mods.json"))) {
		database = JSON.parse(fs.readFileSync(path.join(gimhookDirectory, "mods.json"), "utf-8"));
	}
}

export function getPreload() {
	return path.join(gimhookDirectory, "preload.js");
}

export function installMod(window, filename) {
	// We need to make sure that the file exists before we can do anything with it

	if (!fs.existsSync(filename)) {
		log("error", `${filename} does not exist.`);
		window.webContents.send("install-status", false, "", `${filename} does not exist.`);
		return;
	}

	// yes, this loads the entire mod file into memory just to grab the metadata
	// it should be fine though, mods should be ~100KB max

	const firstLine = fs.readFileSync(filename, "utf-8").split("\n")[0];

	if (!firstLine.startsWith("// gimhook: {")) {
		log("error", `${filename} is not a valid mod file.`);
		window.webContents.send("install-status", false, "", `${filename} is not a valid mod file.`);
		return;
	}

	let metadata = null;

	try {
		metadata = JSON.parse(firstLine.replace("// gimhook: ", ""));
	} catch (e) {
		log("error", `Failed to parse ${filename}!`);
		window.webContents.send("install-status", false, "", `Failed to parse ${filename}!`);
		return;
	}

	if (!("formatVersion" in metadata) || !([1, 2].includes(metadata.formatVersion))) {
		log("error", `${filename} does not contain a valid formatVersion value. This most likely means that the mod was made with an older SDK version.`);
		window.webContents.send("install-status", false, "", `${filename} does not contain a valid formatVersion value. This most likely means that the mod was made with an older SDK version.`);
		return;
	}
	

	// Make sure that the mod isn't already installed

	if (database.modNames.includes(metadata.name)) {
		log("error", `${metadata.name} is already installed.`);
		window.webContents.send("install-status", false, "", `${metadata.name} is already installed.`);
		return;
	}

	// Copy the mod into the mods directory

	fs.copyFileSync(filename, path.join(gimhookModDirectory, `${metadata.name}.js`));

	// Update mods.json

	database.files.push(`${metadata.name}.js`);
	database.modNames.push(metadata.name);
	database.enabledMods.push(metadata.name);
	database.mods.push(metadata);

	updateDatabase();

	log("info", `Installed ${filename}`);

	window.webContents.send("install-status", true, metadata.name, "");
	window.webContents.send("database-update", database);
}

export function removeMod(window: any, modName: string) {
	// Make sure that the mod exists in the database

	if (!database.modNames.includes(modName)) {
		log("error", `${modName} is not installed.`);
		window.webContents.send("remove-status", false, modName, `${modName} is not installed.`);
		return;
	}

	// Make sure that the mod file exists
	// If it doesn't exist, but is in the database, one of two things could've happened:
	// 1. You deleted the mod file directly. Don't do that.
	// 2. Something has gone REALLY wrong. This should never happen, and shouldn't even be possible.

	const filename = path.join(gimhookModDirectory, `${modName}.js`);

	if (!fs.existsSync(filename)) {
		log("error", `${modName} is in the database but doesn't exist. THIS SHOULD NEVER HAPPEN!`);
		window.webContents.send("remove-status", false, modName, `${modName} is in the database but doesn't exist. THIS SHOULD NEVER HAPPEN!`);
	}

	// Remove the mod file

	fs.rmSync(filename);

	// Remove the mod from the database

	database.files = database.files.filter(mod => mod !== `${modName}.js`);
	database.modNames = database.modNames.filter(mod => mod !== modName);
	database.enabledMods = database.modNames.filter(mod => mod !== modName);
	database.mods = database.mods.filter(mod => mod.name !== modName);

	updateDatabase();

	log("info", `Removed ${modName}`);

	window.webContents.send("remove-status", true, modName, "");
	window.webContents.send("database-update", database);
}

export function enableMod(window: any, modName: string) {
	if (!database.enabledMods.includes(modName) && database.modNames.includes(modName)) {
		database.enabledMods.push(modName);
		updateDatabase();
		window.webContents.send("database-update", database);
		log("info", `Enabled ${modName}`);
	}
}

export function disableMod(window: any, modName: string) {
	database.enabledMods = database.modNames.filter(mod => mod !== modName);
	updateDatabase();
	window.webContents.send("database-update", database);
	log("info", `Disabled ${modName}`);
}

export function setOption(window: any, modName: string, key: string, value: any) {
	log("info", `${key} (${modName}) -> ${value}`);

	if (!Object.keys(database).includes("modOptions")) {
		database.modOptions = {};
	}

	if (!Object.keys(database.modOptions).includes(modName)) {
		database.modOptions[modName] = {};
	}

	database.modOptions[modName][key] = value;

	updateDatabase();
}
