import * as PIXI from 'pixi.js';
import { Reel } from './Reel.js';
import * as SETTINGS from '../config/gameSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js';

export class ReelManager {
    reels = [];
    reelContainer = null;
    parentLayer = null;
    appTicker = null;

    constructor(parentLayer, appTicker) {
        if (!parentLayer) {
            console.error("ReelManager: Parent layer is required!");
            return;
        }
        if (!appTicker) {
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

        // Add slight shadow to reels container for depth
        const reelShadow = new PIXI.Graphics()
            .rect(0, 0, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
            .fill({ color: 0x000000, alpha: 0.2 });
        this.reelContainer.addChild(reelShadow);

        // Add the container to the parent layer
        this.parentLayer.addChild(this.reelContainer);
    }

    _createReels() {
        if (!this.reelContainer) return;

        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
            const reel = new Reel(i, REEL_STRIPS[i], this.appTicker);
            this.reels.push(reel);
            this.reelContainer.addChild(reel.container);
        }
    }

    _applyMask() {
        if (!this.reelContainer) return;

        const reelMask = new PIXI.Graphics()
            .rect(SETTINGS.reelAreaX, SETTINGS.reelAreaY, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
            .fill(0xffffff);
        this.reelContainer.mask = reelMask;

        // Mask graphic itself needs to be added to a common ancestor (the stage)
        // We assume the stage is accessible via the parent layer's parent hierarchy,
        // but it's safer if Game adds this mask graphic directly.
        // For now, let's try adding it relative to the parent layer.
        // This might need adjustment if the parentLayer isn't directly on the stage.
        if (this.parentLayer.parent) {
             this.parentLayer.parent.addChild(reelMask);
        } else {
            console.warn("ReelManager: Could not add mask graphic to stage.");
            // As a fallback, add it to the parent layer itself, though this might not be correct visually.
            this.parentLayer.addChild(reelMask);
        }
    }

    // Method to update all reels - called by Game's update loop
    update(delta, now) {
        let anyReelMoving = false;
        this.reels.forEach((reel) => {
            const isActive = reel.update(delta, now);
            if (isActive) {
                anyReelMoving = true;
            }
        });
        return anyReelMoving;
    }

    // Add methods to control reels if needed by SpinManager later
    // e.g., startAllSpins(isTurbo), scheduleStop(reelIndex, stopTime), etc.
}
