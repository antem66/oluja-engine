import * as PIXI from 'pixi.js';
import * as SETTINGS from '../config/gameSettings.js';
// Import logger type for JSDoc
import { Logger } from '../utils/Logger.js';
import gsap from 'gsap';

export class BackgroundManager {
    /** @type {PIXI.Sprite | null} */
    backgroundSprite = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;

    /** @type {PIXI.Application | null} */ // Store app reference
    app = null;

    /**
     * @param {PIXI.Application} appInstance
     * @param {import('../utils/Logger.js').Logger} loggerInstance
     */
    constructor(appInstance, loggerInstance) {
        this.logger = loggerInstance;
        if (!appInstance) {
            this.logger?.error('BackgroundManager', 'PIXI App instance is required!');
            return;
        }
        this.app = appInstance;
        this._createSprite();
        this.logger?.info('BackgroundManager', 'Initialized.');
    }

    _createSprite() {
        try {
            // Use the alias defined in the manifest
            const alias = 'background_default'; // Make sure this matches your asset manifest
            this.logger?.debug(`BackgroundManager: Attempting to get texture with alias: ${alias}`);
            const texture = PIXI.Assets.get(alias);
            if (!texture) {
                throw new Error(`Background texture ('${alias}') not found in assets cache.`);
            }
            this.backgroundSprite = new PIXI.Sprite(texture);
            this.backgroundSprite.anchor.set(0.5);
            this.backgroundSprite.zIndex = -1; // Ensure it's behind everything
            
            // Add directly to the main stage
            if (this.app?.stage) {
                // Ensure stage sorting is enabled (might be redundant if set elsewhere)
                this.app.stage.sortableChildren = true;
                this.app.stage.addChild(this.backgroundSprite);
                this._applyScreenScaling(); // Apply initial screen-relative scale/position
                this.logger?.debug('BackgroundManager', 'Background sprite created and added to stage.');
            } else {
                this.logger?.error('BackgroundManager', '_createSprite called but app or app.stage is unexpectedly null.');
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
        
        // Remove resize listener
        if (this._boundResizeHandler) {
            window.removeEventListener('resize', this._boundResizeHandler);
            this._boundResizeHandler = null;
            this.logger?.debug('BackgroundManager', 'Removed resize listener.');
        }
        
        // Destroy background sprite
        if (this.backgroundSprite) {
            this.backgroundSprite.destroy(); // No children expected
            // this.backgroundSprite = null; // Optional based on linter
        }
        
        // Nullify references
        this.app = null;
        this.logger = null;
        this.backgroundSprite = null; // Linter might complain here too
    }

    /**
     * Sets up the resize listener.
     * @private
     */
    _setupResizeHandler() {
        this._boundResizeHandler = this._applyScreenScaling.bind(this);
        // @ts-ignore - Suppress persistent linter error about listener type mismatch
        window.addEventListener('resize', this._boundResizeHandler);
        this.logger?.debug('BackgroundManager', 'Resize handler attached.');
    }

    /**
     * Calculates and applies scale/position to cover the screen.
     * @private
     */
    _applyScreenScaling() {
        if (!this.backgroundSprite || !this.backgroundSprite.texture || !this.backgroundSprite.texture.width || !this.backgroundSprite.texture.height) {
            this.logger?.warn('BackgroundManager', 'Cannot apply screen scaling: Sprite or texture invalid.');
            return;
        }

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const textureWidth = this.backgroundSprite.texture.width;
        const textureHeight = this.backgroundSprite.texture.height;

        // Calculate 'cover' scale based on screen dimensions
        const scale = Math.max(screenWidth / textureWidth, screenHeight / textureHeight);

        // Apply scale (consider BG_SCALE_FACTOR from settings for slight zoom)
        const finalScale = scale * (SETTINGS.BG_SCALE_FACTOR || 1);
        this.backgroundSprite.scale.set(finalScale);

        // Position sprite center at screen center
        // Offsets from settings can be applied here if needed relative to screen center
        this.backgroundSprite.x = screenWidth / 2 + (SETTINGS.BG_OFFSET_X || 0);
        this.backgroundSprite.y = screenHeight / 2 + (SETTINGS.BG_OFFSET_Y || 0);

        this.logger?.debug('BackgroundManager', `Applied screen scaling. Screen: ${screenWidth}x${screenHeight}, Scale: ${finalScale.toFixed(3)}, Pos: (${this.backgroundSprite.x.toFixed(1)}, ${this.backgroundSprite.y.toFixed(1)})`);
    }
}
