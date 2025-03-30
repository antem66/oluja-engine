/**
 * @module AutoplayPlugin
 * @description Plugin to manage the Autoplay feature.
 * Handles starting, stopping, and managing the sequence of autoplay spins.
 */

// Import types for JSDoc
import * as PIXI from 'pixi.js'; // Import PIXI
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { SpinManager } from '../core/SpinManager.js';
import { state, updateState } from '../core/GameState.js'; // TEMP: Import state/updateState
import { winAnimDelayMultiplier } from '../config/animationSettings.js'; // Import settings
import { NUM_PAYLINES } from '../config/paylines.js';
// TODO: Get game dimensions dynamically or from config service
import { GAME_HEIGHT } from '../config/gameSettings.js';
/** @typedef {import('../ui/UIManager.js').UIManager} UIManager */ // Import UIManager type for JSDoc

export class AutoplayPlugin {
    // --- BEGIN ADD STATIC NAME ---
    static pluginName = 'Autoplay';
    // --- END ADD STATIC NAME ---

    // --- BEGIN LINTER FIX: Remove TS syntax ---
    /** @type {Logger | null} */
    logger = null;
    /** @type {EventBus | null} */
    eventBus = null;
    /** @type {SpinManager | null} */
    spinManager = null;
    /** @type {UIManager | null} */ // Add UIManager
    uiManager = null;
    /** @type {Array<Function>} */
    _listeners = [];
    /** @type {ReturnType<typeof setTimeout> | null} */
    _nextSpinTimeout = null;
    /** @type {any | null} */ // TODO: Add proper type for ButtonFactory return
    _autoplayButton = null;
     /** @type {object | null} */
    _initialState = null;
    // Track current state locally, updated by event
    /** @type {boolean} */
    _isAutoplaying = false;
    /** @type {number} */
    _autoplaySpinsRemaining = 0;
    // --- END LINTER FIX ---

    /**
     * @param {object} dependencies
     * @param {Logger} dependencies.logger
     * @param {EventBus} dependencies.eventBus
     * @param {SpinManager} dependencies.spinManager
     * @param {UIManager} dependencies.uiManager // Add UIManager
     * @param {object} dependencies.initialState // The initial game state
     */
    // --- BEGIN LINTER FIX: Remove TS syntax from constructor ---
    constructor(dependencies) {
    // --- END LINTER FIX ---
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        this.spinManager = dependencies.spinManager;
        this.uiManager = dependencies.uiManager; // Store UIManager
        this._initialState = dependencies.initialState; // Store initial state

        if (!this.logger || !this.eventBus || !this.spinManager || !this.uiManager) {
            console.error("AutoplayPlugin: Missing core dependencies.");
            return;
        }

        // Initialize local state from initial game state
        this._isAutoplaying = this._initialState?.isAutoplaying ?? false;
        this._autoplaySpinsRemaining = this._initialState?.autoplaySpinsRemaining ?? 0;

        this.logger?.info(AutoplayPlugin.pluginName, 'Constructed.'); // Use static name for logging
        // Note: init() will be called by PluginSystem later
    }

    init() {
        this.logger?.info(AutoplayPlugin.pluginName, 'Initializing...');
        this._subscribeToEvents();
        // Set initial button state AFTER subscribing, as subscribe might trigger UI update
        this._updateButtonState(this._isAutoplaying);
        this.logger?.info(AutoplayPlugin.pluginName, 'Initialization complete.');
    }

    _subscribeToEvents() {
        if (!this.eventBus) return;

        const unsubscribeClick = this.eventBus.on('ui:button:click', (event) => {
            if (event.buttonName === 'autoplay') {
                this._handleAutoplayButtonClick();
            }
        });

        const unsubscribeState = this.eventBus.on('game:stateChanged', this._handleStateChangeForAutoplay.bind(this));
        const unsubscribeReelsStopped = this.eventBus.on('reels:stopped', this._handleReelsStopped.bind(this));

        this._listeners.push(unsubscribeClick, unsubscribeState, unsubscribeReelsStopped);
        this.logger?.debug(AutoplayPlugin.pluginName, 'Subscribed to events.');
    }

    _handleAutoplayButtonClick() {
        this.logger?.info(AutoplayPlugin.pluginName, 'Autoplay button clicked');
        if (this._isAutoplaying) {
            this.stopAutoplay('manual');
        } else {
            // TODO: Get spin count from config or UI element
            const spinsToStart = 10;
            this.startAutoplay(spinsToStart);
        }
    }

