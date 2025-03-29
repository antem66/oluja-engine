/**
 * @module WinEvaluation
 * @description Validates server-provided win data and prepares data for animations.
 * Listens for spin results and emits an event to trigger the AnimationController.
 * Does NOT calculate wins or update game state directly.
 *
 * Dependencies (Injected via init):
 * - eventBus: To listen for server results and emit animation triggers.
 * - logger: For logging.
 * - reelManager: To access symbol sprites on the reels.
 *
 * Public API:
 * - init(dependencies): Initializes and subscribes to events.
 * - destroy(): Cleans up listeners.
 *
 * Events Emitted:
 * - win:validatedForAnimation { totalWin, winningLines, symbolsToAnimate, currentTotalBet }
 *
 * Events Consumed:
 * - server:spinResultReceived { data: SpinResult } 
 */

// Keep config imports needed for symbol/reel dimensions or constants if used in validation later
import { PAYLINES } from '../config/paylines.js';
// import { PAYTABLE } from '../config/symbolDefinitions.js'; 
import {
    SYMBOLS_PER_REEL_VISIBLE, 
    // SCATTER_SYMBOL_ID, MIN_SCATTERS_FOR_FREE_SPINS, ENABLE_FREE_SPINS, FREE_SPINS_AWARDED // Keep if validating scatters
} from '../config/gameSettings.js';
// Removed state and direct effect imports

// Import types
import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { ReelManager } from '../core/ReelManager.js';

// --- Module-level variables ---
/** @type {EventBus | null} */
let eventBus = null;
/** @type {Logger | null} */
let logger = null;
/** @type {ReelManager | null} */
let reelManager = null;

/** @type {Function | null} */
let _unsubscribeSpinResult = null;

/**
 * Initializes the module with dependencies and subscribes to events.
 * @param {object} dependencies
 * @param {EventBus} dependencies.eventBus
 * @param {Logger} dependencies.logger
 * @param {ReelManager} dependencies.reelManager
 */
export function init(dependencies) {
    if (!dependencies || !dependencies.eventBus || !dependencies.logger || !dependencies.reelManager) {
        console.error("WinEvaluation Init Error: Missing dependencies (eventBus, logger, reelManager).");
        return;
    }
    eventBus = dependencies.eventBus;
    logger = dependencies.logger;
    reelManager = dependencies.reelManager;

    // Subscribe to server result event
    _unsubscribeSpinResult = eventBus.on('server:spinResultReceived', _handleSpinResultReceived);
    
    logger.info('WinEvaluation', 'Initialized and subscribed to server:spinResultReceived.');
}

/**
 * Cleans up event listeners.
 */
export function destroy() {
    if (_unsubscribeSpinResult) {
        _unsubscribeSpinResult();
        _unsubscribeSpinResult = null;
        logger?.info('WinEvaluation', 'Unsubscribed from server:spinResultReceived.');
    }
    // Nullify references
    eventBus = null;
    logger = null;
    reelManager = null;
}

/**
 * Event handler for processing server spin results.
 * Validates data (optional), identifies winning symbols, and emits event for animations.
 * @param {object} eventData
 * @param {object} eventData.data - The spin result payload (SpinResult structure expected).
 * @param {number[]} eventData.data.stopPositions - Final reel stop indices.
 * @param {object[]} eventData.data.winningLines - Array of winning line details from server.
 * @param {number} eventData.data.totalWin - Total win amount from server.
 * @param {number} eventData.data.currentTotalBet - Bet amount for the spin.
 * @param {object[]} [eventData.data.featureTriggers] - Optional array of feature triggers.
 * @private
 */
