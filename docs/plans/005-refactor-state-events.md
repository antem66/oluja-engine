# Feature Plan: 001 - Refactor State Management & Event Flow

**Goal:** Improve engine robustness, maintainability, and debuggability by clarifying state flag semantics (especially `isTransitioning`) and refining event timing for spin cycle completion. Prepare a stronger foundation for future features and server integration.

**Context:**
Debugging the Autoplay feature revealed timing conflicts and ambiguity related to the `isTransitioning` state flag. The flag was used both for brief technical transitions post-spin and longer visual transitions during feature entry/exit. Autoplay logic also triggered too early based on the `reels:stopped` event, rather than waiting for the full win presentation sequence to complete.

**Requirements & Phases:**

**Phase 1: Refactor `isTransitioning` State**
*   [ ] **Define New State:** Add `isFeatureTransitioning: boolean` to `src/core/GameState.js`. Initialize to `false`.
*   [ ] **Update `FreeSpins.js`:** Modify `enterFreeSpins` and `exitFreeSpins` (and potentially related internal functions) to set/unset `isFeatureTransitioning` instead of the original `isTransitioning`.
*   [ ] **Update `SpinManager.js`:** Remove the setting/unsetting of the original `isTransitioning` flag within the `handleSpinEnd` method.
*   [ ] **Update State Readers:** Modify all modules that previously read `isTransitioning` to achieve the following:
    *   If the check was intended only for *major feature transitions* (like FS entry/exit), change the check to `isFeatureTransitioning`. (Applies to `GameState._handleBetChange`, `SpinManager.startSpin`, potentially `UIManager.setButtonsEnabled`, `FreeSpins.js`).
    *   If the check was only necessary because `reels:stopped` fired too early (like the original `Autoplay` issue), the check might become redundant once later phases are complete, but for now, ensure it relies on `isSpinning` or the new `isFeatureTransitioning` if appropriate.
*   [ ] **Verify Core Functionality:** Test basic spins, FS entry/exit, and UI button states to ensure the core game loop remains functional after state flag changes.

**Phase 2: Introduce `spin:sequenceComplete` Event**
*   [ ] **Define Responsibility:** Determine the best module (`Animations.js`, `AnimationController.js`, or `ResultHandler.js`) to track the completion of all win presentation animations triggered by `spin:evaluateRequest`. (Likely requires coordination via `AnimationController`).
*   [ ] **Implement Completion Tracking:** Modify the chosen module(s) to use Promises, callbacks, or GSAP timelines' `onComplete` handlers to know when all relevant animations (rollups, symbol animations, big wins) are finished.
*   [ ] **Emit Event:** The coordinating module emits `spin:sequenceComplete` via the `eventBus` once all tracked animations are done.

**Phase 3: Update Event Listeners & Finalize UI**
*   [ ] **Update `Autoplay.js`:** Change `handleSpinEndForAutoplay` to listen for `spin:sequenceComplete` instead of `reels:stopped`.
*   [ ] **Update `FreeSpins.js`:** Change the listener that triggers the *next* free spin (likely in `handleFreeSpinEnd` or similar) to listen for `spin:sequenceComplete`.
*   [ ] **Update `UIManager.js`:**
    *   Finalize `setButtonsEnabled` logic. It should primarily depend on `!state.isSpinning && !state.isFeatureTransitioning`.
    *   *Optional (Decision Point):* Decide if UI buttons should re-enable immediately when spinning stops (as per the above logic) or wait for `spin:sequenceComplete` for a more polished feel (would require adding a listener for this event in UIManager).
*   [ ] **Testing:** Thoroughly test Autoplay, Free Spins, basic spins, and UI responsiveness to ensure the new event flow works correctly under various conditions (small wins, big wins, feature triggers).

**Progress:**

*   **Phase 1:** Outstanding
*   **Phase 2:** Outstanding
*   **Phase 3:** Outstanding

**Development Notes & Blockers:**

*   *(Initial)* Need to decide on the best place/mechanism for tracking aggregate animation completion (Phase 2). `AnimationController` seems suitable if it can manage promises/callbacks for registered animations.
*   *(Initial)* Need to decide on the exact UI re-enabling timing (Phase 3). Simpler logic first is recommended.

**Discussion Points:**

*   Confirm the preferred module for managing `spin:sequenceComplete` emission (suggesting `AnimationController` or `Animations.js`).
*   Confirm the desired UI re-enabling behavior (wait for animations or enable sooner).

---