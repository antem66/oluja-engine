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
  customFilters = []; // Track custom filters separately from base filters

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
  
  /**
   * Adds a visual effect filter to the symbol
   * @param {PIXI.Filter} filter - The PIXI filter to add
   * @param {string} [name] - Optional name to reference this filter later
   * @returns {PIXI.Filter} The added filter
   */
  addFilter(filter, name) {
    // Initialize filters array if not exists
    if (!this.filters) {
      this.filters = [];
    }
    
    // Add name property to filter for reference
    if (name) {
      filter.name = name;
    }
    
    // Add to both arrays
    this.filters.push(filter);
    this.customFilters.push(filter);
    
    return filter;
  }
  
  /**
   * Removes a filter by reference or name
   * @param {PIXI.Filter|string} filterOrName - Filter object or name to remove
   * @returns {boolean} True if filter was found and removed
   */
  removeFilter(filterOrName) {
    if (!this.filters || !this.customFilters.length) return false;
    
    let filterIndex = -1;
    
    if (typeof filterOrName === 'string') {
      // Find by name
      filterIndex = this.filters.findIndex(f => f.name === filterOrName);
    } else {
      // Find by reference
      filterIndex = this.filters.indexOf(filterOrName);
    }
    
    if (filterIndex >= 0) {
      const removedFilter = this.filters.splice(filterIndex, 1)[0];
      
      // Also remove from our tracking array
      const customIndex = this.customFilters.indexOf(removedFilter);
      if (customIndex >= 0) {
        this.customFilters.splice(customIndex, 1);
      }
      
      // If no more filters, set to null
      if (this.filters.length === 0) {
        this.filters = null;
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Removes all custom filters that were added
   */
  clearCustomFilters() {
    if (!this.filters) return;
    
    // Remove all custom filters from main filters array
    this.customFilters.forEach(filter => {
      const index = this.filters.indexOf(filter);
      if (index >= 0) {
        this.filters.splice(index, 1);
      }
    });
    
    // Clear the custom filters array
    this.customFilters = [];
    
    // If no more filters, set to null
    if (this.filters.length === 0) {
      this.filters = null;
    }
  }
  
  /**
   * Gets a filter by name
   * @param {string} name - The name of the filter to find
   * @returns {PIXI.Filter|null} The filter or null if not found
   */
  getFilter(name) {
    if (!this.filters) return null;
    return this.filters.find(f => f.name === name) || null;
  }
}
