/* global PIXI */ // Might be needed for flashing elements later
import { BET_PER_LINE_LEVELS } from '../config/gameSettings.js';
import { NUM_PAYLINES } from '../config/paylines.js'; // Corrected import
// Removed unused import: import { updateAnimationSettings } from '../config/animationSettings.js';

// --- Placeholder Imports (Will be replaced with actual module imports later) ---
// These represent dependencies that need to be resolved once other modules are created.
import { state, updateState } from '../core/GameState.js'; // Assuming GameState exports state object and update function
import { updateDisplays, updateAutoplayButtonState, updateTurboButtonState, setButtonsEnabled } from './UIManager.js'; // Assuming UIManager handles UI updates
import { flashElement } from './Notifications.js'; // Assuming Notifications handles flashing
import { applyTurboSettings as applyTurbo } from '../features/TurboMode.js'; // Assuming TurboMode handles applying settings
// Removed import for global startSpinLoop
// import { startSpinLoop } from '../core/Game.js';

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

  // Update state via imported function/object
  updateState({ currentBetPerLine: BET_PER_LINE_LEVELS[newLevelIndex] });
  updateState({ currentTotalBet: state.currentBetPerLine * NUM_PAYLINES }); // Also update total bet

  updateDisplays(); // Update UI
}

export function decreaseBet() {
  changeBet(-1);
}

export function increaseBet() {
  changeBet(1);
}

// --- Autoplay ---

export function toggleAutoplay() {
  if (state.isSpinning || state.isTransitioning || state.isInFreeSpins) return;

  if (state.isAutoplaying) {
    updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
    console.log("Autoplay stopped.");
    setButtonsEnabled(true); // Enable buttons
  } else {
    updateState({ isAutoplaying: true, autoplaySpinsRemaining: state.autoplaySpinsDefault }); // Use default from state
    console.log(`Autoplay started: ${state.autoplaySpinsRemaining} spins.`);
    updateAutoplayButtonState(); // Update button appearance
    startSpin(); // Start the first spin
  }
  // updateInfoOverlay(); // This will be handled by UIManager based on state changes
}


// --- Turbo Mode ---

export function toggleTurbo() {
  if (state.isTransitioning) return; // Prevent toggle during transitions

  const newTurboState = !state.isTurboMode;
  updateState({ isTurboMode: newTurboState }); // Update global state
  console.log(`Turbo: ${state.isTurboMode}`);

  // Apply settings (might involve updating animation config or directly passing values)
  applyTurbo(state.isTurboMode); // Call function from TurboMode feature
  updateTurboButtonState(); // Update button appearance
}


// --- Spin ---

export function startSpin(isFreeSpin = false) {
  if (state.isSpinning || state.isTransitioning) return;

  // Ensure total bet is current
  const currentTotalBet = state.currentBetPerLine * NUM_PAYLINES;
  updateState({ currentTotalBet: currentTotalBet });

  // Check balance only if it's not a free spin
  if (!isFreeSpin && state.balance < currentTotalBet) {
    console.warn("Insufficient funds.");
    // flashElement(balanceText, 0xe74c3c); // Needs reference to balanceText UI element - UIManager should handle this
    if (state.isAutoplaying) {
      // Stop autoplay if funds are insufficient
      updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
      updateAutoplayButtonState();
      // updateInfoOverlay(); // Handled by UIManager
    }
    setButtonsEnabled(true); // Re-enable buttons
    return; // Stop the spin process
  }

  // --- Start the Spin Process ---
  updateState({ isSpinning: true }); // Set master spinning flag
  setButtonsEnabled(false); // Disable controls

  // Reset win display and line graphics (UIManager or specific modules should handle this)
  updateState({ lastTotalWin: 0, winningLinesInfo: [] });
  // winLineGraphics.clear(); // Handled by PaylineGraphics module
  // overlayContainer.removeChildren(); // Handled by Notifications/UIManager

  updateDisplays(); // Update balance/win text immediately

  // Deduct bet if not a free spin
  if (!isFreeSpin) {
    updateState({ balance: state.balance - currentTotalBet });
    // balanceText.text = `€${state.balance.toFixed(2)}`; // Handled by UIManager
  }

  // Reset target stopping index for chained stops
  updateState({ targetStoppingReelIndex: 0 }); // This might be redundant if SpinManager handles it

  // Initiate the spin via SpinManager on the global gameApp instance
  if (window.gameApp && window.gameApp.spinManager) {
      window.gameApp.spinManager.startSpin(); // Call the manager's method
  } else {
      console.error("Cannot start spin: SpinManager not found on window.gameApp");
      // Re-enable buttons if spin couldn't start
      setButtonsEnabled(true);
      updateState({ isSpinning: false });
  }

  // The rest of the spin logic (scheduling stops, handling stop completion)
  // will be managed within the Game/Reel modules and the game loop itself.
}
