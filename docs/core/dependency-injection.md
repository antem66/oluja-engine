# Oluja Engine: Dependency Injection

**Last Updated:** March 30, 2024

## 1. Overview

Dependency Injection (DI) is a design pattern used throughout the Oluja Engine to manage the relationships and dependencies between different modules, particularly the core managers.

The primary goal is to achieve **loose coupling**. Instead of modules creating their own dependencies (like a `Logger` or `EventBus` instance) or relying on global singletons directly, these dependencies are "injected" from an external source.

## 2. The Injector: `src/core/Game.js`

The central point for dependency injection in the engine is the `Game` class (`src/core/Game.js`). It acts as the main **injector** or **assembler**.

Here's the typical flow:

1.  **Initial Dependencies:** The `Game` class itself receives core, application-wide services in its `constructor`. These are typically created in `src/main.js` and passed in a `dependencies` object:
    *   `Logger` instance
    *   `EventBus` instance
    *   `ApiService` instance
    *   `FeatureManager` instance
    *   `initialState` object

2.  **Manager Instantiation (`_createManagers()`):** Inside its `async init()` method, the `Game` class calls `_createManagers()`. This private method is responsible for **instantiating** all the core manager classes:
    *   `BackgroundManager`
    *   `ReelManager`
    *   `AnimationController`
    *   `UIManager`
    *   `SpinManager`
    *   `ResultHandler`
    *   `FreeSpinsUIManager`
    *   `LogoManager`
    *   `PluginSystem`
    *   *(Others as needed)*

3.  **Injection via Constructor:** When `Game` creates an instance of a manager (e.g., `new SpinManager(...)`), it passes all the necessary dependencies **into that manager's constructor**.

    *Example (Conceptual):*
    ```javascript
    // Inside Game.js -> _createManagers()
    
    // Create AnimationController, passing its dependencies
    this.animationController = new AnimationController({
        eventBus: this.deps.eventBus,
        logger: this.deps.logger
    });
    
    // Create UIManager, passing its dependencies (including other managers)
    this.uiManager = new UIManager({
        uiLayer: this.layerUI,
        eventBus: this.deps.eventBus,
        logger: this.deps.logger,
        initialState: this.initialState, // Pass initial state
        // Note: May need AnimationController if it directly calls win animations
        // animationController: this.animationController 
    });
    
    // Create SpinManager, passing its dependencies
    this.spinManager = new SpinManager({
        eventBus: this.deps.eventBus,
        logger: this.deps.logger,
        apiService: this.deps.apiService,
        reelManager: this.reelManager, // Inject ReelManager
        // uiManager: this.uiManager // Inject UIManager if needed
    });
    
    // ... and so on for other managers ...
    ```

4.  **Module Initialization (`_initCoreModules()`):** A similar pattern is used in `_initCoreModules()` for helper modules or components that aren't full-fledged managers but still require dependencies (like `PaylineGraphics`, `Notifications`, `Animations`). Their `init` functions receive the necessary dependencies.

## 3. Common Dependencies

Managers and modules typically receive dependencies such as:
*   `eventBus`: For subscribing to and emitting events.
*   `logger`: For logging messages.
*   `apiService`: For interacting with the (mock) backend.
*   Specific PixiJS `Container` layers (e.g., `layerUI`, `layerReels`).
*   References to **other managers** they need to interact with (e.g., `SpinManager` needs `ReelManager` and `ApiService`).
*   `initialState` or direct access to the `state` object from `GameState.js`.
*   `featureManager`: To check feature flags.
*   `animationController`: To register or sometimes trigger animations.

## 4. Benefits

*   **Decoupling:** Managers don't need to know *how* to create a `Logger` or where the `EventBus` comes from. They just declare what they need in their constructor.
*   **Testability:** When testing a manager (e.g., `SpinManager`), you can easily create mock versions of its dependencies (`ReelManager`, `ApiService`, `EventBus`) and pass those into the constructor, isolating the unit under test.
*   **Centralized Configuration:** The `Game` class provides a single place to see how all the major components are created and wired together.
*   **Flexibility:** If the implementation of a dependency changes (e.g., a different `Logger`), only the creation point (in `main.js` or `Game.js`) needs to be updated, as long as the interface remains the same.

## 5. Usage

When creating new managers or core modules:
1.  Define a `constructor` that accepts an object containing all required dependencies.
2.  Store these dependencies as instance properties (e.g., `this.eventBus = dependencies.eventBus`).
3.  In `Game.js`, update `_createManagers()` (or `_initCoreModules()`) to instantiate the new module, passing the correct dependencies from `this.deps` or other already-created managers (`this.someManager`).
