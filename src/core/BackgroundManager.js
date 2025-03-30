import * as PIXI from 'pixi.js';
import * as SETTINGS from '../config/gameSettings.js';
// Import logger type for JSDoc
import { Logger } from '../utils/Logger.js';
import gsap from 'gsap';

export class BackgroundManager {
    /** @type {PIXI.Sprite | null} */
    backgroundSprite = null;
    /** @type {PIXI.Container | null} */
    parentLayer = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;

    /**
     * @param {PIXI.Container} parentLayer 
     * @param {import('../utils/Logger.js').Logger} loggerInstance 
     */
    constructor(parentLayer, loggerInstance) {
        this.logger = loggerInstance;
        if (!parentLayer) {
            this.logger?.error('BackgroundManager', 'Parent layer is required!');
            return;
        }
        this.parentLayer = parentLayer;
        this._createSprite();
        this.logger?.info('BackgroundManager', 'Initialized.');
    }

    _createSprite() {
        try {
            // Assume BG_IMAGE is loaded via PIXI.Assets in Game.js
            const texture = PIXI.Assets.get('BG_IMAGE');
            if (!texture) {
                throw new Error('Background texture (BG_IMAGE) not found in assets.');
            }
            this.backgroundSprite = new PIXI.Sprite(texture);
            this.backgroundSprite.anchor.set(0.5);
            this.backgroundSprite.x = SETTINGS.GAME_WIDTH / 2;
            this.backgroundSprite.y = SETTINGS.GAME_HEIGHT / 2;
            
            // Scale to fit
            const scale = Math.max(SETTINGS.GAME_WIDTH / this.backgroundSprite.width, SETTINGS.GAME_HEIGHT / this.backgroundSprite.height);
            this.backgroundSprite.scale.set(scale);

            // Explicit null check for parentLayer to satisfy linter
            if (this.parentLayer) {
                this.parentLayer.addChild(this.backgroundSprite);
                this.logger?.debug('BackgroundManager', 'Background sprite created and added.');
            } else {
                 this.logger?.error('BackgroundManager', '_createSprite called but parentLayer is unexpectedly null.');
            }
        } catch (error) {
            this.logger?.error('BackgroundManager', 'Error creating background sprite:', error);
        }
    }

    /**
     * Allows dynamic adjustment of the background position and scale
     * Called by DebugPanel
     * @param {number} offsetX - X-axis offset adjustment
     * @param {number} offsetY - Y-axis offset adjustment
     * @param {number} scale - Scale adjustment factor
     */
    adjustBackground(offsetX, offsetY, scale) {
        if (!this.backgroundSprite) {
            console.warn("adjustBackground called before backgroundSprite was initialized.");
            return;
        }

        // Suppress TS errors in JS file for property access after null check
        // @ts-ignore
        this.backgroundSprite.x = SETTINGS.GAME_WIDTH / 2 + offsetX;
        // @ts-ignore
        this.backgroundSprite.y = SETTINGS.GAME_HEIGHT / 2 + offsetY;

        // Update scale with current factor
        // @ts-ignore
        const textureWidth = this.backgroundSprite.texture.width;
        // @ts-ignore
        const textureHeight = this.backgroundSprite.texture.height;

        const baseScale = SETTINGS.BG_SCALE_MODE === 'cover'
            ? Math.max(SETTINGS.GAME_WIDTH / textureWidth, SETTINGS.GAME_HEIGHT / textureHeight)
            : SETTINGS.BG_SCALE_MODE === 'contain'
                ? Math.min(SETTINGS.GAME_WIDTH / textureWidth, SETTINGS.GAME_HEIGHT / textureHeight)
                : 1;

        // @ts-ignore
        this.backgroundSprite.scale.set(baseScale * scale);

        console.log(`Background adjusted: offset(${offsetX}, ${offsetY}), scale: ${scale.toFixed(2)}`);
    }

    /**
     * Placeholder method to change the background tint/image.
     * Called by FreeSpins feature.
     * TODO: Implement actual background change logic (e.g., tinting, swapping texture).
     * @param {number} targetColor - The target background color tint (e.g., 0xff0000).
     * @param {number} duration - Duration of the transition in seconds.
     * @returns {gsap.core.Tween | null} The GSAP tween instance or null if animation doesn't start.
     */
    changeBackground(targetColor, duration) {
        let tween = null; // Variable to store the tween
        if (this.backgroundSprite && typeof gsap !== 'undefined') {
            this.logger?.info('BackgroundManager', `Initiating background tint to 0x${targetColor.toString(16)} over ${duration}s.`);
            tween = gsap.to(this.backgroundSprite, { 
                pixi: { tint: targetColor }, 
                duration: duration, 
                ease: "power1.inOut"
            });
        } else {
            if (!this.backgroundSprite) {
                this.logger?.warn('BackgroundManager', 'changeBackground called but backgroundSprite is null.');
            }
            if (typeof gsap === 'undefined') {
                 this.logger?.error('BackgroundManager', 'GSAP is not defined. Cannot animate background tint.');
            }
        }
        return tween;
    }

    /**
     * Cleans up resources used by the BackgroundManager.
     */
    destroy() {
        this.logger?.info('BackgroundManager', 'Destroying...');
        
        // Destroy background sprite
        if (this.backgroundSprite) {
            this.backgroundSprite.destroy(); // No children expected
            // this.backgroundSprite = null; // Optional based on linter
        }
        
        // Nullify references
        this.parentLayer = null;
        this.logger = null;
        this.backgroundSprite = null; // Linter might complain here too
    }
}
