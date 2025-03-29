# Improving Code Modularity and Extensibility for a Multi-Game Engine

## Current Architecture Assessment

The slot game engine currently follows a modular approach with clear separation between UI components, animation systems, game logic, and configuration. The codebase is already well-structured with:

- Centralized state management through `GameState.js`
- Configuration-driven game parameters
- Separation of concerns between UI, animations, and game logic
- A flexible animation system using GSAP

However, to support a **production-ready engine** designed for **multiple future games**, further enhancements are needed to improve extensibility, clarity, and robustness.

## Goals

1. Improve code comprehension for new developers joining future game projects
2. Reduce coupling between core engine modules and game-specific features
3. Standardize interfaces and interactions between components
4. Make the system highly extensible for new game mechanics and features via plugins
5. Simplify the process of creating and configuring new slot game variants
6. Enhance robustness and maintainability for production environments
7. Prepare architecture for seamless integration with an authoritative backend server, while maintaining current functionality via mocking initially.

## Proposed Improvements

### 1. Event System Implementation

**Current Issue:** Direct module imports create tight coupling (e.g., WinEvaluation directly calls UI and Animation functions).

**Solution:** Implement a lightweight global event system (`EventBus`) for decoupled communication.

```javascript
// utils/EventBus.js
export class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

export const globalEventBus = new EventBus();
```

**Usage:**
- Modules emit events for significant state changes or actions (e.g., `win:evaluated`, `spin:started`, `server:responseReceived`).
- Modules subscribe to relevant events instead of holding direct references to other modules.
- **`ApiService` Integration:** `ApiService` becomes the sole source of server interaction results. It emits events like `server:spinResultReceived`, `server:balanceUpdated`, `server:error` upon receiving responses or encountering issues. **Crucially, during initial refactoring, it will emit these events using locally generated mock data.**
- **Outcome Consumption:** Modules like `SpinManager` (or a dedicated `ResultHandler`) will listen for `server:spinResultReceived` to get authoritative stop positions, win data, and feature triggers.

### 2. Module Interface & API Documentation

**Current Issue:** Lack of clear documentation about module responsibilities, public methods, and consumed/emitted events.

**Solution:** Create standardized interface documentation (e.g., using JSDoc) at the top of each key module.

**Include Documentation For:** `UIManager`, `Animations`, `WinEvaluation`, `SpinManager`, `ReelManager`, `GameState`, **`ApiService`**, `EventBus`, `PluginSystem`, `FeatureManager`, `AnimationController`.

```javascript
/**
 * @module ApiService
 * @description Handles all communication with the backend game server.
 * 
 * Public API:
 * - init(config): Initializes the service with server endpoints.
 * - requestSpin(betInfo): Sends a spin request to the server.
 * - requestGameState(): Fetches the current game state from the server.
 * 
 * Events Emitted:
 * - server:spinResultReceived {data: SpinResult}
 * - server:balanceUpdated {newBalance: number}
 * - server:gameStateReceived {state: GameStateData}
 * - server:error {type: string, message: string}
 * 
 * Events Consumed: (Potentially none, depends on implementation)
 */
```

### 3. Component Lifecycle Standardization

**Current Issue:** Inconsistent initialization and cleanup patterns across modules.

**Solution:** Standardize component lifecycle methods (`init`, `destroy`, optionally `update`) across all major engine modules and plugins.

```javascript
// Template for modules/plugins
export class ModuleTemplate {
  constructor(dependencies) {
    this.initialized = false;
    this.dependencies = dependencies;
  }

  init() {
    // Setup code
    this.initialized = true;
    return this;
  }

  update(deltaTime) {
    // Update logic (for modules that need per-frame updates)
  }

  destroy() {
    // Cleanup resources
    this.initialized = false;
  }
}
```

### 4. Animation Pipeline Restructuring

**Current Issue:** Win animation responsibilities split between `UIManager` and `Animations`, complex flow.

**Solution:** Implement a dedicated `AnimationController` using the `EventBus` to manage distinct animation stages (e.g., `prepare`, `execute`, `complete`).

