/**
 * @module ResultHandler
 * @description Listens for spin results from the ApiService and instructs the ReelManager
 *              on where the reels should stop based on the authoritative server response.
 *              It acts as the bridge between the server result and the visual reel stopping mechanism.
 * 
 * Dependencies (Injected):
 * - eventBus: To listen for server:spinResultReceived.
 * - logger: For logging.
 * - reelManager: To set the final stop positions on the reels.
 * 
 * Events Emitted: (Potentially)
 * - reels:stopsSet { stopPositions: number[] }
 *
 * Events Consumed:
 * - server:spinResultReceived { data: SpinResult }
 */

// Import types for JSDoc
import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';
import { ReelManager } from './ReelManager.js';

export class ResultHandler {
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('./ReelManager.js').ReelManager | null} */
    reelManager = null;
    
    /** @type {Function | null} */
    _unsubscribeSpinResult = null; // To store the unsubscribe function

    /**
     * @param {object} dependencies
     * @param {import('../utils/EventBus.js').EventBus} dependencies.eventBus
     * @param {import('../utils/Logger.js').Logger} dependencies.logger
     * @param {import('./ReelManager.js').ReelManager} dependencies.reelManager
     */
    constructor(dependencies) {
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.reelManager = dependencies.reelManager;

        if (!this.eventBus || !this.logger || !this.reelManager) {
            const errorMsg = 'ResultHandler: Missing dependencies (eventBus, logger, reelManager).';
            console.error(errorMsg); // Use console as logger might be missing
            // TODO: Consider throwing an error to halt initialization
        }

        this.logger?.info('ResultHandler', 'Instance created.');
    }

    /**
     * Initializes the handler by subscribing to necessary events.
     */
    init() {
        if (!this.eventBus) {
            this.logger?.error('ResultHandler', 'Cannot init - EventBus is missing.');
            return;
        }
        // Subscribe to the spin result event
        // Store the unsubscribe function for cleanup
        this._unsubscribeSpinResult = this.eventBus.on('server:spinResultReceived', this._handleSpinResultReceived.bind(this));
        this.logger?.info('ResultHandler', 'Initialized and subscribed to server:spinResultReceived.');
    }

    /**
     * Cleans up event listeners.
     */
    destroy() {
        this.logger?.info('ResultHandler', 'Destroying...'); // Add log
        if (this._unsubscribeSpinResult) {
            this._unsubscribeSpinResult();
            this._unsubscribeSpinResult = null;
            this.logger?.info('ResultHandler', 'Unsubscribed from server:spinResultReceived.');
        }
        // Nullify references
        this.eventBus = null;
        this.logger = null;
        this.reelManager = null;
    }

    /**
     * Handles the received spin result from the server (via ApiService event).
     * @param {object} eventData 
     * @param {object} eventData.data - The spin result payload (Should match SpinResult structure).
     * @private
     */
    _handleSpinResultReceived(eventData) {
        try {
            if (!eventData || !eventData.data) {
                this.logger?.error('ResultHandler', 'Received spin result event with invalid data.', eventData);
                return;
            }

            const { stopPositions } = eventData.data;

            // Use local constant for reelManager after null check
            const reelManager = this.reelManager;
            if (!reelManager) {
                this.logger?.error('ResultHandler', 'Cannot handle spin result - ReelManager is missing.');
                return;
            }
            // Use local constant in length check
            if (!Array.isArray(stopPositions) || stopPositions.length !== reelManager.reels.length) {
                 this.logger?.error('ResultHandler', 'Received invalid stopPositions data.', stopPositions);
                 return;
            }

            this.logger?.info('ResultHandler', 'Received spin result. Setting reel stop positions:', stopPositions);

            // Instruct the ReelManager to set the final positions
            stopPositions.forEach((position, index) => {
                // Access reel via local reelManager constant
                const reel = reelManager.reels[index];
                if (reel) {
                    // Set the finalStopPosition property directly
                    reel.finalStopPosition = position;
                     this.logger?.debug('ResultHandler', `Set stop position ${position} for reel ${index}`);
                } else {
                     this.logger?.warn('ResultHandler', `Reel not found at index ${index} when setting stop position.`);
                }
            });

            // Optionally emit an event indicating stops have been set
            this.eventBus?.emit('reels:stopsSet', { stopPositions });

            // TODO: Trigger next steps? (e.g., win evaluation request, start visual reel stopping sequence)
            // This might involve emitting another event like `spin:processResult` or `reels:startStoppingSequence`
            
        } catch (error) {
            this.logger?.error('ResultHandler', 'Error in _handleSpinResultReceived handler:', error);
            // Optionally re-throw or emit a specific error event
            // this.eventBus?.emit('system:error', { source: 'ResultHandler', error });
        }
    }
} 