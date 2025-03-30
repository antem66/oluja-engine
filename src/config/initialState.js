/**
 * @module initialState
 * @description Defines the default initial state for the game.
 */

import { DEFAULT_CURRENCY, BET_PER_LINE_LEVELS } from './gameSettings.js';
import { NUM_PAYLINES } from '../config/paylines.js';

/**
 * Defines the initial state of the game when it first loads.
 */
const initialState = {
    // Core Gameplay State
    balance: 100, // Default starting balance
    currentCurrency: DEFAULT_CURRENCY, // <-- Rename 'currency' to 'currentCurrency'
    currentBetPerLine: BET_PER_LINE_LEVELS[1], // <-- Use index 3 (0.1)
    numPaylines: NUM_PAYLINES, // <-- Use imported NUM_PAYLINES (15)
    currentTotalBet: BET_PER_LINE_LEVELS[1] * NUM_PAYLINES, // <-- Calculate using index 3 and NUM_PAYLINES (1.5)
    lastTotalWin: 0, // <-- Rename 'winAmount' to 'lastTotalWin'
    isSpinning: false, // Is the slot machine currently spinning?
    reelSymbols: null, // Will be populated by ReelManager initialization [[]]
    winningLines: [], // Details of winning lines from the last spin

    // Feature States
    isAutoplaying: false,
    autoplaySpinsRemaining: 0,
    isTurboMode: false,
    freeSpinsRemaining: 0,
    totalFreeSpinsAwarded: 0,
    freeSpinsMultiplier: 1, // Default multiplier during free spins
    isInFreeSpins: false, // Flag indicating if the free spins feature is active

    // Debugging and Development Flags
    forceWin: false, // Debug flag to force a win on the next spin
    forceFeature: null, // Debug flag to force a specific feature trigger (e.g., 'freeSpins')

    // Server/API Related State (if applicable)
    sessionId: null, // Unique session identifier
    lastServerResponse: null, // Store the last response from the game server

    // UI/Animation State
    isFastSpinning: false, // If individual reels finish faster (subset of isTurboMode)
    currentScreen: 'mainGame', // e.g., 'mainGame', 'freeSpinsIntro', 'paytable'
    isTransitioning: false, // Flag for screen transitions or major animations
};

export default initialState;
