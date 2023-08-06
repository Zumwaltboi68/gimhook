/**
* @namespace gimhook
*/

declare var gimhook: {
	/**
 * gimhook.getHooks is used to get all of the hook callbacks, given a hook name.
 * @param {string} name - The name of the hook.
 * @returns {string[]}
 */

	getHooks: (name: string) => string[];

	/**
 * gimhook.addHook is used to add a callback function to a hook, which is called whenever the hook is triggered.
 * @param {string} name - The name of the hook.
	* @param {any} callback - The callback function to run when the hook is triggered.
 */

	addHook: (name: string, callback: any) => void;

	/**
 * gimhook.onJoin(handler) is a synonym for gimhook.addHook("join", handler).
	* @param {any} callback - The callback function to run when the game is joined.
 */

	onJoin: (callback: any) => void;

	game: {
		/**
  *	@property {boolean} isGameActive - gimhook.game.isGameActive is used to determine when a game is currently active.
  */

		isGameActive: boolean;

		/**
  *	@property {boolean} is2DGamemode - gimhook.game.is2DGamemode is used to determine if the active gamemode (if any) is a 2D gamemode.
  */

		is2DGamemode: boolean;
	};

	graphics: {
		player: {
			/**
			* gimhook.graphics.player.getPlayer is used to get the currently active player.
			* @returns {any}
			*/

			getPlayer: () => any;

			/**
			* gimhook.graphics.player.getPosition is used to get the position of the currently active player.
			* @returns {any}
			*/

			getPosition: () => any;

			/**
			* gimhook.graphics.player.setPosition is used to set the position of the currently active player.
			*
			* NOTE: No, you can't use this to teleport around the map and cheat. It is useless unless you're in the creative map editor.
			* @property {number} x - The new X value.
			* @property {number} y - The new Y value.
			* @returns {any}
			*/

			setPosition: (x: number, y: number) => any;
		};

		camera: {
			/**
			* gimhook.graphics.camera.getCamera is used to get the currently active camera.
			* @returns {any}
			*/

			getCamera: () => any;

			/**
			* gimhook.graphics.camera.getZoom is used to get the zoom value of the currently active camera.
			* @returns {number}
			*/

			getZoom: () => number;

			/**
			* gimhook.graphics.camera.setZoom is used to set the zoom value of the currently active camera.
			* @property {number} zoom - The new zoom value.
			* @returns {number}
			*/

			setZoom: (zoom: number) => number;
		};
	};

	ui: {
		/**
  *	@property {any} toaster -	gimhook.ui.toaster is the Gimkit toaster function, intercepted via Gimhook. You can use it to create notifications.
  */

		toaster: any;
	}
};

/**
* @namespace mod
*/

declare var mod: {
	/**
	* @property {string} name - The name of the current mod.
	*/

	name: string;

	/**
	* mod.getOption() returns an option for the current mod.
	* @returns {string | number | undefined}
	*/
	
	getOption(name: string): string | number | undefined;
};