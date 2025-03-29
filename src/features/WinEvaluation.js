/**
 * @module WinEvaluation
 * @description Calculates wins based on stopped reel positions and payline definitions.
 * Currently performs client-side win calculation.
 *
 * --- ROLE CHANGE in Phase 3 --- 
 * This module's responsibility will shift significantly:
 * 1. It will be triggered by an event containing server-provided results (e.g., `server:spinResultReceived` or `win:evaluateRequest`).
 * 2. It will **validate** the server-provided win data against the final symbol grid (optional sanity check).
 * 3. It will identify the specific `Symbol` instances on screen corresponding to the winning lines provided by the server.
 * 4. It will prepare data needed for animations (winning symbols, win amounts from server) and emit an event 
 *    (e.g., `win:validatedForAnimation`) to trigger the AnimationController.
 * 5. It will **stop calculating** win amounts or updating game state (like balance).
 *
 * Public API (Current):
 * - initWinEvaluation(reels): Initializes with reel references (Temporary).
 * - evaluateWin(): Calculates line wins and scatter triggers based on `reelsRef` and `GameState`.
 *
 * Public API (Future - Phase 3):
 * - init(dependencies): Initialize with EventBus, Logger.
 * - (No direct public methods, primarily reacts to events).
 *
 * Events Emitted (Future - Phase 3):
 * - win:validatedForAnimation { totalWin, winningLines, symbolsToAnimate, currentTotalBet } 
 *   (Containing data derived from the server response for animation system)
 *
 * Events Consumed (Future - Phase 3):
 * - server:spinResultReceived { data: SpinResult } (or a specific win:evaluateRequest event)
 */

import { PAYLINES, NUM_PAYLINES } from '../config/paylines.js';
import { PAYTABLE } from '../config/symbolDefinitions.js';
import {
    SCATTER_SYMBOL_ID, MIN_SCATTERS_FOR_FREE_SPINS, SYMBOLS_PER_REEL_VISIBLE,
    ENABLE_FREE_SPINS, FREE_SPINS_AWARDED
} from '../config/gameSettings.js';
import { state, updateState } from '../core/GameState.js'; // TODO: Remove direct state update
import { drawWinLines } from './PaylineGraphics.js'; // TODO: Remove direct call
import { playWinAnimations, animateWinningSymbols } from './Animations.js'; // TODO: Remove direct call
import { enterFreeSpins } from './FreeSpins.js'; // TODO: Refactor/Remove direct call
import { updateDisplays, animateWin } from '../ui/UIManager.js'; // TODO: Remove direct call

// Placeholder for reels data - this should be passed in or accessed via GameState/Game module
// TODO: Remove this global state, get reel data/symbols differently (e.g., from Game or event)
let reelsRef = [];
export function initWinEvaluation(reels) {
    reelsRef = reels;
    // TODO (Phase 2): Initialize with dependencies (EventBus, Logger), subscribe to events.
}

/**
 * Evaluates the win based on the current stopped reels.
 * Calculates line wins and scatter triggers.
 * Updates game state and triggers win animations/sounds.
 * --- DEPRECATED LOGIC in Phase 3 --- 
 * This method will be replaced by an event handler reacting to server results.
 * The logic will shift to validation and preparing animation data.
 */
