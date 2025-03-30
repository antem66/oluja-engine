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

import { state, updateState } from './GameState.js'; // Keep for reading state temporarily
// Remove imports for WinEvaluation, FreeSpins, Autoplay, UIManager, PaylineGraphics
import * as SETTINGS from '../config/gameSettings.js';
import {
    REEL_STOP_STAGGER, baseSpinDuration,
    turboBaseSpinDuration, turboReelStopStagger
} from '../config/animationSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js'; // Keep for debug helpers
// Import types
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { ApiService } from './ApiService.js';
import { ReelManager } from './ReelManager.js';

export class SpinManager {
    /** @type {import('./ReelManager.js').ReelManager | null} */
    reelManager = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;
    /** @type {import('./ApiService.js').ApiService | null} */
    apiService = null;

    /**
     * @param {import('./ReelManager.js').ReelManager} reelManagerInstance 
     * @param {import('../utils/Logger.js').Logger} loggerInstance 
     * @param {import('../utils/EventBus.js').EventBus} eventBusInstance 
     * @param {import('./ApiService.js').ApiService} apiServiceInstance 
     */
    constructor(reelManagerInstance, loggerInstance, eventBusInstance, apiServiceInstance) {
        this.reelManager = reelManagerInstance;
        this.logger = loggerInstance;
        this.eventBus = eventBusInstance;
        this.apiService = apiServiceInstance;

        if (!this.reelManager) {
            this.logger?.error("SpinManager", "ReelManager instance is required!");
            // TODO: Handle error - throw?
        }
        if (!this.logger) {
            console.error("SpinManager: Logger instance is required!");
        }
        if (!this.eventBus) {
            this.logger?.warn("SpinManager", "EventBus instance was not provided.");
        }
        if (!this.apiService) {
            this.logger?.error("SpinManager", "ApiService instance is required!");
            // TODO: Handle error - throw?
        }

        this.logger?.info('SpinManager', 'Initialized.');
        // Subscribe to spin requests from UI
        this.eventBus?.on('ui:button:click', (event) => {
            if (event.buttonName === 'spin') this.handleSpinRequest();
        });
        // TODO (Phase 2.2+): Subscribe to server:spinResultReceived
    }

    /**
     * Handles the request to start a spin (e.g., from UI button click event).
     */
    handleSpinRequest() {
        // TODO (Phase 2): Add checks (balance, state) before proceeding
        this.logger?.info('SpinManager', 'Spin requested.');
        // In Phase 2, this would call apiService.requestSpin()
        // For now, we call the old startSpin logic directly.
        this.startSpin();
    }

