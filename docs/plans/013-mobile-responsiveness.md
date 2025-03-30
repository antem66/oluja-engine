# Feature Plan: 013 - Mobile Responsiveness (Hybrid Scaling)

**Status:** Planning

## 1. Goal

Implement a robust responsiveness strategy for the slot engine UI to ensure optimal usability and appearance across various screen sizes, particularly mobile devices, while maintaining the visual integrity and fixed aspect ratio **(16:9)** of the core game area (reels). **The solution must accommodate different reel configurations (e.g., 3-reel, 5-reel, varying symbol sizes) in future games.**

## 2. Context

The current system scales the entire PixiJS stage (`app.stage`) uniformly to fit the window, preserving a fixed aspect ratio **(now targeting 16:9, previously 10:7)**. This causes letterboxing/pillarboxing and, more critically, shrinks UI elements (buttons, text) on smaller or differently proportioned screens (especially mobile landscape), hindering readability and usability.

## 3. Approach: Hybrid Scaling

We will adopt a hybrid scaling approach:

*   **Core Game Area (Fixed Ratio):** Layers containing essential game elements (`layerBackground`, `layerReels`, `layerWinLines`, `layerParticles`) will remain children of the main scaled stage managed by `AppInitializer`, preserving their fixed **16:9** aspect ratio (e.g., 1280x720 logical resolution) and proportional scaling. **The specific layout of reels within this area is defined by game configuration.**
*   **UI Overlay (Adaptive):** Critical UI layers (`layerUI`, `layerLogo`, `layerOverlays`, `layerDebug`, `layerFullScreenEffects`) will be moved to a separate top-level container (`uiRootContainer`) added directly to `app.stage`. This container will *not* be scaled uniformly with the main game stage.
*   **Independent UI Resize Logic:** A new resize handler will manage the `uiRootContainer` and its contents. This logic will adapt UI element positions and potentially sizes based on the actual `window.innerWidth` and `window.innerHeight`, ensuring elements remain accessible and readable. **UI elements will primarily use screen-relative anchoring (e.g., bottom-left, bottom-center) to decouple from specific reel dimensions.**

## 4. Requirements

*   The core game reels and background must maintain their fixed **16:9** aspect ratio (e.g., 1280x720) and scale proportionally within the window.
*   The main UI panel (buttons, text displays) must remain usable (e.g., anchored to the bottom, sides) and adapt to the window width, **independent of the specific reel layout configured for the current game.**
*   Buttons must maintain a minimum tappable size (respecting mobile touch guidelines).
*   Text (Balance, Bet, Win) must remain readable on small screens.
*   The UI background gradient should span the full window width.
*   The solution should minimize excessive black bars where possible for the UI layer.
*   The implementation must be robust, maintainable, and testable across different resolutions and aspect ratios.

## 5. Implementation Phases

**Phase 1: Refactor Layer Management (`src/core/Game.js`)**

*   **Goal:** Separate UI layers from the main scaled stage.
*   **Tasks:**
    *   Create a new top-level `PIXI.Container` named `uiRootContainer` in `Game.js`.
    *   Add `uiRootContainer` directly to `app.stage` (alongside the main stage container if one exists, or manage stage children carefully).
    *   Modify `_createLayers`: Move the creation and assignment of `this.layerUI`, `this.layerLogo`, `this.layerOverlays`, `this.layerDebug`, `this.layerFullScreenEffects` so they become children of `uiRootContainer` instead of `app.stage`.
    *   Ensure `app.stage.sortableChildren = true` is set and verify that z-index properties on the layers still achieve the correct visual stacking between game elements and UI elements.
*   **Status:** TODO

**Phase 2: Update Resize Logic (`src/core/AppInitializer.js`)**

*   **Goal:** Implement separate resize handling for the main game stage and the new UI root container, respecting the **16:9** game ratio.
*   **Tasks:**
    *   Modify `_setupResizeHandler`:
        *   Ensure the logic correctly uses the updated `GAME_WIDTH` (1280) and `GAME_HEIGHT` (720) to calculate scale and position (`scale`, `posX`, `posY`) for the main game stage based on the **16:9** ratio.
        *   Add *new* logic within the `resize` function to handle `uiRootContainer` (obtained potentially via a getter from the `Game` instance or passed reference).
        *   `uiRootContainer` should likely **not** be scaled (`uiRootContainer.scale.set(1)`).
        *   `uiRootContainer` should likely be positioned at `(0, 0)` (`uiRootContainer.position.set(0, 0)`).
        *   Store `window.innerWidth` and `window.innerHeight` or pass them via an event (`ui:resize`) for `UIManager` and other UI components to use.
