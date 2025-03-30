/**
 * @module FreeSpinsPlugin
 * @description Plugin to manage the Free Spins bonus feature.
 * Handles triggering, managing spins, win accumulation, UI updates, and transitions.
 */

import { state, updateState } from '../core/GameState.js';
import * as PIXI from 'pixi.js';
import { FREE_SPINS_AWARDED, freeSpinsBgColor, normalBgColor } from '../config/gameSettings.js';

// Import types for JSDoc
/** @typedef {import('../utils/Logger.js').Logger} Logger */
/** @typedef {import('../utils/EventBus.js').EventBus} EventBus */
/** @typedef {import('../core/SpinManager.js').SpinManager} SpinManager */
/** @typedef {import('../core/AnimationController.js').AnimationController} AnimationController */
/** @typedef {import('../core/BackgroundManager.js').BackgroundManager} BackgroundManager */
/** @typedef {import('../ui/FreeSpinsUIManager.js').FreeSpinsUIManager} FreeSpinsUIManager */

export class FreeSpinsPlugin {
    static pluginName = 'FreeSpins';

    /** @type {Logger | null} */
    logger = null;
    /** @type {EventBus | null} */
    eventBus = null;
    /** @type {SpinManager | null} */
    spinManager = null;
    /** @type {AnimationController | null} */
    animationController = null;
    /** @type {BackgroundManager | null} */
    backgroundManager = null;
    /** @type {FreeSpinsUIManager | null} */
    freeSpinsUIManager = null;
    /** @type {PIXI.Container | null} */ // Layer for full-screen effects
    effectsLayer = null;

    /** @type {Array<Function>} */
    _listeners = [];

    // Internal state tracking (can mirror GameState or be more specific)
    /** @type {boolean} */
    _isInFreeSpins = false;
    /** @type {number} */
    _spinsRemaining = 0;
    /** @type {number} */
    _totalWin = 0;

    /**
     * @param {object} dependencies
     * @param {Logger} dependencies.logger
     * @param {EventBus} dependencies.eventBus
     * @param {SpinManager} dependencies.spinManager
     * @param {AnimationController} dependencies.animationController
     * @param {BackgroundManager} dependencies.backgroundManager
     * @param {FreeSpinsUIManager} dependencies.freeSpinsUIManager // Assuming the manager is passed
     * @param {PIXI.Container} dependencies.effectsLayer // Layer for entry/exit animations
     * @param {object} dependencies.initialState
     */
    constructor(dependencies) {
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        this.spinManager = dependencies.spinManager;
        this.animationController = dependencies.animationController;
        this.backgroundManager = dependencies.backgroundManager;
        this.freeSpinsUIManager = dependencies.freeSpinsUIManager;
        this.effectsLayer = dependencies.effectsLayer;

        if (!this.logger || !this.eventBus || !this.spinManager || !this.animationController || !this.backgroundManager || !this.freeSpinsUIManager || !this.effectsLayer) {
            console.error("FreeSpinsPlugin: Missing core dependencies.");
            return;
        }

        // Initialize local state from initial game state
        this._isInFreeSpins = dependencies.initialState?.isInFreeSpins ?? false;
        this._spinsRemaining = dependencies.initialState?.freeSpinsRemaining ?? 0;
        this._totalWin = dependencies.initialState?.totalFreeSpinsWin ?? 0;

        this.logger?.info(FreeSpinsPlugin.pluginName, 'Constructed.');
    }

    init() {
        this.logger?.info(FreeSpinsPlugin.pluginName, 'Initializing...');
        this._subscribeToEvents();
        this.freeSpinsUIManager?.updateDisplay(this._isInFreeSpins, this._spinsRemaining, this._totalWin);
        this.logger?.info(FreeSpinsPlugin.pluginName, 'Initialization complete.');
    }

    _subscribeToEvents() {
        if (!this.eventBus) return;
        this.logger?.debug(FreeSpinsPlugin.pluginName, 'Subscribing to events...');

        // Listen for state changes to update local tracking and UI
        const unsubscribeState = this.eventBus.on('game:stateChanged', this._handleStateChange.bind(this));

        // Listen for reels stopping to trigger next FS spin or exit
        const unsubscribeReelsStopped = this.eventBus.on('reels:stopped', this._handleReelsStopped.bind(this));

        // --- BEGIN EDIT: Add Trigger Listener ---
        const unsubscribeTrigger = this.eventBus.on('feature:trigger:freeSpins', this._handleFreeSpinsTrigger.bind(this));
        this._listeners.push(unsubscribeTrigger);
        // --- END EDIT ---

        this._listeners.push(unsubscribeState, unsubscribeReelsStopped); // Add trigger listener later

        this.logger?.debug(FreeSpinsPlugin.pluginName, 'Subscribed to events.');
    }

