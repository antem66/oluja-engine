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
    /** @type {Function | null} */ // Store unsubscribe function
    _unsubscribeSpinClick = null;
    /** @type {Function | null} */ // Store unsubscribe function
    _unsubscribeSpinResult = null;
    /** @type {object | null} */ // Store the latest received spin result data temporarily
    _lastSpinResultData = null;
    /** @type {boolean} */ // Flag to prevent multiple early stop requests per spin
    _earlyStopRequestedThisSpin = false;

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
        this._unsubscribeSpinClick = this.eventBus?.on('ui:button:click', (event) => {
            if (event.buttonName === 'spin') this.handleSpinRequest();
        });
        // Subscribe to the authoritative spin result from the server (or ApiService mock)
        this._unsubscribeSpinResult = this.eventBus?.on('server:spinResultReceived', this._handleSpinResultReceived.bind(this));
    }

    /**
     * Handles the request to start a spin (e.g., from UI button click event).
     */
    handleSpinRequest() {
        // --- BEGIN EDIT: Early Stop Logic ---
        if (state.isSpinning) {
            if (!this._earlyStopRequestedThisSpin) {
                this.logger?.info('SpinManager', 'Early stop requested by user.');
                this.eventBus?.emit('spin:requestEarlyStop');
                this._earlyStopRequestedThisSpin = true; // Prevent further requests this spin
            } else {
                this.logger?.debug('SpinManager', 'Early stop already requested this spin, ignoring.');
            }
            return; // Don't proceed to start a new spin
        }
        // --- END EDIT: Early Stop Logic ---

        // TODO (Phase 2): Add checks (balance, state) before proceeding
        // TODO: Refactor Feature Flags
        this.logger?.info('SpinManager', 'Spin requested.');
        
        // 1. Start the visual spinning immediately
        this.startVisualSpin(); 

        // 2. Request the actual spin result from the ApiService (which will use mock for now)
        this.apiService?.requestSpin({ totalBet: state.currentTotalBet });
    }

    /**
     * Initiates the visual spinning of reels and handles initial state updates (e.g., deduct bet).
     * Does NOT determine stop positions or schedule stops.
     */
    startVisualSpin() {
        this.logger?.info('SpinManager', 'startVisualSpin() called.');

        // --- MODIFIED CHECK: Allow spins during FS, but not during transitions or other spins ---
        if (state.isSpinning || state.isFeatureTransitioning) { 
            this.logger?.warn('SpinManager', 'Spin requested but already spinning or in transition.');
            return;
        }
        // --- END MODIFICATION ---

        if (!this.reelManager || !this.eventBus) {
            this.logger?.error('SpinManager', 'Cannot start spin: ReelManager or EventBus missing.');
            return;
        }
        // Redundant check, covered above
        // if (state.isSpinning) { ... }

        // --- INTERRUPT previous win presentation --- 
        this.logger?.debug('SpinManager', 'Emitting spin:interruptAnimations');
        this.eventBus?.emit('spin:interruptAnimations');
        // Also request payline clear immediately
        this.logger?.debug('SpinManager', 'Emitting paylines:clearRequest');
        this.eventBus?.emit('paylines:clearRequest');
        // ----------------------------------------

        this.logger?.debug('SpinManager', 'Starting spin sequence...');

        // --- Deduct Bet (ONLY if not in Free Spins) --- 
        let stateUpdates = { 
            isSpinning: true, 
            lastTotalWin: 0 // Reset last win always
        };

        if (!state.isInFreeSpins) {
            this.logger?.debug('SpinManager', 'Normal spin: Deducting bet.');
            const currentBet = state.currentTotalBet;
            const currentBalance = state.balance;
            const newBalance = currentBalance - currentBet;
            if (newBalance < 0) { // Basic insufficient funds check
                this.logger?.warn('SpinManager', 'Insufficient funds to spin.');
                this.eventBus?.emit('ui:notification:show', { message: 'Insufficient funds!', type: 'error' });
                return; // Stop spin start
            }
            this.logger?.info('SpinManager', `Deducting bet ${currentBet}. New balance: ${newBalance}`);
            stateUpdates.balance = newBalance; // Add balance update only for normal spins
        } else {
            this.logger?.debug('SpinManager', 'Free spin: Skipping bet deduction.');
            // --- REMOVE DECREMENT LOGIC --- 
            /*
            // Decrement remaining free spins count
            if (state.freeSpinsRemaining > 0) {
                stateUpdates.freeSpinsRemaining = state.freeSpinsRemaining - 1;
            } else {
                // This case shouldn't normally happen if logic is correct, but log it.
                this.logger?.warn('SpinManager', 'Attempted free spin with 0 remaining spins.');
            }
            */
           // --- END REMOVAL ---
        }

        // Update state 
        updateState(stateUpdates);

        this.eventBus?.emit('spin:started');

        const isTurbo = state.isTurboMode;
        const currentReels = this.reelManager.reels;

        currentReels.forEach((reel, i) => {
            reel.startSpinning(isTurbo);
            // Stop scheduling is now handled in _handleSpinResultReceived
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

        updateState({ isSpinning: false });
        this.logger?.debug("SpinManager", "All reels visually stopped.");

        // Emit event for UI to stop spin animation (UI listens for state change)
        this.eventBus?.emit('spin:stoppedVisuals');
        
        // --- EMIT REELS_STOPPED FOR AUTOPLAY/OTHER LOGIC --- 
        this.logger?.info('SpinManager', '>>> EMITTING reels:stopped >>>');
        this.eventBus?.emit('reels:stopped');
        this.logger?.info('SpinManager', '<<< EMITTED reels:stopped <<<');
        // --- END EMIT ---

        // Emit event to request win evaluation, passing the result data received from server/mock
        this.logger?.info("SpinManager", ">>> EMITTING spin:evaluateRequest >>>");
        this.eventBus?.emit('spin:evaluateRequest', { spinResultData: this._lastSpinResultData /* This needs to exist */ }); 
        this.logger?.info("SpinManager", "<<< EMITTED spin:evaluateRequest <<<");
    }

    /**
     * Handles the received spin result from the server (or ApiService mock).
     * Sets the final stop positions and schedules the visual reel stops.
     * @param {object} eventData 
     * @param {object} eventData.data - The spin result payload from server/mock.
     * @param {number[]} eventData.data.stopPositions - Array of stop indices.
     * @private
     */
    _handleSpinResultReceived(eventData) {
        // --- BEGIN EDIT: Early Stop - Reset flag --- 
        this._earlyStopRequestedThisSpin = false; // Reset flag when new results arrive
        // --- END EDIT: Early Stop - Reset flag --- 

        this.logger?.info('SpinManager', 'Received server:spinResultReceived', eventData);
        if (!eventData || !eventData.data || !Array.isArray(eventData.data.stopPositions)) {
            this.logger?.error('SpinManager', 'Invalid data received for server:spinResultReceived', eventData);
            // TODO: Handle error state - maybe force reels to stop randomly or show error?
            return;
        }

        const stopPositions = eventData.data.stopPositions;
        if (!this.reelManager || stopPositions.length !== this.reelManager.reels.length) {
            this.logger?.error('SpinManager', 'Stop positions length mismatch or ReelManager missing.');
            return;
        }

        const isTurbo = state.isTurboMode;
        const startTime = performance.now(); // Use current time as base for scheduling stops

        this.reelManager.reels.forEach((reel, i) => {
            const stopIndex = stopPositions[i];
            if (typeof stopIndex !== 'number') {
                this.logger?.warn('SpinManager', `Invalid stop index ${stopIndex} for reel ${i}, using random.`);
                reel.finalStopPosition = Math.floor(Math.random() * (reel.strip?.length || 1));
            } else {
                 reel.finalStopPosition = stopIndex;
            }
            
            // Calculate stop times based on the received result time
            const currentBaseDuration = isTurbo ? turboBaseSpinDuration : baseSpinDuration;
            const currentStagger = isTurbo ? turboReelStopStagger : REEL_STOP_STAGGER;
            const targetStopTime = startTime + currentBaseDuration + i * currentStagger;

            reel.scheduleStop(targetStopTime);
            this.logger?.debug('SpinManager', `Reel ${i} scheduled to stop at index ${reel.finalStopPosition} around time ${targetStopTime.toFixed(0)}`);
        });

        // Store the received data in _lastSpinResultData
        this._lastSpinResultData = eventData.data;
    }

    destroy() {
        this.logger?.info('SpinManager', 'Destroying...');
        // Unsubscribe from eventBus listener (ui:button:click)
        if (this._unsubscribeSpinClick) {
            this._unsubscribeSpinClick();
            this._unsubscribeSpinClick = null;
        }
        // Unsubscribe from server result
        if (this._unsubscribeSpinResult) {
            this._unsubscribeSpinResult();
            this._unsubscribeSpinResult = null;
        }
        this.reelManager = null;
        this.logger = null;
        this.eventBus = null;
        this.apiService = null;
    }
}
