import { updateAnimationSettings, skipBounceInTurbo } from '../config/animationSettings.js';
import { state } from '../core/GameState.js'; // Assuming state access
import { updateTurboButtonState as updateBtnState } from '../ui/UIManager.js'; // Assuming UI management

// Placeholder for reels data - this should be passed in or accessed via GameState/Game module
let reelsRef = [];
export function initTurboMode(reels) {
    reelsRef = reels;
}

/**
 * Applies turbo settings to the game.
 * Updates animation timings and reel bounce behavior based on the turbo state.
 * @param {boolean} isTurbo - Whether turbo mode is currently active.
 */
export function applyTurboSettings(isTurbo) {
    // Update the shared animation settings based on turbo state
    updateAnimationSettings(isTurbo);

    // Update reel-specific behavior (like skipping bounce)
    // This assumes reelsRef is initialized and contains reel objects with a 'skipBounce' property
    if (reelsRef && reelsRef.length > 0) {
        reelsRef.forEach(reel => {
            if (reel) { // Check if reel object exists
                reel.skipBounce = isTurbo && skipBounceInTurbo;
            } else {
                console.warn("TurboMode: Found undefined reel in reelsRef during applyTurboSettings.");
            }
        });
    } else {
        // This might happen if called before reels are created, maybe log a warning
        // console.warn("TurboMode: applyTurboSettings called before reelsRef was initialized or populated.");
    }

    // Update the button state visually (handled by UIManager)
    // updateBtnState(isTurbo); // Call the function imported from UIManager
}

// Note: updateTurboButtonState is now assumed to be part of UIManager.js
// It will read the `isTurboMode` from the shared state and update the button's appearance.
// The toggleTurbo function in ButtonHandlers.js calls applyTurboSettings here
// and then calls the UIManager's updateTurboButtonState.