export function evaluateWin() {
    // TODO (Phase 3): This function becomes an event handler.
    // Input: Server result data (stopPositions, winningLines, totalWin, featureTriggers) from event.
    // Output: Emits `win:validatedForAnimation` event.

    let calculatedTotalWin = 0;
    let calculatedWinningLines = []; // Initialize as empty array
    const resultsGrid = getResultsGrid(); // Uses stopIndex internally now
    // TODO: Use Logger
    console.log("[DEBUG] WinEvaluation - Results Grid:", JSON.stringify(resultsGrid)); // DEBUG: Log the grid
    let scatterCount = 0;

    // --- Calculate Line Wins (Current Client-Side Logic) ---
    // TODO (Phase 3): This loop changes to iterate server `winningLines` data,
    // find corresponding symbols on screen, and validate amounts.
    PAYLINES.forEach((linePath, lineIndex) => {
        let lineSymbolIds = [];
        let lineSymbolObjects = []; // Restore retrieving symbol objects

        for (let reelIndex = 0; reelIndex < state.numReels; reelIndex++) {
            const rowIndex = linePath[reelIndex];
            if (rowIndex >= 0 && rowIndex < SYMBOLS_PER_REEL_VISIBLE) {
                const symbolId = resultsGrid[reelIndex]?.[rowIndex]; // Use optional chaining
                lineSymbolIds.push(symbolId);

                // Find the corresponding symbol object on the reel
                let symbolObj = null;
                const reel = reelsRef[reelIndex]; // Uses temporary global ref
                // Access the visual symbols array on the reel
                if (reel && reel.symbols && reel.symbols.length > rowIndex + 1) {
                    // Index 1 to SYMBOLS_PER_REEL_VISIBLE are visible symbols
                    symbolObj = reel.symbols[rowIndex + 1];
                    // Optional: Verify symbolId matches, though getResultsGrid should be correct now
                    if (symbolObj?.symbolId !== symbolId) {
                        // TODO: Use Logger
                         console.warn(`[DEBUG] Mismatch between resultsGrid and symbolSprite at [${reelIndex},${rowIndex}]! Grid: ${symbolId}, Sprite: ${symbolObj?.symbolId}`);
                    }
                } else {
                    // TODO: Use Logger
                     console.error(`[DEBUG] Line ${lineIndex}, Reel ${reelIndex}: Invalid reel or symbols array.`);
                }
                lineSymbolObjects.push(symbolObj); // Push the found object (or null)

            } else {
                lineSymbolIds.push(null);
                lineSymbolObjects.push(null);
            }
        }
        // TODO: Use Logger (debug level)
        // console.log(`[DEBUG] Line ${lineIndex} - Collected Symbol IDs: ${lineSymbolIds.join(', ')}`);
        // console.log(`[DEBUG] Line ${lineIndex} - Collected Symbol Objects:`, lineSymbolObjects.map(s => s?.symbolId || 'null'));

        const firstSymbolId = lineSymbolIds[0];
        if (!firstSymbolId || !PAYTABLE[firstSymbolId]) {
            return; // Skip if first symbol isn't payable
        }

        let matchCount = 1;
        for (let i = 1; i < state.numReels; i++) {
            if (lineSymbolIds[i] === firstSymbolId) {
                matchCount++;
            } else {
                break;
            }
        }
        // TODO: Use Logger (debug level)
        // console.log(`[DEBUG] Line ${lineIndex} - Calculated Match Count: ${matchCount}`);

        const payoutInfo = PAYTABLE[firstSymbolId];
        const expectedPayout = payoutInfo ? payoutInfo[matchCount] : undefined;

        if (matchCount >= 3 && payoutInfo && expectedPayout !== undefined) {
            const lineWin = expectedPayout * state.currentBetPerLine; // Uses direct state access
            calculatedTotalWin += lineWin;

            // Get the actual winning symbol objects for animation
            const winningSymbols = lineSymbolObjects.slice(0, matchCount).filter(s => s !== null); // Filter nulls

            const winInfo = {
                lineIndex: lineIndex,
                symbolId: firstSymbolId,
                count: matchCount,
                winAmount: lineWin,
                symbols: winningSymbols, // Store actual symbol objects
            };
            calculatedWinningLines.push(winInfo);
            // TODO: Use Logger
            // console.log("[DEBUG] WinEvaluation - WIN FOUND:", { ... });
        }
    });

    // --- Check for Scatters (Current Client-Side Logic) ---
    // TODO (Phase 3): Check server `featureTriggers` data instead.
    resultsGrid.forEach(col => col.forEach(symId => {
        if (symId === SCATTER_SYMBOL_ID) {
            scatterCount++;
        }
    }));

    // --- Update State and Trigger Effects (Current Client-Side Logic) ---
    // TODO (Phase 3): Remove direct state updates and direct effect triggering.
    // Emit `win:validatedForAnimation` event instead.
    updateState({ lastTotalWin: calculatedTotalWin, winningLinesInfo: calculatedWinningLines });

    if (calculatedTotalWin > 0) {
        // TODO (Phase 3): Balance update should happen based on server response event.
        if (!state.isInFreeSpins) {
            updateState({ balance: state.balance + calculatedTotalWin });
        }
        // TODO: Use Logger
        console.log(`Win: €${calculatedTotalWin.toFixed(2)}`);

        // Trigger animations directly (will be replaced by event emission)
        drawWinLines(calculatedWinningLines); // TODO: Replace with event listener
        playWinAnimations(calculatedTotalWin, state.currentTotalBet); // TODO: Replace with event listener
        animateWin(calculatedTotalWin); // TODO: Replace with event listener

        // Prepare symbol list for animation
        if (calculatedWinningLines.length > 0) {
            const allSymbolsToAnimate = [];
            const seenSymbols = new Set();
            calculatedWinningLines.forEach(info => {
                if (info.symbols && info.symbols.length > 0) {
                    info.symbols.forEach(symbol => {
                        if (symbol && !seenSymbols.has(symbol)) {
                            seenSymbols.add(symbol);
                            allSymbolsToAnimate.push(symbol);
                        }
                    });
                }
            });
            if (allSymbolsToAnimate.length > 0) {
                animateWinningSymbols(allSymbolsToAnimate); // TODO: Replace with event listener
            }
        }
    } else {
        // TODO: Use Logger
        console.log("No line win.");
        // Still need to update display if win was previously shown
        updateDisplays(); // TODO: Replace with event listener?
    }

    // --- Trigger Free Spins (Current Client-Side Logic) ---
    // TODO (Phase 3): This logic should react to `featureTriggers` from server response event.
    if (scatterCount >= MIN_SCATTERS_FOR_FREE_SPINS && ENABLE_FREE_SPINS) {
        // TODO: Use Logger
        console.log(`WinEvaluation: ${scatterCount} scatters found. Triggering free spins (Enabled: ${ENABLE_FREE_SPINS}).`);
        const delay = (calculatedTotalWin > 0 ? 1000 : 100) * state.winAnimDelayMultiplier;
        updateState({ isTransitioning: true });
        setTimeout(() => {
            // TODO: This should likely emit a feature:trigger:FreeSpins event
            import('../features/FreeSpins.js').then(module => {
                module.enterFreeSpins(FREE_SPINS_AWARDED);
            });
        }, delay);
    }
}