*   **Status:** TODO

**Phase 3: Adapt UI Layout & Elements (`src/ui/UIManager.js`, `src/config/uiPanelLayout.js`)**

*   **Goal:** Make UI elements position and size themselves relative to the window dimensions, independent of the **16:9** game area and specific reel configuration.
*   **Tasks:**
    *   Modify `UIManager.js`:
        *   Listen for the `ui:resize` event (or access window dimensions directly/via service).
        *   In `init` and potentially a new `_handleResize` method:
            *   Resize the `_backgroundPanel` (gradient sprite) width to `window.innerWidth`.
            *   Recalculate button and text positions based on `window.innerWidth` and `window.innerHeight`, **primarily using screen-edge anchoring logic (e.g., bottom-left, bottom-center, bottom-right) rather than fixed offsets from a logical center.**
    *   Modify `src/config/uiPanelLayout.js`:
        *   Change `position` definitions. Instead of fixed `x`, `y` pixels based on `GAME_WIDTH`, **use descriptive screen-relative anchors** (e.g., `{ anchor: 'bottom-left', xOffset: 20, yOffset: -20 }`, `{ anchor: 'bottom-center', xOffset: 0, yOffset: -20 }`) or percentage-based values if feasible. Ensure calculations no longer depend on `GAME_WIDTH` or specific reel area calculations.
    *   Modify `UIManager._buildPanelFromConfig` and `_createTextDisplays` to interpret the new layout definitions and calculate actual `x`, `y` based on current window dimensions and anchor points.
    *   Implement minimum size checks/scaling limits for text and buttons if necessary, potentially scaling them slightly based on width but clamping the size.
*   **Status:** TODO

**Phase 4: Adjust Debug Panel (`src/ui/DebugPanel.js`)**

*   **Goal:** Ensure debug panel and toggle work correctly with the new structure and window-relative positioning.
*   **Tasks:**
    *   Confirm `toggleBtn` remains attached directly to `app.stage` at a fixed screen position (e.g., top-left `10, 10`).
    *   Modify `initDebugPanel`:
        *   Position `debugContainer` relative to window dimensions (e.g., anchor top-right: `x = window.innerWidth - panelWidth - 10`, `y = 10`) within the `layerDebug` (which is now in the unscaled `uiRootContainer`). Remove dependency on `GAME_WIDTH`.
*   **Status:** TODO

**Phase 5: Testing & Refinement**

*   **Goal:** Ensure the hybrid scaling works correctly and robustly with the **16:9** game ratio.
*   **Tasks:**
    *   Test extensively in browsers using developer tools for various device sizes (iPhone, iPad, Android common resolutions, desktop sizes).
    *   Test portrait and landscape orientations.
    *   Verify button tap target sizes are adequate on small screens.
    *   Verify text readability across sizes.
    *   Check alignment and positioning on extreme aspect ratios.
    *   Identify and fix any visual glitches or layout issues.
    *   Consider adding safe area insets for mobile devices.
*   **Status:** TODO

## 6. Open Questions / Considerations

*   How should the logo (`layerLogo`) scale? With the UI or the game? (Suggest UI for now).
*   How should general overlays/notifications (`layerOverlays`) scale? (Suggest UI).
*   How should fullscreen effects (`layerFullScreenEffects`) scale? (Depends on the effect - likely UI layer is best).
*   Confirm precise positioning logic/anchoring required for UI elements (e.g., exactly how should spacing adapt based on `window.innerWidth`?).
*   Need to carefully manage coordinate transformations if interactions need to happen between the scaled game world and the adaptive UI (e.g., clicking on a game element to show UI, **or positioning a UI element precisely next to a specific reel**).
*   **Revisit Asset Scaling:** Ensure background images and potentially other assets look good with the new 16:9 scaling ('cover' might be more appropriate now, check `BG_SCALE_MODE` in `gameSettings.js`).

## 7. Progress Updates

*   **[Date]:** Planning phase initiated.
*   **[Date]:** Updated target aspect ratio to 16:9.
*   **[Date]:** Plan updated to emphasize UI decoupling from specific reel layouts via screen-relative anchoring.
