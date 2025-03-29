import { PAYLINES, NUM_PAYLINES } from '../config/paylines.js';
import { PAYTABLE } from '../config/symbolDefinitions.js';
import {
    SCATTER_SYMBOL_ID, MIN_SCATTERS_FOR_FREE_SPINS, SYMBOLS_PER_REEL_VISIBLE,
    ENABLE_FREE_SPINS, FREE_SPINS_AWARDED
} from '../config/gameSettings.js';
import { state, updateState } from '../core/GameState.js'; // Assuming state management
import { drawWinLines } from './PaylineGraphics.js'; // Assuming graphics handling
import { playWinAnimations, animateWinningSymbols } from './Animations.js'; // Assuming animation handling
import { enterFreeSpins } from './FreeSpins.js'; // Assuming FreeSpins handling
import { updateDisplays } from '../ui/UIManager.js'; // Assuming UI update handling
// import { flashElement } from '../ui/Notifications.js'; // Assuming notification handling

// Placeholder for reels data - this should be passed in or accessed via GameState/Game module
let reelsRef = [];
export function initWinEvaluation(reels) {
    reelsRef = reels;
}

/**
 * Evaluates the win based on the current stopped reels.
 * Calculates line wins and scatter triggers.
 * Updates game state and triggers win animations/sounds.
 */
export function evaluateWin() {
    let calculatedTotalWin = 0;
    let calculatedWinningLines = []; // Initialize as empty array
    const resultsGrid = getResultsGrid(); // Uses stopIndex internally now
    console.log("[DEBUG] WinEvaluation - Results Grid:", JSON.stringify(resultsGrid)); // DEBUG: Log the grid
    let scatterCount = 0;

    // --- Calculate Line Wins ---
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
                const reel = reelsRef[reelIndex];
                // Access the visual symbols array on the reel
                if (reel && reel.symbols && reel.symbols.length > rowIndex + 1) {
                    // Index 1 to SYMBOLS_PER_REEL_VISIBLE are visible symbols
                    symbolObj = reel.symbols[rowIndex + 1];
                    // Optional: Verify symbolId matches, though getResultsGrid should be correct now
                    if (symbolObj?.symbolId !== symbolId) {
                         console.warn(`[DEBUG] Mismatch between resultsGrid and symbolSprite at [${reelIndex},${rowIndex}]! Grid: ${symbolId}, Sprite: ${symbolObj?.symbolId}`);
                         // Decide how to handle mismatch - use grid symbol ID?
                    }
                } else {
                     console.error(`[DEBUG] Line ${lineIndex}, Reel ${reelIndex}: Invalid reel or symbols array.`);
                }
                lineSymbolObjects.push(symbolObj); // Push the found object (or null)

            } else {
                lineSymbolIds.push(null);
                lineSymbolObjects.push(null);
            }
        }
        console.log(`[DEBUG] Line ${lineIndex} - Collected Symbol IDs: ${lineSymbolIds.join(', ')}`);
        console.log(`[DEBUG] Line ${lineIndex} - Collected Symbol Objects:`, lineSymbolObjects.map(s => s?.symbolId || 'null')); // Log retrieved object IDs

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
        console.log(`[DEBUG] Line ${lineIndex} - Calculated Match Count: ${matchCount}`);

        const payoutInfo = PAYTABLE[firstSymbolId];
        const expectedPayout = payoutInfo ? payoutInfo[matchCount] : undefined;

        if (matchCount >= 3 && payoutInfo && expectedPayout !== undefined) {
            const lineWin = expectedPayout * state.currentBetPerLine;
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
            console.log("[DEBUG] WinEvaluation - WIN FOUND:", {
                line: lineIndex,
                symbol: firstSymbolId,
                count: matchCount,
                amount: lineWin,
                symbolsToAnimate: winningSymbols.map(s => s.symbolId) // Log IDs
            });
        }
    });

    // --- Check for Scatters ---
    resultsGrid.forEach(col => col.forEach(symId => {
        if (symId === SCATTER_SYMBOL_ID) {
            scatterCount++;
        }
    }));

    // --- Update State and Trigger Effects ---
    updateState({ lastTotalWin: calculatedTotalWin, winningLinesInfo: calculatedWinningLines });

    if (calculatedTotalWin > 0) {
        if (!state.isInFreeSpins) {
            updateState({ balance: state.balance + calculatedTotalWin });
        }
        console.log(`Win: €${calculatedTotalWin.toFixed(2)}`);

        drawWinLines(calculatedWinningLines);
        playWinAnimations(calculatedTotalWin, state.currentTotalBet);
        updateDisplays();

        // Restore animating winning symbols
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
                animateWinningSymbols(allSymbolsToAnimate); // Restore call
            }
        }
    } else {
        console.log("No line win.");
        updateDisplays();
    }

    // --- Trigger Free Spins (if applicable and enabled) ---
    if (scatterCount >= MIN_SCATTERS_FOR_FREE_SPINS && ENABLE_FREE_SPINS) {
        console.log(`WinEvaluation: ${scatterCount} scatters found. Triggering free spins (Enabled: ${ENABLE_FREE_SPINS}).`);
        const delay = (calculatedTotalWin > 0 ? 1000 : 100) * state.winAnimDelayMultiplier;
        updateState({ isTransitioning: true });
        setTimeout(() => {
            import('../features/FreeSpins.js').then(module => {
                module.enterFreeSpins(FREE_SPINS_AWARDED);
            });
        }, delay);
    }
}

/**
 * Gets the grid of symbol IDs currently visible on the reels.
 * Uses the logical stopIndex.
 * @returns {string[][]} A 2D array representing the visible grid [reelIndex][rowIndex].
 */
function getResultsGrid() {
    const grid = [];
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
             console.error(`[DEBUG] Invalid reel or strip for Reel ${reelIndex} in getResultsGrid`);
             for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                 column.push(null);
             }
        }
        grid.push(column);
    });
    return grid;
}