```javascript
// AnimationController.js
export class AnimationController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
    this.stages = {
      preparation: [], // Functions that prepare for animation
      execution: [],   // Core animation functions
      completion: []   // Post-animation cleanup
    };
  }

  setupEventListeners() {
    this.eventBus.on('win:evaluated', this.handleWinEvaluated.bind(this));
  }

  handleWinEvaluated(winData) {
    this.runAnimationPipeline(winData);
  }

  runAnimationPipeline(data) {
    // Run stages in sequence
    Promise.resolve()
      .then(() => this.runStage('preparation', data))
      .then(() => this.runStage('execution', data))
      .then(() => this.runStage('completion', data))
      .then(() => this.eventBus.emit('animation:completed', data));
  }

  runStage(stageName, data) {
    // Execute all functions in the stage
    const promises = this.stages[stageName].map(fn => fn(data));
    return Promise.all(promises);
  }

  registerAnimation(stage, animationFn) {
    if (!this.stages[stage]) return;
    this.stages[stage].push(animationFn);
    return () => this.unregisterAnimation(stage, animationFn);
  }

  unregisterAnimation(stage, animationFn) {
    if (!this.stages[stage]) return;
    this.stages[stage] = this.stages[stage].filter(fn => fn !== animationFn);
  }
}
```
- Modules like `PaylineGraphics`, `Animations` (for symbol/big win anims), `UIManager` (for win counter) register their specific animation functions with the `AnimationController` for the appropriate stage (`execute`).

### 5. Feature Flag System

**Current Issue:** Features like autoplay, turbo, specific bonus types are tightly integrated.

**Solution:** Implement a `FeatureManager` to easily enable/disable core engine features or game-specific mechanics, potentially loaded from game configuration.

```javascript
// utils/FeatureManager.js
export class FeatureManager {
  constructor(initialFlags = {}) { this.features = initialFlags; }
  loadFlags(flags) { this.features = { ...this.features, ...flags }; }
  isEnabled(featureName) { return this.features[featureName] === true; }
}
export const featureManager = new FeatureManager(); // Or inject via DI
```
- Used to conditionally initialize UI elements, register event listeners, or execute logic based on enabled features.
- Include debug flags like `debug.useMockApi` (defaults to `true` initially) and `debug.forceWin`.

### 6. Plugin Architecture for Extensions

**Current Issue:** Adding new game features (unique bonuses, side games) requires modifying core engine files.

**Solution:** Implement a `PluginSystem` to register and manage game-specific features or extensions.

- **Core vs. Plugin:** Define boundaries. Core handles fundamental slot mechanics (reels, basic UI, server comms). Plugins handle specific game rules, bonus rounds, unique presentation elements.
- **Lifecycle Hooks:** The `PluginSystem` should call standardized methods on plugins if they exist: `init(gameInstance)`, `destroy()`, and potentially event-driven hooks like `onSpinStart()`, `onSpinEnd(resultData)`, `onWinEvaluated(winData)`. This provides clear integration points.

```javascript
// core/PluginSystem.js
export class PluginSystem {
  constructor(game) {
    this.game = game;
    this.plugins = new Map();
  }

  register(name, plugin) {
    if (this.plugins.has(name)) {
      console.warn(`Plugin '${name}' already registered. Overwriting.`);
    }
    
    this.plugins.set(name, plugin);
    
    if (typeof plugin.init === 'function') {
      plugin.init(this.game);
    }
    
    return this;
  }

  unregister(name) {
    const plugin = this.plugins.get(name);
    
    if (plugin && typeof plugin.destroy === 'function') {
      plugin.destroy();
    }
    
    this.plugins.delete(name);
    return this;
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }
}

// Example Plugin Lifecycle
// plugins/MyBonusGamePlugin.js
export class MyBonusGamePlugin {
  init(game) {
    this.game = game;
    this.eventBus = game.eventBus;
    
    // Register event listeners
    this.eventBus.on('spin:complete', this.handleSpinComplete.bind(this));
    
    // Add UI elements
    this.addAutoplayButton();
  }

  handleSpinComplete() {
    if (this.game.state.isAutoplaying) {
      // Handle autoplay logic
    }
  }

  destroy() {
    // Clean up resources
  }
}
```

