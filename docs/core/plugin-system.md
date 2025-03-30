# Oluja Engine: Plugin System (`src/core/PluginSystem.js`)

**Last Updated:** [Current Date - Please update manually]

## 1. Overview

The Oluja Engine utilizes a Plugin System to encapsulate optional or modular features, separating them from the core game loop and main managers. This promotes:

*   **Modularity:** Features like Autoplay, Turbo Mode, or potential future additions (e.g., specific bonus games, tournament integrations) can be developed and maintained independently.
*   **Extensibility:** New features can be added without modifying the core `Game.js` or major manager classes extensively.
*   **Organization:** Keeps feature-specific logic contained within dedicated plugin files.
*   **Conditional Loading:** (Future potential) Allows enabling/disabling features based on configuration or feature flags more easily.

The system is managed by the `PluginSystem` class (`src/core/PluginSystem.js`), which is instantiated within the `Game` class.

## 2. Architecture

1.  **Initialization (`Game.js` -> `_createManagers`):**
    *   An instance of `PluginSystem` is created after the core managers (`UIManager`, `SpinManager`, `ReelManager`, etc.) and dependencies (`logger`, `eventBus`, `featureManager`) are available.
    *   A comprehensive `dependencies` object is assembled, containing references to core managers, layers, factories (like `createButton` from `UIManager`), and the initial game state. This object is passed to the `PluginSystem` constructor.

2.  **Registration (`Game.js` -> `_createManagers`):**
    *   Specific plugin classes (e.g., `AutoplayPlugin` from `src/plugins/AutoplayPlugin.js`) are registered with the `PluginSystem` instance using `pluginSystem.registerPlugin(PluginClass)`. The registration process typically involves the `PluginSystem` storing the plugin class constructor.

3.  **Plugin Instantiation (`Game.js` -> `_finalizeSetup`):**
    *   After the main game setup is complete but *before* the game loop starts, `pluginSystem.initializePlugins()` is called.
    *   Inside `initializePlugins`, the `PluginSystem` iterates through the registered plugin classes.
    *   For each class, it creates an instance, passing the shared `dependencies` object collected during the `PluginSystem`'s own initialization.
    *   This dependency injection ensures each plugin instance has access to the necessary core engine components (logger, event bus, UI manager, etc.) without needing global variables or tight coupling to `Game.js`.

4.  **Plugin Operation:**
    *   Once instantiated, plugins typically operate by listening to events on the shared `eventBus`.
    *   For example, `AutoplayPlugin` listens for `game:stateChanged` to see if autoplay was enabled/disabled and `reels:stopped` to know when to potentially trigger the next spin.
    *   Plugins use the injected dependencies (e.g., `uiManager`, `spinManager`) to interact with the core system – updating UI elements, requesting spins, etc.

5.  **Cleanup (`Game.js` -> `destroy`):**
    *   During the game shutdown sequence, `pluginSystem.destroyPlugins()` is called *before* destroying the core managers.
    *   This method iterates through the active plugin instances and calls their respective `destroy()` methods (if they exist), allowing plugins to unsubscribe from events, kill tweens, or clean up any resources they created.

## 3. Plugin Dependencies

The `PluginSystem` provides a consistent set of dependencies to each plugin it instantiates. This currently includes:

*   `logger`: The shared logger instance.
*   `eventBus`: The shared event bus instance.
*   `apiService`: The API service instance.
*   `featureManager`: The feature manager instance.
*   `initialState`: The initial game state object.
*   `spinManager`: The `SpinManager` instance.
*   `layerUI`: The main `PIXI.Container` for the UI layer.
*   `uiManager`: The `UIManager` instance.
*   `factories`: An object containing factory functions, e.g.:
    *   `createButton`: The button factory function (provided via `UIManager`).
*   Potentially others as needed (e.g., `animationController`, `reelManager`).

Plugins should declare the dependencies they expect in their constructor and use them accordingly.

## 4. Creating a New Plugin

1.  **Create the File:** Add a new file in the `src/plugins/` directory (e.g., `src/plugins/MyNewFeaturePlugin.js`).
2.  **Define the Class:** Create an ES6 class for your plugin.
    ```javascript
    import { state } from '../core/GameState.js'; // Or rely on event data

    export class MyNewFeaturePlugin {
        // Declare expected dependencies
        /** @type {import('../utils/Logger.js').Logger | null} */
        logger = null;
        /** @type {import('../utils/EventBus.js').EventBus | null} */
        eventBus = null;
        /** @type {import('../ui/UIManager.js').UIManager | null} */
        uiManager = null;
        // ... other dependencies

        _listeners = []; // To store unsubscribe functions

        constructor(dependencies) {
            this.logger = dependencies.logger;
            this.eventBus = dependencies.eventBus;
            this.uiManager = dependencies.uiManager;
            // ... store other dependencies

            this.logger?.info('MyNewFeaturePlugin', 'Initialized.');
            this._subscribeToEvents();
        }

        _subscribeToEvents() {
            if (!this.eventBus) return;
            // Example: Listen for state changes
            const unsubscribeState = this.eventBus.on('game:stateChanged', this._handleStateChange.bind(this));
            this._listeners.push(unsubscribeState);
            // ... subscribe to other relevant events
        }

        _handleStateChange(eventData) {
            const { newState, updatedProps } = eventData;
            this.logger?.debug('MyNewFeaturePlugin', 'State changed:', updatedProps);
            // React to specific state changes needed for the feature
            if (updatedProps.includes('someRelevantProperty')) {
                // ... do something ...
                // Example: Update a UI element managed by this plugin
                // this.uiManager?.setButtonVisualState(...);
            }
        }

        destroy() {
            this.logger?.info('MyNewFeaturePlugin', 'Destroying...');
            this._listeners.forEach(unsubscribe => unsubscribe());
            this._listeners = [];
            // Nullify references
            this.logger = null;
            this.eventBus = null;
            this.uiManager = null;
            // ... nullify others
        }
    }
    ```
3.  **Register the Plugin:** In `src/core/Game.js` within the `_createManagers` method, after the `PluginSystem` is instantiated, add:
    ```javascript
    import { MyNewFeaturePlugin } from '../plugins/MyNewFeaturePlugin.js';
    // ... inside _createManagers ...
    this.pluginSystem.registerPlugin(MyNewFeaturePlugin);
    ```

## 5. Current Plugins

*   **`AutoplayPlugin` (`src/plugins/AutoplayPlugin.js`):** Manages the Autoplay feature logic, including starting/stopping sequences, tracking remaining spins, and interacting with the UI and SpinManager via events.

## 6. Future Enhancements

*   **Data-Driven UI for Turbo:** Refactor Turbo Mode into a `TurboPlugin` following the pattern established by `AutoplayPlugin`.
*   **Lifecycle Hooks:** Consider adding more explicit lifecycle hooks to plugins beyond `constructor` and `destroy` if needed (e.g., `onGameReady`, `onSpinStart`).
*   **Plugin Configuration:** Allow passing specific configuration objects to plugins during registration or instantiation.
*   **Conditional Registration:** Integrate with `FeatureManager` to only register plugins if their corresponding feature flag is enabled.
