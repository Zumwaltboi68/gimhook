declare var gimhook: any;

function setupUI() {
	// Use the require() hook to make React into a global variable

	gimhook.addHook("require", (moduleObject) => {
		if (typeof moduleObject.exports !== "object") {
			return; // We only want objects for the exports value
		}

		if (!("createElement" in moduleObject.exports && "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED" in moduleObject.exports)) {
			return; // We only want the module that we are looking for
		}
		
		// If this is the module that we want, then make it global

		console.log(`Gimhook (ui): Detected React instance in ${moduleObject.id}`);

		globalThis.React = moduleObject.exports;
	});

	// Use the require() hook to add the Gimhook documentation to the help menu

	gimhook.addHook("require", (moduleObject) => {
		if (typeof moduleObject.exports !== "object") {
			return; // We only want objects for the exports value
		}

		if (!("default" in moduleObject.exports)) {
			return; // We only want modules with a default export
		}

		// yes, this is very hacked together. Works perfectly fine though!

		try {
			if (!new String(moduleObject.exports.default).includes("Documentation & Help")) {
				return;
			}
		} catch (e) {
			return;
		}

		moduleObject.exports._default = moduleObject.exports.default;
		delete moduleObject.exports.default;

		moduleObject.exports.default = (props: any) => {
			// Grab the react element using the original function

			let vDOMTree = moduleObject.exports._default(props);

			// And then... modify it!

			let links = vDOMTree.props.children.props.children;

			console.log(links[0]);

			links.push((window as any).React.createElement(links[0].type, {
				name: "Gimhook SDK Documentation",
				description: "The work-in-progress documentation for the Gimhook SDK.",
				link: "https://github.com/gimhook/gimhook/blob/master/docs/sdk/index.md"
			}));

			return vDOMTree;
		};

		return moduleObject;
	});
}

export default setupUI;