### 7. Dependency Injection (DI) Pattern

**Current Issue:** Direct imports create tight coupling, making testing and replacement difficult.

**Solution:** Use constructor-based Dependency Injection for core engine services.

```javascript
// In main.js or GameFactory.js
const eventBus = new EventBus();
const featureManager = new FeatureManager();
const apiService = new ApiService();
const animationController = new AnimationController(eventBus);
// ... other services

const game = new Game({
  eventBus,
  featureManager,
  apiService,
  animationController,
  // ... inject UIManager, ReelManager, SpinManager instances etc.
});

// In Game.js
constructor(dependencies) { this.deps = dependencies; /* Assign dependencies */ }
```
- Core modules receive dependencies (`EventBus`, `ApiService`, `FeatureManager`, other managers) via their constructor.
- Facilitates easier mocking for tests and swapping implementations.

### 8. Multi-Game Configuration Management

**Current Issue:** Configuration assumes a single game setup.

**Solution:** Define a clear strategy for managing configurations across multiple games.

- **Layered Config:** Implement a system where a base engine configuration (in `src/config/`) is merged with game-specific configurations (e.g., `games/game-a/config/`). Game-specific files override base settings.
- **Loading:** The game initialization process should load the appropriate base + game-specific configs.
- **Access:** Provide a centralized way (e.g., a `ConfigService` injected via DI) for modules and plugins to access the final, merged configuration values.
- **Feature Flags:** Game-specific configs could also define which features/plugins are enabled (`FeatureManager.loadFlags(gameConfig.features)`).
- **Logging Configuration:** Game-specific configs can define enabled logging domains and minimum log levels (e.g., `{ logging: { domains: { 'ApiService': 'INFO', 'UIManager': 'DEBUG', '*': 'WARN' } } }`).
- Debug flags (`debug.useMockApi`, etc.) can also be part of the game configuration.

### 9. Centralized Error Handling & Logging

**Current Issue:** No standardized approach for handling or reporting errors in production. Limited control over log verbosity.

**Solution:** Implement robust error handling and a flexible, domain-based logging mechanism.

- **Error Boundaries:** Use try/catch blocks in critical sections (API calls, event handlers, animation callbacks).
- **Centralized Logger:** Create a `Logger` service (injectable via DI) supporting different log levels (DEBUG, INFO, WARN, ERROR) and **logging domains/namespaces**. Modules specify a domain when logging (e.g., `logger.debug('UIManager', 'Button state updated')`).
- **Configurable Logging:** The `Logger` loads configuration (from `ConfigService` or its own setup) defining the minimum log level for each domain (and a default '*' level). It only outputs logs if the message level meets the threshold for its domain.
- **Reporting:** In production builds, the `Logger` could send ERROR (and potentially WARN) level logs to a remote monitoring service.
- **User Feedback:** Define how critical errors are communicated to the user.
- **Graceful Recovery:** Attempt to recover game state or offer a refresh mechanism upon encountering non-fatal errors where possible.

```javascript
// Example Logger Usage
// In UIManager.js (assuming logger is injected)
this.logger.info('UIManager', 'Initializing UI components...');
try {
  // Some operation
  this.logger.debug('UIManager', 'Operation successful.');
} catch (error) {
  this.logger.error('UIManager', 'Operation failed:', error);
  // Trigger user feedback or recovery
}
```

### 10. Server Integration & Outcome Handling Strategy

**Current Issue:** Game logic currently determines outcomes (reel stops, wins). Production requires server authority. Need a transition path that preserves current functionality during refactoring.

**Solution:** Refactor logic to depend on server-provided outcomes (via events), but use a configurable mock implementation initially.

- **`ApiService` Mocking:** `ApiService.requestSpin` will check `featureManager.isEnabled('debug.useMockApi')` (or similar flag, initially `true`).
    - If `true`: It calls an internal **private** method (e.g., `_generateMockSpinResult()`) which **encapsulates the current client-side outcome generation logic** (random stops, handling `debug.forceWin`, calculating basic wins based on stops).
    - If `false`: It makes the actual HTTP request to the backend server.
    - In both cases, it emits the *same* `server:spinResultReceived` event containing the outcome data (stop positions, win lines, feature triggers, final balance) in the expected server response format.