    /**
     * Handles the event signaling that Free Spins should be awarded.
     * @param {object} eventData - Data about the trigger (e.g., number of spins awarded).
     * @param {number} eventData.spinsAwarded
     * @private
     */
    async _handleFreeSpinsTrigger(eventData) {
        // --- BEGIN DEBUG LOG --- 
        this.logger?.info(FreeSpinsPlugin.pluginName, '_handleFreeSpinsTrigger STARTED');
        // --- END DEBUG LOG --- 
        let isRetrigger = this._isInFreeSpins; // Use local tracked state
        try {
            const spinsAwarded = eventData.spinsAwarded ?? FREE_SPINS_AWARDED; // Use constant if not provided
            this.logger?.info(FreeSpinsPlugin.pluginName, `Handling trigger. Awarded: ${spinsAwarded}, IsRetrigger: ${isRetrigger}, CurrentRemaining: ${this._spinsRemaining}`);

            if (isRetrigger) {
                const newRemaining = this._spinsRemaining + spinsAwarded;
                // Request state update for remaining spins only
                updateState({
                    freeSpinsRemaining: newRemaining
                });
                // Request retrigger notification
                this.eventBus?.emit('notification:show', {
                    message: `${spinsAwarded} EXTRA FREE SPINS!`,
                    duration: 2500,
                });
            } else {
                // Initial Entry
                this.logger?.debug(FreeSpinsPlugin.pluginName, 'Initiating Free Spins entry sequence.');
                
                // --- BEGIN EDIT: Wrap sequence in try block for async --- 
                try {
                    // Request state update for entry (TRANSITION START)
                    this.logger?.debug(FreeSpinsPlugin.pluginName, 'Calling updateState for FS entry...');
                    updateState({
                        isInFreeSpins: true,
                        isFeatureTransitioning: true, // Start transition
                        freeSpinsRemaining: spinsAwarded,
                        totalFreeSpinsWin: 0 // Reset win on initial entry
                    });
                    this.logger?.debug(FreeSpinsPlugin.pluginName, 'updateState for FS entry CALLED.');

                    // Start animations concurrently
                    this.logger?.debug(FreeSpinsPlugin.pluginName, 'Starting background and entry animations...');
                    const backgroundTween = this.backgroundManager?.changeBackground(freeSpinsBgColor, 1.5);
                    const entryAnimationPromise = this._playEntryAnimation();

                    // Create a promise for the GSAP tween completion
                    const backgroundPromise = backgroundTween ? 
                        new Promise(resolve => backgroundTween.then(resolve)) : 
                        Promise.resolve(); // Resolve immediately if tween is null

                    // Wait for both animations to complete
                    await Promise.all([backgroundPromise, entryAnimationPromise]);
                    
                    this.logger?.debug(FreeSpinsPlugin.pluginName, 'Background and entry animations COMPLETE.');

                    // Animations complete, show notification and trigger spin
                    this.eventBus?.emit('notification:show', {
                        message: `${spinsAwarded} FREE SPINS AWARDED!`,
                        duration: 3000,
                        onComplete: () => { 
                             this.logger?.debug(FreeSpinsPlugin.pluginName, 'Notification complete callback STARTED.');
                            if (this._isInFreeSpins) {
                                this.logger?.info(FreeSpinsPlugin.pluginName, 'Notification complete, scheduling first spin.');
                                this._triggerNextSpin(); 
                            } else {
                                 this.logger?.warn(FreeSpinsPlugin.pluginName, 'Notification complete, but no longer in Free Spins state. First spin cancelled.');
                            }
                            // End transition AFTER spin is triggered (or attempt fails)
                            updateState({ isFeatureTransitioning: false }); 
                        }
                    });
                // --- END EDIT: End try block ---
                } catch (animError) {
                     this.logger?.error(FreeSpinsPlugin.pluginName, 'Error during animation/notification sequence:', animError);
                     // Reset state if animations fail
                     updateState({ isInFreeSpins: false, isFeatureTransitioning: false });
                }
            }
        } catch (error) {
            this.logger?.error(FreeSpinsPlugin.pluginName, 'Error in _handleFreeSpinsTrigger:', error);
            // Attempt to reset state if something went wrong during entry
            if (!isRetrigger) {
                updateState({ isInFreeSpins: false, isFeatureTransitioning: false });
            }
        }
    }

