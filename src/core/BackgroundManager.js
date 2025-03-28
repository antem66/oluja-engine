import * as PIXI from 'pixi.js';
import * as SETTINGS from '../config/gameSettings.js';

export class BackgroundManager {
    backgroundSprite = null;
    parentLayer = null;

    constructor(parentLayer) {
        if (!parentLayer) {
            console.error("BackgroundManager: Parent layer is required!");
            return;
        }
        this.parentLayer = parentLayer;
        this._createSprite();
    }

    _createSprite() {
        // --- Create Background Sprite ---
        const bgSprite = new PIXI.Sprite(PIXI.Assets.get('BG_IMAGE'));

        // Position the background
        bgSprite.x = SETTINGS.GAME_WIDTH / 2 + SETTINGS.BG_OFFSET_X;
        bgSprite.y = SETTINGS.GAME_HEIGHT / 2 + SETTINGS.BG_OFFSET_Y;

        // Scale based on the configured mode
        let scale = 1;
        if (SETTINGS.BG_SCALE_MODE === 'cover') {
            // Cover mode: ensure image covers the entire game area
            const scaleX = SETTINGS.GAME_WIDTH / bgSprite.width;
            const scaleY = SETTINGS.GAME_HEIGHT / bgSprite.height;
            scale = Math.max(scaleX, scaleY) * SETTINGS.BG_SCALE_FACTOR;
        } else if (SETTINGS.BG_SCALE_MODE === 'contain') {
            // Contain mode: ensure entire image fits in the game area
            const scaleX = SETTINGS.GAME_WIDTH / bgSprite.width;
            const scaleY = SETTINGS.GAME_HEIGHT / bgSprite.height;
            scale = Math.min(scaleX, scaleY) * SETTINGS.BG_SCALE_FACTOR;
        } else {
            // Exact mode: use the scale factor directly
            scale = SETTINGS.BG_SCALE_FACTOR;
        }

        // Center anchor and apply scale
        bgSprite.anchor.set(0.5);
        bgSprite.scale.set(scale);

        // Ensure background doesn't interfere with game play
        bgSprite.eventMode = 'none';

        // Store reference
        this.backgroundSprite = bgSprite;

        // Add to parent layer
        this.parentLayer.addChild(this.backgroundSprite);
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
}
