# Feature Plan: 002 - Foundational Stability Improvements

**Goal:** Enhance the engine's stability, robustness, and debuggability by implementing comprehensive component lifecycles (preventing memory leaks), basic error handling, improved logging, and completing pending core module integrations.

**Context:**
Following the state/event refactoring (Plan 001), several foundational areas require attention before adding more complex game features. These include potential memory leaks due to incomplete cleanup, lack of centralized error handling, basic logging capabilities needing enhancement, and pending integration fixes from previous refactors.

**Requirements & Phases:**

**Phase 1: Component Lifecycles & Memory Management (Stability)**
*   [X] **Review & Implement `destroy()`:** Systematically review the following core managers and feature modules. Implement or enhance their `destroy()` methods to ensure proper cleanup:
    *   [X] `src/core/ReelManager.js`: Destroy reel container, call `destroy` on individual `Reel` instances (assuming `Reel.js` also needs a `destroy` method).
    *   [X] `src/core/BackgroundManager.js`: Destroy background sprite, remove from parent.
    *   [X] `src/ui/FreeSpinsUIManager.js`: Destroy any created PIXI objects (indicator graphics, text), unsubscribe listeners.
    *   [X] `src/ui/UIManager.js`: Ensure all created PIXI objects (text, buttons, panel, internal container) are destroyed, GSAP tweens killed, listeners unsubscribed.
    *   [X] `src/core/SpinManager.js`: Unsubscribe listeners, nullify refs.
    *   [X] `src/core/ResultHandler.js`: Unsubscribe listeners, nullify refs.
    *   [X] `src/features/Animations.js`: Destroy containers, clear intervals/timeouts, unsubscribe listeners.
    *   [X] `src/features/Autoplay.js`: Clear timeouts, unsubscribe listeners.
    *   [X] `src/features/FreeSpins.js`: Destroy containers, clear timeouts, unsubscribe listeners.
    *   [X] `src/features/PaylineGraphics.js`: Destroy graphics objects, unsubscribe listeners.
    *   [X] `src/features/TurboMode.js`: Unsubscribe listeners.
    *   [X] `src/core/Reel.js`: Add `destroy()` method: kill GSAP tweens, destroy symbol container and symbol sprites, remove main container from parent.
*   [ ] **Update `Game.destroy()`:** Uncomment the previously commented-out `.destroy()` calls for the managers once they are implemented.
*   [ ] **Testing:** Manually trigger game destruction (if possible via debug tools or code modification) and monitor console/memory for errors or leaks after repeated init/destroy cycles.

**Phase 2: Basic Error Handling & Logging Enhancement (Debuggability)**
*   [X] **Implement `try...catch`:** Wrap critical event handlers (callbacks passed to `eventBus.on` in modules like `GameState`, `ResultHandler`, `AnimationController`, `Animations`, `Autoplay`, `FreeSpins`, etc.) in `try...catch` blocks.
    *   *(Note: Focused on main handlers in ResultHandler, GameState, Animations, Autoplay, FreeSpins, PaylineGraphics. AnimationController might need review later.)*
*   [X] **Log Errors:** Inside the `catch` blocks, use `logger.error('Domain', 'Error in handler XYZ:', error)` to log the error with its context.
*   [X] **Enhance `Logger` Filtering:** Add basic domain/level filtering logic to `utils/Logger.js`. Start with hardcoded default levels (e.g., show `INFO` and above for all domains `*`) but allow for potential future configuration.
*   [X] **Consistent Logging Domains:** Ensure all existing log messages use clear, consistent domain names (e.g., `'UIManager'`, `'SpinManager'`). *(Quick search performed, looks generally consistent)*
*   [ ] **Testing:** Trigger deliberate errors (e.g., throw an error inside an event handler temporarily) to verify `try...catch` works and logs correctly. Verify log filtering reduces noise (e.g., temporarily set default level to `WARN` and check if `INFO`/`DEBUG` messages disappear).

**Phase 3: Complete Core Module Integrations (Consistency)**
*   [X] **Fix `initNotifications`/`initInfoOverlay`:** Determine the correct dependency signature for these functions (likely just the container/element or specific deps like logger/eventBus if needed) and fix the calls in `src/core/Game.js#_initCoreModules`. Resolve associated linter errors. *(Calls were already correct)*
*   [X] **Implement `BackgroundManager.changeBackground`:** Provide the actual implementation (e.g., using GSAP for tint animation) for the placeholder method added previously. *(Completed earlier)*
*   [X] **Refactor `WinEvaluation.js`:** Ensure it accepts dependencies via `init`, listens for `spin:evaluateRequest`, removes direct UI/Animation calls, emits appropriate events (`paylines:show`, `win:coordinateAnimations`, `freespins:triggerCheck`). Update call in `Game.js`. *(Completed: Added try-catch, removed balance update, added paylines:show emit)*
*   [X] **Refactor `PaylineGraphics.js`:** Ensure it accepts dependencies via `init`, listens for events (`spin:started` or `paylines:clearRequest` to clear, `paylines:show` to draw). Update call in `Game.js`. *(Completed: Switched listener to paylines:show, added try-catch)*
*   [X] **Verify `Game.js` Integration:** Ensure all modules initialized in `Game.js#_initCoreModules` now correctly receive their dependencies via the `moduleDeps` object or direct injection. *(Verified)*
*   [ ] **Testing:** Test the complete spin cycle, including win presentation (paylines, rollups, symbol animations) and feature triggers (Free Spins) to ensure the integrated modules work correctly via the event bus.

**Progress:**

*   **Phase 1:** Mostly Complete (Pending `Game.destroy` update & testing)
*   **Phase 2:** Mostly Complete (Pending testing)
*   **Phase 3:** Mostly Complete (Pending testing)

**Development Notes & Blockers:**

*   Implementing comprehensive `destroy` methods requires careful attention to *all* resources created by a module (PIXI objects, listeners, timers).
*   Fixing `initNotifications`/`initInfoOverlay` might require looking into their definitions if the expected signature isn't obvious. *(Verified calls were correct)*
*   Need to uncomment manager destroy calls in `Game.js`.
*   Testing is needed to confirm stability improvements and integration fixes.

**Discussion Points:**

*   Confirm the desired default logging level for the enhanced Logger filtering. *(INFO was used as default)*
*   Confirm the exact dependencies needed by `initNotifications`/`initInfoOverlay`. *(Verified single arg needed)*

---