/**
 * @module WinEvaluation
 * @description (TEMP) Calculates wins based on final reel positions and triggers animations.
 * (FUTURE) Validates server-provided win data and prepares data for animations.
 * Listens for spin evaluation requests and emits an event to trigger the AnimationController.
 *
 * Dependencies (Injected via init):
 * - eventBus: To listen for evaluation requests and emit animation triggers/state updates.
 * - logger: For logging.
 * - reelManager: To access symbol sprites on the reels.
 *
 * Public API:
 * - init(dependencies): Initializes and subscribes to events.
 * - destroy(): Cleans up listeners.
 *
 * Events Emitted:
 * - win:validatedForAnimation { totalWin, winningLines, symbolsToAnimate, currentTotalBet }
 * - state:update { lastTotalWin, winningLinesInfo }
 * - freespins:triggered { spinsAwarded }
 *
 * Events Consumed:
 * - spin:evaluateRequest
 */

// Keep config imports needed for symbol/reel dimensions or constants if used in validation later
import { PAYLINES } from '../config/paylines.js';
import { PAYTABLE } from '../config/symbolDefinitions.js'; // Import PAYTABLE
import {
    SYMBOLS_PER_REEL_VISIBLE, 
    SCATTER_SYMBOL_ID, MIN_SCATTERS_FOR_FREE_SPINS, ENABLE_FREE_SPINS, FREE_SPINS_AWARDED // Keep for scatter logic
} from '../config/gameSettings.js';
// Removed state and direct effect imports

// Import types
import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { ReelManager } from '../core/ReelManager.js';
import { state } from '../core/GameState.js'; // Import state for currentTotalBet

// --- Module-level variables ---
/** @type {EventBus | null} */
let eventBus = null;
/** @type {Logger | null} */
let logger = null;
/** @type {ReelManager | null} */
let reelManager = null;

/** @type {Function | null} */
let _unsubscribeEvalRequest = null;

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

    // Subscribe to evaluation request event
    _unsubscribeEvalRequest = eventBus.on('spin:evaluateRequest', _handleEvaluateRequest); // Changed event
    
    logger.info('WinEvaluation', 'Initialized and subscribed to spin:evaluateRequest.');
}

/**
 * Cleans up event listeners.
 */
export function destroy() {
    if (_unsubscribeEvalRequest) {
        _unsubscribeEvalRequest();
        _unsubscribeEvalRequest = null;
        logger?.info('WinEvaluation', 'Unsubscribed from spin:evaluateRequest.');
    }
    // Nullify references
    eventBus = null;
    logger = null;
    reelManager = null;
}

/**
 * Event handler for processing spin evaluation requests.
 * (TEMP) Calculates wins based on the current reel grid.
 * Identifies winning symbols, and emits event for animations.
 * @private
 */
