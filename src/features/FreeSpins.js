import { FREE_SPINS_AWARDED, freeSpinsBgColor, normalBgColor } from '../config/gameSettings.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { state, updateState } from '../core/GameState.js'; // Assuming state management
import { showOverlayMessage } from '../ui/Notifications.js'; // Assuming notification handling
import { setButtonsEnabled, updateAutoplayButtonState } from '../ui/UIManager.js'; // Assuming UI management
import { startSpin } from '../ui/ButtonHandlers.js'; // Assuming spin initiation

// Reference to the Pixi app (needed for background color change)
let appRef = null;
export function initFreeSpins(app) {
    appRef = app;
}

/**
 * Enters the Free Spins mode.
 * Updates state, shows message, changes background, and starts the first free spin.
 */
export function enterFreeSpins() {
    if (state.isInFreeSpins || !appRef) return; // Prevent re-entry or if not initialized

    console.log(`Enter Free Spins: ${FREE_SPINS_AWARDED}`);
    updateState({
        isInFreeSpins: true,
        freeSpinsRemaining: FREE_SPINS_AWARDED,
        totalFreeSpinsWin: 0, // Reset total win for the feature
    });

    // Stop autoplay if it was running
    if (state.isAutoplaying) {
        updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
        updateAutoplayButtonState(); // Update UI
        console.log("Autoplay stopped for FS.");
    }

    // Change background color
    appRef.renderer.background.color = freeSpinsBgColor;

    // updateInfoOverlay(); // Handled by UIManager based on state change
    setButtonsEnabled(false); // Disable controls during transition
    updateState({ isTransitioning: true });

    // Show entry message
    showOverlayMessage(
        `${FREE_SPINS_AWARDED}\nFREE SPINS`,
        2000, // Use base duration, showOverlayMessage applies multiplier
        () => {
            updateState({ isTransitioning: false });
            setButtonsEnabled(false); // Keep buttons disabled during FS (except maybe stop?)
            startFreeSpin(); // Start the first spin after the message
        }
    );
}

/**
 * Initiates a single free spin if conditions are met.
 */
function startFreeSpin() {
    if (!state.isInFreeSpins || state.freeSpinsRemaining <= 0 || state.isSpinning || state.isTransitioning) {
        console.log("Cannot start free spin:", {fs: state.isInFreeSpins, rem: state.freeSpinsRemaining, spin: state.isSpinning, trans: state.isTransitioning});
        return;
    }
    // updateInfoOverlay(); // Handled by UIManager
    setButtonsEnabled(false); // Ensure buttons remain disabled
    startSpin(true); // Call the main startSpin function, flagging it as a free spin
}

/**
 * Exits the Free Spins mode.
 * Shows summary message, resets state, changes background back.
 */
export function exitFreeSpins() {
    if (!state.isInFreeSpins || !appRef) return;

    console.log(`Exit Free Spins. Total Win: €${state.totalFreeSpinsWin.toFixed(2)}`);
    updateState({ isTransitioning: true }); // Prevent actions during transition

    // Show summary message
    showOverlayMessage(
        `FREE SPINS COMPLETE\nTOTAL WIN:\n€${state.totalFreeSpinsWin.toFixed(2)}`,
        3000, // Use base duration
        () => {
            // Reset state AFTER the message
            updateState({
                isInFreeSpins: false,
                freeSpinsRemaining: 0,
                isTransitioning: false,
                // Keep totalFreeSpinsWin for display until next regular win? Or reset here?
                // totalFreeSpinsWin: 0, // Let's reset it here for clarity
            });
            appRef.renderer.background.color = normalBgColor; // Change background back
            // updateInfoOverlay(); // Handled by UIManager
            setButtonsEnabled(true); // Re-enable controls
            // updateDisplays(); // Ensure final win amount is shown correctly if needed
        }
    );
}

/**
 * Handles the logic after a free spin completes.
 * Updates total win, decrements remaining spins, and decides whether to start next spin or exit.
 */
export function handleFreeSpinEnd() {
    if (!state.isInFreeSpins) return;

    // Add the win from the completed spin to the total FS win
    updateState({ totalFreeSpinsWin: state.totalFreeSpinsWin + state.lastTotalWin });
    updateState({ freeSpinsRemaining: state.freeSpinsRemaining - 1 });

    // updateInfoOverlay(); // Handled by UIManager

    // Delay before next action (next spin or exit)
    const delay = (state.isTurboMode ? 200 : 800) * winAnimDelayMultiplier;
    updateState({ isTransitioning: true });

    setTimeout(() => {
        updateState({ isTransitioning: false });
        if (state.freeSpinsRemaining > 0) {
            startFreeSpin(); // Start the next free spin
        } else {
            exitFreeSpins(); // No spins left, exit the mode
        }
    }, delay);
}