function _handleSpinResultReceived(eventData) {
    logger?.debug('WinEvaluation', 'Handling server:spinResultReceived', eventData);

    if (!eventBus || !logger || !reelManager || !reelManager.reels) {
         (logger || console).error('WinEvaluation Error: Dependencies (eventBus, logger, reelManager, reelManager.reels) not initialized or available.');
         return;
    }

    if (!eventData || !eventData.data) {
        logger.error('WinEvaluation', 'Received event with invalid data structure.', eventData);
        return;
    }

    // --- Extract data from payload --- 
    const {
        stopPositions, // Needed to map winning lines to symbols
        winningLines,  // Array of { lineIndex, symbolId, count, winAmount, /* positions?: number[] */ }
        totalWin, 
        currentTotalBet, // Needed for Big Win calc in Animations module
        featureTriggers // Optional array like [{ type: 'FreeSpins', count: 10 }]
    } = eventData.data;

    // --- Basic Validation (Expand later if needed) --- 
    if (!Array.isArray(winningLines) || typeof totalWin !== 'number' || typeof currentTotalBet !== 'number') {
        logger.error('WinEvaluation', 'Invalid winningLines, totalWin, or currentTotalBet in payload.', eventData.data);
        return;
    }
    // TODO: Add validation for stopPositions length against reelManager.reels.length?
    // TODO: Add validation for featureTriggers structure?

    // --- Identify Winning Symbols --- 
    const allSymbolsToAnimate = [];
    const seenSymbols = new Set(); // Track unique symbol instances

    if (winningLines.length > 0) {
        logger.debug('WinEvaluation', `Processing ${winningLines.length} winning lines from server.`);
        
        winningLines.forEach((winInfo) => {
            const linePath = PAYLINES[winInfo.lineIndex]; // Assumes PAYLINES is available/imported
            if (!linePath) {
                logger?.warn('WinEvaluation', `Invalid lineIndex ${winInfo.lineIndex} received.`);
                return; // Skip this winning line
            }
            
            if (!reelManager || !reelManager.reels) {
                logger?.error('WinEvaluation', 'reelManager became unavailable during line processing.');
                return; // Cannot proceed without reels
            }
            
            // Iterate through the reels involved in the win (up to winInfo.count)
            for (let reelIndex = 0; reelIndex < winInfo.count; reelIndex++) {
                const rowIndex = linePath[reelIndex];
                if (rowIndex >= 0 && rowIndex < SYMBOLS_PER_REEL_VISIBLE) {
                    const reel = reelManager.reels[reelIndex];
                    if (reel && reel.symbols && reel.symbols.length > rowIndex + 1) {
                        // Access the visible SymbolSprite instance
                        const symbolSprite = reel.symbols[rowIndex + 1]; 
                        
                        // Optional: Verify symbol ID matches server data (sanity check)
                        if (symbolSprite?.symbolId !== winInfo.symbolId) {
                            logger?.warn('WinEvaluation', `Symbol ID mismatch on line ${winInfo.lineIndex}, reel ${reelIndex}. Server: ${winInfo.symbolId}, Client: ${symbolSprite?.symbolId}`);
                        }
                        
                        // Add unique symbol instance to animation list
                        if (symbolSprite && !seenSymbols.has(symbolSprite)) {
                            seenSymbols.add(symbolSprite);
                            allSymbolsToAnimate.push(symbolSprite);
                        }
                    } else {
                        logger?.error('WinEvaluation', `Could not find valid symbol sprite at [${reelIndex}, ${rowIndex}] for winning line ${winInfo.lineIndex}.`);
                    }
                }
            }
        });
    } else {
         logger?.debug('WinEvaluation', 'No winning lines reported by server.');
    }

    // --- Prepare Animation Payload --- 
    const animationPayload = {
        totalWin, // Pass total win from server
        winningLines, // Pass server winning lines (for payline graphics)
        symbolsToAnimate: allSymbolsToAnimate, // Pass identified symbol instances
        currentTotalBet // Pass bet (for big win calc)
        // Add featureTriggers if animations need them?
    };

    logger.info('WinEvaluation', 'Emitting win:validatedForAnimation', animationPayload);

    // --- Emit Event for AnimationController --- 
    eventBus.emit('win:validatedForAnimation', animationPayload);

    // TODO (Phase 3): Handle feature triggers - maybe emit separate events?
    // e.g., if (featureTriggers?.some(t => t.type === 'FreeSpins')) { 
    //           eventBus.emit('feature:trigger:FreeSpins', { count: ... }); 
    //      } 
}

// Removed evaluateWin function

// Keep getResultsGrid for potential future validation, but update it to use reelManager
/**
 * Gets the grid of symbol IDs currently visible on the reels.
 * Uses the logical finalStopPosition.
 * @returns {string[][] | null[][]} A 2D array representing the visible grid [reelIndex][rowIndex].
 */
function getResultsGrid() {
    const grid = [];
    if (!reelManager || !reelManager.reels) {
        logger?.error("getResultsGrid: reelManager or reels not available.");
        return []; 
    }
    reelManager.reels.forEach((reel, reelIndex) => {
        const column = [];
        if (reel && reel.strip) {
            const finalLogicalPosition = reel.finalStopPosition;
            if (typeof finalLogicalPosition !== 'number' || finalLogicalPosition < 0) {
                 logger?.warn('getResultsGrid', `Invalid finalStopPosition for reel ${reelIndex}`);
                 // Fill column with nulls if stop position is invalid
                 for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                     column.push(null);
                 }
            } else {
                 for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                    const symbolIndexOnStrip = (finalLogicalPosition + rowIndex + reel.strip.length) % reel.strip.length;
                    column.push(reel.strip[symbolIndexOnStrip]);
                }
            }
        } else {
             logger?.error('getResultsGrid', `Invalid reel or strip for Reel ${reelIndex}`);
             for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                 column.push(null);
             }
        }
        grid.push(column);
    });
    return grid;
}
