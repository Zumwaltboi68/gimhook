declare var gimhook: any;

function phaserCheck() {
	if (typeof globalThis.Phaser === "undefined") {
		throw new Error("Attempted to use gimhook.graphics before Phaser is loaded! Is this a non-2D gamemode?");
	}
}

function setupGraphics() {
	// First of all, we need to setup the graphics-related stuff in the gimhook object.

	gimhook.graphics = {camera: {}, player: {}};

	// Then, use a require() hook to expose the phaser instance (not the main Phaser object, that's already global)

	gimhook.addHook("require", (moduleObject) => {
		if (typeof moduleObject.exports !== "object") {
			return; // We only want objects for the exports value
		}

		if (!("default" in moduleObject.exports && typeof moduleObject.exports.default === "object")) {
			return; // We only want the module that we are looking for
		}

		if (!(moduleObject.exports.default !== null && "phaser" in moduleObject.exports.default)) {
			return; // We still only want the module that we are looking for
		}
		
		// If this is the module that we want, then grab the phaser instance and make it global

		console.log(`Gimhook (graphics): Detected Phaser instance in ${moduleObject.id}`);

		gimhook.graphics.phaserInstance = moduleObject.exports.default.phaser;

		return moduleObject;
	});

	// Also, define some gimhook functions for graphics while we're at it:

	// Player

	gimhook.graphics.player.getPlayer = () => {
		phaserCheck();
		return gimhook.graphics.phaserInstance.mainCharacter;
	};

	gimhook.graphics.player.getPosition = () => {
		const position = gimhook.graphics.player.getPlayer()?.body.pos;
		return typeof position === "undefined" ? {x: 0, y: 0} : position;
	};

	gimhook.graphics.player.setPosition = (x, y) => {
		return gimhook.graphics.player.getPlayer()?.body.setPosition(x, y);
	};

	// Camera

	gimhook.graphics.camera.getCamera = () => {
		phaserCheck();
		return gimhook.graphics.phaserInstance.scene.cameras.cameras[0];
	};

	gimhook.graphics.camera.getZoom = () => {
		return gimhook.graphics.camera.getCamera()?.zoom;
	};

	gimhook.graphics.camera.setZoom = (zoom) => {
		gimhook.graphics.camera.getCamera()?.setZoom(zoom);
	};
}

export default setupGraphics;