    /**
     * @param {{ newState: object, updatedProps: string[] }} eventData 
     */
    // --- BEGIN LINTER FIX: Remove TS syntax from handler param ---
    _handleStateChangeForAutoplay(eventData) {
    // --- END LINTER FIX ---
        try {
            // --- BEGIN REMOVE LOG ---
            /*
            this.logger?.debug(AutoplayPlugin.pluginName, 'Received game:stateChanged', { 
                updatedProps: eventData.updatedProps, 
                newState_isAutoplaying: eventData.newState?.isAutoplaying,
                newState_spinsRemaining: eventData.newState?.autoplaySpinsRemaining
            });
            */
            // --- END REMOVE LOG ---
            const { newState, updatedProps } = eventData;
            // Update local tracking state if relevant properties changed
            if (updatedProps.includes('isAutoplaying')) {
                const changed = this._isAutoplaying !== newState.isAutoplaying;
                this._isAutoplaying = newState.isAutoplaying;
                if (changed) {
                     this.logger?.debug(AutoplayPlugin.pluginName, `Local isAutoplaying updated to: ${this._isAutoplaying}`);
                     this._updateButtonState(this._isAutoplaying);
                     // If autoplay was turned OFF externally, clear timeout
                     if (!this._isAutoplaying && this._nextSpinTimeout) {
                         clearTimeout(this._nextSpinTimeout);
                         this._nextSpinTimeout = null;
                         this.logger?.info(AutoplayPlugin.pluginName, 'Autoplay cancelled externally, cleared timeout.');
                     }
                }
            }
            if (updatedProps.includes('autoplaySpinsRemaining')) {
                 const changed = this._autoplaySpinsRemaining !== newState.autoplaySpinsRemaining;
                 this._autoplaySpinsRemaining = newState.autoplaySpinsRemaining;
                  if (changed) {
                     this.logger?.debug(AutoplayPlugin.pluginName, `Local spins remaining updated to: ${this._autoplaySpinsRemaining}`);
                     // Optional: Update a specific UI display if one exists for spins remaining
                     // this._updateSpinsRemainingDisplay(this._autoplaySpinsRemaining);
                  }
            }
        } catch (error) {
            this.logger?.error(AutoplayPlugin.pluginName, 'Error processing state change:', error);
        }
    }

    _handleReelsStopped() {
        if (this._isAutoplaying) {
            this.logger?.debug(AutoplayPlugin.pluginName, 'Reels stopped during autoplay.');
            // Check if spins remain BEFORE decrementing in GameState
            if (this._autoplaySpinsRemaining > 0) {
                this.logger?.info(AutoplayPlugin.pluginName, `Autoplay spins remaining: ${this._autoplaySpinsRemaining -1}`);
                // Simple delay before next spin - TODO: Make configurable
                const delay = 1000;
                 this._nextSpinTimeout = setTimeout(() => {
                    if (this._isAutoplaying) { // Double check state before spinning
                        this.logger?.debug(AutoplayPlugin.pluginName, 'Triggering next autoplay spin.');
                        this.eventBus?.emit('ui:button:click', { buttonName: 'spin' }); // Request spin via event
                    } else {
                         this.logger?.warn(AutoplayPlugin.pluginName, 'Delay finished but autoplay is now off. Spin cancelled.');
                    }
                 }, delay);
            } else {
                this.logger?.info(AutoplayPlugin.pluginName, 'Autoplay finished (0 spins remaining).');
                // No need to call stopAutoplay here, state should already be updated
            }
        } else {
            //this.logger?.debug(AutoplayPlugin.pluginName, 'Reels stopped, not in autoplay.');
        }
    }

    startAutoplay(numSpins) {
        if (numSpins <= 0) {
            this.logger?.warn(AutoplayPlugin.pluginName, 'Cannot start autoplay with 0 or fewer spins.', { numSpins });
            return;
        }
        this.logger?.info(AutoplayPlugin.pluginName, `Starting autoplay for ${numSpins} spins.`);
        updateState({
            isAutoplaying: true,
            autoplaySpinsRemaining: numSpins
        });
        // Trigger the first spin immediately if game is idle
        if (!state.isSpinning) {
             this.logger?.debug(AutoplayPlugin.pluginName, 'Triggering first autoplay spin immediately.');
             this.eventBus?.emit('ui:button:click', { buttonName: 'spin' });
        } else {
             this.logger?.debug(AutoplayPlugin.pluginName, 'Game is currently spinning, first autoplay spin will occur after reels stop.');
        }
    }

    stopAutoplay(reason = 'unknown') {
        this.logger?.info(AutoplayPlugin.pluginName, `Stopping autoplay. Reason: ${reason}`);
        if (this._nextSpinTimeout) {
            clearTimeout(this._nextSpinTimeout);
            this._nextSpinTimeout = null;
        }
        // Only update state if it's currently on
        if (this._isAutoplaying || this._autoplaySpinsRemaining > 0) {
             updateState({
                 isAutoplaying: false,
                 autoplaySpinsRemaining: 0
             });
        } else {
            this.logger?.debug(AutoplayPlugin.pluginName, 'stopAutoplay called but already stopped.');
        }
    }

    _updateButtonState(isActive) {
        if (!this.uiManager) {
             this.logger?.error(AutoplayPlugin.pluginName, 'Cannot update button state - UIManager missing.');
             return;
        }
         this.logger?.debug(AutoplayPlugin.pluginName, `Updating autoplay button visual state to: ${isActive ? 'Active' : 'Inactive'}`);
         this.uiManager.setButtonVisualState('autoplay', isActive, 'autoplay-active', 'autoplay');
    }

    // Optional: Method to update a dedicated spins remaining display
    /*
    _updateSpinsRemainingDisplay(spinsLeft) {
        if (this.uiManager && typeof this.uiManager.updateAutoplaySpinsDisplay === 'function') {
            this.uiManager.updateAutoplaySpinsDisplay(spinsLeft);
        } else {
            // logger?.debug(AutoplayPlugin.pluginName, 'No dedicated spins remaining display method found on UIManager.');
        }
    }
    */

    destroy() {
        this.logger?.info(AutoplayPlugin.pluginName, 'Destroying...');
        this._listeners.forEach(unsubscribe => unsubscribe());
        this._listeners = [];
        if (this._nextSpinTimeout) {
            clearTimeout(this._nextSpinTimeout);
            this._nextSpinTimeout = null;
        }
        // Nullify references
        this.logger = null;
        this.eventBus = null;
        this.spinManager = null;
        this.uiManager = null;
        this._initialState = null;
    }
}
