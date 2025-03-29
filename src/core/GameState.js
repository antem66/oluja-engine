/**
 * @module GameState
 * @description Manages the central, mutable state of the slot game.
 * Provides the current state object and functions to initialize and update it.
 * Other modules should import `state` for read access and `updateState` for modifications.
 *
 * Key state properties:
 * - balance: Player's current balance.
 * - currentBetPerLine: Bet amount per payline.
 * - currentTotalBet: Total bet for the next spin (betPerLine * numPaylines).
 * - lastTotalWin: Win amount from the last completed spin.
 * - isSpinning: Boolean flag indicating if reels are currently moving.
 * - isAutoplaying: Boolean flag for autoplay mode.
 * - isTurboMode: Boolean flag for turbo mode.
 * - isInFreeSpins: Boolean flag for free spins mode.
 * - winningLinesInfo: Array containing detailed info about winning lines from the last spin.
 * - (See `state` object definition for all properties)
 *
 * Events Emitted (Future - Phase 2):
 * - game:stateChanged (or more granular events like state:balanceChanged)
 *
 * Events Consumed (Future - Phase 2):
 * - Potentially server:balanceUpdated, server:spinResultReceived (to update state based on authoritative data)
 */

import { AUTOPLAY_SPINS_DEFAULT, BET_PER_LINE_LEVELS, NUM_REELS, DEFAULT_CURRENCY } from '../config/gameSettings.js'; // Import NUM_REELS and DEFAULT_CURRENCY
import { NUM_PAYLINES } from '../config/paylines.js'; // Corrected import

// --- Central Game State ---
// Using 'let' for properties that change, 'const' for initial settings if not modified elsewhere.
export let state = {
    // Core gameplay
    balance: 10000,
    currentBetPerLine: BET_PER_LINE_LEVELS[3] || 0.1, // Default to a mid-level bet
    currentTotalBet: (BET_PER_LINE_LEVELS[3] || 0.1) * NUM_PAYLINES,
    currentCurrency: DEFAULT_CURRENCY, // Track current currency setting (EUR/USD)
    numReels: NUM_REELS, // Add number of reels to state
    lastTotalWin: 0,
    /** @type {Array<{lineIndex: number, symbolId: string, count: number, winAmount: number, symbols: Array<import('./Symbol.js').Symbol>}>} */
    winningLinesInfo: [], // Array of { lineIndex, symbolId, count, winAmount, symbols }

    // Spin state
    isSpinning: false,      // Master flag: Are reels currently spinning/stopping?
    isTransitioning: false, // Is the game in a non-interactive transition (e.g., FS entry/exit message)?
    targetStoppingReelIndex: -1, // Which reel index is expected to stop next (for chained stops)

    // Features state
    isAutoplaying: false,
    autoplaySpinsRemaining: 0,
    autoplaySpinsDefault: AUTOPLAY_SPINS_DEFAULT, // Store the default value
    isTurboMode: false,
    isInFreeSpins: false,
    freeSpinsRemaining: 0,
    totalFreeSpinsWin: 0,

    // Debug features
    isDebugMode: false,     // Master toggle for debug features
    forceWin: false,        // When true, every spin will result in a win (used by mock API)

    // References (can be set during initialization if needed, though maybe better managed in Game.js)
    // reels: [], // Maybe keep reel references in Game.js instead?
    // uiElements: {}, // Maybe keep UI references in UIManager.js?
};

/**
 * Initializes the game state to default values.
 * Can be called at the start or to reset the game.
 */
export function initGameState() {
    state = {
        ...state, // Keep potential references if any were added dynamically
        balance: 10000,
        currentBetPerLine: BET_PER_LINE_LEVELS[3] || 0.1,
        currentTotalBet: (BET_PER_LINE_LEVELS[3] || 0.1) * NUM_PAYLINES,
        currentCurrency: DEFAULT_CURRENCY, // Reset to default currency
        numReels: NUM_REELS, // Add number of reels to state reset
        lastTotalWin: 0,
        winningLinesInfo: [], // Reset to empty array
        isSpinning: false,
        isTransitioning: false,
        targetStoppingReelIndex: -1,
        isAutoplaying: false,
        autoplaySpinsRemaining: 0,
        isTurboMode: false, // Reset turbo on init? Or keep user preference? Let's reset for now.
        isInFreeSpins: false,
        freeSpinsRemaining: 0,
        totalFreeSpinsWin: 0,

        // Debug features - reset to false on game init
        isDebugMode: false,
        forceWin: false,
    };
    // TODO: Replace with Logger call in Phase 2
    console.log("GameState Initialized:", state);
}

/**
 * Updates the central game state object with new values.
 * Merges the provided updates with the existing state.
 * This is the primary way mutable state should be changed.
 * Emits events (Future - Phase 2) after state change.
 * @param {Partial<typeof state>} updates - An object containing state properties to update.
 */
export function updateState(updates) {
    // --- DEBUG LOGGING START ---
    // const oldIsInFreeSpins = state.isInFreeSpins;
    // const oldIsSpinning = state.isSpinning;
    // const oldIsTransitioning = state.isTransitioning;
    // --- DEBUG LOGGING END ---

    // Basic merge, could add validation or logging later
    state = { ...state, ...updates };

    // --- DEBUG LOGGING START ---
    /* // Commented out the detailed logging block
    if (updates.hasOwnProperty('isInFreeSpins') && updates.isInFreeSpins !== oldIsInFreeSpins) {
        console.warn(`[STATE_CHANGE] isInFreeSpins changed from ${oldIsInFreeSpins} to ${updates.isInFreeSpins}! Update:`, updates);
        // Add a stack trace to see who called it
        console.trace('Stack trace for isInFreeSpins change');
    }
    // Optional: Log other potentially conflicting state changes

    if (updates.hasOwnProperty('isSpinning') && updates.isSpinning !== oldIsSpinning) {
        console.log(`[STATE_CHANGE] isSpinning changed from ${oldIsSpinning} to ${updates.isSpinning}. Update:`, updates);
    }
    if (updates.hasOwnProperty('isTransitioning') && updates.isTransitioning !== oldIsTransitioning) {
        console.log(`[STATE_CHANGE] isTransitioning changed from ${oldIsTransitioning} to ${updates.isTransitioning}. Update:`, updates);
    }

    // console.log("GameState Updated with:", updates, "New Full State:", state); // More verbose log
    */
    // --- DEBUG LOGGING END ---

    // TODO (Phase 2): Emit state change event(s) via EventBus
    // globalEventBus.emit('game:stateChanged', { updatedProps: Object.keys(updates), newState: state });
}

// Optional: Add getter functions if direct state access is discouraged later
// export function getBalance() { return state.balance; }
// export function isSpinning() { return state.isSpinning; }
// ... etc.
