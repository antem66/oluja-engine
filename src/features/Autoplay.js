import { state, updateState } from '../core/GameState.js'; // Assuming state management
import { setButtonsEnabled, updateAutoplayButtonState as updateBtnState } from '../ui/UIManager.js'; // Assuming UI management
import { startSpin } from '../ui/ButtonHandlers.js'; // Assuming spin initiation
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { NUM_PAYLINES } from '../config/paylines.js';
// import { flashElement } from '../ui/Notifications.js'; // Assuming notification handling

/**
 * Handles the logic for the next spin during autoplay.
 * Checks conditions (autoplay active, spins remaining, balance),
 * then schedules the next spin or stops autoplay.
 */
export function handleAutoplayNextSpin() {
    // Stop conditions
    if (!state.isAutoplaying || state.isInFreeSpins || state.isTransitioning) {
        if (state.isAutoplaying) { // Only log/update if it was actually autoplaying
            console.log("Autoplay stopped (condition met: FS/Transition).");
            updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
            updateBtnState(); // Update button appearance
            // updateInfoOverlay(); // Handled by UIManager
            // Enable buttons only if not transitioning into free spins or another state
            setButtonsEnabled(!state.isSpinning && !state.isInFreeSpins && !state.isTransitioning);
        }
        return;
    }

    if (state.autoplaySpinsRemaining > 0) {
        // Check balance before starting the next spin
        const currentTotalBet = state.currentBetPerLine * NUM_PAYLINES; // Recalculate just in case
        if (state.balance < currentTotalBet) {
            console.log("Autoplay stopped: Low balance.");
            updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
            updateBtnState();
            // updateInfoOverlay(); // Handled by UIManager
            setButtonsEnabled(true);
            // flashElement(balanceText, 0xe74c3c); // Needs UIManager reference
            return;
        }

        // Decrement spins and schedule next one
        updateState({ autoplaySpinsRemaining: state.autoplaySpinsRemaining - 1 });
        // updateInfoOverlay(); // Handled by UIManager

        const delay = (state.isTurboMode ? 150 : 600) * winAnimDelayMultiplier;
        // Removed: updateState({ isTransitioning: true }); // Prevent actions during the short delay

        setTimeout(() => {
            // Removed: updateState({ isTransitioning: false });
            startSpin(); // Start the next spin
        }, delay);

    } else {
        // Autoplay finished naturally
        console.log("Autoplay finished.");
        updateState({ isAutoplaying: false });
        updateBtnState();
        // updateInfoOverlay(); // Handled by UIManager
        setButtonsEnabled(true); // Re-enable buttons
    }
}

// Note: updateAutoplayButtonState is now assumed to be part of UIManager.js
// If it needs specific logic tied only to autoplay, it could live here,
// but updating button appearance feels like a UI Manager responsibility.
