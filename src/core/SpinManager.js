/**
 * @module SpinManager
 * @description Orchestrates the spinning process. Currently handles starting spins,
 * scheduling stops (based on client-side logic or debug patterns), and triggering
 * win evaluation after stops. 
 * 
 * --- ROLE CHANGE in Phase 2 --- 
 * This module's responsibility will shift significantly. It will:
 * 1. Receive spin requests (likely via events from UI buttons).
 * 2. Trigger `ApiService.requestSpin`.
 * 3. Listen for `server:spinResultReceived` event from ApiService.
 * 4. Instruct `ReelManager` / `Reels` on their final stop positions based *only* on the server response.
 * 5. Trigger subsequent processes like win evaluation/animation based on the server response.
 * It will **stop** generating outcomes (random stops, debug patterns) itself.
 *
 * Public API (Current):
 * - constructor(reelManager): Initializes with a ReelManager instance.
 * - startSpin(): Initiates the spin sequence (determines stops, tells reels to spin).
 * - handleSpinEnd(): Called when all reels stop, triggers win evaluation and next action.
 *
 * Public API (Future - Phase 2):
 * - init(dependencies): Initialize with EventBus, ReelManager, ApiService, Logger.
 * - (May not have many public methods, primarily reacts to events)
 *
 * Events Emitted (Future - Phase 2):
 * - spin:started
 * - spin:stopped
 * - win:evaluateRequest (or similar, to trigger evaluation/animation pipeline)
 *
 * Events Consumed (Future - Phase 2):
 * - ui:button:click { buttonName: 'spin' }
 * - server:spinResultReceived { data: SpinResult }
 * - reel:stopped { reelIndex: number } (Potentially, to track when all reels are done)
 */

import { state, updateState } from './GameState.js';
import { evaluateWin } from '../features/WinEvaluation.js';
import { handleFreeSpinEnd } from '../features/FreeSpins.js';
import { handleAutoplayNextSpin } from '../features/Autoplay.js';
import { setButtonsEnabled, animateSpinButtonRotation, stopSpinButtonRotation, animateWin } from '../ui/UIManager.js';
import { clearWinLines } from '../features/PaylineGraphics.js';
import * as SETTINGS from '../config/gameSettings.js';
import {
    REEL_STOP_STAGGER, baseSpinDuration, // Normal settings
    turboBaseSpinDuration, turboReelStopStagger // Turbo settings
} from '../config/animationSettings.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js'; // Import separately if needed
import { REEL_STRIPS } from '../config/reelStrips.js'; // Needed for debug helpers

// TODO (Phase 2): Remove direct imports of features/UI, interact via events/DI.

export class SpinManager {
    reelManager = null; // Reference to ReelManager

    constructor(reelManager) { 
        // TODO (Phase 2): Inject dependencies (EventBus, ReelManager, ApiService, Logger)
        this.reelManager = reelManager;
        if (!this.reelManager) {
            // TODO: Use Logger
            console.error("SpinManager: ReelManager instance is required!");
        }
        // TODO (Phase 2): Subscribe to events like ui:button:click(spin), server:spinResultReceived
    }