    /**
     * Handles global state changes, updating local tracking and the UI indicator.
     * @param {{ newState: object, updatedProps: string[] }} eventData 
     * @private
     */
    _handleStateChange(eventData) {
        const { newState, updatedProps } = eventData;
        let uiNeedsUpdate = false;

        if (updatedProps.includes('isInFreeSpins')) {
            if (this._isInFreeSpins !== newState.isInFreeSpins) {
                this._isInFreeSpins = newState.isInFreeSpins;
                this.logger?.debug(FreeSpinsPlugin.pluginName, `Local isInFreeSpins updated to: ${this._isInFreeSpins}`);
                uiNeedsUpdate = true;
            }
        }
        if (updatedProps.includes('freeSpinsRemaining')) {
             if (this._spinsRemaining !== newState.freeSpinsRemaining) {
                this._spinsRemaining = newState.freeSpinsRemaining;
                 this.logger?.debug(FreeSpinsPlugin.pluginName, `Local spins remaining updated to: ${this._spinsRemaining}`);
                uiNeedsUpdate = true;
             }
        }
        if (updatedProps.includes('totalFreeSpinsWin')) {
             if (this._totalWin !== newState.totalFreeSpinsWin) {
                 this._totalWin = newState.totalFreeSpinsWin;
                 this.logger?.debug(FreeSpinsPlugin.pluginName, `Local total win updated to: ${this._totalWin}`);
                uiNeedsUpdate = true;
             }
        }

        if (uiNeedsUpdate) {
            this.logger?.debug(FreeSpinsPlugin.pluginName, 'Updating FS UI Indicator.');
            this.freeSpinsUIManager?.updateDisplay(this._isInFreeSpins, this._spinsRemaining, this._totalWin);
        }
    }

    /**
     * Handles the reels stopping, potentially triggering the next free spin or exiting the feature.
     * @private
     */
    _handleReelsStopped() {
        if (!this._isInFreeSpins) {
            // Not in free spins, do nothing
            return;
        }

        this.logger?.debug(FreeSpinsPlugin.pluginName, 'Reels stopped during Free Spins.');

        // --- BEGIN IMPLEMENTATION based on old handleFreeSpinEnd ---
        try {
            // 1. Accumulate Win
            const lastWin = state.lastTotalWin; // Read from global state (as updated by WinEvaluation)
            if (lastWin > 0) {
                const winToAdd = lastWin * FreeSpinsPlugin.FREE_SPINS_MULTIPLIER; // Use multiplier
                const newTotalWin = this._totalWin + winToAdd;
                this.logger?.info(FreeSpinsPlugin.pluginName, `Accumulating win. Last: ${lastWin}, Multiplier: ${FreeSpinsPlugin.FREE_SPINS_MULTIPLIER}, Added: ${winToAdd}, New Total: ${newTotalWin}`);
                // Update total win state ONLY (remaining decremented below)
                updateState({ totalFreeSpinsWin: newTotalWin });
            }

            // 2. Decrement Spins Remaining
            const newSpinsRemaining = this._spinsRemaining - 1;
             this.logger?.info(FreeSpinsPlugin.pluginName, `Decrementing spins. Remaining: ${newSpinsRemaining}`);
             // Request state update for remaining spins
             updateState({ freeSpinsRemaining: newSpinsRemaining });

            // 3. Check if spins remain
            if (newSpinsRemaining > 0) {
                // If yes: Trigger next spin (after delay?)
                // Use the helper method we created
                // TODO: Add configurable delay
                const delay = state.isTurboMode ? 200 : 800; // Use delay based on turbo state
                 this.logger?.debug(FreeSpinsPlugin.pluginName, `Scheduling next spin in ${delay}ms.`);
                 setTimeout(() => {
                     this._triggerNextSpin();
                 }, delay);
            } else {
                // If no: Initiate exit sequence
                 this.logger?.info(FreeSpinsPlugin.pluginName, 'Last free spin complete. Initiating exit sequence.');
                 this._exitFreeSpins(); 
            }
        } catch (error) {
             this.logger?.error(FreeSpinsPlugin.pluginName, 'Error in _handleReelsStopped:', error);
             // Consider attempting to exit gracefully if error occurs
             if (this._isInFreeSpins) {
                 this._exitFreeSpins();
             }
        }
        // --- END IMPLEMENTATION ---
    }

    // --- BEGIN EDIT: Add FREE_SPINS_MULTIPLIER constant ---
    static FREE_SPINS_MULTIPLIER = 2;
    // --- END EDIT ---

