# Feature Plan: 011 - Early Spin Stop

**Status:** Proposed

## 1. Goal

Allow the player to manually stop the reels early during a spin sequence by clicking the main spin button, which will transform into a "Stop" button while the reels are spinning.

## 2. Context

Currently, the spin button likely becomes disabled once a spin is initiated. The reels spin for a predetermined duration based on animation settings and then smoothly stop at the positions dictated by the spin result (from `ApiService`). Implementing an early stop requires keeping the button interactive, changing its appearance, and adding logic to interrupt the standard spin duration and immediately transition the reels to their final stopping positions upon user request.

## 3. Requirements

1.  **Button Transformation:** When a spin starts (`state.isSpinning` becomes true), the main Spin button's icon must change from its standard "Play" icon to a "Stop" icon.
2.  **Button Interactivity:** The Spin/Stop button must remain enabled and clickable *while* the reels are spinning (`state.isSpinning` is true).
3.  **Stop Action:** If the user clicks the button while it shows the "Stop" icon (i.e., `state.isSpinning` is true):
    *   An event (`spin:requestEarlyStop`) should be emitted via the `EventBus`.
    *   Subsequent clicks on the Stop button during the same spin should be ignored until the reels have fully stopped.
4.  **Reel Reaction:** Individual `Reel` instances (or `ReelManager`) must listen for the `spin:requestEarlyStop` event.
    *   If a reel receives this event while in its `accelerating` or `spinning` state, it must immediately cancel any ongoing spin-speed-based movement and initiate its final GSAP stop tween (`gsap.to(this, { position: this.finalStopPosition, ... })`).
    *   This early stop tween should use a significantly shorter duration (`EARLY_STOP_DURATION`) than the normal stop tween.
    *   If a reel receives the event while already in the `tweeningStop` or `stopped` state, it should ignore the event.
5.  **Button Reversion:** Once all reels have reached the `stopped` state (regardless of whether it was a natural or early stop), the Spin button must revert to its standard "Play" icon and state.
6.  **Result Integrity:** The early stop must *only* affect the visual duration of the spin. The final reel positions and the resulting win/loss outcome are determined by the data received from `ApiService` (`server:spinResultReceived`) and must not be altered by the early stop action.
7.  **Configuration:** The duration for the early stop tween (`EARLY_STOP_DURATION`) should be configurable (e.g., in `src/config/animationSettings.js`).

## 4. Implementation Phases & Tasks

**Phase 1: UI Setup & Button State Management**

*   [x] **Task 1.1:** Define & Load Stop Icon:
    *   Ensure a suitable "Stop" icon asset exists (e.g., `public/assets/control/stop.svg`). (Verified)
    *   Add its alias (e.g., `'stopIcon'`) to the asset list loaded by `ButtonFactory.loadButtonAssets`. (Verified - Alias is `'btn_stop'`)
*   [x] **Task 1.2:** Update `UIManager` for Spin Start:
    *   Modify `UIManager._handleStateChange` (or the method responsible for reacting to `state.isSpinning` becoming `true`).
    *   When spin starts:
        *   Call `this.setButtonVisualState('spin', true, 'btn_stop', 'btn_spin')` (using correct aliases).
        *   Ensure `this.buttons.get('spin')?.setEnabled(true)` is called or that `setButtonsEnabled` logic keeps it enabled when `isSpinning` is true.
*   [x] **Task 1.3:** Update `UIManager` for Spin End:
    *   Modify `UIManager._handleStateChange` (or the method responsible for reacting to `state.isSpinning` becoming `false`).
    *   When spin ends:
        *   Call `this.setButtonVisualState('spin', false, 'btn_stop', 'btn_spin')` to revert the icon.
        *   Ensure the button's enabled state is correctly set based on the final game state (usually enabled if not transitioning).
*   [ ] **Task 1.4:** Testing:
    *   Run the game, start a spin. Verify the button changes to "Stop" and remains clickable.
    *   Let the spin complete naturally. Verify the button changes back to "Play".

**Phase 2: Handling the Stop Click Event**

*   [x] **Task 2.1:** Modify Spin Button Click Handler:
    *   Locate where the `ui:button:click` event for the 'spin' button is handled (likely in `SpinManager`).
    *   Add logic: If `state.isSpinning` is `true` when the click event is received:
        *   Emit `this.eventBus.emit('spin:requestEarlyStop')`.
        *   *(Optional but recommended)* Add internal logic (e.g., a flag within `SpinManager`) to prevent emitting `spin:requestEarlyStop` multiple times within the same spin cycle if the user clicks repeatedly. Reset this flag when the spin actually ends (`reels:stopped` or similar).
    *   If `state.isSpinning` is `false`, proceed with the existing `startVisualSpin` logic.
*   [x] **Task 2.2:** Define Event: Ensure `spin:requestEarlyStop` is understood as a valid event (no specific code needed for the simple `EventBus`, but document it).

**Phase 3: Implementing Early Reel Stop Logic**

*   [x] **Task 3.1:** Add Config Setting:
    *   In `src/config/animationSettings.js`, add a new setting, e.g., `EARLY_STOP_DURATION: 0.1` (adjust value as needed).
*   [x] **Task 3.2:** Modify `Reel.js` Constructor:
    *   Inject the `eventBus` dependency if not already present.
    *   Subscribe to the `spin:requestEarlyStop` event, calling a new method like `this._handleEarlyStopRequest`. Store the unsubscribe function.
    *   Update `destroy()` to call the unsubscribe function.
*   [x] **Task 3.3:** Implement `Reel.js#_handleEarlyStopRequest()`:
    *   Check the current `this.state`.
    *   If `this.state === 'accelerating' || this.state === 'spinning'`:
        *   Log the early stop request.
        *   Kill any non-GSAP timers related to spinning effects if applicable.
        *   Immediately transition to the stop tween:
            *   Set `this.state = 'tweeningStop'`.
            *   Kill any *existing* `this.stopTween` just in case (though unlikely).
            *   Create the `gsap.to` tween targeting `this.position` to `this.finalStopPosition`.
            *   Use `duration: SETTINGS.EARLY_STOP_DURATION` (load settings).
            *   Ensure the tween uses the same `onUpdate` (calling `alignReelSymbols`, fading effects) and `onComplete` (setting state to `stopped`, ensuring final position, disabling effects) logic as the *natural* stop tween.
    *   If the state is already `tweeningStop` or `stopped`, simply return or log that the request is ignored.
*   [ ] **Task 3.4:** Testing:
    *   Start a spin, wait a moment, then click the "Stop" button.
    *   Verify the reels quickly snap to their final positions (which were determined when the spin started via the mock `ApiService`).
    *   Verify win presentation (paylines, animations, rollups) proceeds correctly based on the result, even after an early stop.
    *   Verify the button reverts to "Play" after the early stop completes.

**Phase 4: Refinement & Comprehensive Testing**

*   [ ] **Task 4.1:** Edge Case Testing:
    *   Click Stop immediately after starting the spin.
    *   Click Stop repeatedly during the spin.
    *   Click Stop very late, while the reels are naturally tweening to a stop (should be ignored).
    *   Test during Autoplay (early stop should likely stop the current spin but not necessarily cancel Autoplay mode itself, unless desired).
    *   Test during Free Spins.
    *   Test with Turbo Mode enabled (early stop should still function, using the short duration).
*   [ ] **Task 4.2:** Code Review: Ensure consistency with project patterns, clear logging, and proper cleanup.
*   [ ] **Task 4.3:** Update Documentation: Add notes about the early stop feature to relevant docs (`reel-mechanics.md`, `spin-result-flow.md`, `