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
import { UIManager } from '../ui/UIManager.js'; // Import UIManager type for JSDoc

export const AutoplayPlugin = {
    name: 'Autoplay',
    version: '1.0.0',

    /** @type {Logger | null} */
    logger: null,
    /** @type {EventBus | null} */
    eventBus: null,
    /** @type {SpinManager | null} */
    spinManager: null,
    /** @type {UIManager | null} */ // Add UIManager
    uiManager: null,
    /** @type {Array<Function>} */
    listeners: [],
    /** @type {ReturnType<typeof setTimeout> | null} */
    nextSpinTimeout: null,
    /** @type {any | null} */ // TODO: Add proper type for ButtonFactory return
    autoplayButton: null,
     /** @type {object | null} */
    initialState: null,
    // Track current state locally, updated by event
    /** @type {boolean} */
    isAutoplaying: false,
    /** @type {number} */
    autoplaySpinsRemaining: 0,

    /**
     * Initializes the plugin, storing dependencies and setting up listeners.
     * @param {object} coreDependencies - Core dependencies injected by PluginSystem.
     * @param {Logger} coreDependencies.logger
     * @param {EventBus} coreDependencies.eventBus
     * @param {SpinManager} coreDependencies.spinManager
     * @param {UIManager} coreDependencies.uiManager // Get UIManager
     * @param {object} coreDependencies.initialState // The initial game state
     */
    init(coreDependencies) {
        this.logger = coreDependencies.logger;
        this.eventBus = coreDependencies.eventBus;
        this.spinManager = coreDependencies.spinManager;
        this.uiManager = coreDependencies.uiManager; // Store UIManager
        this.initialState = coreDependencies.initialState;

        if (!this.logger || !this.eventBus || !this.spinManager || !this.uiManager || !this.initialState) {
            console.error("AutoplayPlugin: Missing core dependencies (logger, eventBus, spinManager, uiManager, initialState).");
            return;
        }

        this.logger.info(`AutoplayPlugin v${this.version}`, 'Initializing...');
        
        // Initialize local state tracking
        this.isAutoplaying = this.initialState.isAutoplaying || false;
        this.autoplaySpinsRemaining = this.initialState.autoplaySpinsRemaining || 0;

        // --- BEGIN EDIT: Get button from UIManager, remove creation --- 
        // Get the button instance created by UIManager
        this.autoplayButton = this.uiManager.getButton('autoplay');

        if (!this.autoplayButton) {
            this.logger.error('AutoplayPlugin', 'Could not find autoplay button from UIManager.');
            // Maybe don't proceed if the button is essential?
        } else {
            // Set initial visual state using UIManager's method
            this.uiManager.setButtonVisualState(
                'autoplay', 
                this.isAutoplaying, 
                'autoplay-active', 
                'autoplay'
            );
        }
        
        // --- END EDIT ---
        
        // --- Subscribe to Events --- 
        const unsubscribeSpinEnd = this.eventBus.on('spin:sequenceComplete', this._handleSpinEndForAutoplay.bind(this));
        this.listeners.push(unsubscribeSpinEnd);
        
        const unsubscribeState = this.eventBus.on('game:stateChanged', this._handleStateChangeForAutoplay.bind(this));
        this.listeners.push(unsubscribeState);
        
        this.logger.info('AutoplayPlugin', 'Initialization complete, subscribed to events.');
    },

    /**
     * Cleans up listeners, timeouts, and any created UI elements.
     */
    destroy() {
        this.logger?.info('AutoplayPlugin', 'Destroying...');
        
        // Unsubscribe listeners
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        // Clear timeout
        if (this.nextSpinTimeout) {
            clearTimeout(this.nextSpinTimeout);
            this.nextSpinTimeout = null;
        }
        
        // --- BEGIN EDIT: Remove button destruction logic --- 
        // Button is managed by UIManager, plugin just removes its listener
        if (this.autoplayButton && typeof this.autoplayButton.off === 'function') {
            // REMOVED: this.autoplayButton.off('click', this._handleButtonClick.bind(this));
            // this.logger?.debug('AutoplayPlugin', 'Removed click listener from autoplay button.'); // REMOVE log too
        }
        // Nullify button reference, but don't destroy it
        this.autoplayButton = null;
        // --- END EDIT ---
        
        // Nullify dependencies
        this.logger = null;
        this.eventBus = null;
        this.spinManager = null;
        this.uiManager = null; // Nullify uiManager
        this.initialState = null;
    },

    // --- Internal Methods --- 
    _handleSpinEndForAutoplay() {
        try {
            if (this.nextSpinTimeout) { 
                 clearTimeout(this.nextSpinTimeout);
                 this.nextSpinTimeout = null;
            }
            
            // Use locally tracked state
            if (!this.isAutoplaying) {
                this.logger?.debug('AutoplayPlugin', 'Spin sequence complete, but autoplay is not active (local state).');
                return;
            }
            
            // Read global state directly (TEMP - should use local state or event payload)
            if (state.isInFreeSpins) {
                this.logger?.info('AutoplayPlugin', 'Spin sequence complete, stopping autoplay because Free Spins are active.');
                this.eventBus?.emit('state:update', { isAutoplaying: false, autoplaySpinsRemaining: 0 }); 
                return;
            }
            
            // Use locally tracked state
            if (this.autoplaySpinsRemaining > 0) {
                // Read global state for bet/balance check (TEMP)
                const currentTotalBet = state.currentBetPerLine * NUM_PAYLINES; 
                if (state.balance < currentTotalBet) {
                    this.logger?.info('AutoplayPlugin', 'Spin sequence complete, stopping autoplay due to low balance.');
                    this.eventBus?.emit('state:update', { isAutoplaying: false, autoplaySpinsRemaining: 0 }); 
                    // TODO: Emit user notification event?
                    return;
                }

                // Decrement local count first
                this.autoplaySpinsRemaining--;
                this.logger?.debug('AutoplayPlugin', `Locally decremented spins remaining to: ${this.autoplaySpinsRemaining}`);
                // Request state update for remaining spins 
                // NOTE: This might cause race conditions if GameState also decrements.
                // Ideally, only one system updates the authoritative state.
                // For now, let the plugin update it.
                this.eventBus?.emit('state:update', { autoplaySpinsRemaining: this.autoplaySpinsRemaining });
                
                const delay = (state.isTurboMode ? 150 : 600) * winAnimDelayMultiplier; // Read global state (TEMP)
                this.logger?.debug('AutoplayPlugin', `Scheduling next autoplay spin in ${delay}ms.`);

                this.nextSpinTimeout = setTimeout(() => {
                    if (!this.spinManager || !this.isAutoplaying || state.isInFreeSpins) { // Use local + global state (TEMP)
                        this.logger?.debug('AutoplayPlugin', 'Next spin cancelled (timeout check).');
                        if(this.isAutoplaying) { // Only emit stop if we thought we were active
                            this.eventBus?.emit('state:update', { isAutoplaying: false, autoplaySpinsRemaining: 0 }); 
                        }
                        return;
                    }
                    this.logger?.info('AutoplayPlugin', 'Triggering next spin via SpinManager.');
                    this.spinManager.startSpin(); 
                    this.nextSpinTimeout = null;
                }, delay);

            } else {
                this.logger?.info('AutoplayPlugin', 'Autoplay finished naturally.');
                this.eventBus?.emit('state:update', { isAutoplaying: false, autoplaySpinsRemaining: 0 }); 
            }
        } catch (error) {
            this.logger?.error('AutoplayPlugin', 'Error in _handleSpinEndForAutoplay handler:', error);
        }
    },

    _handleStateChangeForAutoplay(eventData) {
        try {
            const { newState, updatedProps } = eventData;
            let stateChanged = false;
            
            // Update locally tracked state if relevant properties changed
            if (updatedProps.includes('isAutoplaying')) {
                if (this.isAutoplaying !== newState.isAutoplaying) {
                    this.isAutoplaying = newState.isAutoplaying;
                    this.logger?.debug('AutoplayPlugin', `Local isAutoplaying updated to: ${this.isAutoplaying}`);
                    stateChanged = true;
                }
            }
            if (updatedProps.includes('autoplaySpinsRemaining')) {
                 if (this.autoplaySpinsRemaining !== newState.autoplaySpinsRemaining) {
                    this.autoplaySpinsRemaining = newState.autoplaySpinsRemaining;
                    this.logger?.debug('AutoplayPlugin', `Local autoplaySpinsRemaining updated to: ${this.autoplaySpinsRemaining}`);
                    // No need to set stateChanged = true here, only visual/flow changes needed
                 }
            }

            // Trigger First Spin logic (if autoplay was just turned ON)
            if (updatedProps.includes('isAutoplaying') && newState.isAutoplaying) {
                 if (!newState.isSpinning && !newState.isFeatureTransitioning && !newState.isInFreeSpins) {
                     this.logger?.info('AutoplayPlugin', 'Autoplay activated, scheduling first spin.');
                     if (this.spinManager) { 
                         setTimeout(() => {
                             if (this.spinManager && this.isAutoplaying && !state.isSpinning && !state.isFeatureTransitioning && !state.isInFreeSpins) {
                                 this.logger?.debug('AutoplayPlugin', 'Timeout executed, starting first spin.');
                                 this.spinManager.startSpin(); 
                             } else {
                                 this.logger?.debug('AutoplayPlugin', 'First spin cancelled (state changed during initial delay or spin manager missing).');
                             }
                         }, 50); 
                     } else {
                         this.logger?.error('AutoplayPlugin', 'Cannot schedule first spin, SpinManager is missing.');
                     }
                 }
            }

            // --- Stop Autoplay check --- 
            let shouldStop = false;
             if (this.isAutoplaying) { // Check local state
                if (updatedProps.includes('isAutoplaying') && !newState.isAutoplaying) { 
                    // Already handled by updating local state
                } else if (updatedProps.includes('isInFreeSpins') && newState.isInFreeSpins) {
                    shouldStop = true;
                    this.logger?.info('AutoplayPlugin', 'Detected FS start, stopping autoplay.');
                } // Add other conditions (balance? server error?)
             }
            
             if (shouldStop) {
                if (this.nextSpinTimeout) {
                    clearTimeout(this.nextSpinTimeout);
                    this.nextSpinTimeout = null;
                    this.logger?.debug('AutoplayPlugin', 'Cancelled pending next spin due to state change (FS entry).');
                }
                // Request state update to ensure stopped
                this.eventBus?.emit('state:update', { isAutoplaying: false, autoplaySpinsRemaining: 0 });
             }
             
             // --- Update Button Visuals --- 
             if (stateChanged && this.autoplayButton) {
                this.uiManager?.setButtonVisualState(
                    'autoplay', 
                    this.isAutoplaying, 
                    'autoplay-active', 
                    'autoplay'
                );
             }

        } catch (error) {
             this.logger?.error('AutoplayPlugin', 'Error in _handleStateChangeForAutoplay handler:', error);
        }
    },
};
