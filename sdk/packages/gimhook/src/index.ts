const esbuild = require('esbuild');
const { createSpinner } = require('nanospinner');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let usageText = `Usage:
	gimhook build [project path, or blank] - Builds a gimhook mod`;

// Internal function for the post-typecheck build stage
// Don't use this for your own stuff, this is only meant to be used internally.

async function _buildStage2(sourceDirectory, production, spinner) {
	// Load package.json

	if (!fs.existsSync("package.json")) {
		spinner.error({ text: "Failed to find package.json!" });
		process.exit(1);
	}

	const metadata = JSON.parse(fs.readFileSync("package.json"));

	if (!("main" in metadata) || metadata.main === "") {
		spinner.error({ text: "\"main\" value not specified in package.json!" });
	}
	
	// Create the mod metadata object

	let modMetadata = {
		formatVersion: 2,
		production,
		name: path.basename(sourceDirectory),
		slug: path.basename(sourceDirectory).toLowerCase().replace(" ", "-").replace("_", "-"),
		description: "A Gimhook mod.",
		version: "1.0.0",
		author: "unknown",
		license: "unknown",
		dependencies: [],
		options: []
	};

	// Safely copy metadata from package.json when possible

	if (typeof metadata.name !== "undefined" && metadata.name !== "") {
		modMetadata.name = metadata.name;
	}

	if (typeof metadata.slug !== "undefined" && metadata.slug !== "") {
		modMetadata.slug = metadata.slug;
	}

	if (typeof metadata.description !== "undefined" && metadata.description !== "") {
		modMetadata.description = metadata.description;
	}

	if (typeof metadata.version !== "undefined" && metadata.version !== "") {
		modMetadata.version = metadata.version;
	}

	if (typeof metadata.author !== "undefined" && metadata.author !== "") {
		modMetadata.author = metadata.author;
	}

	if (typeof metadata.license !== "undefined" && metadata.license !== "") {
		modMetadata.license = metadata.license;
	}

	if (typeof metadata.modDependencies !== "undefined") {
		modMetadata.dependencies = metadata.modDependencies;
	}

	if (typeof metadata.modOptions !== "undefined") {
		modMetadata.options = metadata.modOptions;
	}

	// Build the project with esbuild

	try {
		await esbuild.build({
			entryPoints: [metadata.main],
			bundle: true,
			minify: production,
			platform: "browser",
			format: "iife",
			alias: {
				"react": "gimhook/react"
			},
			banner: {
				js: "// gimhook: " + JSON.stringify(modMetadata)
			},
			logLevel: "silent",
			outfile: "dist/index.js",
		});

		spinner.success({ text: "Finished!" });

		if (!production) {
			console.log("\nWARNING: This is a development build. Do not use it in production.\n\nIf you meant to create a production build, run \"npm run dist\" instead of \"npm run build\".");
		}
	} catch (e) {
		spinner.error({ text: `Build error: ${e.errors[0].text}` });

		if (e.errors[0].text === "Could not resolve \"gimhook/react\" (originally \"react\")") {
			const explanation = `\nThis means that you are importing React using the import alias, but esbuild could not find the gimhook package in your project.

There are 2 ways that you can solve this problem:
	1. Run "npm i -D gimhook" to install the Gimhook SDK (recommended)
	2. Use window.React directly instead of importing React`;

			console.log(explanation);
		}
		process.exit(1);
	}
}

// The build function.

async function build(sourceDirectory, production, typecheck) {
	// Show a warning message if production is false and typecheck is true

	if (typecheck && !production) {
		console.log("WARNING: You are using typechecking on a development build.\n\nThis is usually not what you want, as it makes it slower to build.\n");
	}

	// Start the spinner

	const spinner = createSpinner("Building project...").start({ color: "cyan" });
	const originalPath = process.cwd();

	process.chdir(sourceDirectory);
	
	// If typechecking is disabled, just run the second stage.

	if (!typecheck) {
		_buildStage2(sourceDirectory, production, spinner);
		return;
	}

	// Otherwise, run the typescript compiler command

	// On unix-like systems, running TypeScript is quite simple

	let typescriptCommand = "tsc";

	// However, on Windows we must do this awfulness

	if (process.platform === "win32") {
		typescriptCommand = "node_modules\\.bin\\tsc";
	}

	let command = process.platform === "win32" ? spawn("node", ["node_modules/typescript/lib/tsc.js"]) : spawn("tsc");
	let output = "";

	command.stdout.on("data", (data) => {
		output += data;
	});

	command.stderr.on("data", (data) => {
		output += data;
	});

	command.on("close", (status) => {
		if (status === 0) {
			// If it typechecked successfully, move on to stage 2.

			_buildStage2(sourceDirectory, production, spinner);
			return;
		}

		spinner.error({ text: "Failed to typecheck with TypeScript:" });
		console.log();
		console.error(output.trim());
		process.exit(1);
	});

	command.on("error", () => {
		if (output !== "") {
			spinner.error({ text: "Catastrophically failed in a way that shouldn't even be possible!" });
			console.log("Here's the error log, please send this to hexaheximal:");
			console.log(output);
			return;
		}
		
		spinner.error({ text: "Failed to find the TypeScript compiler! Please install it first!" });
		process.exit(1);
	});
}

function usage() {
	console.log(usageText);
	process.exit(1);
}

function main() {
	const _args = process.argv.slice(2);
	let args = [];
	let options = {};

	// Basic argument parser, maybe in the future I should make this into an npm module

	for (let i = 0; i < _args.length; i++) {
		const argument = _args[i];

		// Handle --key=value arguments

		if (argument.startsWith("--") && argument.includes("=")) {
			const splitArgument = argument.slice(2).split("=")

			options[splitArgument[0]] = splitArgument[1];
			continue;
		}

		// Handle --key arguments

		if (argument.startsWith("--")) {
			options[argument.slice(2)] = true;
			continue;
		}

		// Otherwise, push it to the args array if it's not an option

		args.push(argument);
	}

	// Argument util function

	const getArgument = (key) => {
		if (key in options) {
			return options[key];
		}

		return false;
	}

	// If there are no arguments, show the usage and exit

	if (args.length === 0) {
		usage();
	}

	// Grab the subcommand

	const subcommand = args[0];

	if (subcommand === "build") {
		// --production

		let production = false;

		// If a path is specified, use that as the project directory.

		if (args.length !== 1) {
			build(path.resolve(args[1]), getArgument("production"), getArgument("typecheck")).then(() => {});
		}

		// Otherwise, build the project in the current working directory.

		build(process.cwd(), getArgument("production"), getArgument("typecheck")).then(() => {});

		return;
	}

	usage();
}

if (require.main === module) {
	main();
}

module.exports = {
	build,
	main
};