- **`SpinManager` / `ResultHandler`:** This module listens *only* for `server:spinResultReceived`. It **does not generate outcomes itself**. It takes the stop positions from the event payload and instructs the `ReelManager`/`Reels` where to stop.
- **`WinEvaluation` Role Change:** This module listens for `server:spinResultReceived` (or a subsequent `win:evaluateRequest` event triggered by `SpinManager`). Its primary role becomes:
    - **Validation (Optional):** Verify server win data against the final symbol grid as a sanity check.
    - **Symbol Identification:** Find the specific `Symbol` instances on screen corresponding to the winning lines provided in the event data.
    - **Data Preparation:** Prepare data needed for animations (e.g., list of winning symbols, total win amount from server data) and potentially emit an event like `win:validatedForAnimation`.
    - **It no longer calculates win amounts for state updates.** Balance updates should come directly from `server:spinResultReceived` or `server:balanceUpdated` events consumed elsewhere (e.g., by a state manager module).
- **Preserving Functionality:** By moving the *current* outcome generation logic into `ApiService._generateMockSpinResult()` and ensuring the rest of the application only reacts to the `server:spinResultReceived` event, the game will function exactly as it does now post-refactoring, while being architecturally ready for the real server.

### 11. Performance & Responsiveness Considerations

**Current Issue:** While the architectural refactor focuses on structure, performance (especially for mobile) and responsive UI layout are critical for production but not explicitly addressed.

**Solution:** Integrate performance best practices where feasible during the refactor and acknowledge the need for dedicated future work.

- **Memory Management:** Emphasize strict resource cleanup in the standardized component lifecycle (`destroy` methods) to prevent memory leaks, crucial on mobile.
- **Rendering (Awareness):** While not a primary goal of *this* refactor, developers should be mindful of PixiJS best practices (preferring Sprites over Graphics where appropriate, considering batching implications) during implementation.
- **Object Pooling (Future):** Note that object pooling for frequently created/destroyed objects (like Symbols during reel spins, particles) should be investigated *if* performance profiling reveals bottlenecks, especially targeting mobile devices.
- **Responsiveness Strategy (Separate):** Acknowledge that a dedicated strategy for handling different screen sizes, aspect ratios, and resolutions (e.g., scaling, responsive layout adjustments, adaptive assets) is required. This architectural refactor should aim not to hinder future responsiveness implementations; components should ideally use relative positioning or layout logic where practical.

## Implementation Plan

*(Refined Phases)*

### Phase 1: Core Infrastructure & Documentation (Foundation Laying) (COMPLETE)

*   **[X]** **Task 1.1 - 1.5:** Implement `EventBus`, `FeatureManager`, `Logger`; Setup & Run Unit Tests.
*   **[X]** **Task 1.6:** Define standard module lifecycle template (`init`, `destroy`) in documentation. **Emphasize that `destroy` must handle cleanup of all resources (PIXI objects, listeners, timers) to prevent memory leaks.**
*   **[X]** **Task 1.7:** **Documentation:** Start JSDoc headers for core modules.
*   **[X]** **Task 1.8:** Define `server:spinResultReceived` payload structure.

### Phase 2: DI and Initial Refactoring (Decoupling Core Services)

*   **[X]** **Task 2.1:** Implement Dependency Injection container or pattern (e.g., manual injection in `main.js` or `Game.js` constructor).
*   **[X]** **Task 2.2:** Inject `EventBus`, `FeatureManager`, `Logger` into the main `Game` class/entry point and core modules as needed.
*   **[X]** **Task 2.3:** **Refactor `ApiService`:**
    *   **[X]** Inject dependencies (`Logger`, `EventBus`, `FeatureManager`, `ConfigService`?). (Core deps done, ConfigService TBD)
    *   **[X]** Implement `requestSpin` with the `debug.useMockApi` check. (Already Done)
    *   **[X]** **Create private `_generateMockSpinResult()`:** Move the *existing* client-side outcome generation logic (random stops, debug win forcing) into this method. Ensure it returns data matching the defined `server:spinResultReceived` payload structure. (Already Done)
    *   **[X]** Ensure `requestSpin` emits `server:spinResultReceived` with data from `_generateMockSpinResult()` when mocked, or from the (future) real API call otherwise. (Already Done)
    *   **[X]** Add domain-specific logging.
    *   [ ] **Test:** Verify `requestSpin` emits the correct event with correctly structured mock data, preserving current win/stop logic. (Manual test needed)
