/* global PIXI */ // Might be needed for flashing elements later
import { BET_PER_LINE_LEVELS } from '../config/gameSettings.js';
import { NUM_PAYLINES } from '../config/paylines.js'; // Corrected import
// Removed unused import: import { updateAnimationSettings } from '../config/animationSettings.js';

// --- Placeholder Imports (Will be replaced with actual module imports later) ---
// These represent dependencies that need to be resolved once other modules are created.
import { state } from '../core/GameState.js'; // Keep temporarily for state checks
import { flashElement } from './Notifications.js'; // Assuming Notifications handles flashing
import { applyTurboSettings as applyTurbo } from '../features/TurboMode.js'; // Assuming TurboMode handles applying settings
// Removed problematic imports

// Import types
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

// Module dependencies
/** @type {EventBus | null} */
let eventBus = null;
/** @type {Logger | null} */
let logger = null;

/**
 * Initializes the ButtonHandlers module with necessary dependencies.
 * @param {object} dependencies
 * @param {EventBus} dependencies.eventBus
 * @param {Logger} dependencies.logger
 */
export function initButtonHandlers(dependencies) {
    if (!dependencies || !dependencies.eventBus || !dependencies.logger) {
        console.error("ButtonHandlers Init Error: Missing dependencies (eventBus, logger).");
        return;
    }
    eventBus = dependencies.eventBus;
    logger = dependencies.logger;
    logger.info('ButtonHandlers', 'Initialized.');
}

// --- Button Click Handlers (Emit Events) ---

/**
 * Emits event for toggling autoplay.
 */
export function toggleAutoplay() {
    logger?.debug('ButtonHandlers', 'toggleAutoplay called');
    eventBus?.emit('ui:button:click', { buttonName: 'autoplay' });
}

/**
 * Emits event for toggling turbo mode.
 */
export function toggleTurbo() {
    logger?.debug('ButtonHandlers', 'toggleTurbo called');
    eventBus?.emit('ui:button:click', { buttonName: 'turbo' });
}

/**
 * Emits event for increasing the bet.
 */
export function increaseBet() {
    // Basic state check might still be useful before emitting
    if (state.isSpinning || state.isAutoplaying || state.isInFreeSpins) {
        logger?.debug('ButtonHandlers', 'increaseBet blocked by game state.');
        return; 
    }
    logger?.debug('ButtonHandlers', 'increaseBet called');
    eventBus?.emit('ui:button:click', { buttonName: 'betIncrease' });
}

/**
 * Emits event for decreasing the bet.
 */
export function decreaseBet() {
    // Basic state check might still be useful before emitting
    if (state.isSpinning || state.isAutoplaying || state.isInFreeSpins) {
        logger?.debug('ButtonHandlers', 'decreaseBet blocked by game state.');
        return; 
    }
    logger?.debug('ButtonHandlers', 'decreaseBet called');
    eventBus?.emit('ui:button:click', { buttonName: 'betDecrease' });
}

// --- Removed Obsolete Functions ---
// Removed changeBet (logic moves to GameState handler)
// Removed findCurrentBetIndex (logic moves to GameState handler)
// Removed startSpin (logic handled by SpinManager)
