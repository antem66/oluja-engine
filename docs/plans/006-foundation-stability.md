# Feature Plan: 002 - Foundational Stability Improvements

**Goal:** Enhance the engine's stability, robustness, and debuggability by implementing comprehensive component lifecycles (preventing memory leaks), basic error handling, improved logging, and completing pending core module integrations.

**Context:**
Following the state/event refactoring (Plan 001), several foundational areas require attention before adding more complex game features. These include potential memory leaks due to incomplete cleanup, lack of centralized error handling, basic logging capabilities needing enhancement, and pending integration fixes from previous refactors.

**Requirements & Phases:**

**Phase 1: Component Lifecycles & Memory Management (Stability)**
*   [ ] **Review & Implement `destroy()`:** Systematically review the following core managers and feature modules. Implement or enhance their `destroy()` methods to ensure proper cleanup:
    *   [ ] `src/core/ReelManager.js`: Destroy reel container, call `destroy` on individual `Reel` instances (assuming `Reel.js` also needs a `destroy` method).
    *   [ ] `src/core/BackgroundManager.js`: Destroy background sprite, remove from parent.
    *   [ ] `src/ui/FreeSpinsUIManager.js`: Destroy any created PIXI objects (indicator graphics, text), unsubscribe listeners.
    *   [ ] `src/ui/UIManager.js`: Ensure all created PIXI objects (text, buttons, panel, internal container) are destroyed, GSAP tweens killed, listeners unsubscribed.
    *   [ ] `src/core/SpinManager.js`: Unsubscribe listeners, nullify refs.
    *   [ ] `src/core/ResultHandler.js`: Unsubscribe listeners, nullify refs.
    *   [ ] `src/features/Animations.js`: Destroy containers, clear intervals/timeouts, unsubscribe listeners.
    *   [ ] `src/features/Autoplay.js`: Clear timeouts, unsubscribe listeners.
    *   [ ] `src/features/FreeSpins.js`: Destroy containers, clear timeouts, unsubscribe listeners.
    *   [ ] `src/features/PaylineGraphics.js`: Destroy graphics objects, unsubscribe listeners.
    *   [ ] `src/features/TurboMode.js`: Unsubscribe listeners.
    *   [ ] `src/core/Reel.js`: Add `destroy()` method: kill GSAP tweens, destroy symbol container and symbol sprites, remove main container from parent.
*   [ ] **Update `Game.destroy()`:** Uncomment the previously commented-out `.destroy()` calls for the managers once they are implemented.
*   [ ] **Testing:** Manually trigger game destruction (if possible via debug tools or code modification) and monitor console/memory for errors or leaks after repeated init/destroy cycles.

**Phase 2: Basic Error Handling & Logging Enhancement (Debuggability)**
*   [ ] **Implement `try...catch`:** Wrap critical event handlers (callbacks passed to `eventBus.on` in modules like `GameState`, `ResultHandler`, `AnimationController`, `Animations`, `Autoplay`, `FreeSpins`, etc.) in `try...catch` blocks.
*   [ ] **Log Errors:** Inside the `catch` blocks, use `logger.error('Domain', 'Error in handler XYZ:', error)` to log the error with its context.
*   [ ] **Enhance `Logger` Filtering:** Add basic domain/level filtering logic to `utils/Logger.js`. Start with hardcoded default levels (e.g., show `INFO` and above for all domains `*`) but allow for potential future configuration.
*   [ ] **Consistent Logging Domains:** Ensure all existing log messages use clear, consistent domain names (e.g., `'UIManager'`, `'SpinManager'`).
*   [ ] **Testing:** Trigger deliberate errors (e.g., throw an error inside an event handler temporarily) to verify `try...catch` works and logs correctly. Verify log filtering reduces noise (e.g., temporarily set default level to `WARN` and check if `INFO`/`DEBUG` messages disappear).

**Phase 3: Complete Core Module Integrations (Consistency)**
*   [ ] **Fix `initNotifications`/`initInfoOverlay`:** Determine the correct dependency signature for these functions (likely just the container/element or specific deps like logger/eventBus if needed) and fix the calls in `src/core/Game.js#_initCoreModules`. Resolve associated linter errors.
*   [ ] **Implement `BackgroundManager.changeBackground`:** Provide the actual implementation (e.g., using GSAP for tint animation) for the placeholder method added previously.
*   [ ] **Refactor `WinEvaluation.js`:** Ensure it accepts dependencies via `init`, listens for `spin:evaluateRequest`, removes direct UI/Animation calls, emits appropriate events (`paylines:show`, `win:coordinateAnimations`, `freespins:triggerCheck`). Update call in `Game.js`.
*   [ ] **Refactor `PaylineGraphics.js`:** Ensure it accepts dependencies via `init`, listens for events (`spin:started` or `paylines:clearRequest` to clear, `paylines:show` to draw). Update call in `Game.js`.
*   [ ] **Verify `Game.js` Integration:** Ensure all modules initialized in `Game.js#_initCoreModules` now correctly receive their dependencies via the `moduleDeps` object or direct injection.
*   [ ] **Testing:** Test the complete spin cycle, including win presentation (paylines, rollups, symbol animations) and feature triggers (Free Spins) to ensure the integrated modules work correctly via the event bus.

**Progress:**

*   **Phase 1:** Outstanding
*   **Phase 2:** Outstanding
*   **Phase 3:** Outstanding

**Development Notes & Blockers:**

*   Implementing comprehensive `destroy` methods requires careful attention to *all* resources created by a module (PIXI objects, listeners, timers).
*   Fixing `initNotifications`/`initInfoOverlay` might require looking into their definitions if the expected signature isn't obvious.

**Discussion Points:**

*   Confirm the desired default logging level for the enhanced Logger filtering.
*   Confirm the exact dependencies needed by `initNotifications`/`initInfoOverlay`.

---