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
        // Listen for the signal that reels have stopped visually
        // In Phase 2, this might listen to 'server:spinResultReceived' from ApiService
        const unsubscribeSpinEnd = this.eventBus.on('spin:stoppedVisuals', this._processSpinResult.bind(this));
        this._listeners.push(unsubscribeSpinEnd);
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
     * Processes the result of a completed spin.
     * (FUTURE) This method will receive the authoritative spin result from the server.
     * It will validate the result, update game state (balance, features), 
     * and emit events for presentation (paylines, symbol animations, win amounts).
     * @param {object} [serverResultData] - The result data from the server (in the future).
     * @private
     */
    _processSpinResult(serverResultData) {
        this.logger?.info('ResultHandler', 'Processing spin result...', serverResultData ? { serverData: true } : { clientMock: true });

        // --- FUTURE SERVER LOGIC --- 
        // 1. Receive serverResultData from ApiService via event
        // 2. Validate serverResultData (checksums, sequence numbers, etc.)
        // 3. Update critical GameState based *only* on server data:
        //    - updateState({ balance: serverResultData.newBalance });
        //    - updateState({ lastTotalWin: serverResultData.totalWin }); 
        //    - updateState({ winningLinesInfo: serverResultData.winningLines });
        //    - Handle feature triggers from server (e.g., serverResultData.featuresTriggered)
        //      - eventBus.emit('feature:trigger:freeSpins', { spinsAwarded: serverResultData.freeSpinsAwarded });
        // 4. Prepare data payload for presentation modules based on validated server data.
        // --------------------------
        
        // --- CURRENT MOCK LOGIC (Replaces WinEvaluation) --- 
        const grid = this._getGridFromReels();
        if (!grid) {
            this.logger?.error('ResultHandler', 'Failed to get grid for mock evaluation.');
            return;
        }

        let calculatedTotalWin = 0;
        const calculatedWinningLines = [];
        const allSymbolsToAnimate = new Set(); // Use Set for uniqueness

        // Mock Payline Check (similar to WinEvaluation)
        PAYLINES.forEach((linePath, lineIndex) => {
            const firstSymbolId = grid[0]?.[linePath?.[0]];
            if (!firstSymbolId || !PAYTABLE[firstSymbolId]) return;

            let consecutiveCount = 0;
            if (this.reelManager && this.reelManager.reels) { 
                for (let reelIndex = 0; reelIndex < this.reelManager.reels.length; reelIndex++) {
                    if (grid[reelIndex]?.[linePath?.[reelIndex]] === firstSymbolId) {
                        consecutiveCount++;
                    } else {
                        break;
                    }
                }
            } else {
                 this.logger?.warn('ResultHandler', 'ReelManager or reels array missing for payline check.');
            }
            const payoutMap = PAYTABLE[firstSymbolId];
            const winMultiplier = payoutMap?.[consecutiveCount] || 0;
            
            if (winMultiplier > 0) {
                const lineWin = winMultiplier * state.currentBetPerLine;
                calculatedTotalWin += lineWin;
                const lineInfo = { lineIndex, symbolId: firstSymbolId, count: consecutiveCount, winAmount: lineWin };
                calculatedWinningLines.push(lineInfo);
                
                // Add symbols to animate
                for (let reelIndex = 0; reelIndex < consecutiveCount; reelIndex++) {
                    const rowIndex = linePath[reelIndex];
                    const symbolSprite = this.reelManager?.reels?.[reelIndex]?.symbols?.[rowIndex + 1];
                    if (symbolSprite) allSymbolsToAnimate.add(symbolSprite);
                }
            }
        });
        
        // Update non-critical state (for presentation)
        updateState({
            lastTotalWin: calculatedTotalWin,
            winningLinesInfo: calculatedWinningLines,
        });
        this.logger?.debug('ResultHandler', `Mock evaluation complete. Win: ${calculatedTotalWin}`);

        // --- Add win to balance (CRITICAL) ---
        if (calculatedTotalWin > 0) {
            const currentBalance = state.balance;
            updateState({ balance: currentBalance + calculatedTotalWin });
            this.logger?.info('ResultHandler', `Updated balance from ${currentBalance} to ${state.balance}`);
        }

        // Emit event for payline drawing
        if (calculatedWinningLines.length > 0) {
            this.logger?.info('ResultHandler', 'Emitting paylines:show');
            this.eventBus?.emit('paylines:show', { winningLines: calculatedWinningLines });
        }

        // Emit event for win animations
        const animationPayload = {
            totalWin: calculatedTotalWin,
            winningLines: calculatedWinningLines, 
            symbolsToAnimate: Array.from(allSymbolsToAnimate), // Convert Set to Array
            currentTotalBet: state.currentTotalBet 
        };
        this.logger?.info('ResultHandler', 'Emitting win:validatedForAnimation');
        this.eventBus?.emit('win:validatedForAnimation', animationPayload);
        
        // --- END MOCK LOGIC --- 

        // --- Feature Trigger Handling (Example - Moved from WinEvaluation, triggered by server data in future) ---
        // Mock scatter check - this would use serverResultData.scatterCount in future
        let scatterCount = 0;
         if (SETTINGS.ENABLE_FREE_SPINS && SETTINGS.SCATTER_SYMBOL_ID) {
             grid.forEach(column => {
                 column.forEach(symbolId => {
                     if (symbolId === SETTINGS.SCATTER_SYMBOL_ID) scatterCount++;
                 });
             });
         }
         const freeSpinsTriggered = SETTINGS.ENABLE_FREE_SPINS && scatterCount >= SETTINGS.MIN_SCATTERS_FOR_FREE_SPINS;
        
         if (freeSpinsTriggered) {
             this.logger?.info('ResultHandler', `(Mock) Free Spins Trigger Condition Met! Count: ${scatterCount}`);
             this.eventBus?.emit('feature:trigger:freeSpins', { spinsAwarded: SETTINGS.FREE_SPINS_AWARDED });
         }
        // --- End Feature Trigger --- 

        // Finally, emit event indicating evaluation/processing is complete
        this.logger?.info('ResultHandler', '>>> EMITTING win:evaluationComplete >>>');
        this.eventBus?.emit('win:evaluationComplete');
    }

    /** Helper to get grid - TEMPORARY, mimics WinEvaluation */
    _getGridFromReels() {
        if (!this.reelManager?.reels) return null;
        try {
            return this.reelManager.reels.map(reel => {
                if (!reel?.symbols) throw new Error(`Reel ${reel?.reelIndex} has no symbols`);
                // +1 accounts for the buffer symbol at index 0
                return reel.symbols.slice(1, 1 + SETTINGS.SYMBOLS_PER_REEL_VISIBLE).map(s => s?.symbolId);
            });
        } catch (error) {
            this.logger?.error('ResultHandler', 'Error getting results grid:', error);
            return null;
        }
    }
} 