    // TODO: Add methods for entry sequence (_enterFreeSpins) -> Renamed to _playEntryAnimation
    // --- BEGIN ADD HELPER METHODS ---
    /**
     * Placeholder for the entry animation.
     * @param {Function} onComplete - Callback function when animation finishes.
     * @returns {Promise<void>} A promise that resolves when the animation simulation is complete.
     * @private
     */
    _playEntryAnimation(onComplete = () => {}) {
        // --- BEGIN EDIT: Return Promise --- 
        return new Promise((resolve) => {
            // TODO: Replicate animation from old FreeSpins.js or integrate with AnimationController
            this.logger?.warn(FreeSpinsPlugin.pluginName, '_playEntryAnimation needs implementation!');
            // Simulate animation duration for now
            setTimeout(() => {
                onComplete(); // Call original callback if needed
                resolve(); // Resolve the promise
            }, 1500); // Simulate 1.5 second animation
        });
        // --- END EDIT ---
    }

    /**
     * Triggers the next free spin if conditions are met.
     * @private
     */
    _triggerNextSpin() {
        // --- BEGIN DEBUG LOG --- 
        this.logger?.info(FreeSpinsPlugin.pluginName, '_triggerNextSpin STARTED.');
        // --- END DEBUG LOG --- 
        // TODO: Add delay similar to old code?
        this.logger?.debug(FreeSpinsPlugin.pluginName, 'Attempting to trigger next spin.');
        // --- BEGIN DEBUG LOG --- 
        const conditions = {
            hasSpinManager: !!this.spinManager,
            isInFS_local: this._isInFreeSpins,
            isSpinning_global: state.isSpinning
        };
        this.logger?.debug(FreeSpinsPlugin.pluginName, 'Checking conditions for triggering spin:', conditions);
        // --- END DEBUG LOG --- 
        if (this.spinManager && this._isInFreeSpins && !state.isSpinning) { // Check global spin state too
             this.logger?.info(FreeSpinsPlugin.pluginName, 'Triggering spin via SpinManager.');
             // --- BEGIN DEBUG LOG --- 
             this.logger?.debug(FreeSpinsPlugin.pluginName, 'Emitting ui:button:click { buttonName: spin }');
             // --- END DEBUG LOG --- 
             // Use event to request spin, consistent with Autoplay
             this.eventBus?.emit('ui:button:click', { buttonName: 'spin' });
             // OLD: this.spinManager.startSpin(); 
        } else {
             this.logger?.warn(FreeSpinsPlugin.pluginName, 'Conditions not met for triggering next spin.', {
                 hasSpinManager: !!this.spinManager,
                 isInFS: this._isInFreeSpins,
                 isSpinningGlobal: state.isSpinning
             });
        }
    }
    // --- END ADD HELPER METHODS ---

    // TODO: Add methods for exit sequence (_exitFreeSpins)

    // --- BEGIN EDIT: Add _exitFreeSpins placeholder ---
    /**
     * Placeholder for the exit sequence and animation.
     * @private
     */
    _exitFreeSpins() {
        this.logger?.info(FreeSpinsPlugin.pluginName, 'Initiating exit sequence...');
        // Request state update: transitioning = true?
        updateState({ isFeatureTransitioning: true });

        // TODO: Play exit animation/summary (e.g., using Notifications or AnimationController)
        this.eventBus?.emit('notification:show', {
            message: `FREE SPINS COMPLETE\nTOTAL WIN: €${this._totalWin.toFixed(2)}`,
            duration: 4000, // Longer duration for summary
            onComplete: () => {
                this.logger?.debug(FreeSpinsPlugin.pluginName, 'Exit summary complete.');
                // Change background back
                this.backgroundManager?.changeBackground(normalBgColor, 1.5);
                // Final state update to exit Free Spins
                updateState({
                    isInFreeSpins: false,
                    isFeatureTransitioning: false // End transition
                    // freeSpinsRemaining and totalFreeSpinsWin should already be correct
                });
                this.logger?.info(FreeSpinsPlugin.pluginName, 'Exited Free Spins mode.');
            }
        });
    }
    // --- END EDIT ---

    destroy() {
        this.logger?.info(FreeSpinsPlugin.pluginName, 'Destroying...');
        this._listeners.forEach(unsubscribe => unsubscribe());
        this._listeners = [];
        // Nullify references
        this.logger = null;
        this.eventBus = null;
        this.spinManager = null;
        this.animationController = null;
        this.backgroundManager = null;
        this.freeSpinsUIManager = null;
        this.effectsLayer = null;
    }
}
