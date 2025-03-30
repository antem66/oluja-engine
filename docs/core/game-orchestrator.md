# Oluja Engine: Game Orchestrator (`src/core/Game.js`)

**Last Updated:** March 30, 2024

## 1. Overview

The `Game` class (`src/core/Game.js`) is the central orchestrator of the Oluja Engine. It acts as the entry point after `main.js` and is responsible for setting up the entire game environment, managing core components, and running the main update loop.

## 2. Initialization Sequence (`constructor` & `init`)

1.  **Constructor (`constructor(canvasContainerId, dependencies)`):**
    *   Receives the ID of the HTML element where the PixiJS canvas should be appended.
    *   Receives a `dependencies` object containing instances of core services created in `main.js` (Logger, EventBus, ApiService, FeatureManager) and the `initialState` object.
    *   Validates that essential dependencies are present.
    *   Stores the dependencies and initial state for later use.

2.  **Initialization (`async init()`):**
    *   This asynchronous method performs the main setup tasks in order:
        *   `_exposeGlobals()`: Exposes the `Game` instance and managers to the `window` object for debugging purposes.
        *   `_setupPixiApp()`: Creates the `PIXI.Application` instance, initializes it with settings from `gameSettings.js`, and appends the canvas to the container element.
        *   `_loadAssets()`: Loads essential visual assets using `PIXI.Assets`. This currently includes symbol textures and button icon assets.
        *   `_createLayers()`: Creates all the necessary `PIXI.Container` layers using the `_createLayer` helper, assigning names and `zIndex` values for proper stacking order.
        *   `_createManagers()`: Instantiates all core engine managers (`BackgroundManager`, `ReelManager`, `AnimationController`, `UIManager`, `SpinManager`, `ResultHandler`, `FreeSpinsUIManager`, `LogoManager`, `PluginSystem`), passing them the required dependencies (layers, logger, eventBus, other managers, etc.). **Crucially, this is where Dependency Injection happens.** It also initializes the `ApiService` by calling its `init()` method.
        *   `_createGameElements()`: Creates any game elements that are not part of a specific manager but need to be added to a layer (e.g., the initial `PIXI.Graphics` object for paylines).
        *   `_initCoreModules()`: Initializes modules that require dependencies but aren't full manager classes (e.g., `PaylineGraphics`, `Notifications`, `InfoOverlay`, `DebugPanel`, `Animations`), passing them the necessary dependencies.
        *   `_finalizeSetup()`: Performs final setup steps:
            *   Sorts the stage children based on `zIndex`.
            *   Adds the main `update` method to the PixiJS ticker.
            *   Initializes all registered plugins via `pluginSystem.initializePlugins()`.
            *   Subscribes to any remaining necessary global events (like `notification:show`).

## 3. Core Update Loop (`update(ticker)`)

*   This method is added to the `app.ticker` and runs every frame.
*   Receives the `ticker` object containing timing information (`deltaTime`, `lastTime`).
*   **Responsibilities:**
    *   Calls the `update` method of `ReelManager` to advance reel spinning/stopping logic.
    *   Calls `updateParticles` (from `Animations.js`) to update active particle effects.
    *   **Detects Spin End:** Checks if reels were previously spinning (`this.wasSpinning` or `state.isSpinning`) but are no longer moving (`!anyReelMoving`).
    *   **Triggers `handleSpinEnd`:** If the spin end condition is met, it calls `spinManager.handleSpinEnd()` to initiate the result processing sequence.
*   Includes basic error handling to stop the ticker on critical loop errors.

## 4. Destruction (`destroy()`)

*   Responsible for cleaning up all resources created by the `Game` instance and its managers/plugins.
*   Calls the `destroy()` method on the `PluginSystem` first.
*   Calls the `destroy()` method on all core managers (`ResultHandler`, `UIManager`, `AnimationController`, `SpinManager`, `ReelManager`, `BackgroundManager`, `FreeSpinsUIManager`).
*   Stops the PixiJS ticker (`app.ticker.stop()`).
*   Destroys the PixiJS stage and application (`app.stage.destroy()`, `app.destroy()`).
*   Resets the game state (`destroyGameState()`).
*   Removes the global debug reference (`window.gameApp`).
*   Nullifies references to layers, managers, and dependencies to aid garbage collection.

## 5. Key Responsibilities Summary

*   Bootstrapping the entire application.
*   Creating and managing the PixiJS application and stage.
*   Defining and managing the rendering layers.
*   Instantiating and providing dependencies to core managers and plugins (Dependency Injection hub).
*   Running the main game update loop.
*   Detecting the visual completion of a spin and triggering the result handling process.
*   Orchestrating the graceful shutdown and cleanup of the application.
