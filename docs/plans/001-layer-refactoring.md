Okay, here is a plan with actionable tasks to refactor the layering system, fix the Free Spins (FS) indicator visibility, and implement minor visual improvements for both the indicator and the logo.

**Goal:** Implement an explicit layer management system using dedicated `PIXI.Container`s to reliably control rendering order, ensuring the FS indicator appears above the logo, and enhance the visuals/animations of both elements.

**Phase 1: Setup & Foundation**

*   **Task 1.1: Define Layer Containers in `Game.js`**
    *   **Action:** In `src/core/Game.js`, declare class properties for each layer container (`layerBackground`, `layerReels`, `layerWinLines`, `layerUI`, `layerLogo`, `layerOverlays`, `layerParticles`, `layerDebug`).
    *   **Action:** In `Game.init()`, instantiate these containers (`new PIXI.Container()`).
    *   **Action:** Assign a unique `name` property to each layer container for easier debugging (e.g., `this.layerBackground.name = "Layer: Background";`).
    *   **Action:** Assign the planned `zIndex` to each layer container.
    *   **Action:** Add all layer containers as direct children to `this.app.stage`.
    *   **Action:** Set `sortableChildren = true` on `this.layerOverlays` to allow z-indexing within that layer if needed later.
    *   **Estimate:** Small
    *   **AC:** Layer containers exist as properties on the `Game` instance and are added to the stage.

**Phase 2: Core Layering Refactor**

*   **Task 2.1: Move Background**
    *   **Action:** In `Game.init()`, modify the background sprite creation logic to add `this.backgroundSprite` to `this.layerBackground` instead of the stage.
    *   **Estimate:** Small
    *   **AC:** Background sprite is a child of `layerBackground`.

*   **Task 2.2: Move Reels & Mask**
    *   **Action:** In `Game.init()`, add the `reelContainer` (which contains the individual reel graphics and the mask) to `this.layerReels`. Ensure the mask is added *within* the `reelContainer`.
    *   **Estimate:** Small
    *   **AC:** `reelContainer` is a child of `layerReels`. Reel mask functions correctly.

*   **Task 2.3: Move Win Lines**
    *   **Action:** In `Game.init()`, add the `winLineGraphics` object to `this.layerWinLines`. Update `initPaylineGraphics` if necessary (though it likely just uses the passed graphics object).
    *   **Estimate:** Small
    *   **AC:** `winLineGraphics` is a child of `layerWinLines`. Win lines draw correctly.

*   **Task 2.4: Move UI Elements**
    *   **Action:** In `Game.init()`, add the main `uiContainer` (which holds buttons, text displays via `UIManager`) to `this.layerUI`.
    *   **Estimate:** Small
    *   **AC:** `uiContainer` is a child of `layerUI`. All standard UI elements (buttons, balance, bet, win) are visible and functional.

*   **Task 2.5: Refactor Logo Manager**
    *   **Action:** Modify `src/ui/LogoManager.js` constructor to accept `parentLayer` argument.
    *   **Action:** Modify `LogoManager.setup()` to add `this.container` to `this.parentLayer` instead of the stage. Remove internal `zIndex` setting and `sortChildren` call.
    *   **Action:** In `Game.init()`, update the `LogoManager` instantiation to pass `this.layerLogo`.
    *   **Estimate:** Medium
    *   **AC:** Logo is created and added to `layerLogo`. Logo animations still work.

*   **Task 2.6: Move Overlays (FS Indicator, Notifications, Big Wins)**
    *   **Action:** In `Game.init()`, ensure `initNotifications` and `initAnimations` are passed `this.layerOverlays`. Verify these modules add their elements (messages, big win text) to this container.
    *   **Action:** Modify `createFreeSpinsIndicator` in `Game.js` to accept `parentLayer` and add `freeSpinsIndicator` to it. Update the call in `Game.init()` to pass `this.layerOverlays`.
    *   **Estimate:** Medium
    *   **AC:** Notification messages, Big Win text, and the FS indicator are children of `layerOverlays`. FS Indicator logic (`updateFreeSpinsIndicator`) correctly targets the element within this layer.

*   **Task 2.7: Move Particles**
    *   **Action:** In `Game.init()`, ensure `initAnimations` is passed `particleContainer`, and add `particleContainer` itself to `this.layerParticles`. Verify `Animations.js` uses the correct container for adding particle graphics.
    *   **Estimate:** Small
    *   **AC:** Particle effects are rendered within `layerParticles`.