    /**
     * Starts the spinning process for all reels visually.
     * --- ROLE CHANGE in Phase 2 --- 
     * This logic (stop generation) moves to ApiService mock.
     * This method will primarily be triggered AFTER receiving server response.
     */
    startSpin() {
        this.logger?.info('SpinManager', 'startSpin() called.');

        if (state.isSpinning || state.isInFreeSpins || state.isTransitioning) {
            this.logger?.warn('SpinManager', 'Spin requested but already spinning or in transition/FS.');
            return;
        }
        if (!this.reelManager || !this.eventBus) {
            this.logger?.error('SpinManager', 'Cannot start spin: ReelManager or EventBus missing.');
            return;
        }
        if (state.isSpinning) {
            this.logger?.warn('SpinManager', 'Spin requested but already spinning.');
            return; // Don't start if already spinning
        }

        // --- INTERRUPT previous win presentation --- 
        this.logger?.debug('SpinManager', 'Emitting spin:interruptAnimations');
        this.eventBus?.emit('spin:interruptAnimations');
        // Also request payline clear immediately
        this.logger?.debug('SpinManager', 'Emitting paylines:clearRequest');
        this.eventBus?.emit('paylines:clearRequest');
        // ----------------------------------------

        this.logger?.debug('SpinManager', 'Starting spin sequence...');

        // --- Deduct Bet --- 
        const currentBet = state.currentTotalBet;
        const currentBalance = state.balance;
        const newBalance = currentBalance - currentBet;
        if (newBalance < 0) { // Basic insufficient funds check
            this.logger?.warn('SpinManager', 'Insufficient funds to spin.');
            // TODO: Emit event for UI notification?
            this.eventBus?.emit('ui:notification:show', { message: 'Insufficient funds!', type: 'error' });
            return; // Stop spin start
        }
        this.logger?.info('SpinManager', `Deducting bet ${currentBet}. New balance: ${newBalance}`);

        // Update state including new balance
        updateState({ 
            isSpinning: true, 
            balance: newBalance, 
            lastTotalWin: 0 // Reset last win 
        });

        this.eventBus?.emit('spin:started');

        const isTurbo = state.isTurboMode;
        const startTime = performance.now();
        let winPattern = null;
        const currentReels = this.reelManager.reels;

        if (state.isDebugMode && state.forceWin) {
            this.logger?.info("SpinManager", "Debug mode active: Forcing a win pattern (Mock)");
            winPattern = this._generateRandomWinPattern();
            this.logger?.debug("SpinManager", "Generated win pattern:", winPattern);
        }

        currentReels.forEach((reel, i) => {
            reel.startSpinning(isTurbo);

            let stopIndex;
            if (state.isDebugMode && state.forceWin && winPattern?.positions) {
                stopIndex = this._findStopIndexForSymbol(reel, winPattern.symbol, winPattern.positions[i]);
            } else {
                stopIndex = Math.floor(Math.random() * (reel.strip?.length || 1));
            }
            // Set final stop position (In Phase 2, this comes from server response)
            reel.finalStopPosition = stopIndex;

            const currentBaseDuration = isTurbo ? turboBaseSpinDuration : baseSpinDuration;
            const currentStagger = isTurbo ? turboReelStopStagger : REEL_STOP_STAGGER;
            const targetStopTime = startTime + currentBaseDuration + i * currentStagger;

            reel.scheduleStop(targetStopTime);
        });

        this.eventBus?.emit('state:update', { targetStoppingReelIndex: -1 });
        this.logger?.info('SpinManager', 'Reels spinning visually.');
    }

    /**
     * Handles the logic after all reels have stopped spinning visually.
     * Called by Game loop.
     */
    handleSpinEnd() {
        this.logger?.info('SpinManager', 'handleSpinEnd() called.');

        if (!state.isSpinning && !state.isTransitioning) {
            this.logger?.warn('SpinManager', 'handleSpinEnd called but not spinning or transitioning?');
            return;
        }
        if (!this.reelManager || !this.eventBus) {
            this.logger?.error('SpinManager', 'Cannot handle spin end: ReelManager or EventBus missing.');
            return;
        }

        this.logger?.debug("SpinManager", "Calling updateState { isSpinning: false, isTransitioning: true }");
        updateState({ isSpinning: false, isTransitioning: true });
        this.logger?.debug("SpinManager", "All reels visually stopped.");

        // Emit event for UI to stop spin animation (UI listens for state change)
        this.eventBus?.emit('spin:stoppedVisuals');

        // Emit event to request win evaluation
        this.logger?.info("SpinManager", ">>> EMITTING spin:evaluateRequest >>>");
        this.eventBus?.emit('spin:evaluateRequest');
        this.logger?.info("SpinManager", "<<< EMITTED spin:evaluateRequest <<<");
        
        // Set transitioning false IMMEDIATELY after requesting evaluation
        this.logger?.debug('SpinManager', 'Evaluation requested, calling updateState { isTransitioning: false }');
        updateState({ isTransitioning: false });
    }

    // --- Debug Helper Methods (Keep for now, move to ApiService later) --- 
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

    destroy() {
        this.logger?.info('SpinManager', 'Destroying...');
        this.reelManager = null;
        this.logger = null;
        this.eventBus = null;
        this.apiService = null;
    }
}