/**
 * Gets the grid of symbol IDs currently visible on the reels.
 * Uses the logical stopIndex.
 * TODO: This might be needed for validation in Phase 3, or could be passed in event data.
 * @returns {string[][] | null[][]} A 2D array representing the visible grid [reelIndex][rowIndex].
 */
function getResultsGrid() {
    const grid = [];
    if (!reelsRef) {
        // TODO: Use Logger
        console.error("getResultsGrid: reelsRef is not initialized.");
        return []; // Return empty grid if reels aren't available
    }
    reelsRef.forEach((reel, reelIndex) => {
        const column = [];
        // Calculate visible symbols based on stopIndex
        if (reel && reel.strip) {
            // Use finalStopPosition as it reflects the target index after tweening
            const finalLogicalPosition = reel.finalStopPosition;
            for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                const symbolIndexOnStrip = (finalLogicalPosition + rowIndex + reel.strip.length) % reel.strip.length;
                column.push(reel.strip[symbolIndexOnStrip]);
            }
        } else {
            // TODO: Use Logger
             console.error(`[DEBUG] Invalid reel or strip for Reel ${reelIndex} in getResultsGrid`);
             for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                 column.push(null); // Push null if reel/strip is invalid
             }
        }
        grid.push(column);
    });
    return grid;
}