*   **[X]** **Task 2.4:** **Refactor `SpinManager` (or create `ResultHandler`):**
    *   **[X]** Inject dependencies (`EventBus`, `Logger`, `ReelManager`). (Done for ResultHandler)
    *   **[X]** **Remove all outcome generation logic** (random stops, etc.). (Done - New ResultHandler has none)
    *   **[X]** **Subscribe to `server:spinResultReceived`.** (Done in ResultHandler.init)
    *   **[X]** Implement logic to take `stopPositions` from the event payload and call `reel.setFinalStopPosition()` (or similar) on the relevant reels managed by `ReelManager`. (Done in ResultHandler._handleSpinResultReceived)
    *   [ ] Potentially trigger subsequent events like `win:evaluateRequest` if `WinEvaluation` is separate. (TODO in ResultHandler)
    *   **[X]** Add domain-specific logging. (Done in ResultHandler)
    *   [ ] **Test:** Verify reels are correctly instructed to stop based *only* on the (mocked) event data. (Manual test needed)
*   **[ ]** **Task 2.5:** **Refactor `UIManager` (Partial):**
    *   **[x]** Convert `UIManager.js` to a `UIManager` class.
    *   **[x]** Update `Game.js` to instantiate `UIManager` and inject dependencies.
    *   **[ ]** Manual Test: Verify UI elements are created and positioned correctly.
    *   **[ ]** Manual Test: Verify button initial states are correct.
    *   **[ ]** Manual Test: Verify button clicks still function (even if via old handlers for now).

**NOTE (Pending Fixes):** After instantiating `UIManager` in `Game.js`, several linter errors appeared. These relate to:
1.  Calls within `Game.js#_initCoreModules` to various `init...` functions (e.g., `initPaylineGraphics`, `initFreeSpins`, `initNotifications`, etc.). These functions have not yet been refactored to accept the `moduleDeps` object containing dependencies like `logger`, `eventBus`, `uiManager`, etc.
2.  Calls within `Game.js#_finalizeSetup` and `Game.js#update` to the previously global functions `updateDisplays()` and `setButtonsEnabled()`. These should now be called via the `UIManager` instance (e.g., `this.uiManager.updateDisplays()`).

These integration errors in `Game.js` will be addressed **after** the relevant modules (`GameState`, `PaylineGraphics`, `FreeSpins`, `Notifications`, etc.) have been refactored in subsequent tasks to handle dependency injection and event-based communication correctly.

*   **[ ]** **Task 2.6:** **Refactor `GameState`:**
    *   **[x]** Inject `Logger`, `EventBus`.
    *   **[x]** Emit `state:changed:*` events.
    *   **[x]** *Add domain-specific logging* for state changes.
    *   **[ ]** Ensure balance/feature state updates are primarily driven by consuming server events (requires server integration/mock updates later).
    *   **[x]** **Test:** Verify state updates, events, and logging.
*   **[ ]** **Task 2.7:** Write/update unit tests for refactored modules using mocked dependencies.
    *   **[x]** Unit Tests for `GameState` (Added in `test/GameState.test.js`).
    *   **[ ]** Unit Tests for `ApiService` (Pending).
    *   **[x]** Unit Tests for `ResultHandler` (Added in `test/ResultHandler.test.js`).
    *   **[ ]** Unit Tests for `UIManager` (Pending).
*   **[ ]** **Task 2.8:** Integrate `ResultHandler` more deeply (manual test & potentially more unit tests).

### Phase 3: Animation & Win Flow Refactoring (Streamlining Presentation)

