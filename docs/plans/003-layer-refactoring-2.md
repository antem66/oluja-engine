# Refactoring Plan: Dedicated Layer for Full-Screen Effects

**Version:** 1.1
**Date:** 2024-07-26

## 1. Goal

To improve the engine's layer architecture by introducing a dedicated, centrally managed layer (`layerFullScreenEffects`) for displaying transient, visually prominent effects that should appear above the main game elements (reels, UI, logo) but below critical overlays (like notifications or persistent indicators). This refactor aims to enhance code structure, maintainability, and future extensibility.

*Initial Use Case:* Correctly layer the "FREE SPINS" entry animation (`specialAnimationsContainer`) as the first consumer of this new layer.

## 2. Problem Description

Currently, effects like the "FREE SPINS" entry animation are added directly to the main stage (`app.stage`) from feature modules (`FreeSpins.js`).

*   **Layering Conflicts:** These effects often lack explicit `zIndex` values or have them set decentrally, leading to incorrect visual stacking where they might appear behind elements like the game reels (which have centrally defined, higher `zIndex` values).
*   **Architectural Issue:** Managing the layering (`zIndex`) of major visual components decentrally across different feature modules makes the overall rendering structure harder to understand, maintain, and extend without introducing conflicts.

## 3. Chosen Solution & Justification

We will implement the **Dedicated Layer Approach**: Create a new main layer (`layerFullScreenEffects`) in `Game.js`, manage its `zIndex` centrally, and pass this layer to feature modules that need to display such effects.

*   **Why (General Benefits):**
    *   **Centralized Control:** Keeps all primary layer definitions and their stacking order (`zIndex`) within `Game.js`, ensuring a clear, manageable rendering hierarchy.
    *   **Separation of Concerns:** `Game.js` handles stage structure; feature modules handle their specific logic and visuals without needing deep knowledge of global layering.
    *   **Extensibility:** This layer provides a standard, designated place for *any* future feature needing similar full-screen transient effects (e.g., Jackpot wins, transition animations, bonus intros). New features can simply add their content to this existing layer, promoting code reuse and consistency.
    *   **Maintainability:** Reduces the risk of `zIndex` conflicts and simplifies global layer adjustments.
    *   **Readability:** Makes the intended purpose and structure of different layers explicit.

## 4. Action Plan

### Phase 1: Modify `Game.js` (Complete)

-   [x] **1.1 Add Layer Property:** Define a new `PIXI.Container` property `layerFullScreenEffects` in the `Game` class (`src/core/Game.js`).
-   [x] **1.2 Instantiate Layer:** In the `_createLayers` method:
    -   Instantiate `layerFullScreenEffects`.
    -   Assign it a suitable name (e.g., "Layer: Full Screen Effects").
    -   Set its `zIndex` to an appropriate value (e.g., 45) to place it above the logo/UI but below general overlays.
    -   Add it to the main `app.stage` along with other primary layers.
-   [x] **1.3 Update Module Initialization:** In the `_initCoreModules` method:
    -   Pass `this.layerFullScreenEffects` as an argument to the `initFreeSpins` function call.
    -   Update any relevant null checks to include the new layer.

### Phase 2: Modify `FreeSpins.js` (Complete)

-   [x] **2.1 Update `initFreeSpins` Signature:** Modify the `initFreeSpins` function (`src/features/FreeSpins.js`) to accept the new `effectsLayer` (or similar name) parameter.
-   [x] **2.2 Update Container Creation:** Inside `initFreeSpins`, locate where `specialAnimationsContainer` (or the container holding the "FREE SPINS" graphic) is created.
-   [x] **2.3 Add to Dedicated Layer:** Instead of adding `specialAnimationsContainer` to `app.stage`, add it as a child to the passed-in `effectsLayer`.
-   [x] **2.4 Remove Direct `zIndex` Setting:** Remove any code within `initFreeSpins` that directly sets the `zIndex` of `specialAnimationsContainer` (if any existed). Its depth is now managed by the parent `effectsLayer`'s `zIndex`.

### Phase 3: Testing (Pending)

-   [ ] **3.1 Verify Animation Visibility:** Run the game and trigger free spins. Confirm the "FREE SPINS" entry animation now correctly appears *above* the reels and other elements like the logo, but *below* notifications and win announcements.
-   [ ] **3.2 Regression Testing:** Briefly check that other UI elements (FS indicator, notifications, win announcements, debug panel) still appear in their correct layers and function as expected.
-   [ ] **3.3 Test Other Effects (Future):** As new full-screen effects are added, ensure they are added to `layerFullScreenEffects` and verify their layering behaves correctly.
