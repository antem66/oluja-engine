import { state } from '../core/GameState.js'; // Keep for reading state values temporarily
// Removed GameState updateState import
// Removed UIManager imports
// Removed ButtonHandlers import
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { NUM_PAYLINES } from '../config/paylines.js';
// Removed Notifications import

// Import types
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { FeatureManager } from '../utils/FeatureManager.js';
import { SpinManager } from '../core/SpinManager.js'; // Import SpinManager type

// --- Module-level variables ---
/** @type {Logger | null} */
let logger = null;
/** @type {EventBus | null} */
let eventBus = null;
/** @type {FeatureManager | null} */
let featureManager = null;
/** @type {SpinManager | null} */
let spinManager = null;
/** @type {Array<Function>} */
let listeners = []; // To store unsubscribe functions
/** @type {ReturnType<typeof setTimeout> | null} */
let nextSpinTimeout = null; // To store the timeout ID


/**
 * Initializes the Autoplay module with dependencies and subscribes to events.
 * @param {object} dependencies
 * @param {Logger} dependencies.logger
 * @param {EventBus} dependencies.eventBus
 * @param {FeatureManager} dependencies.featureManager
 * @param {SpinManager} dependencies.spinManager
 */
export function initAutoplay(dependencies) {
    if (!dependencies || !dependencies.logger || !dependencies.eventBus || !dependencies.featureManager || !dependencies.spinManager) {
        console.error("Autoplay Init Error: Missing dependencies (logger, eventBus, featureManager, spinManager).");
        return;
    }
    logger = dependencies.logger;
    eventBus = dependencies.eventBus;
    featureManager = dependencies.featureManager;
    spinManager = dependencies.spinManager;

    // Listen ONLY for state changes
    const unsubscribeState = eventBus.on('game:stateChanged', handleStateChangeForAutoplay);
    listeners.push(unsubscribeState);

    // TODO: Listen for server errors? 'server:error'?

    logger.info('Autoplay', 'Initialized and subscribed to game:stateChanged.');
}

/**
 * Cleans up event listeners and timeouts.
 */
export function destroy() {
    listeners.forEach(unsubscribe => unsubscribe());
    listeners = [];
    if (nextSpinTimeout) {
        clearTimeout(nextSpinTimeout);
        nextSpinTimeout = null;
    }
    logger?.info('Autoplay', 'Destroyed and unsubscribed.');
    logger = null;
    eventBus = null;
    featureManager = null;
    spinManager = null;
}

/**
 * Listens for relevant state changes to manage autoplay.
 * - Starts the FIRST autoplay spin when isAutoplaying becomes true.
 * - Starts the NEXT autoplay spin when isSpinning becomes false.
 * - Stops autoplay if conditions require it (FS, external toggle off).
 * @param {object} eventData - Data from the 'game:stateChanged' event.
 * @private
 */
function handleStateChangeForAutoplay(eventData) {
    const { newState, updatedProps } = eventData;
    logger?.debug('Autoplay', 'handleStateChangeForAutoplay received', { updatedProps, newState });

    // --- Logic to START FIRST spin --- 
    if (updatedProps.includes('isAutoplaying') && newState.isAutoplaying) {
        // Check if we just transitioned TO autoplaying=true
        // This condition is sufficient, _startFirstAutoplaySpin does further checks
        logger?.info('Autoplay', 'Autoplay activated, attempting first spin.');
        _startFirstAutoplaySpin();
        return; // Don't process other logic on the same event
    }

    // --- Logic to START NEXT spin --- 
    if (updatedProps.includes('isSpinning') && !newState.isSpinning && newState.isAutoplaying) {
        // Check if spin just finished AND we are still in autoplay
        logger?.info('Autoplay', 'Spin finished while autoplay active, attempting to schedule next spin.');
        _scheduleNextAutoplaySpin();
        return; // Don't process stop logic if we just scheduled
    }

    // --- Logic to STOP autoplay --- 
    // Only check for stopping conditions if autoplay WAS active before this state change
    // We access the module-level `state` here assuming it reflects the state *before* this event.
    // This might be slightly racy, but simpler than tracking previous state explicitly.
    if (state.isAutoplaying) {
        let shouldStop = false;
        if (updatedProps.includes('isAutoplaying') && !newState.isAutoplaying) {
            shouldStop = true; // Explicitly stopped by user/another system
            logger?.info('Autoplay', 'Detected external stop command (isAutoplaying changed to false).');
        } else if (updatedProps.includes('isInFreeSpins') && newState.isInFreeSpins) {
            shouldStop = true;
            logger?.info('Autoplay', 'Detected FS start, stopping autoplay.');
        }
        // No need to check for isTransitioning here, as scheduling is tied to isSpinning=false

        if (shouldStop) {
            if (nextSpinTimeout) {
                clearTimeout(nextSpinTimeout);
                nextSpinTimeout = null;
                logger?.debug('Autoplay', 'Cancelled pending next spin due to stop condition.');
            }
            // Autoplay is already stopped in state, UIManager handles visuals.
            // We might still need to emit autoplay:requestStop if the stop wasn't initiated by it directly?
            // For now, assume the source of the state change handles the full stop sequence.
        }
    }
}

