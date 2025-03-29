/* global PIXI */ // Might be needed for flashing elements later
import { BET_PER_LINE_LEVELS } from '../config/gameSettings.js';
import { NUM_PAYLINES } from '../config/paylines.js'; // Corrected import
// Removed unused import: import { updateAnimationSettings } from '../config/animationSettings.js';

// --- Placeholder Imports (Will be replaced with actual module imports later) ---
// These represent dependencies that need to be resolved once other modules are created.
import { state, updateState } from '../core/GameState.js';
import { updateAutoplayButtonState, updateTurboButtonState, updateDisplays, setButtonsEnabled, getSpinManagerStartFunction } from './UIManager.js';
import { flashElement } from './Notifications.js'; // Assuming Notifications handles flashing
import { applyTurboSettings as applyTurbo } from '../features/TurboMode.js'; // Assuming TurboMode handles applying settings
// Removed problematic imports


// --- Bet Adjustment ---

function changeBet(direction) {
  // Access state via imported state object
  if (state.isSpinning || state.isTransitioning || state.isInFreeSpins) return;

  let currentLevelIndex = BET_PER_LINE_LEVELS.indexOf(state.currentBetPerLine);

  // Find closest level if current value isn't exact
  if (currentLevelIndex === -1) {
    currentLevelIndex = BET_PER_LINE_LEVELS.findIndex(
      (lvl) => lvl >= state.currentBetPerLine
    );
    if (currentLevelIndex === -1) {
      currentLevelIndex = BET_PER_LINE_LEVELS.length - 1;
    } else if (
      currentLevelIndex > 0 &&
      BET_PER_LINE_LEVELS[currentLevelIndex] > state.currentBetPerLine
    ) {
      currentLevelIndex--;
    }
  }

  let newLevelIndex = currentLevelIndex + direction;
  newLevelIndex = Math.max(
    0,
    Math.min(newLevelIndex, BET_PER_LINE_LEVELS.length - 1)
  );

  // Make sure we use a valid number of paylines
  const numPaylines = NUM_PAYLINES || 15; // Fallback to 15 if NUM_PAYLINES is undefined
  
  // Update state via imported function/object
  updateState({ currentBetPerLine: BET_PER_LINE_LEVELS[newLevelIndex] });
  updateState({ currentTotalBet: BET_PER_LINE_LEVELS[newLevelIndex] * numPaylines }); // Also update total bet

  updateDisplays(); // Update UI
}

/**
 * Toggles autoplay mode and updates UI state
 */
export function toggleAutoplay() {
    // Allow stopping autoplay at any time, even during spins
    if (state.isAutoplaying) {
        // Stop autoplay
        updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
        
        // Immediately update button appearance
        updateAutoplayButtonState();
        
        console.log(`Autoplay toggled OFF`);
        
        // Only re-enable buttons if not spinning and not in transitions
        if (!state.isSpinning && !state.isTransitioning) {
            setButtonsEnabled(true);
        }
    } else {
        // Only allow starting autoplay if in appropriate state
        if (!state.isSpinning && !state.isTransitioning && !state.isInFreeSpins) {
            updateState({ 
                isAutoplaying: true, 
                autoplaySpinsRemaining: state.autoplaySpinsDefault 
            });
            
            // Update button appearance
            updateAutoplayButtonState();
            
            console.log(`Autoplay toggled ON - ${state.autoplaySpinsRemaining} spins`);
            
            // Start the first spin
            const startSpin = getSpinManagerStartFunction();
            if (startSpin) startSpin();
        }
    }
}

/**
 * Toggles turbo mode
 */
export function toggleTurbo() {
    // We can toggle turbo regardless of spin state
    updateState({ isTurboMode: !state.isTurboMode });
    
    // Apply settings (might involve updating animation config)
    applyTurbo(state.isTurboMode);
    
    // Update UI to reflect the new turbo state
    updateTurboButtonState();
    
    console.log(`Turbo mode toggled ${state.isTurboMode ? 'ON' : 'OFF'}`);
}

/**
 * Find the index of the current bet level in the available levels
 * @returns {number} The index of the current bet level
 */
