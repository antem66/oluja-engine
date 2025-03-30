/**
 * @module GameState
 * @description Manages the central, mutable state of the slot game.
 * Provides the current state object and functions to initialize and update it.
 * Other modules should import `state` for read access and `updateState` for modifications.
 * Requires initialization with dependencies (eventBus, logger) via `initGameState`.
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
 * Events Emitted:
 * - state:changed:[propertyName] (e.g., state:changed:balance, state:changed:isSpinning)
 *   Payload: { property: string, oldValue: any, newValue: any }
 *
 * Events Consumed:
 * - Potentially server:balanceUpdated, server:spinResultReceived (to update state based on authoritative data)
 */

import { AUTOPLAY_SPINS_DEFAULT, BET_PER_LINE_LEVELS, NUM_REELS, DEFAULT_CURRENCY } from '../config/gameSettings.js';
import { NUM_PAYLINES } from '../config/paylines.js';
// Import types for dependencies
import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
// Import TurboMode function needed when state changes
import { applyTurboSettings } from '../features/TurboMode.js';

// --- Module-level Dependency Instances ---
/** @type {EventBus | null} */
let eventBusInstance = null;
/** @type {Logger | null} */
let loggerInstance = null;
/** @type {Array<Function>} */
let listeners = []; // Store listener unsubscribe functions

// --- Central Game State ---
// Using 'let' for properties that change, 'const' for initial settings if not modified elsewhere.
export let state = {
    // Core gameplay
    balance: 10000,
    currentBetPerLine: BET_PER_LINE_LEVELS[3] || 0.1,
    currentTotalBet: (BET_PER_LINE_LEVELS[3] || 0.1) * NUM_PAYLINES,
    currentCurrency: DEFAULT_CURRENCY,
    numReels: NUM_REELS,
    lastTotalWin: 0,
    /** @type {Array<object>} */
    winningLinesInfo: [],

    // Spin state
    isSpinning: false,
    isTransitioning: false,
    targetStoppingReelIndex: -1,

    // Features state
    isAutoplaying: false,
    autoplaySpinsRemaining: 0,
    autoplaySpinsDefault: AUTOPLAY_SPINS_DEFAULT,
    isTurboMode: false,
    isInFreeSpins: false,
    freeSpinsRemaining: 0,
    totalFreeSpinsWin: 0,

    // Debug features
    isDebugMode: false,
    forceWin: false,

    // References (Removed - Managed elsewhere)
};

/**
 * Initializes the game state to default values and sets up dependencies.
 * Subscribes to UI events needed for state changes.
 * MUST be called once before `updateState` can emit events or log.
 * @param {object} dependencies - Core dependencies.
 * @param {EventBus} dependencies.eventBus - The global event bus instance.
 * @param {Logger} dependencies.logger - The global logger instance.
 * @returns {typeof state} The initial state object.
 */
export function initGameState(dependencies) {
    if (!dependencies || !dependencies.eventBus || !dependencies.logger) {
        console.error('GameState Error: initGameState requires dependencies object with eventBus and logger.');
        // Fallback to console if logger is missing
        (dependencies?.logger || console).error('GameState', 'Initialization failed: Missing dependencies.');
        return;
    }
    eventBusInstance = dependencies.eventBus;
    loggerInstance = dependencies.logger;

    // Define initial state properties
    const initialState = {
        balance: 10000,
        currentBetPerLine: BET_PER_LINE_LEVELS[3] || 0.1,
        currentTotalBet: (BET_PER_LINE_LEVELS[3] || 0.1) * NUM_PAYLINES,
        currentCurrency: DEFAULT_CURRENCY,
        numReels: NUM_REELS,
        lastTotalWin: 0,
        winningLinesInfo: [],
        isSpinning: false,
        isTransitioning: false,
        targetStoppingReelIndex: -1,
        isAutoplaying: false,
        autoplaySpinsRemaining: 0,
        autoplaySpinsDefault: AUTOPLAY_SPINS_DEFAULT,
        isTurboMode: false,
        isInFreeSpins: false,
        freeSpinsRemaining: 0,
        totalFreeSpinsWin: 0,
        isDebugMode: false,
        forceWin: false,
    };
    // Assign to the exported state variable
    state = { ...initialState };

    // Subscribe to UI button clicks
    if (eventBusInstance) {
        // Clean up previous listener if re-initializing
        unsubscribeListeners();
        const unsubscribeClick = eventBusInstance.on('ui:button:click', handleButtonClick);
        listeners.push(unsubscribeClick);
        loggerInstance.info('GameState', 'Subscribed to ui:button:click events.');
    } else {
        loggerInstance.error('GameState', 'EventBus not available, cannot subscribe to button clicks.');
    }

    loggerInstance.info('GameState', 'Initialized and dependencies set.', { initialState: state });

    // Return the initial state
    return initialState;
}

/**
 * Cleans up event listeners.
 */
export function destroyGameState() {
    unsubscribeListeners();
    loggerInstance?.info('GameState', 'Destroyed and unsubscribed listeners.');
    eventBusInstance = null;
    loggerInstance = null;
}

/** Unsubscribes all active listeners */
function unsubscribeListeners() {
    listeners.forEach(unsubscribe => unsubscribe());
    listeners = [];
}

/**
 * Handles 'ui:button:click' events to update game state.
 * @param {object} eventData 
 * @param {string} eventData.buttonName
 */
