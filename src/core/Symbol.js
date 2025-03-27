import * as PIXI from 'pixi.js';
// Removed SYMBOL_DEFINITIONS import for now, will be used later for texture mapping
import { SYMBOL_SIZE, REEL_WIDTH } from '../config/gameSettings.js';

/**
 * Creates a PixiJS Sprite representation for a given symbol ID.
 * @param {string} symbolId - The ID of the symbol (e.g., "FACE1", "SCAT").
 * @returns {SymbolSprite} An instance of the SymbolSprite class.
 */
export function createSymbolGraphic(symbolId) { // Keep function name for compatibility
  return new SymbolSprite(symbolId);
}

/**
 * Represents a single symbol sprite on the reel.
 * Extends PIXI.Sprite for better performance.
 */
export class SymbolSprite extends PIXI.Sprite { // Rename class to SymbolSprite
  symbolId; // The ID of the symbol ('FACE1', 'SCAT', etc.)
  isAnimating = false; // Flag for win animations

  constructor(symbolId) {
    // TODO: Replace placeholder with actual texture loading based on symbolId
    // Use the preloaded texture from PIXI.Assets by its alias (which is the symbolId)
    const texture = PIXI.Assets.get(symbolId);
    if (!texture) {
        console.error(`Texture not found for symbol ID: ${symbolId}. Ensure it was preloaded.`);
        // Use a fallback texture or handle error appropriately
        super(PIXI.Texture.WHITE); // Fallback to a white square
    } else {
        super(texture); // Call PIXI.Sprite constructor with the loaded texture
    }
    this.symbolId = symbolId;

    // Set anchor to center for positioning and scaling
    this.anchor.set(0.5);

    // Set size (optional, adjust as needed based on texture size)
    this.width = SYMBOL_SIZE * 0.9;
    this.height = SYMBOL_SIZE * 0.9;

    // Position in the center of the reel width (x is relative to parent container)
    this.x = REEL_WIDTH / 2;

    // Y position will be set by alignReelSymbols in Reel.js
  }
}