function findCurrentBetIndex() {
    return BET_PER_LINE_LEVELS.findIndex(bet => bet === state.currentBetPerLine);
}

/**
 * Increases the current bet per line
 */
export function increaseBet() {
    // Only allow bet changes when not spinning or in autoplay
    if (!state.isSpinning && !state.isAutoplaying && !state.isInFreeSpins) {
        const currentIndex = findCurrentBetIndex();
        const maxIndex = BET_PER_LINE_LEVELS.length - 1;
        
        if (currentIndex < maxIndex) {
            const newBetPerLine = BET_PER_LINE_LEVELS[currentIndex + 1];
            // Make sure numPaylines is defined before using it
            const numPaylines = NUM_PAYLINES || 15; // Fallback to 15 if NUM_PAYLINES is undefined
            
            updateState({ 
                currentBetPerLine: newBetPerLine,
                currentTotalBet: newBetPerLine * numPaylines
            });
            
            // Update UI to reflect the new bet amount
            updateDisplays();
            
            console.log(`Bet increased to ${state.currentBetPerLine} per line, total: ${state.currentTotalBet}`);
        } else {
            console.log("Already at maximum bet level");
        }
    } else {
        console.log('Cannot change bet during spin, autoplay, or free spins.');
    }
}

/**
 * Decreases the current bet per line
 */
export function decreaseBet() {
    // Only allow bet changes when not spinning or in autoplay
    if (!state.isSpinning && !state.isAutoplaying && !state.isInFreeSpins) {
        const currentIndex = findCurrentBetIndex();
        
        if (currentIndex > 0) {
            const newBetPerLine = BET_PER_LINE_LEVELS[currentIndex - 1];
            // Make sure numPaylines is defined before using it
            const numPaylines = NUM_PAYLINES || 15; // Fallback to 15 if NUM_PAYLINES is undefined
            
            updateState({ 
                currentBetPerLine: newBetPerLine,
                currentTotalBet: newBetPerLine * numPaylines
            });
            
            // Update UI to reflect the new bet amount
            updateDisplays();
            
            console.log(`Bet decreased to ${state.currentBetPerLine} per line, total: ${state.currentTotalBet}`);
        } else {
            console.log("Already at minimum bet level");
        }
    } else {
        console.log('Cannot change bet during spin, autoplay, or free spins.');
    }
}

// --- Spin ---

export function startSpin(isFreeSpin = false) {
  if (state.isSpinning || state.isTransitioning) {
    console.warn(`[ButtonHandlers.startSpin] Aborting spin start during Autoplay? isSpinning: ${state.isSpinning}, isTransitioning: ${state.isTransitioning}`);
    return;
  }

  // Make sure we use a valid number of paylines
  const numPaylines = NUM_PAYLINES || 15; // Fallback to 15 if NUM_PAYLINES is undefined
  
  // Ensure total bet is current
  const currentTotalBet = state.currentBetPerLine * numPaylines;
  updateState({ currentTotalBet: currentTotalBet });

  // Check balance only if it's not a free spin
  if (!isFreeSpin && state.balance < currentTotalBet) {
    console.warn("Insufficient funds.");
    if (state.isAutoplaying) {
      // Stop autoplay if funds are insufficient
      updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
      updateAutoplayButtonState();
    }
    setButtonsEnabled(true); // Re-enable buttons
    return; // Stop the spin process
  }

  // --- Start the Spin Process ---
  setButtonsEnabled(false); // Disable controls

  // Reset win display and line graphics
  updateState({ lastTotalWin: 0, winningLinesInfo: [] });

  updateDisplays(); // Update balance/win text immediately

  // Deduct bet if not a free spin
  if (!isFreeSpin) {
    updateState({ balance: state.balance - currentTotalBet });
  }

  // Reset target stopping index for chained stops
  updateState({ targetStoppingReelIndex: 0 });

  // Get the spin function from UIManager
  const spinFunc = getSpinManagerStartFunction();

  // Initiate the spin via the retrieved function
  if (spinFunc) {
      spinFunc(); // Call the SpinManager's startSpin method
  } else {
      console.error("Cannot start spin: Spin function not available from UIManager.");
      // Re-enable buttons if spin couldn't start
      setButtonsEnabled(true);
  }
}