*   **Task 2.8: Refactor Debug Panel**
    *   **Action:** Modify `src/ui/DebugPanel.js` `initDebugPanel` to accept `layerDebug` argument.
    *   **Action:** Ensure the panel graphics and controls are added as children to the passed `layerDebug` container. Update `toggleDebugPanel` to control `layerDebug.visible`.
    *   **Action:** In `Game.init()`, update the `initDebugPanel` call to pass `this.layerDebug`. (Keep the toggle button on the main stage).
    *   **Estimate:** Medium
    *   **AC:** Debug panel elements are children of `layerDebug`. Toggling works by showing/hiding the layer.

*   **Task 2.9: Final Stage Sort & Cleanup**
    *   **Action:** In `Game.init()`, ensure `this.app.stage.sortChildren()` is called exactly *once* after all layer containers have been added to the stage.
    *   **Action:** Remove any redundant `sortChildren` calls from other modules (like `LogoManager`).
    *   **Action:** Add console logging after the sort in `Game.init()` to list `this.app.stage.children` and their zIndices to confirm the order.
    *   **Estimate:** Small
    *   **AC:** Stage children are sorted correctly according to layer zIndices. Console logs confirm the order.

**Phase 3: Indicator & Logo Improvements**

*   **Task 3.1: Verify FS Indicator Visibility**
    *   **Action:** After completing Phase 2, thoroughly test triggering Free Spins. Use console logs added previously and browser dev tools (PixiJS DevTools extension recommended) to inspect the hierarchy and ensure `freeSpinsIndicator` is visible, has `alpha > 0`, correct `y` position, and is within `layerOverlays`, which should be above `layerLogo`.
    *   **Estimate:** Small
    *   **AC:** Free Spins indicator appears reliably *in front* of the game logo when FS starts and disappears correctly when FS ends.

*   **Task 3.2: Enhance FS Indicator Animation**
    *   **Action:** In `Game.js`, modify the GSAP tweens within `updateFreeSpinsIndicator` for the "in" and "out" animations.
    *   **Suggestion:** Add a slight rotation (e.g., `rotation: 0.1` on entry, back to `0` on exit) or use a more dynamic ease (e.g., `elastic.out(1, 0.8)` for entry).
    *   **Suggestion:** Make the count text flash (`gsap.to(freeSpinsCountText.scale, ...)`) more prominent (larger scale, quicker duration).
    *   **Estimate:** Small
    *   **AC:** FS indicator entry/exit animations are smoother or more visually engaging. Count flash is noticeable.

*   **Task 3.3: Enhance FS Indicator Visuals**
    *   **Action:** In `Game.js::createFreeSpinsIndicator`, tweak visual properties.
    *   **Suggestion:** Adjust `panel` fill/stroke colors or alpha.
    *   **Suggestion:** Refine `freeSpinsGlow` alpha/size or GSAP animation (`startGlowAnimation`).
    *   **Suggestion:** Update `titleStyle` or `countStyle` (font size, fill, stroke).
    *   **Estimate:** Small
    *   **AC:** FS indicator panel looks slightly more polished or distinct.

*   **Task 3.4: Enhance Logo Idle Animation**
    *   **Action:** In `src/ui/LogoManager.js::initAnimations`, review existing GSAP tweens.
    *   **Suggestion:** Combine the `y` bobbing, `scale` pulsing, and `rotation` wobble into a single timeline for better control.
    *   **Suggestion:** Adjust easing (e.g., `sine.inOut` is good for smooth loops) and durations for a more subtle or appealing effect. Maybe add a very slow, subtle `tint` shift loop.
    *   **Estimate:** Small
    *   **AC:** Logo idle animation feels slightly more polished or less repetitive.

**Phase 4: Testing & Validation**

*   **Task 4.1: Comprehensive Testing**
    *   **Action:** Test all core game functions: spinning, winning, triggering free spins, entering/exiting free spins, turbo mode, autoplay, debug panel toggle, bet changes.
    *   **Action:** Pay close attention to rendering order during all phases, especially FS entry/exit and Big Win sequences. Verify the logo, FS indicator, win lines, UI, and overlays stack correctly.
    *   **Action:** Check for any visual glitches or performance regressions introduced by the refactoring.
    *   **Action:** Use PixiJS DevTools to inspect the scene graph and confirm the new layer structure.
    *   **Estimate:** Medium
    *   **AC:** Game functions correctly. All elements render in the expected order across different game states. No new visual bugs or performance issues related to layering are observed.

This plan provides a structured approach to implementing the robust layering system while incorporating the requested improvements in a single iteration. Remember to commit changes incrementally after completing logical tasks or phases.