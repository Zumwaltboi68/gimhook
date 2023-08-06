import { input, confirm } from '@inquirer/prompts';
import { createSpinner } from 'nanospinner';
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const tsconfigTemplate = {
	"compilerOptions": {
		"target": "ES2022",
		"noEmit": true,
		"jsx": "react",
		"types": ["gimhook"],
		"paths": {
			"react": ["./node_modules/gimhook/react"]
		}
	}
};

const modTemplate = `gimhook.onJoin(() => {
	console.log("example");
});`;

async function main() {
	if (fs.existsSync("package.json")) {
		console.log("Existing package.json found. Exiting.");
		process.exit(1);
	}

	let args = process.argv.slice(2);
	let cwd = process.cwd();
	let targetDirectory: string = args.length === 1 ? path.resolve(args[0]) : cwd;

	const name = await input({ message: "Project name:", default: path.basename(targetDirectory)});
	const slug = await input({ message: "Project slug (a short version of the name with only lowercase letters, numbers, and dashes):", default: path.basename(targetDirectory).toLowerCase().replace(" ", "-")});
	const url = await input({ message: "Project URL (blank for none):", default: ""});
	const description = await input({ message: "Project description:", default: ""});
	const author = await input({ message: "Author name:", default: ""});
	const license = await input({ message: "Project license:", default: "MIT"});
	const useTypescript = await confirm({ message: "Do you want to use typescript? (recommended)", default: true });
	const includeSDK = await confirm({ message: "Do you want to include the Gimhook SDK in the dependencies? (recommended)", default: true });
	const installDependencies = !useTypescript && !includeSDK ? false : await confirm({ message: "Do you want to install dependencies with npm after creating the project? (recommended)", default: true });

	// Start the spinner

	const spinner = createSpinner("Creating project...").start({ color: "cyan" });

	// Create the target directory if it doesn't already exist

	if (!fs.existsSync(targetDirectory)) {
		fs.mkdirSync(targetDirectory);
	}

	// Create the template for package.json

	let packageMetadata: any = {
		name,
		slug,
		version: "1.0.0",
		description,
		main: useTypescript ? "src/index.tsx" : "src/index.js",
		scripts: {
			build: "gimhook build",
			dist: `gimhook build --production${useTypescript ? " --typecheck" : ""}`,
			test: "echo \"Error: no test specified\" && exit 1"
		},
		author,
		license,
		devDependencies: {} as any,
		modDependencies: [],
		modOptions: []
	};

	if (url !== "") {
		packageMetadata.url = url;
	}

	// Add typescript to devDependencies if enabled

	if (useTypescript) {
		packageMetadata.devDependencies.typescript = "^5.1.6";
	}

	// Add the Gimhook SDK if enabled

	if (includeSDK) {
		packageMetadata.devDependencies.gimhook = "^0.0.16";
	}

	// Remove devDependencies if it does not contain anything

	if (!("typescript" in packageMetadata.devDependencies || "gimhook" in packageMetadata.devDependencies)) {
		delete packageMetadata.devDependencies;
	}

	const finish = () => {
		spinner.success({ text: "Finished!" });

		const shouldMentionInstallingDependencies = !installDependencies && "devDependencies" in packageMetadata;

		// Write a newline first

		console.log();

		// Show some information on what to do next

		if (targetDirectory !== cwd) {
			console.log(`Run \"cd ${path.relative(cwd, targetDirectory)}\" to enter the project directory.`);
			
			if (shouldMentionInstallingDependencies) {
				console.log("Then, run \"npm i\" to install all of the project dependencies.");
			}
		} else if (shouldMentionInstallingDependencies) {
			console.log("Run \"npm i\" to install all of the project dependencies.");
		}

		console.log("To create a development build of your project, run \"npm run build\".");
		console.log("To make a production build, run \"npm run dist\".");

		process.exit(0);
	}

	// Create package.json

	fs.writeFileSync(path.join(targetDirectory, "package.json"), JSON.stringify(packageMetadata, null, "  "));

	// Create .gitignore

	fs.writeFileSync(path.join(targetDirectory, ".gitignore"), "node_modules\ndist");

	// Add the code template

	fs.mkdirSync(path.join(targetDirectory, "src"));
	fs.writeFileSync(path.join(targetDirectory, useTypescript ? "src/index.tsx" : "src/index.js"), modTemplate);

	// Add tsconfig.json if TypeScript is enabled

	if (useTypescript) {
		fs.writeFileSync(path.join(targetDirectory, "tsconfig.json"), JSON.stringify(tsconfigTemplate, null, "\t"));
	}

	// Install dependencies if enabled

	if (installDependencies) {
		// Change the current directory to the target directory if it isn't already the target directory

		if (targetDirectory !== cwd) {
			process.chdir(targetDirectory);
		}

		let command = spawn("npm", ["i"]);

		command.on("close", (exitCode) => {
			if (exitCode !== 0) {
				spinner.error({ text: "Failed to install dependencies!" });
				return;
			}

			finish();
		});
	} else {
		// Otherwise, report a success and exit.

		finish();
	}
}

if (require.main === module) {
	main();
}