*   **[ ]** **Task 3.1:** Implement `AnimationController` class in `src/core/AnimationController.js` (inject `EventBus`, `Logger`).
*   **[ ]** **Task 3.2:** Inject `AnimationController` into the main `Game` class.
*   **[ ]** **Task 3.3:** **Refactor `Animations` module:**
    *   **[ ]** Inject dependencies (`AnimationController`, `Logger`).
    *   **[ ]** *Add domain-specific logging*.
    *   **[ ]** Register animation logic with `AnimationController`.
    *   **[ ]** **Test:** Verify animations and logging.
*   **[ ]** **Task 3.4:** **Refactor `UIManager` (Win Animation):**
    *   **[ ]** Inject `AnimationController`, `Logger`.
    *   **[ ]** *Add domain-specific logging*.
    *   **[ ]** Register `animateWin` logic with `AnimationController`.
    *   **[ ]** **Test:** Verify win counter animation and logging.
*   **[x]** **Task 3.5:** Refactor `WinEvaluation` (validate server data, identify symbols, emit event).
*   **[x]** **Task 3.6:** Refactor `PaylineGraphics` (subscribe to `win:validatedForAnimation`, draw lines based on event, use GSAP).
*   **[ ]** **Task 3.7:** Update integration tests for the win flow (Pending - Requires Integration Test Setup).
*   **Note:** When refactoring animations, be mindful of potential performance implications (e.g., number of simultaneous tweens, complexity).

### Phase 3.5: Integration & Fixes

**Goal:** Address immediate integration errors preventing the app from running and ensure core features interact correctly with refactored services using dependency injection and events.

**Tasks:**

*   **Task 3.5.1: Refactor `TurboMode.js` - DONE**
    *   Modify `initTurboMode` to accept dependencies (`logger`, `eventBus`, `featureManager`).
    *   Remove direct imports/calls to `UIManager`.
    *   Listen for `state:changed:isTurboMode` instead of direct state checks/updates where applicable.
    *   Update call in `Game.js`.
*   **Task 3.5.2: Refactor `Autoplay.js` - DONE**
    *   Modify/Create `initAutoplay` to accept dependencies (`logger`, `eventBus`, `featureManager`, `spinManager`).
    *   Remove direct imports/calls to `UIManager`, `GameState`, `ButtonHandlers`.
    *   Listen for events like `reels:stopped`, `state:changed:*`.
    *   Trigger spins via `spinManager`.
    *   Emit `autoplay:requestStop` events.
    *   Update call in `Game.js`.
*   **Task 3.5.3: Refactor `FreeSpins.js` - DONE**
    *   Modify `initFreeSpins` to accept dependencies (`logger`, `eventBus`, `featureManager`, `spinManager`, `animationController`, `backgroundManager`, `effectsLayer`).
    *   Remove direct imports/calls to `UIManager`, `GameState`, `ButtonHandlers`, `PIXI.Application`.
    *   Listen for `freespins:triggered`, `reels:stopped`.
    *   Trigger state changes, notifications, background changes, animations, and spins via events or injected managers.
    *   Update call in `Game.js`.
*   **Task 3.5.4: Handle UI Button Events in `GameState` - PENDING**
    *   Inject `EventBus` into `GameState`.
    *   Subscribe to `ui:button:click` events.
    *   Implement logic to handle 'turbo', 'autoplay', 'betIncrease', 'betDecrease' clicks.
    *   Update the corresponding state properties (`isTurboMode`, `isAutoplaying`, `currentBetPerLine`, etc.).
    *   Ensure `game:stateChanged` event is emitted after state modifications.
    *   Call `applyTurboSettings` when turbo state changes.
*   **Task 3.5.5: Refactor `WinEvaluation.js` - PENDING**
    *   Modify/Create `initWinEvaluation` to accept dependencies.
    *   Listen for `spin:evaluateRequest`.
    *   Remove direct UI calls.
    *   Emit events for payline drawing, animations, free spins trigger.
    *   Update state via `state:update` events.
*   **Task 3.5.6: Refactor `PaylineGraphics.js` - PENDING**
    *   Modify/Create `initPaylineGraphics` to accept dependencies.
    *   Listen for `spin:started` (to clear lines).
    *   Listen for `payline:drawRequest` (to draw lines).
