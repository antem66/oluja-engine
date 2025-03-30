/**
 * @module ReelManager
 * @description Manages the creation, layout, masking, and updating of all Reel instances.
 * It creates the main container for the reels and applies a mask to show only the
 * visible area.
 *
 * Public API:
 * - constructor(parentLayer, appTicker): Initializes and creates reels.
 * - update(delta, now): Updates all managed Reel instances, called by the game loop.
 * - reels: Provides direct access to the array of Reel instances (consider making private later).
 *
 * Dependencies:
 * - PIXI.Container (parentLayer)
 * - PIXI.Ticker (appTicker)
 * - Reel class
 * - Game Settings (for layout, dimensions)
 * - Reel Strips config
 *
 * Events Emitted: (None currently)
 *
 * Events Consumed: (None currently)
 */

import * as PIXI from 'pixi.js';
import { Reel } from './Reel.js';
import * as SETTINGS from '../config/gameSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js';
import { Logger } from '../utils/Logger.js';

export class ReelManager {
    /** @type {Reel[]} */
    reels = [];
    /** @type {PIXI.Container | null} */
    reelContainer = null;
    /** @type {PIXI.Container | null} */
    parentLayer = null;
    /** @type {PIXI.Ticker | null} */
    appTicker = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;

    /**
     * @param {PIXI.Container} parentLayer - The PIXI Container to add the reels container to.
     * @param {PIXI.Ticker} appTicker - The PIXI Ticker for updating reels.
     * @param {import('../utils/Logger.js').Logger} loggerInstance
     */
    constructor(parentLayer, appTicker, loggerInstance) {
        this.logger = loggerInstance;
        
        if (!parentLayer) {
            this.logger?.error('ReelManager', 'Parent layer is required!');
            return;
        }
        if (!appTicker) {
            this.logger?.error('ReelManager', 'App ticker is required!');
            return;
        }
        if (!this.logger) {
            console.error("ReelManager: Logger instance is required!");
            // Allow continuation for now, but ideally throw or prevent
        }

        this.parentLayer = parentLayer;
        this.appTicker = appTicker;
        this._setupContainer();
        this._createReels();
        this._applyMask();
        this.logger?.info('ReelManager', 'Initialized.');
    }

    _setupContainer() {
        this.reelContainer = new PIXI.Container();
        this.reelContainer.x = SETTINGS.reelAreaX;
        this.reelContainer.y = SETTINGS.reelAreaY;

        // Optional: Add slight shadow or background behind reels if needed
        // const reelBackground = new PIXI.Graphics()...;
        // this.reelContainer.addChild(reelBackground);

        // Add the container to the parent layer
        if (this.parentLayer) {
            this.parentLayer.addChild(this.reelContainer);
        } else {
             this.logger?.error('ReelManager', '_setupContainer called but parentLayer is null.');
        }
        this.logger?.debug('ReelManager', 'Reel container setup complete.');
    }

    _createReels() {
        if (!this.reelContainer || !this.appTicker) {
             this.logger?.error('ReelManager', '_createReels: Cannot create reels, container or ticker missing.');
             return;
        }

        const container = this.reelContainer;
        const ticker = this.appTicker;

        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
            if (!REEL_STRIPS[i]) {
                this.logger?.error('ReelManager', `Reel strip configuration missing for reel ${i}.`);
                continue; // Skip creating this reel
            }
            // TODO: Pass logger to Reel constructor when it's updated
            const reel = new Reel(i, REEL_STRIPS[i], ticker); 
            this.reels.push(reel);
            container.addChild(reel.container);
        }
        this.logger?.debug('ReelManager', `Created ${this.reels.length} reels.`);
    }

    _applyMask() {
        if (!this.reelContainer) {
            this.logger?.warn('ReelManager', '_applyMask called but reelContainer is null.');
            return;
        }
        const parentLayer = this.parentLayer;
        if (!parentLayer) {
            this.logger?.error('ReelManager', 'Cannot apply mask as parentLayer is missing.');
            return;
        }
        
        // Create a mask graphic positioned correctly in world space
        const mask = new PIXI.Graphics()
            .rect(0, 0, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
            .fill(0xffffff);
        
        if (!mask) {
            this.logger?.error('ReelManager', 'Failed to create mask graphics.');
            return;
        }

        // Position the mask graphic itself at the reel area's top-left corner
        mask.x = SETTINGS.reelAreaX;
        mask.y = SETTINGS.reelAreaY;
        
        // Add the mask to the parent layer FIRST
        parentLayer.addChild(mask);

        // THEN assign it as the mask for the reel container
        this.reelContainer.mask = mask;

        this.logger?.debug('ReelManager', 'Reel mask applied.');
    }

    /**
     * Update all reels and return true if any reel is still considered active.
     * A reel is considered active if its state is not 'stopped' or 'idle'.
     * @param {number} delta - Time difference since the last frame.
     * @param {number} now - Current time (ticker.lastTime).
     * @returns {boolean} True if any reel is active, false otherwise.
     */
    update(delta, now) {
        let anyMoving = false;
        let reelStates = []; // Array to store states for logging
        for (const reel of this.reels) {
            // Update the reel first (this handles its internal state changes)
            reel.update(delta, now);
            
            // Now, check the reel's state directly
            const isStopped = reel.state === 'stopped' || reel.state === 'idle';
            reelStates.push(`R${reel.reelIndex}:${reel.state}`); // Log state
            if (!isStopped) {
                anyMoving = true;
                //this.logger?.warn('ReelManager.update', `Reel ${reel.reelIndex} still active! State: ${reel.state}`);
            }
        }
        // Use info level for visibility - RE-COMMENT
        // this.logger?.info('ReelManager.update', `States: [${reelStates.join(', ')}] -> anyMoving: ${anyMoving}`); 
        return anyMoving;
    }

    /**
     * Sets the final stopping position for a specific reel.
     * Used by SpinManager/ResultHandler after receiving server response.
     * @param {number} reelIndex 
     * @param {number} stopPosition 
     */
    setReelStopPosition(reelIndex, stopPosition) {
        const reel = this.reels[reelIndex];
        if (reel) {
            // TODO (Phase 2): Add logging with Logger
            reel.finalStopPosition = stopPosition;
        } else {
            // TODO: Use Logger
            console.error(`ReelManager: Attempted to set stop position for invalid reel index ${reelIndex}`);
        }
    }

    // TODO (Phase 2): Add method destroy() for cleanup (remove container, destroy reels, etc.)
    /**
     * Cleans up resources used by the ReelManager.
     */
    destroy() {
        this.logger?.info('ReelManager', 'Destroying...');
        
        // 1. Destroy individual Reels
        this.reels.forEach(reel => {
            if (reel && typeof reel.destroy === 'function') {
                reel.destroy();
            }
        });
        this.reels = []; // Clear array
        
        // 2. Destroy the main reel container
        // This also removes the mask implicitly if it was set
        if (this.reelContainer) {
            this.reelContainer.destroy({ children: true });
            // No need to set to null if linter complains
        }
        
        // 3. Nullify references
        this.parentLayer = null;
        this.appTicker = null;
        this.logger = null;
        // Explicitly set reelContainer to null if allowed by types/linter
        this.reelContainer = null; 
    }
}
