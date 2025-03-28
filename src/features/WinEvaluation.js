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
    const resultsGrid = getResultsGrid();
    console.log("[DEBUG] WinEvaluation - Results Grid:", JSON.stringify(resultsGrid)); // DEBUG: Log the grid
    let scatterCount = 0;

    // --- Calculate Line Wins ---
    PAYLINES.forEach((linePath, lineIndex) => {
        // console.log(`--- [DEBUG] Checking Line ${lineIndex} --- Path: ${linePath}`); // DEBUG: Line Start
        let lineSymbolIds = [];
        let lineSymbolObjects = []; // Store references to the actual symbol objects on screen

        for (let reelIndex = 0; reelIndex < state.numReels; reelIndex++) { // Use state.numReels
            const rowIndex = linePath[reelIndex];
            if (rowIndex >= 0 && rowIndex < SYMBOLS_PER_REEL_VISIBLE) {
                const symbolId = resultsGrid[reelIndex][rowIndex];
                lineSymbolIds.push(symbolId);

                // Find the corresponding symbol object on the reel
                let symbolObj = null;
                const reel = reelsRef[reelIndex];
                if (reel && reel.symbols && reel.symbols.length > rowIndex + 1) {
                    symbolObj = reel.symbols[rowIndex + 1]; // Index 1 to SYMBOLS_PER_REEL_VISIBLE should be visible
                    console.log(`[DEBUG] Line ${lineIndex}, Reel ${reelIndex}, Row ${rowIndex}: Trying index ${rowIndex + 1}. Got symbolObj: ${symbolObj?.symbolId || 'undefined'}, Expected: ${symbolId}`);
                } else {
                     console.error(`[DEBUG] Line ${lineIndex}, Reel ${reelIndex}: Invalid reel or symbols array.`);
                }

                // Verify the retrieved object matches the expected symbol ID from the grid
                if (symbolObj && symbolObj.symbolId === symbolId) {
                    lineSymbolObjects.push(symbolObj);
                } else {
                    console.warn(`[DEBUG] Line ${lineIndex}, Reel ${reelIndex}, Row ${rowIndex}: Symbol object mismatch or missing (Expected: ${symbolId}, Found: ${symbolObj?.symbolId || 'null/undefined'}). Pushing null.`);
                    lineSymbolObjects.push(null);
                }
            } else {
                // Should not happen with valid PAYLINES definition
                lineSymbolIds.push(null);
                lineSymbolObjects.push(null);
            }
        }
        console.log(`[DEBUG] Line ${lineIndex} - Collected Symbol IDs: ${lineSymbolIds.join(', ')}`); // DEBUG: Symbols on line
        console.log(`[DEBUG] Line ${lineIndex} - Collected Symbol Objects:`, lineSymbolObjects.map(s => s?.symbolId || 'null')); // DEBUG: Symbol objects collected

        const firstSymbolId = lineSymbolIds[0];
        // console.log(`Line ${lineIndex} First Symbol: ${firstSymbolId}`); // DEBUG: First symbol
        if (!firstSymbolId || !PAYTABLE[firstSymbolId]) {
            // console.log(`Line ${lineIndex}: Skipping - First symbol invalid or not payable.`); // DEBUG
            return; // Skip if first symbol isn't payable
        }

        let matchCount = 1;
        for (let i = 1; i < state.numReels; i++) {
            if (lineSymbolIds[i] === firstSymbolId) {
                matchCount++;
            } else {
                break; // Symbols must match consecutively from the left
            }
        }
        console.log(`[DEBUG] Line ${lineIndex} - Calculated Match Count: ${matchCount}`); // DEBUG: Match count

        const payoutInfo = PAYTABLE[firstSymbolId];
        const expectedPayout = payoutInfo ? payoutInfo[matchCount] : undefined;
        // console.log(`Line ${lineIndex} Payout Info: ${JSON.stringify(payoutInfo)}, Expected Payout for ${matchCount}: ${expectedPayout}`); // DEBUG: Payout check

        if (matchCount >= 3 && payoutInfo && expectedPayout !== undefined) { // Check expectedPayout specifically
            const lineWin = expectedPayout * state.currentBetPerLine;
            calculatedTotalWin += lineWin;
            // Filter out nulls *before* slicing to ensure correct symbols are kept
            const validSymbolObjects = lineSymbolObjects.filter(s => s !== null);
            const winningSymbols = validSymbolObjects.slice(0, matchCount);

            const winInfo = {
                lineIndex: lineIndex,
                symbolId: firstSymbolId,
                count: matchCount, // Use the calculated matchCount
                winAmount: lineWin,
                symbols: winningSymbols, // Use the correctly sliced array
            };
            calculatedWinningLines.push(winInfo);
            console.log("[DEBUG] WinEvaluation - WIN FOUND:", {
                line: lineIndex,
                symbol: firstSymbolId,
                count: matchCount,
                amount: lineWin,
                symbolsToAnimate: winningSymbols.map(s => s.symbolId) // Log IDs being sent to animation
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
        
        // IMPORTANT: Order of operations
        // 1. Draw win lines first
        drawWinLines(calculatedWinningLines);
        
        // 2. Start win animations BEFORE updating static displays
        // This ensures the rollup animation starts and hides static text
        playWinAnimations(calculatedTotalWin, state.currentTotalBet);
        
        // 3. Now update displays (the animation code will properly handle visibility)
        updateDisplays();
        
        // 4. Animate the winning symbols
        if (calculatedWinningLines.length > 0) {
            // Collect all unique symbols to animate
            const allSymbolsToAnimate = [];
            const seenSymbols = new Set();
            
            calculatedWinningLines.forEach(info => {
                // Check the symbols array in the winInfo object
                if (info.symbols && info.symbols.length > 0) {
                    // Add only unique symbols to the animation array
                    info.symbols.forEach(symbol => {
                        if (symbol && !seenSymbols.has(symbol)) {
                            seenSymbols.add(symbol);
                            allSymbolsToAnimate.push(symbol);
                        }
                    });
                }
            });
            
            // Animate all winning symbols at once
            if (allSymbolsToAnimate.length > 0) {
                animateWinningSymbols(allSymbolsToAnimate);
            }
        }
    } else {
        console.log("No line win.");
        updateDisplays(); // Ensure win display is cleared if needed
    }

    // --- Trigger Free Spins (if applicable and enabled) ---
    if (scatterCount >= MIN_SCATTERS_FOR_FREE_SPINS && ENABLE_FREE_SPINS) {
        console.log(`WinEvaluation: ${scatterCount} scatters found. Triggering free spins (Enabled: ${ENABLE_FREE_SPINS}).`);
        // Delay slightly after win animations if any
        const delay = (calculatedTotalWin > 0 ? 1000 : 100) * state.winAnimDelayMultiplier;
        updateState({ isTransitioning: true }); // Prevent actions during transition
        setTimeout(() => {
            import('../features/FreeSpins.js').then(module => {
                module.enterFreeSpins(FREE_SPINS_AWARDED); // Pass FREE_SPINS_AWARDED explicitly
            });
        }, delay);
    }
}

/**
 * Gets the grid of symbol IDs currently visible on the reels.
 * @returns {string[][]} A 2D array representing the visible grid [reelIndex][rowIndex].
 */
function getResultsGrid() {
    const grid = [];
    reelsRef.forEach((reel) => {
        const column = [];
        // Calculate visible symbols based on stopIndex
        // Ensure reel and strip exist
        if (reel && reel.strip) {
            for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                // Ensure stopIndex is a number
                const stopIndex = typeof reel.stopIndex === 'number' ? reel.stopIndex : 0;
                const symbolIndexOnStrip = (stopIndex + rowIndex + reel.strip.length) % reel.strip.length;
                column.push(reel.strip[symbolIndexOnStrip]);
            }
        } else {
             console.error("[DEBUG] Invalid reel or reel strip found in getResultsGrid");
             // Push empty column or handle error appropriately
             for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
                 column.push(null); // Push nulls if reel is invalid
             }
        }
        grid.push(column);
    });
    // console.log("Result Grid:", grid); // Optional: Debugging
    return grid;
}
