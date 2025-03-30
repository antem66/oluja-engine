# Technical Debt Log

This document tracks known technical issues, areas for improvement, and potential refactoring opportunities in the Oluja Slot Engine codebase.

## Linter Warnings / Type Safety

*   **File:** `src/core/ReelManager.js`
    *   **Line:** 48 (`this.parentLayer.addChild(this.reelContainer);`)
    *   **Issue:** Linter flags `this.parentLayer` as potentially null, even though it's checked for non-nullity in the constructor. The type checker might not be correctly inferring the non-null state across methods.
    *   **Status:** Deferred (Runtime check exists in constructor).

*   **File:** `src/core/Game.js`
    *   **Line:** 262 (`initFreeSpins(app, reelContainerRef, currentReels);`)
    *   **Issue:** Linter flags `reelContainerRef` (derived from `this.reelManager.reelContainer`) as potentially null when passed to `initFreeSpins`. The function `initFreeSpins` likely expects a non-null `PIXI.Container`. While `this.reelManager` is checked for null earlier in the `_initCoreModules` method, the linter doesn't guarantee `reelContainerRef` isn't null.
    *   **Status:** Deferred (Runtime check for `this.reelManager` exists). May require checking `initFreeSpins` signature or adding a specific check before the call.

*   **File:** `src/core/Game.js`
    *   **Line:** 285 (`initDebugPanel(app, this.layerDebug);`)
    *   **Issue:** Linter flags `this.layerDebug` as potentially null when passed to `initDebugPanel`. Although checked earlier in the `_initCoreModules` method, the `initDebugPanel` function likely expects a non-null `PIXI.Container`.
    *   **Status:** Deferred (Runtime check `if (this.layerDebug && app)` exists before the call).
