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

    // Subscribe to the event indicating a spin sequence has fully completed
    // TODO: Determine the correct event: 'spin:complete', 'reels:stopped', or 'animation:completed'? Using 'reels:stopped' for now.
    const unsubscribeSpinEnd = eventBus.on('reels:stopped', handleSpinEndForAutoplay);
    listeners.push(unsubscribeSpinEnd);
    
    // Listen for state changes to potentially cancel autoplay mid-spin
    const unsubscribeState = eventBus.on('game:stateChanged', handleStateChangeForAutoplay);
    listeners.push(unsubscribeState);

    // TODO: Listen for server errors? 'server:error'?

    logger.info('Autoplay', 'Initialized and subscribed to events.');
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
 * Handles the 'reels:stopped' event to potentially trigger the next autoplay spin.
 * @private
 */
function handleSpinEndForAutoplay() {
    if (nextSpinTimeout) { // Clear any pending timeout from previous calls
         clearTimeout(nextSpinTimeout);
         nextSpinTimeout = null;
    }
    
    // Check conditions *after* the spin has ended
    if (!state.isAutoplaying) {
        logger?.debug('Autoplay', 'Spin ended, but autoplay is not active.');
        return;
    }

    if (state.isInFreeSpins || state.isTransitioning) {
        logger?.info('Autoplay', 'Spin ended, stopping autoplay due to FS/Transition state.');
        // Request state change - UIManager will handle button updates
        eventBus?.emit('autoplay:requestStop'); 
        return;
    }

    if (state.autoplaySpinsRemaining > 0) {
        const currentTotalBet = state.currentBetPerLine * NUM_PAYLINES; // Still need to read state for this
        if (state.balance < currentTotalBet) {
            logger?.info('Autoplay', 'Spin ended, stopping autoplay due to low balance.');
            eventBus?.emit('autoplay:requestStop', { reason: 'balance' }); // Emit stop request
            // Potentially notify user via event -> Notifications module?
            return;
        }

        // Decrement spins *before* scheduling the next one
        // TODO: This state update should ideally happen via an event/handler too.
        // For now, let's assume something else handles decrementing based on spin start/end.
        // updateState({ autoplaySpinsRemaining: state.autoplaySpinsRemaining - 1 });

        const delay = (state.isTurboMode ? 150 : 600) * winAnimDelayMultiplier;
        logger?.debug('Autoplay', `Spin ended, scheduling next autoplay spin in ${delay}ms.`);

        nextSpinTimeout = setTimeout(() => {
            // Final check before spinning
            if (!spinManager || !state.isAutoplaying || state.isInFreeSpins || state.isTransitioning) {
                logger?.debug('Autoplay', 'Next spin cancelled (timeout check).');
                eventBus?.emit('autoplay:requestStop'); // Ensure stopped if conditions changed during delay
                return;
            }
            logger?.info('Autoplay', 'Triggering next spin via SpinManager.');
            spinManager.startSpin(); // Use SpinManager to start the spin
            nextSpinTimeout = null; // Clear timeout reference
        }, delay);

    } else {
        logger?.info('Autoplay', 'Spin ended, autoplay finished naturally.');
        eventBus?.emit('autoplay:requestStop', { reason: 'completed' }); // Emit stop request
    }
}

/**
 * Listens for relevant state changes to cancel autoplay immediately if needed.
 * @param {object} eventData - Data from the 'game:stateChanged' event.
 * @private
 */
function handleStateChangeForAutoplay(eventData) {
    if (!state.isAutoplaying) return; // Only care if autoplay is active

    const { newState, updatedProps } = eventData;
    let shouldStop = false;

    // Check if specific relevant properties changed *to* a stopping condition
    if (updatedProps.includes('isAutoplaying') && !newState.isAutoplaying) {
        shouldStop = true; // Explicitly stopped by user/another system
        logger?.info('Autoplay', 'Detected external stop (isAutoplaying changed to false).');
    } else if (updatedProps.includes('isInFreeSpins') && newState.isInFreeSpins) {
        shouldStop = true;
        logger?.info('Autoplay', 'Detected FS start, stopping autoplay.');
    } else if (updatedProps.includes('isTransitioning') && newState.isTransitioning) {
        shouldStop = true;
        logger?.info('Autoplay', 'Detected transition start, stopping autoplay.');
    }
    // Add other conditions like server error flag if needed

    if (shouldStop) {
        if (nextSpinTimeout) {
            clearTimeout(nextSpinTimeout);
            nextSpinTimeout = null;
            logger?.debug('Autoplay', 'Cancelled pending next spin due to state change.');
        }
        // Ensure state is fully updated (UIManager handles button visuals based on state)
        // If the state change didn't already set isAutoplaying to false, we might need to emit here,
        // but ideally the source of the state change (e.g., user click) handles it.
        // eventBus?.emit('autoplay:requestStop'); // Avoid redundant emissions if possible
    }
}


// Removed handleAutoplayNextSpin export
// Removed old direct call logic
