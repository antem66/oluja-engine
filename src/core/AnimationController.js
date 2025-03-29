/**
 * @module AnimationController
 * @description Central controller for managing and triggering game animations.
 * Allows different modules to register animation logic (callbacks or timelines)
 * which can then be played back based on game events or direct calls.
 *
 * Dependencies (Injected):
 * - eventBus: To potentially listen for events that trigger animations.
 * - logger: For logging.
 *
 * Key Methods:
 * - constructor(dependencies)
 * - init(): Subscribes to relevant events (TODO).
 * - registerAnimation(animationName, callback): Registers a function to be called for an animation.
 * - playAnimation(animationName, data): Executes a registered animation callback with provided data.
 * - destroy(): Cleans up listeners (TODO).
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
// Import GSAP for potential future timeline management within the controller
// import { gsap } from 'gsap';

export class AnimationController {
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;

    /** @type {Map<string, Function[]> | null} */ // Allow null after destroy
    registeredAnimations = null;

    // TODO: Add properties for managing active timelines or sequences if needed

    /**
     * @param {object} dependencies
     * @param {import('../utils/EventBus.js').EventBus} dependencies.eventBus
     * @param {import('../utils/Logger.js').Logger} dependencies.logger
     */
    constructor(dependencies) {
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;

        if (!this.eventBus || !this.logger) {
            console.error('AnimationController: Missing dependencies (eventBus, logger).');
            // Logger might be missing, so use console
        }

        this.registeredAnimations = new Map();
        this.logger?.info('AnimationController', 'Instance created.');
    }

    /**
     * Initializes the controller, potentially subscribing to events.
     */
    init() {
        // TODO: Subscribe to relevant events that might trigger animations directly
        // e.g., this.eventBus.on('win:validatedForAnimation', this.handleWinAnimationTrigger.bind(this));
        this.logger?.info('AnimationController', 'Initialized.');
    }

    /**
     * Registers an animation callback function for a specific animation name.
     * Multiple callbacks can be registered for the same name.
     * @param {string} animationName - The name/key of the animation (e.g., 'symbolWin', 'bigWin', 'paylineFlash').
     * @param {Function} callback - The function to execute when this animation is played. It will receive the data passed to playAnimation.
     * @returns {Function} An unregister function.
     */
    registerAnimation(animationName, callback) {
        if (typeof callback !== 'function') {
            this.logger?.error('AnimationController', `Failed to register animation "${animationName}": callback is not a function.`);
            return () => {}; // Return no-op unregister
        }
        if (!this.registeredAnimations) {
             this.logger?.warn('AnimationController', `Attempted to register animation "${animationName}" after controller was destroyed.`);
             return () => {};
        }

        if (!this.registeredAnimations.has(animationName)) {
            this.registeredAnimations.set(animationName, []);
        }

        const callbacks = this.registeredAnimations.get(animationName);
        // Avoid double registration of the exact same callback instance
        if (callbacks && !callbacks.includes(callback)) { // Add null check for callbacks
            callbacks.push(callback);
            this.logger?.debug('AnimationController', `Registered animation callback for "${animationName}".`);
        } else if (callbacks && callbacks.includes(callback)){
            this.logger?.warn('AnimationController', `Attempted to register the same animation callback instance multiple times for "${animationName}".`);
        }

        // Return an unregister function
        return () => {
            this.unregisterAnimation(animationName, callback);
        };
    }

    /**
     * Unregisters a specific animation callback.
     * @param {string} animationName
     * @param {Function} callback
     */
    unregisterAnimation(animationName, callback) {
        if (!this.registeredAnimations || !this.registeredAnimations.has(animationName)) {
            return; // No callbacks registered or controller destroyed
        }

        const callbacks = this.registeredAnimations.get(animationName);
        if (!callbacks) return; // Should not happen if map entry exists, but check anyway

        const initialLength = callbacks.length;
        // Create a new filtered array
        const updatedCallbacks = callbacks.filter(cb => cb !== callback);

        // Only update the map and log if a change actually occurred
        if (updatedCallbacks.length < initialLength) {
            this.registeredAnimations.set(animationName, updatedCallbacks);
            this.logger?.debug('AnimationController', `Unregistered animation callback for "${animationName}".`);
        }
    }


    /**
     * Plays all registered animation callbacks for a given animation name.
     * @param {string} animationName - The name/key of the animation to play.
     * @param {any} [data] - Optional data payload to pass to the animation callback functions.
     */
    playAnimation(animationName, data = null) {
         if (!this.registeredAnimations) {
             this.logger?.warn('AnimationController', `Attempted to play animation "${animationName}" after controller was destroyed.`);
             return;
         }
        if (!this.registeredAnimations.has(animationName)) {
            this.logger?.debug('AnimationController', `playAnimation called for "${animationName}", but no callbacks registered.`);
            return;
        }

        const callbacks = this.registeredAnimations.get(animationName);
        if (!callbacks || callbacks.length === 0) {
             this.logger?.debug('AnimationController', `playAnimation called for "${animationName}", but callback list is empty.`);
             return;
        }

        this.logger?.info('AnimationController', `Playing animation "${animationName}" (${callbacks.length} callbacks)...`, { data });

        // Execute callbacks safely
        callbacks.forEach(callback => {
            try {
                // Execute the registered animation function
                if (typeof callback === 'function') {
                     callback(data);
                } else {
                     this.logger?.error('AnimationController', `Registered item for "${animationName}" is not a function.`);
                }
            } catch (error) {
                this.logger?.error('AnimationController', `Error executing animation callback for "${animationName}":`, error);
                // TODO: Consider more robust error handling - stop sequence? emit error event?
            }
        });

        // TODO: Potentially manage completion events or timelines here
    }

    /**
     * Cleans up resources, like event listeners.
     */
    destroy() {
        // TODO: Unsubscribe from any events subscribed to in init()
        this.registeredAnimations?.clear(); // Use optional chaining
        this.logger?.info('AnimationController', 'Destroyed.');
        // Nullify references to help GC and prevent accidental use
        this.eventBus = null;
        this.logger = null;
        this.registeredAnimations = null;
    }

    // --- Potential Internal Event Handlers ---
    /*
    _handleWinAnimationTrigger(eventData) {
        this.logger?.debug('AnimationController', 'Received win:validatedForAnimation trigger', eventData);
        // Example: Trigger multiple animation types based on event data
        if (eventData.winningSymbols && eventData.winningSymbols.length > 0) {
            this.playAnimation('symbolWin', { symbols: eventData.winningSymbols });
        }
        if (eventData.paylines && eventData.paylines.length > 0) {
             this.playAnimation('paylineFlash', { lines: eventData.paylines });
        }
        if (eventData.totalWin > 0) {
            this.playAnimation('winRollup', { amount: eventData.totalWin });
        }
        // Add logic for big win, etc.
    }
    */
}
