/**
 * @module ResultHandler
 * @description Listens for spin results from the ApiService and instructs the ReelManager
 *              on where the reels should stop based on the authoritative server response.
 *              It acts as the bridge between the server result and the visual reel stopping mechanism.
 * 
 * Dependencies (Injected):
 * - eventBus: To listen for server:spinResultReceived.
 * - logger: For logging.
 * - reelManager: To set the final stop positions on the reels.
 * 
 * Events Emitted: (Potentially)
 * - reels:stopsSet { stopPositions: number[] }
 *
 * Events Consumed:
 * - server:spinResultReceived { data: SpinResult }
 */

// Import types for JSDoc
import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { ReelManager } from './ReelManager.js';
import { state, updateState } from './GameState.js'; // Import state and updateState
import { PAYTABLE } from '../config/symbolDefinitions.js'; // Example: Need Paytable for validation
import { PAYLINES } from '../config/paylines.js'; // Example: Need Paylines for validation
import * as SETTINGS from '../config/gameSettings.js'; // <-- Import SETTINGS

export class ResultHandler {
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('./ReelManager.js').ReelManager | null} */
    reelManager = null;
    
    /** @type {Function | null} */
    _unsubscribeSpinResult = null; // To store the unsubscribe function

    /** @type {Array<Function>} */
    _listeners = [];

    /**
     * @param {object} dependencies
     * @param {import('../utils/EventBus.js').EventBus} dependencies.eventBus
     * @param {import('../utils/Logger.js').Logger} dependencies.logger
     * @param {import('./ReelManager.js').ReelManager} dependencies.reelManager
     */
    constructor(dependencies) {
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.reelManager = dependencies.reelManager;

        if (!this.eventBus || !this.logger || !this.reelManager) {
            const errorMsg = 'ResultHandler: Missing dependencies (eventBus, logger, reelManager).';
            console.error(errorMsg); // Use console as logger might be missing
            // TODO: Consider throwing an error to halt initialization
        }

        this.logger?.info('ResultHandler', 'Instance created.');
    }

    /**
     * Initializes the handler by subscribing to necessary events.
     */
    init() {
        if (!this.eventBus) {
            this.logger?.error('ResultHandler', 'Cannot init - EventBus is missing.');
            return;
        }
        // Subscribe to the spin result event
        // Store the unsubscribe function for cleanup
        this._unsubscribeSpinResult = this.eventBus.on('server:spinResultReceived', this._handleSpinResultReceived.bind(this));
        this.logger?.info('ResultHandler', 'Initialized and subscribed to server:spinResultReceived.');

        this._subscribeToEvents();
        this.logger?.info('ResultHandler', 'Initialized and subscribed to events.');
    }

    _subscribeToEvents() {
        if (!this.eventBus) return;
        // Listen for the request to evaluate results, triggered by SpinManager after server response
        const unsubscribeEval = this.eventBus.on('spin:evaluateRequest', (eventData) => {
            const spinResultData = eventData?.spinResultData;
            if (spinResultData) {
                this._processSpinResult(spinResultData);
            } else {
                this.logger?.error('ResultHandler', 'Received spin:evaluateRequest without spinResultData!');
                // Handle error - maybe process a default 'loss' result?
                 this._processSpinResult({ totalWin: 0, winningLines: [], symbolsToAnimate: [], scatterCount: 0 });
            }
        });
        this._listeners.push(unsubscribeEval);
    }

    /**
     * Cleans up event listeners.
     */
    destroy() {
        this.logger?.info('ResultHandler', 'Destroying...'); // Add log
        if (this._unsubscribeSpinResult) {
            this._unsubscribeSpinResult();
            this._unsubscribeSpinResult = null;
            this.logger?.info('ResultHandler', 'Unsubscribed from server:spinResultReceived.');
        }
        // Nullify references
        const loggerRef = this.logger; // Hold reference before nullifying
        this.eventBus = null;
        this.logger = null; // Nullify logger
        this.reelManager = null;
        loggerRef?.info('ResultHandler', 'Destroyed.'); // Log using reference
    }

    /**
     * Handles the received spin result from the server (via ApiService event).
     * @param {object} eventData 
     * @param {object} eventData.data - The spin result payload (Should match SpinResult structure).
     * @private
     */
    _handleSpinResultReceived(eventData) {
        try {
            if (!eventData || !eventData.data) {
                this.logger?.error('ResultHandler', 'Received spin result event with invalid data.', eventData);
                return;
            }

            const { stopPositions } = eventData.data;

            // Use local constant for reelManager after null check
            const reelManager = this.reelManager;
            if (!reelManager) {
                this.logger?.error('ResultHandler', 'Cannot handle spin result - ReelManager is missing.');
                return;
            }
            // Use local constant in length check
            if (!Array.isArray(stopPositions) || stopPositions.length !== reelManager.reels.length) {
                 this.logger?.error('ResultHandler', 'Received invalid stopPositions data.', stopPositions);
                 return;
            }

            this.logger?.info('ResultHandler', 'Received spin result. Setting reel stop positions:', stopPositions);

            // Instruct the ReelManager to set the final positions
            stopPositions.forEach((position, index) => {
                // Access reel via local reelManager constant
                const reel = reelManager.reels[index];
                if (reel) {
                    // Set the finalStopPosition property directly
                    reel.finalStopPosition = position;
                     this.logger?.debug('ResultHandler', `Set stop position ${position} for reel ${index}`);
                } else {
                     this.logger?.warn('ResultHandler', `Reel not found at index ${index} when setting stop position.`);
                }
            });

            // Optionally emit an event indicating stops have been set
            this.eventBus?.emit('reels:stopsSet', { stopPositions });

            // TODO: Trigger next steps? (e.g., win evaluation request, start visual reel stopping sequence)
            // This might involve emitting another event like `spin:processResult` or `reels:startStoppingSequence`
            
        } catch (error) {
            this.logger?.error('ResultHandler', 'Error in _handleSpinResultReceived handler:', error);
            // Optionally re-throw or emit a specific error event
            // this.eventBus?.emit('system:error', { source: 'ResultHandler', error });
        }
    }

    /**
     * Processes the result of a completed spin based on provided data.
     * This method expects data that would normally come from the server.
     * It updates game state (balance, features) and emits events for presentation.
     *
     * @typedef {object} SpinResultData
     * @property {number} totalWin - The total win amount for the spin.
     * @property {Array<object>} winningLines - Array of winning line information objects.
     * @property {Array<import('./Symbol.js').SymbolSprite>} [symbolsToAnimate] - Optional array of symbol sprites involved in wins.
     * @property {number} [scatterCount] - Optional count of scatter symbols.
     * @property {number} [newBalance] - Optional: The new balance AFTER the win is applied (server authoritative).
     * @property {object} [featuresTriggered] - Optional: Information about triggered features.
     * @property {number} [featuresTriggered.freeSpinsAwarded]
     *
     * @param {SpinResultData} spinResultData - The result data for the spin.
     * @private
     */
    _processSpinResult(spinResultData) {
        this.logger?.info('ResultHandler', 'Processing spin result with provided data:', spinResultData);

        if (!spinResultData) {
            this.logger?.error('ResultHandler', '_processSpinResult called without spinResultData.');
            return;
        }

        // Extract data from the result object
        const { 
            totalWin = 0,
            winningLines = [],
            symbolsToAnimate = [], // Default to empty array if not provided
            scatterCount = 0,      // Default to 0
            newBalance,            // Optional: direct balance from server
            featuresTriggered = {} // Default to empty object
        } = spinResultData;

        // TEMP: Ignore mock server newBalance for now. Update balance based on calculated win.
        // In production, the server's newBalance would be authoritative, or win amount applied separately.
        if (totalWin > 0) {
            // Server did NOT provide balance, calculate client-side
            const currentBalance = state.balance;
            updateState({
                balance: currentBalance + totalWin,
                lastTotalWin: totalWin,
                winningLinesInfo: winningLines
            });
            this.logger?.info('ResultHandler', `Updated balance from ${currentBalance} to ${state.balance}`);
        } else {
            // No win, just update win state to 0/empty
            updateState({ lastTotalWin: 0, winningLinesInfo: [] });
        }

        // Emit event for payline drawing
        if (winningLines.length > 0) {
            this.logger?.info('ResultHandler', 'Emitting paylines:show');
            this.eventBus?.emit('paylines:show', { winningLines: winningLines });
        }

        // Emit event for win animations
        const animationPayload = {
            totalWin: totalWin,
            winningLines: winningLines, 
            symbolIdentifiers: symbolsToAnimate, // Use renamed key
            currentTotalBet: state.currentTotalBet 
        };
        this.logger?.info('ResultHandler', 'Emitting win:validatedForAnimation');
        this.eventBus?.emit('win:validatedForAnimation', animationPayload);
        
        // --- Feature Trigger Handling (Example - Based on received data) ---
        // Mock scatter check - uses received scatterCount
        const freeSpinsTriggered = SETTINGS.ENABLE_FREE_SPINS && scatterCount >= SETTINGS.MIN_SCATTERS_FOR_FREE_SPINS;
        
        // Use featuresTriggered object from spinResultData if available
        const awardedSpins = featuresTriggered.freeSpinsAwarded || (freeSpinsTriggered ? SETTINGS.FREE_SPINS_AWARDED : 0);
        
        if (awardedSpins > 0) {
            this.logger?.info('ResultHandler', `Free Spins Trigger Condition Met! Awarded: ${awardedSpins}`);
            this.eventBus?.emit('feature:trigger:freeSpins', { spinsAwarded: awardedSpins });
        }
        // --- End Feature Trigger --- 

        // Finally, emit event indicating evaluation/processing is complete
        this.logger?.info('ResultHandler', '>>> EMITTING win:evaluationComplete >>>');
        this.eventBus?.emit('win:evaluationComplete');
    }
} 