    /**
     * Starts the spinning process for all reels.
     * --- DEPRECATED LOGIC in Phase 2 --- 
     * This method will change to primarily trigger ApiService.requestSpin.
     * Outcome generation (stops, win patterns) will move to ApiService mock.
     */
    startSpin() {
        // TODO (Phase 2): This method should:
        // 1. Check if spin is possible (balance, state).
        // 2. Prepare betInfo.
        // 3. Call `apiService.requestSpin(betInfo)`.
        // 4. Emit `spin:started` event.
        // The current logic below will move to ApiService._generateMockSpinResult()

        if (!this.reelManager || state.isSpinning) {
            return; // Don't start if already spinning or no reel manager
        }

        // Update state, disable UI, clear lines, reset win display
        updateState({ isSpinning: true, isTransitioning: false, lastTotalWin: 0 });
        setButtonsEnabled(false); // TODO: Replace with event listener in UIManager
        clearWinLines(); // TODO: Replace with event listener in PaylineGraphics
        animateWin(0); // TODO: Replace with event listener in UIManager

        // Animate the spin button rotation
        animateSpinButtonRotation(); // TODO: Replace with event listener in UIManager

        const isTurbo = state.isTurboMode;
        const startTime = performance.now();
        let winPattern = null;

        if (!this.reelManager) {
            // TODO: Use Logger
            console.error("SpinManager.startSpin: ReelManager is null!");
            updateState({ isSpinning: false, isTransitioning: false });
            setButtonsEnabled(true);
            return;
        }
        const currentReels = this.reelManager.reels;

        // --- START OF LOGIC TO MOVE TO ApiService._generateMockSpinResult --- 
        // Generate forced win pattern if in debug mode
        if (state.isDebugMode && state.forceWin) {
            // TODO: Use Logger
            console.log("Debug mode active: Forcing a win pattern");
            winPattern = this._generateRandomWinPattern(); 
            console.log("Generated win pattern:", winPattern);
        }

        // Start all reels spinning and schedule their stops
        currentReels.forEach((reel, i) => {
            reel.startSpinning(isTurbo); // Keep: Visual effect starts immediately

            // Determine stop index (This logic moves to mock generation)
            let stopIndex;
            if (state.isDebugMode && state.forceWin && winPattern && winPattern.positions) {
                 stopIndex = this._findStopIndexForSymbol(reel, winPattern.symbol, winPattern.positions[i]);
            } else {
                 stopIndex = Math.floor(Math.random() * reel.strip.length);
            }
            // TODO (Phase 2): Remove setting stopIndex/finalStopPosition here.
            // These will be set based on server:spinResultReceived event.
            reel.stopIndex = stopIndex;
            reel.finalStopPosition = stopIndex;

            // Calculate stop time (Remains relevant for visual scheduling)
            const currentBaseDuration = isTurbo ? turboBaseSpinDuration : baseSpinDuration;
            const currentStagger = isTurbo ? turboReelStopStagger : REEL_STOP_STAGGER;
            const targetStopTime = startTime + currentBaseDuration + i * currentStagger;

            // Schedule the visual stop tween (Keep)
            reel.scheduleStop(targetStopTime);
        });
        // --- END OF LOGIC TO MOVE TO ApiService._generateMockSpinResult --- 

        updateState({ targetStoppingReelIndex: -1 });
    }

    /**
     * Handles the logic after all reels have stopped spinning visually.
     * TODO (Phase 2): This might be triggered differently, e.g., after receiving
     * server response AND all reels visually stopped. It might primarily
     * trigger the win evaluation/animation pipeline based on received server data.
     */
    handleSpinEnd() {
        if (!this.reelManager) return;

        // TODO (Phase 2): Update state based on server response, not just visual stop.
        updateState({ isSpinning: false, isTransitioning: true });
        // TODO: Use Logger
        console.log("SpinManager: All reels stopped moving.");

        // Stop the spin button rotation
        stopSpinButtonRotation(); // TODO: Replace with event listener in UIManager

        // Evaluate wins based on current state (will change)
        // TODO (Phase 2): Trigger evaluation based on received server data 
        // (e.g., emit `win:evaluateRequest` with server data, or have WinEvaluation listen directly)
        // TODO: Use Logger
        console.log("SpinManager: Evaluating wins...");
        evaluateWin(); 

        updateState({ isTransitioning: false }); // End transition *after* evaluation

        // Decide next action based on game state (logic might move to separate handlers/plugins)
        if (state.isInFreeSpins) {
            handleFreeSpinEnd(); 
        } else if (state.isAutoplaying) {
            handleAutoplayNextSpin();
        } else {
            setButtonsEnabled(true); // TODO: Replace with event listener in UIManager
        }
    }

    // --- Debug Helper Methods --- (These will likely move to ApiService._generateMockSpinResult)

    /**
     * Generate a random winning pattern
     * @returns {Object | null} A winning pattern with symbol and positions, or null on error
     * @deprecated Logic moving to ApiService._generateMockSpinResult
     */
    _generateRandomWinPattern() {
        const highValueSymbols = ["FACE1", "FACE2", "FACE3", "KNIFE", "CUP", "PATCH"];
        const winSymbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        const rowIndex = 1; // Force middle row for simplicity
        const winLength = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5 reels
        const positions = [];

        if (!REEL_STRIPS || REEL_STRIPS.length !== SETTINGS.NUM_REELS) {
            // TODO: Use Logger
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
        return { symbol: winSymbol, positions: positions };
    }

    /**
     * Find the stop index that will show the target symbol in the target position
     * @param {object} reel - The reel object (should have 'strip' and 'reelIndex' properties)
     * @param {string} targetSymbol - The symbol we want to show
     * @param {number} targetPosition - The position where we want the symbol (0=top, 1=middle, 2=bottom)
     * @returns {number} The stop index that will show the target symbol in position
     * @deprecated Logic moving to ApiService._generateMockSpinResult
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
        // TODO: Use Logger
        console.log(`Could not find symbol ${targetSymbol} on reel ${reel.reelIndex} - using random position`);
        return Math.floor(Math.random() * symbols.length);
    }

}
