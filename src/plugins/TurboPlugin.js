/**
 * @module TurboPlugin
 * @description Plugin to manage the Turbo Mode feature.
 * Handles toggling turbo state and updating the UI button.
 */

import { state, updateState } from '../core/GameState.js';

// Import types for JSDoc
/** @typedef {import('../utils/Logger.js').Logger} Logger */
/** @typedef {import('../utils/EventBus.js').EventBus} EventBus */
/** @typedef {import('../ui/UIManager.js').UIManager} UIManager */

export class TurboPlugin {
    static pluginName = 'TurboMode';

    /** @type {Logger | null} */
    logger = null;
    /** @type {EventBus | null} */
    eventBus = null;
    /** @type {UIManager | null} */
    uiManager = null;

    /** @type {Array<Function>} */
    _listeners = [];

    /**
     * @param {object} dependencies
     * @param {Logger} dependencies.logger
     * @param {EventBus} dependencies.eventBus
     * @param {UIManager} dependencies.uiManager
     */
    constructor(dependencies) {
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        this.uiManager = dependencies.uiManager;

        if (!this.logger || !this.eventBus || !this.uiManager) {
            console.error("TurboPlugin: Missing core dependencies (logger, eventBus, uiManager).");
            // Potentially throw error or prevent initialization
            return;
        }

        this.logger?.info('TurboPlugin', 'Initialized.');
        this._subscribeToEvents();
        // Set initial button state based on initial game state
        this._updateButtonState(state.isTurboMode);
    }

    /**
     * Initialization logic for the plugin (if needed).
     * Currently satisfies the IPlugin interface requirement.
     */
    init() {
        this.logger?.debug('TurboPlugin', 'init() called.');
        // No specific initialization needed for Turbo Mode currently
    }

    _subscribeToEvents() {
        if (!this.eventBus) return;

        // Listen for the specific turbo button click event
        const unsubscribeClick = this.eventBus.on('ui:button:click', (event) => {
            this.logger?.debug('TurboPlugin', 'Received ui:button:click', event);
            if (event.buttonName === 'turbo') {
                this._handleTurboButtonClick();
            }
        });

        // Listen for general state changes to update the button if state is changed elsewhere
        const unsubscribeState = this.eventBus.on('game:stateChanged', (eventData) => {
            this.logger?.debug('TurboPlugin', 'Received game:stateChanged', { 
                updatedProps: eventData.updatedProps, 
                newState_isTurboMode: eventData.newState?.isTurboMode 
            });
            if (eventData.updatedProps.includes('isTurboMode')) {
                this.logger?.debug('TurboPlugin', 'Processing isTurboMode state change.');
                const turboStateFromEvent = eventData.newState.isTurboMode;
                this.logger?.debug('TurboPlugin', `Calling _updateButtonState with: ${turboStateFromEvent}`);
                this._updateButtonState(turboStateFromEvent);
            }
        });

        this._listeners.push(unsubscribeClick, unsubscribeState);
        this.logger?.debug('TurboPlugin', 'Subscribed to events.');
    }

    /**
     * Handles the click event for the Turbo button.
     * @private
     */
    _handleTurboButtonClick() {
        this.logger?.info('TurboPlugin', '_handleTurboButtonClick called.');
        const currentTurboState = state.isTurboMode;
        const newTurboState = !currentTurboState;
        this.logger?.info('TurboPlugin', `Turbo button clicked. Toggling state from ${currentTurboState} to ${newTurboState}.`);
        updateState({ isTurboMode: newTurboState });
        // The state change event listener (_handleStateChange) will handle updating the button visual state.
    }

    /**
     * Updates the visual state of the Turbo button.
     * @param {boolean} isTurboActive - The current turbo state.
     * @private
     */
    _updateButtonState(isTurboActive) {
        if (!this.uiManager) return;
        this.logger?.debug('TurboPlugin', `Updating button visual state. isTurboActive: ${isTurboActive}`);
        this.uiManager.setButtonVisualState('turbo', isTurboActive, 'turbo-active', 'turbo');
    }

    destroy() {
        this.logger?.info('TurboPlugin', 'Destroying...');
        this._listeners.forEach(unsubscribe => unsubscribe());
        this._listeners = [];

        // Nullify references
        this.logger = null;
        this.eventBus = null;
        this.uiManager = null;
    }
}