/**
 * Schedules the next autoplay spin after a delay.
 * Includes checks for remaining spins and balance.
 * @private
 */
function _scheduleNextAutoplaySpin() {
    logger?.debug('Autoplay', 'Entering _scheduleNextAutoplaySpin');
    if (nextSpinTimeout) { // Clear potentially conflicting timeout
        logger?.debug('Autoplay', 'Clearing existing schedule timeout.');
        clearTimeout(nextSpinTimeout);
        nextSpinTimeout = null;
    }

    if (state.autoplaySpinsRemaining > 0) {
        const currentTotalBet = state.currentBetPerLine * NUM_PAYLINES;
        if (state.balance < currentTotalBet) {
            logger?.info('Autoplay', 'Stopping autoplay: Low balance before scheduling next spin.');
            eventBus?.emit('autoplay:requestStop', { reason: 'balance' });
            return;
        }

        // Decrement spins via state update event
        const newRemaining = Math.max(0, state.autoplaySpinsRemaining - 1);
        logger?.debug('Autoplay', `Emitting state update for spins remaining: ${newRemaining}`);
        eventBus?.emit('state:update', { autoplaySpinsRemaining: newRemaining });

        if (newRemaining <= 0) {
            logger?.info('Autoplay', 'Autoplay finished naturally (scheduled 0 spins remaining).');
            // Autoplay will stop automatically in GameState/UIManager based on state
            return;
        }

        const delay = (state.isTurboMode ? 150 : 600) * winAnimDelayMultiplier;
        logger?.debug('Autoplay', `Scheduling next autoplay spin in ${delay}ms. Remaining: ${newRemaining}`);

        nextSpinTimeout = setTimeout(() => {
            logger?.debug('Autoplay', 'setTimeout callback executing for next spin.');
            // Perform final checks inside timeout
            if (!spinManager || !state.isAutoplaying || state.isInFreeSpins || state.isSpinning) {
                logger?.warn('Autoplay', 'Next spin cancelled (timeout check failed).', {
                    spinManagerExists: !!spinManager,
                    isAutoplaying: state.isAutoplaying,
                    isInFreeSpins: state.isInFreeSpins,
                    isSpinning: state.isSpinning
                });
                if (state.isAutoplaying) {
                    eventBus?.emit('autoplay:requestStop');
                }
            } else {
                logger?.info('Autoplay', 'Triggering next spin via SpinManager.');
                spinManager.startSpin();
                nextSpinTimeout = null;
            }
        }, delay);

    } else {
        // This case should ideally not be reached if state updates correctly
        logger?.info('Autoplay', 'Autoplay schedule check found 0 spins remaining initially.');
        eventBus?.emit('autoplay:requestStop', { reason: 'completed' });
    }
}

/**
 * Checks conditions and starts the first autoplay spin.
 * @private
 */
function _startFirstAutoplaySpin() {
    if (!spinManager || !state.isAutoplaying || state.isInFreeSpins || state.isTransitioning || state.isSpinning) {
        logger?.warn('Autoplay', 'Conditions not met for starting first spin.', {
            spinManager: !!spinManager,
            isAutoplaying: state.isAutoplaying,
            isInFreeSpins: state.isInFreeSpins,
            isTransitioning: state.isTransitioning,
            isSpinning: state.isSpinning
        });
        // If conditions changed rapidly, ensure autoplay is stopped if needed
        if (state.isAutoplaying && (state.isInFreeSpins || state.isTransitioning || state.isSpinning)) {
            eventBus?.emit('autoplay:requestStop');
        }
        return;
    }

    // Check balance before starting
    const currentTotalBet = state.currentBetPerLine * NUM_PAYLINES;
    if (state.balance < currentTotalBet) {
        logger?.info('Autoplay', 'Stopping autoplay immediately due to low balance before first spin.');
        eventBus?.emit('autoplay:requestStop', { reason: 'balance' });
        return;
    }

    logger?.info('Autoplay', 'Triggering first spin via SpinManager.');
    spinManager.startSpin();
}

// Removed handleAutoplayNextSpin export
// Removed old direct call logic
