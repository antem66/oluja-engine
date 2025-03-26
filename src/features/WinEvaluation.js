import { PAYLINES, NUM_PAYLINES } from '../config/paylines.js';
import { PAYTABLE } from '../config/symbolDefinitions.js';
import { SCATTER_SYMBOL_ID, MIN_SCATTERS_FOR_FREE_SPINS, SYMBOLS_PER_REEL_VISIBLE } from '../config/gameSettings.js';
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
    let scatterCount = 0;

    // --- Calculate Line Wins ---
    PAYLINES.forEach((linePath, lineIndex) => {
        let lineSymbolIds = [];
        let lineSymbolObjects = []; // Store references to the actual symbol objects on screen

        for (let reelIndex = 0; reelIndex < state.numReels; reelIndex++) { // Use state.numReels
            const rowIndex = linePath[reelIndex];
            if (rowIndex >= 0 && rowIndex < SYMBOLS_PER_REEL_VISIBLE) {
                const symbolId = resultsGrid[reelIndex][rowIndex];
                lineSymbolIds.push(symbolId);

                // Find the corresponding symbol object on the reel
                // Assumes symbols array index corresponds to visual row + 1 (for buffer symbol)
                const symbolObj = reelsRef[reelIndex]?.symbols[rowIndex + 1];
                if (symbolObj && symbolObj.symbolId === symbolId) {
                    lineSymbolObjects.push(symbolObj);
                } else {
                    // This case might happen if grid/reels are out of sync, log warning?
                    lineSymbolObjects.push(null);
                }
            } else {
                // Should not happen with valid PAYLINES definition
                lineSymbolIds.push(null);
                lineSymbolObjects.push(null);
            }
        }

        const firstSymbolId = lineSymbolIds[0];
        if (!firstSymbolId || !PAYTABLE[firstSymbolId]) return; // Skip if first symbol isn't payable

        let matchCount = 1;
        for (let i = 1; i < state.numReels; i++) {
            if (lineSymbolIds[i] === firstSymbolId) {
                matchCount++;
            } else {
                break; // Symbols must match consecutively from the left
            }
        }

        const payoutInfo = PAYTABLE[firstSymbolId];
        if (matchCount >= 3 && payoutInfo && payoutInfo[matchCount]) {
            const lineWin = payoutInfo[matchCount] * state.currentBetPerLine;
            calculatedTotalWin += lineWin;
            calculatedWinningLines.push({
                lineIndex: lineIndex,
                symbolId: firstSymbolId,
                count: matchCount,
                winAmount: lineWin,
                symbols: lineSymbolObjects.slice(0, matchCount).filter(s => s !== null), // Store refs to winning symbols
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
        updateDisplays(); // Update balance/win text
        // flashElement(winText, 0xffff00, 200, 3); // Needs UIManager reference to winText
        drawWinLines(calculatedWinningLines); // Pass winning lines info
        playWinAnimations(calculatedTotalWin, state.currentTotalBet); // Pass win and bet for threshold checks
        calculatedWinningLines.forEach(info => {
            if (info.symbols.length > 0) {
                animateWinningSymbols(info.symbols);
            }
        });
    } else {
        console.log("No line win.");
        updateDisplays(); // Ensure win display is cleared if needed
    }

    // --- Trigger Free Spins (if applicable) ---
    if (!state.isInFreeSpins && scatterCount >= MIN_SCATTERS_FOR_FREE_SPINS) {
        // Delay slightly after win animations if any
        const delay = (calculatedTotalWin > 0 ? 1000 : 100) * state.winAnimDelayMultiplier;
        updateState({ isTransitioning: true }); // Prevent actions during transition
        setTimeout(() => enterFreeSpins(), delay);
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
        for (let rowIndex = 0; rowIndex < SYMBOLS_PER_REEL_VISIBLE; rowIndex++) {
            const symbolIndexOnStrip = (reel.stopIndex + rowIndex + reel.strip.length) % reel.strip.length;
            column.push(reel.strip[symbolIndexOnStrip]);
        }
        grid.push(column);
    });
    // console.log("Result Grid:", grid); // Optional: Debugging
    return grid;
}