function handleButtonClick(eventData) {
    const buttonName = eventData.buttonName;
    loggerInstance?.debug('GameState', `Handling button click: ${buttonName}`);

    switch (buttonName) {
        case 'turbo':
            _handleTurboToggle();
            break;
        case 'autoplay':
            _handleAutoplayToggle();
            break;
        case 'betIncrease':
            _handleBetChange(1);
            break;
        case 'betDecrease':
            _handleBetChange(-1);
            break;
        case 'spin':
            // SpinManager listens for this directly to initiate spin
            loggerInstance?.debug('GameState', 'Spin button click detected, SpinManager should handle.');
            break;
        default:
            loggerInstance?.warn('GameState', `Unhandled button click: ${buttonName}`);
    }
}

// --- Internal State Update Logic ---

function _handleTurboToggle() {
    const newState = !state.isTurboMode;
    updateState({ isTurboMode: newState });
    // Apply turbo settings immediately after state change
    // This assumes applyTurboSettings handles reading the new state
    applyTurboSettings(newState);
    loggerInstance?.info('GameState', `Turbo mode toggled ${newState ? 'ON' : 'OFF'}`);
}

function _handleAutoplayToggle() {
    if (state.isAutoplaying) {
        // Stop autoplay
        updateState({ isAutoplaying: false, autoplaySpinsRemaining: 0 });
        loggerInstance?.info('GameState', `Autoplay toggled OFF`);
    } else {
        // Start autoplay only if conditions met
        if (!state.isSpinning && !state.isTransitioning && !state.isInFreeSpins) {
            updateState({
                isAutoplaying: true,
                autoplaySpinsRemaining: state.autoplaySpinsDefault
            });
            loggerInstance?.info('GameState', `Autoplay toggled ON - ${state.autoplaySpinsRemaining} spins`);
            // Note: Autoplay module should listen for state:changed:isAutoplaying 
            //       and trigger the first spin if needed.
        } else {
            loggerInstance?.warn('GameState', 'Cannot start autoplay due to current game state.');
        }
    }
}

function _handleBetChange(direction) {
    if (state.isSpinning || state.isTransitioning || state.isInFreeSpins || state.isAutoplaying) {
        loggerInstance?.warn('GameState', 'Cannot change bet during spin, transition, free spins, or autoplay.');
        return;
    }

    let currentLevelIndex = BET_PER_LINE_LEVELS.indexOf(state.currentBetPerLine);
    // Find closest level if current value isn't exact
    if (currentLevelIndex === -1) {
        const foundIndex = BET_PER_LINE_LEVELS.findIndex(lvl => lvl >= state.currentBetPerLine);
        if (foundIndex === -1) {
            currentLevelIndex = BET_PER_LINE_LEVELS.length - 1;
        } else if (foundIndex > 0 && BET_PER_LINE_LEVELS[foundIndex] > state.currentBetPerLine) {
            currentLevelIndex = foundIndex - 1;
        } else {
            currentLevelIndex = foundIndex; // Assign the found index
        }
    }

    // Ensure currentLevelIndex is valid before proceeding
    if (currentLevelIndex < 0 || currentLevelIndex >= BET_PER_LINE_LEVELS.length) {
        loggerInstance?.error('GameState', `_handleBetChange calculated invalid index: ${currentLevelIndex}`);
        currentLevelIndex = 0; // Default to 0 if something went wrong
    }

    let newLevelIndex = currentLevelIndex + direction;
    // Clamp index
    newLevelIndex = Math.max(0, Math.min(newLevelIndex, BET_PER_LINE_LEVELS.length - 1));

    if (newLevelIndex !== currentLevelIndex) {
        const newBetPerLine = BET_PER_LINE_LEVELS[newLevelIndex];
        const numPaylines = NUM_PAYLINES || 15;
        updateState({
            currentBetPerLine: newBetPerLine,
            currentTotalBet: newBetPerLine * numPaylines
        });
        loggerInstance?.info('GameState', `Bet changed to ${newBetPerLine.toFixed(2)} per line. Total: ${state.currentTotalBet.toFixed(2)}`);
    } else {
        loggerInstance?.debug('GameState', `Bet change requested but already at min/max limit.`);
    }
}

/**
 * Updates the central game state object with new values.
 * Merges the provided updates with the existing state.
 * Emits granular state change events via the configured EventBus.
 * Logs state changes via the configured Logger.
 * @param {Partial<typeof state>} updates - An object containing state properties to update.
 */
export function updateState(updates) {
    if (!eventBusInstance || !loggerInstance) {
        console.warn('GameState: updateState called before initGameState or dependencies not set. Events and logging will be skipped.');
        // Perform basic merge without events/logging
        state = { ...state, ...updates };
        return;
    }

    const changedProperties = {};

    // Store old values and identify changes
    for (const key in updates) {
        if (Object.hasOwnProperty.call(updates, key) && Object.hasOwnProperty.call(state, key)) {
            const oldValue = state[key];
            // @ts-ignore - We know key exists in updates
            const newValue = updates[key];

            if (oldValue !== newValue) {
                // Store for event emission after state is updated
                changedProperties[key] = { oldValue, newValue };
                loggerInstance.debug('GameState', `State changing: ${key} from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`);
            }
        }
    }

    // Merge the updates into the state
    state = { ...state, ...updates };

    // Emit granular events for properties that actually changed
    for (const key in changedProperties) {
        const { oldValue, newValue } = changedProperties[key];
        const eventName = `state:changed:${key}`;
        const payload = { property: key, oldValue, newValue };
        eventBusInstance.emit(eventName, payload);
    }

    // Also emit a general state change event if any properties changed
    if (Object.keys(changedProperties).length > 0) {
        eventBusInstance.emit('game:stateChanged', {
            updatedProps: Object.keys(changedProperties),
            newState: state // Pass the full new state
        });
        loggerInstance.debug('GameState', 'Emitted game:stateChanged event.');
    }
}

// Optional: Add getter functions if direct state access is discouraged later
// export function getBalance() { return state.balance; }
// export function isSpinning() { return state.isSpinning; }
// ... etc.
