import { state, updateState } from '../core/GameState.js'; // Keep for reading state values temporarily + ADD updateState
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
    const unsubscribeSpinEnd = eventBus.on('spin:sequenceComplete', handleSpinEndForAutoplay);
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
    listeners = []; // Clear listeners array
    if (nextSpinTimeout) {
        clearTimeout(nextSpinTimeout);
        nextSpinTimeout = null;
    }
    logger?.info('Autoplay', 'Destroyed and unsubscribed.');
    // Nullify dependencies
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
    try {
        if (nextSpinTimeout) { // Clear any pending timeout from previous calls
             clearTimeout(nextSpinTimeout);
             nextSpinTimeout = null;
        }
        
        // Check conditions *after* the spin has ended
        if (!state.isAutoplaying) {
            logger?.debug('Autoplay', 'Spin sequence complete, but autoplay is not active.');
            return;
        }

        if (state.isInFreeSpins) {
            logger?.info('Autoplay', 'Spin sequence complete, stopping autoplay because Free Spins are active.');
            // Request state change - UIManager will handle button updates
            eventBus?.emit('autoplay:requestStop'); 
            return;
        }

        if (state.autoplaySpinsRemaining > 0) {
            const currentTotalBet = state.currentBetPerLine * NUM_PAYLINES; // Still need to read state for this
            if (state.balance < currentTotalBet) {
                logger?.info('Autoplay', 'Spin sequence complete, stopping autoplay due to low balance.');
                eventBus?.emit('autoplay:requestStop', { reason: 'balance' }); // Emit stop request
                // Potentially notify user via event -> Notifications module?
                return;
            }

            // TODO: This state update should ideally happen via an event/handler too.
            // For now, let's assume something else handles decrementing based on spin start/end.
            // updateState({ autoplaySpinsRemaining: state.autoplaySpinsRemaining - 1 });
            // --- Decrement spins --- 
            const newRemaining = state.autoplaySpinsRemaining - 1;
            updateState({ autoplaySpinsRemaining: newRemaining });
            logger?.debug('Autoplay', `Decremented spins remaining to: ${newRemaining}`);
            // --- End Decrement ---

            const delay = (state.isTurboMode ? 150 : 600) * winAnimDelayMultiplier;
            logger?.debug('Autoplay', `Spin sequence complete, scheduling next autoplay spin in ${delay}ms.`);

            nextSpinTimeout = setTimeout(() => {
                // Final check before spinning
                if (!spinManager || !state.isAutoplaying || state.isInFreeSpins) {
                    logger?.debug('Autoplay', 'Next spin cancelled (timeout check).');
                    eventBus?.emit('autoplay:requestStop'); // Ensure stopped if conditions changed during delay
                    return;
                }
                logger?.info('Autoplay', 'Triggering next spin via SpinManager.');
                spinManager.startSpin(); // Use SpinManager to start the spin
                nextSpinTimeout = null; // Clear timeout reference
            }, delay);

        } else {
            logger?.info('Autoplay', 'Spin sequence complete, autoplay finished naturally.');
            eventBus?.emit('autoplay:requestStop', { reason: 'completed' }); // Emit stop request
        }
    } catch (error) {
        logger?.error('Autoplay', 'Error in handleSpinEndForAutoplay handler:', error);
    }
}

/**
 * Listens for relevant state changes to cancel autoplay immediately if needed,
 * or to trigger the first spin when autoplay is activated.
 * @param {object} eventData - Data from the 'game:stateChanged' event.
 * @private
 */
function handleStateChangeForAutoplay(eventData) {
    try {
        const { newState, updatedProps } = eventData;
        
        // --- Trigger First Spin ---
        // Check if autoplay was just turned ON
        if (updatedProps.includes('isAutoplaying') && newState.isAutoplaying) {
            // Check if we are in a state where we *can* start spinning
            if (!newState.isSpinning && !newState.isFeatureTransitioning && !newState.isInFreeSpins) {
                logger?.info('Autoplay', 'Autoplay activated via state change, scheduling first spin.');
                // Ensure we have a spin manager before setting timeout
                if (spinManager) { 
                    setTimeout(() => {
                        // Re-check state and spinManager *inside* the timeout
                        if (spinManager && state.isAutoplaying && !state.isSpinning && !state.isFeatureTransitioning && !state.isInFreeSpins) {
                            logger?.debug('Autoplay', 'Timeout triggered, starting first spin.');
                            spinManager.startSpin(); 
                        } else {
                             logger?.debug('Autoplay', 'First spin cancelled (state changed or spinManager missing during initial delay).');
                        }
                    }, 50); // Small delay (e.g., 50ms)
                } else {
                    logger?.error('Autoplay', 'Cannot schedule first spin, SpinManager is missing.');
                }
                // Don't proceed to the 'stop' check below if we just started
                return; 
            } else {
                 logger?.debug('Autoplay', 'Autoplay activated, but cannot start first spin due to current state.', { 
                     isSpinning: newState.isSpinning, 
                     isFeatureTransitioning: newState.isFeatureTransitioning,
                     isInFreeSpins: newState.isInFreeSpins 
                 });
            }
        }

        // --- Stop Autoplay ---
        // Only proceed if autoplay is currently supposed to be active
        if (!state.isAutoplaying) return;

        let shouldStop = false;

        // Check if specific relevant properties changed *to* a stopping condition
        if (updatedProps.includes('isAutoplaying') && !newState.isAutoplaying) {
            shouldStop = true; // Explicitly stopped by user/another system
            logger?.info('Autoplay', 'Detected external stop (isAutoplaying changed to false).');
        } else if (updatedProps.includes('isInFreeSpins') && newState.isInFreeSpins) {
            shouldStop = true;
            logger?.info('Autoplay', 'Detected FS start, stopping autoplay.');
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
            // but ideally the source of the state change (e.g., user click via GameState) handles it.
            // We might need to explicitly emit 'autoplay:requestStop' if the stopping condition 
            // wasn't the user directly toggling the isAutoplaying flag.
            if (!(updatedProps.includes('isAutoplaying') && !newState.isAutoplaying)) {
                 logger?.debug('Autoplay', 'Emitting autoplay:requestStop due to FS/Transition/Other.');
                 eventBus?.emit('autoplay:requestStop'); 
            }
        }
    } catch (error) {
         logger?.error('Autoplay', 'Error in handleStateChangeForAutoplay handler:', error);
    }
}


// Removed handleAutoplayNextSpin export
// Removed old direct call logic
