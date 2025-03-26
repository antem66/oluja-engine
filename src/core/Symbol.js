import * as PIXI from 'pixi.js';
import { SYMBOL_DEFINITIONS } from '../config/symbolDefinitions.js';
import { SYMBOL_SIZE, REEL_WIDTH } from '../config/gameSettings.js';

/**
 * Creates a PixiJS graphic representation for a given symbol ID.
 * @param {string} symbolId - The ID of the symbol (e.g., "FACE1", "SCAT").
 * @returns {Symbol} An instance of the Symbol class.
 */
export function createSymbolGraphic(symbolId) {
  return new Symbol(symbolId);
}

/**
 * Represents a single symbol graphic on the reel.
 * Extends PIXI.Container to hold graphics and custom properties.
 */
export class Symbol extends PIXI.Container { // Added export
  symbolId; // The ID of the symbol ('FACE1', 'SCAT', etc.)
  isAnimating = false; // Flag for win animations

  constructor(symbolId) {
    super(); // Call PIXI.Container constructor
    this.symbolId = symbolId;
  const definition = SYMBOL_DEFINITIONS.find(
    (s) => s.id === symbolId
  );

  // Fallback for missing definition
  if (!definition) {
    console.warn("Symbol definition not found:", symbolId);
    const fb = new PIXI.Graphics()
      .rect(0, 0, SYMBOL_SIZE * 0.9, SYMBOL_SIZE * 0.9)
      .fill(0xff0000);
    const txt = new PIXI.Text({ text: "ERR", style: { fill: 0xffffff } });
    txt.anchor.set(0.5);
    txt.x = SYMBOL_SIZE * 0.45;
    txt.y = SYMBOL_SIZE * 0.45;
    fb.addChild(txt);
    // Add the error graphic to this Symbol instance instead of returning
    this.addChild(fb);
    // No explicit return needed from constructor, but we stop further graphic creation
    return;
  }

  // Use 'this' instead of 'container' as we are inside the class constructor
  // this.symbolId = symbolId; // Already set above

  const graphicWidth = SYMBOL_SIZE * 0.9;
  const graphicHeight = SYMBOL_SIZE * 0.9;
  const fillColor = definition.color;

  // Background
  const background = new PIXI.Graphics()
    .roundRect(0, 0, graphicWidth, graphicHeight, 15)
    .fill({ color: fillColor, alpha: 0.85 });

  // Border
  const border = new PIXI.Graphics()
    .roundRect(0, 0, graphicWidth, graphicHeight, 15)
    .stroke({ width: 3, color: 0xffffff, alpha: 0.4, alignment: 0.5 });

  // Text
  const symbolText = new PIXI.Text({
    text: definition.text,
    style: {
      fontFamily: '"Arial Black", Gadget, sans-serif',
      fontSize: SYMBOL_SIZE * 0.6,
      fill: 0xffffff,
      align: "center",
      stroke: { color: 0x000000, width: 5, join: "round" },
      dropShadow: {
        color: "#000000",
        angle: Math.PI / 4,
        distance: 3,
        blur: 3,
        alpha: 0.7,
      },
    },
  });
  symbolText.anchor.set(0.5);
  symbolText.x = graphicWidth / 2;
  symbolText.y = graphicHeight / 2;

  this.addChild(background, border, symbolText);

  // Set pivot to center for easier rotation/scaling if needed later
  this.pivot.set(graphicWidth / 2, graphicHeight / 2);
  // Position in the center of the reel width
  this.x = REEL_WIDTH / 2;

  // No return needed from constructor
 }
}