*   **Task 3.5.7: Refactor/Cleanup `Animations.js` - PENDING**
    *   Ensure `initAnimations` accepts dependencies correctly.
    *   Ensure animations are triggered via `AnimationController` or events.
*   **Task 3.5.8: Fix Core Module Initializations (`Game.js`) - PENDING**
    *   Refactor `initNotifications`, `initInfoOverlay`, `initDebugPanel` to accept dependencies cleanly.
    *   Resolve remaining linter errors in `Game.js` related to these calls.
*   **Task 3.5.9: Implement Missing `destroy()` Methods - PENDING**
    *   Add `destroy` methods to managers and modules currently lacking them (e.g., `ReelManager`, `BackgroundManager`, `SpinManager`, feature modules) to unsubscribe listeners and clean up.
*   **Task 3.5.10: Implement `BackgroundManager.changeBackground` - PENDING**
    *   Add the missing `changeBackground` method used by `FreeSpins.js`.

### Phase 4: Plugin Architecture & Advanced Features

*   **[ ]** **Task 4.1:** Implement `PluginSystem` class in `src/core/PluginSystem.js`.
*   **[ ]** **Task 4.2:** Integrate `PluginSystem` into `Game.js`.
*   **[ ]** **Task 4.3:** Implement Multi-Game Configuration loader.
*   **[ ]** **Task 4.4:** Create `ConfigService` (inject `Logger`), provide access to merged config.
*   **[ ]** **Task 4.5:** Update `FeatureManager` to load flags from `ConfigService`.
*   **[ ]** **Task 4.6:** Update `Logger` service to load domain/level configuration from `ConfigService` and implement filtering logic.
*   **[ ]** **Task 4.7:** **Refactor Autoplay Plugin:**
    *   **[ ]** Create `src/plugins/AutoplayPlugin.js`.
    *   **[ ]** Move logic, inject deps (`Logger`, `EventBus`, etc.).
    *   **[ ]** *Add domain-specific logging* (`this.logger.info('AutoplayPlugin', ...)`).
    *   **[ ]** Register plugin.
    *   **[ ]** Ensure plugin reacts appropriately to server events if needed (e.g., stopping autoplay on server error).
    *   **[ ]** **Test:** Verify Autoplay functionality and logging.
*   **[ ]** **Task 4.8:** Enhance `Logger` for potential remote reporting hooks.

### Phase 5: Error Handling, Polish, Performance & Final Documentation

*   **[ ]** **Task 5.1:** Implement Centralized Error Handling strategy.
*   **[ ]** **Task 5.2:** Refine Plugin Lifecycle hooks.
*   **[ ]** **Task 5.3:** **Performance Profiling:** Conduct initial profiling on key interactions.
*   **[ ]** **Task 5.4:** **Responsiveness Strategy Placeholder:** Create `docs/responsiveness-strategy.md`.
*   **[ ]** **Task 5.5:** **Example Game:** Create sample game, config, plugin.
*   **[ ]** **Task 5.6:** **Documentation:** Write comprehensive Developer Guide.
*   **[ ]** **Task 5.7:** Final end-to-end testing (mock API).
*   **[ ]** **Task 5.8 (Future):** Implement real API calls.
*   **[ ]** **Task 5.9 (Future):** Detailed performance optimization.
*   **[ ]** **Task 5.10 (Future):** Implement responsiveness strategy.

## Expected Benefits

1.  **Reduced Coupling & Increased Cohesion**: Modules focus on their core responsibility, interacting via events or injected services.
2.  **Improved Testability**: DI and decoupled modules allow for robust unit and integration testing.
3.  **High Extensibility**: New games and features are added primarily through configuration and plugins, minimizing core engine changes.
4.  **Clearer Developer Experience**: Standardized patterns, clear interfaces, and documentation ease onboarding and development.
5.  **Production Readiness**: Robust error handling, configuration management, and feature flags support stable deployment and maintenance.

## Conclusion

Implementing this refined plan will establish a powerful, flexible, and maintainable foundation for the slot engine. It directly addresses the requirements for building and scaling multiple production-quality games efficiently and reliably.