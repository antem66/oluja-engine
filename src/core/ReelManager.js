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

export class ReelManager {
    /** @type {Reel[]} */
    reels = [];
    /** @type {PIXI.Container | null} */
    reelContainer = null;
    /** @type {PIXI.Container | null} */
    parentLayer = null;
    /** @type {PIXI.Ticker | null} */
    appTicker = null;

    /**
     * @param {PIXI.Container} parentLayer - The PIXI Container to add the reels container to.
     * @param {PIXI.Ticker} appTicker - The PIXI Ticker for updating reels.
     */
    constructor(parentLayer, appTicker) {
        // TODO (Phase 2): Inject dependencies (Logger?)
        if (!parentLayer) {
            // TODO: Use Logger
            console.error("ReelManager: Parent layer is required!");
            return;
        }
        if (!appTicker) {
            // TODO: Use Logger
            console.error("ReelManager: App ticker is required!");
            return;
        }
        this.parentLayer = parentLayer;
        this.appTicker = appTicker;
        this._setupContainer();
        this._createReels();
        this._applyMask();
    }

    _setupContainer() {
        this.reelContainer = new PIXI.Container();
        this.reelContainer.x = SETTINGS.reelAreaX;
        this.reelContainer.y = SETTINGS.reelAreaY;

        // Optional: Add slight shadow or background behind reels if needed
        // const reelBackground = new PIXI.Graphics()...;
        // this.reelContainer.addChild(reelBackground);

        // Add the container to the parent layer
        this.parentLayer.addChild(this.reelContainer);
    }

    _createReels() {
        // Explicitly check for null container and ticker before proceeding
        if (!this.reelContainer || !this.appTicker) {
             // TODO: Use Logger
             console.error("ReelManager._createReels: Cannot create reels, container or ticker missing.");
             return;
        }

        const container = this.reelContainer;
        const ticker = this.appTicker;

        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
            if (!REEL_STRIPS[i]) {
                // TODO: Use Logger
                console.error(`ReelManager: Reel strip configuration missing for reel ${i}.`);
                continue; // Skip creating this reel
            }
            // Pass the already-validated ticker
            const reel = new Reel(i, REEL_STRIPS[i], ticker); 
            this.reels.push(reel);
            container.addChild(reel.container);
        }
    }

    _applyMask() {
        if (!this.reelContainer) return;

        // Create a mask graphic positioned correctly in world space
        const mask = new PIXI.Graphics()
            .rect(0, 0, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
            .fill(0xffffff);
        // Position the mask graphic itself at the reel area's top-left corner
        mask.x = SETTINGS.reelAreaX;
        mask.y = SETTINGS.reelAreaY;
        
        // Assign the graphic as the mask for the reel container
        this.reelContainer.mask = mask;

        // The mask graphic must be added to the stage/parent for the mask to work.
        // Add it to the same parent as the reel container itself.
        if (this.parentLayer) {
             this.parentLayer.addChild(mask);
        } else {
            // TODO: Use Logger
            console.warn("ReelManager: Could not add mask graphic as parentLayer is missing.");
        }
    }

    // Method to update all reels - called by Game's update loop
    /**
     * Updates all managed Reel instances.
     * @param {number} delta - Time delta from the ticker.
     * @param {number} now - Current time from the ticker.
     * @returns {boolean} - True if any reel is still visually moving/tweening.
     */
    update(delta, now) {
        let anyReelMoving = false;
        if (!this.appTicker) return false;

        this.reels.forEach((reel) => {
            const isActive = reel.update(delta, now);
            if (isActive) {
                anyReelMoving = true;
            }
        });
        return anyReelMoving;
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
}
