import { state, updateState } from './GameState.js';
import { evaluateWin } from '../features/WinEvaluation.js';
import { handleFreeSpinEnd } from '../features/FreeSpins.js';
import { handleAutoplayNextSpin } from '../features/Autoplay.js';
import { setButtonsEnabled } from '../ui/UIManager.js';
import { clearWinLines } from '../features/PaylineGraphics.js';
import * as SETTINGS from '../config/gameSettings.js';
import {
    REEL_STOP_STAGGER, baseSpinDuration, // Normal settings
    turboBaseSpinDuration, turboReelStopStagger // Turbo settings
} from '../config/animationSettings.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js'; // Import separately if needed
import { REEL_STRIPS } from '../config/reelStrips.js'; // Needed for debug helpers

// TODO: Consider how to handle dependencies like FreeSpins, Autoplay
// Maybe pass them in constructor or use an event emitter system?
// For now, assume access via direct imports where possible.

export class SpinManager {
    reelManager = null; // Reference to ReelManager
    // Removed gameInstance reference

    constructor(reelManager) { // Removed gameInstance from constructor
        this.reelManager = reelManager;
        if (!this.reelManager) {
            console.error("SpinManager: ReelManager instance is required!");
        }
         // TODO: Add listeners for events if using an event system
    }

    /**
     * Starts the spinning process for all reels.
     */
    startSpin() {
        if (!this.reelManager || state.isSpinning) {
            return; // Don't start if already spinning or no reel manager
        }

        updateState({ isSpinning: true, isTransitioning: false, lastTotalWin: 0 });
        setButtonsEnabled(false);
        clearWinLines();

        const isTurbo = state.isTurboMode;
        const startTime = performance.now();
        let winPattern = null;

        // Add null check before accessing reels
        if (!this.reelManager) {
             console.error("SpinManager.startSpin: ReelManager is null!");
             // Attempt to recover state if possible
             updateState({ isSpinning: false, isTransitioning: false });
             setButtonsEnabled(true);
              return;
         }
         // @ts-ignore - Null check above ensures reelManager is valid here
         const currentReels = this.reelManager.reels;

        // Generate forced win pattern if in debug mode
        if (state.isDebugMode && state.forceWin) {
            console.log("Debug mode active: Forcing a win pattern");
            winPattern = this._generateRandomWinPattern(); // Use internal helper method
            console.log("Generated win pattern:", winPattern);
        }

        // Start all reels spinning and schedule their stops
        currentReels.forEach((reel, i) => {
            reel.startSpinning(isTurbo);

            // Determine stop index
            let stopIndex;
            if (state.isDebugMode && state.forceWin && winPattern && winPattern.positions) {
                 stopIndex = this._findStopIndexForSymbol(reel, winPattern.symbol, winPattern.positions[i]); // Use internal helper
            } else {
                 stopIndex = Math.floor(Math.random() * reel.strip.length);
            }
            reel.stopIndex = stopIndex; // Set the target stop index on the reel
            reel.finalStopPosition = stopIndex; // Ensure final position matches

            // Calculate stop time
            const currentBaseDuration = isTurbo ? turboBaseSpinDuration : baseSpinDuration;
            const currentStagger = isTurbo ? turboReelStopStagger : REEL_STOP_STAGGER;
            const targetStopTime = startTime + currentBaseDuration + i * currentStagger;

            // Schedule the stop
            reel.scheduleStop(targetStopTime);
            // console.log(`SpinManager: Reel ${i} scheduled to stop at ${targetStopTime.toFixed(0)}ms targeting index ${stopIndex}`);
        });

        updateState({ targetStoppingReelIndex: -1 }); // Reset this if it was used previously
    }

    /**
     * Handles the logic after all reels have stopped spinning.
     */
    handleSpinEnd() {
        if (!this.reelManager) return; // Null check already present

        // Note: isSpinning is set to false here, but transition starts
        updateState({ isSpinning: false, isTransitioning: true });
        console.log("SpinManager: All reels stopped moving.");

        // Evaluate wins *directly* now, the delay will be handled in Game.update
        console.log("SpinManager: Evaluating wins...");
        evaluateWin(); // evaluateWin uses internal reelsRef

        updateState({ isTransitioning: false }); // End transition *after* evaluation

        // Decide next action based on game state
        if (state.isInFreeSpins) {
            handleFreeSpinEnd(); // Needs access to FreeSpins module logic
        } else if (state.isAutoplaying) {
            handleAutoplayNextSpin(); // Needs access to Autoplay module logic
        } else {
            setButtonsEnabled(true); // Enable UI
        }
        // Removed setTimeout wrapper
    }

    // --- Debug Helper Methods --- (Moved from Game.js)

    /**
     * Generate a random winning pattern
     * @returns {Object | null} A winning pattern with symbol and positions, or null on error
     */
    _generateRandomWinPattern() {
        const highValueSymbols = ["FACE1", "FACE2", "FACE3", "KNIFE", "CUP", "PATCH"];
        const winSymbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        const rowIndex = 1; // Force middle row for simplicity
        const winLength = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5 reels
        const positions = [];

        if (!REEL_STRIPS || REEL_STRIPS.length !== SETTINGS.NUM_REELS) {
            console.error("Debug - REEL_STRIPS is invalid or doesn't match NUM_REELS.");
            return null;
        }

        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
            if (i < winLength) {
                positions.push(rowIndex);
            } else {
                positions.push(Math.floor(Math.random() * SETTINGS.SYMBOLS_PER_REEL_VISIBLE));
            }
        }
        // Note: This simplified version doesn't guarantee the symbol exists on the strip
        // or calculate exact stop indices. It just defines the target positions.
        // The findStopIndexForSymbol method handles finding the actual index.
        return { symbol: winSymbol, positions: positions };
    }

    /**
     * Find the stop index that will show the target symbol in the target position
     * @param {object} reel - The reel object (should have 'strip' and 'reelIndex' properties)
     * @param {string} targetSymbol - The symbol we want to show
     * @param {number} targetPosition - The position where we want the symbol (0=top, 1=middle, 2=bottom)
     * @returns {number} The stop index that will show the target symbol in position
     */
    _findStopIndexForSymbol(reel, targetSymbol, targetPosition) {
        const symbols = reel.strip;
        if (!symbols) return Math.floor(Math.random() * (reel.strip?.length || 1));

        for (let i = 0; i < symbols.length; i++) {
          if (symbols[i] === targetSymbol) {
            let stopIndex = (i - targetPosition + symbols.length) % symbols.length;
            return stopIndex;
          }
        }
        console.log(`Could not find symbol ${targetSymbol} on reel ${reel.reelIndex} - using random position`);
        return Math.floor(Math.random() * symbols.length);
    }

    // Potential future methods: forceStop(), handleBonusTrigger(), etc.
}