function _handleEvaluateRequest() {
    logger?.debug('WinEvaluation', 'Handling spin:evaluateRequest');

    if (!eventBus || !logger || !reelManager || !reelManager.reels) {
         (logger || console).error('WinEvaluation Error: Dependencies not initialized or available.');
         return;
    }

    // --- Get Current Grid --- 
    const grid = getResultsGrid();
    if (!grid || grid.length !== reelManager.reels.length) {
        logger.error('WinEvaluation', 'Failed to get valid results grid from reels.');
        return;
    }

    // --- TEMP: Client-Side Win Calculation --- 
    let calculatedTotalWin = 0;
    const calculatedWinningLines = [];
    const allSymbolsToAnimate = [];
    const seenSymbols = new Set();

    // Check Paylines
    PAYLINES.forEach((linePath, lineIndex) => {
        if (!linePath || !reelManager?.reels || linePath.length !== reelManager.reels.length) return; 

        const firstSymbolId = grid[0][linePath[0]];
        if (!firstSymbolId || !PAYTABLE[firstSymbolId]) {
            // Log why line is skipped early
            // logger?.debug('WinEvaluation', `Skipping line ${lineIndex}: Invalid first symbol '${firstSymbolId}' or not in paytable.`);
            return; 
        }

        let consecutiveCount = 0;
        for (let reelIndex = 0; reelIndex < reelManager.reels.length; reelIndex++) {
            if (grid[reelIndex][linePath[reelIndex]] === firstSymbolId) {
                consecutiveCount++;
            } else {
                break; 
            }
        }
        
        // Get the payout MAP for the first symbol
        const payoutMap = PAYTABLE[firstSymbolId]; 
        // Check if a payout exists for the specific count
        const winMultiplier = payoutMap ? payoutMap[consecutiveCount] : 0;
        // Determine if a win occurred
        const winConditionMet = winMultiplier > 0;
        
        // Log check details - UNCOMMENT
        logger?.debug('WinEvaluation', `Line ${lineIndex}: Symbol='${firstSymbolId}', Count=${consecutiveCount}, PayoutMap=${JSON.stringify(payoutMap)}, Multiplier=${winMultiplier}, Met=${winConditionMet}`);

        // Check for win
        if (winConditionMet) {
            const lineWin = winMultiplier * state.currentBetPerLine; 
            calculatedTotalWin += lineWin;
            
            const lineInfo = {
                lineIndex: lineIndex,
                symbolId: firstSymbolId,
                count: consecutiveCount,
                winAmount: lineWin,
            };
            calculatedWinningLines.push(lineInfo);
            // Log win - UNCOMMENT
            logger?.info('WinEvaluation', `WIN FOUND on Line ${lineIndex}! Symbol=${firstSymbolId}, Count=${consecutiveCount}, Amount=${lineWin}`);
            
            // Identify symbols on this winning line for animation
            for (let reelIndex = 0; reelIndex < consecutiveCount; reelIndex++) {
                const rowIndex = linePath[reelIndex];
                 if (rowIndex >= 0 && rowIndex < SYMBOLS_PER_REEL_VISIBLE) {
                    // Check if reel exists before accessing symbols
                    const reel = reelManager?.reels?.[reelIndex]; 
                    if (reel && reel.symbols && reel.symbols.length > rowIndex + 1) { // Explicit check for reel
                        const symbolSprite = reel.symbols[rowIndex + 1]; 
                        if (symbolSprite && !seenSymbols.has(symbolSprite)) {
                            seenSymbols.add(symbolSprite);
                            allSymbolsToAnimate.push(symbolSprite);
                        }
                    } else {
                         // Log if reel or symbols array is missing/invalid
                         logger?.warn('WinEvaluation', `Cannot access symbol at [${reelIndex},${rowIndex}]. Reel or symbols array missing/invalid.`);
                    }
                }
            }
        }
    });

    // --- TEMP: Scatter Check --- (Add if Scatters are implemented)
    let scatterCount = 0;
    let scatterPositions = []; // Optional: For animating scatters
    if (ENABLE_FREE_SPINS && SCATTER_SYMBOL_ID) {
        grid.forEach((column, reelIndex) => {
            column.forEach((symbolId, rowIndex) => {
                if (symbolId === SCATTER_SYMBOL_ID) {
                    scatterCount++;
                    // Identify scatter symbol sprites if needed for animation
                     const reel = reelManager?.reels?.[reelIndex]; 
                     // Explicit check for reel before accessing symbols
                     if (reel && reel.symbols && reel.symbols.length > rowIndex + 1) { 
                         const symbolSprite = reel.symbols[rowIndex + 1]; 
                         if (symbolSprite && !seenSymbols.has(symbolSprite)) {
                             seenSymbols.add(symbolSprite);
                             allSymbolsToAnimate.push(symbolSprite);
                         }
                     } else {
                         // Log if reel or symbols array is missing/invalid
                         logger?.warn('WinEvaluation', `Cannot access scatter symbol at [${reelIndex},${rowIndex}]. Reel or symbols array missing/invalid.`);
                     }
                }
            });
        });
    }
    
    const freeSpinsTriggered = ENABLE_FREE_SPINS && scatterCount >= MIN_SCATTERS_FOR_FREE_SPINS;
    
    logger?.debug('WinEvaluation', `Client-side evaluation complete. Total Win: ${calculatedTotalWin}, Lines: ${calculatedWinningLines.length}, Symbols: ${allSymbolsToAnimate.length}`);

    // --- Update Game State --- 
    eventBus.emit('state:update', {
        lastTotalWin: calculatedTotalWin,
        // Maybe rename winningLinesInfo to winningLinesResult ?
        winningLinesInfo: calculatedWinningLines 
    });

    // --- Prepare Animation Payload --- 
    const animationPayload = {
        totalWin: calculatedTotalWin, 
        winningLines: calculatedWinningLines,
        symbolsToAnimate: allSymbolsToAnimate,
        currentTotalBet: state.currentTotalBet // Pass bet for big win calc
    };

    logger.info('WinEvaluation', 'Emitting win:validatedForAnimation', animationPayload);
    eventBus.emit('win:validatedForAnimation', animationPayload);

    // --- Handle Feature Triggers --- 
    if (freeSpinsTriggered) {
         logger.info('WinEvaluation', `Free Spins Triggered! Count: ${scatterCount}`);
         eventBus.emit('freespins:triggered', { spinsAwarded: FREE_SPINS_AWARDED }); 
    }
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
