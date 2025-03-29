import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { REEL_WIDTH, reelAreaX, reelAreaY, SYMBOL_SIZE } from '../config/gameSettings.js';
import { PAYLINES } from '../config/paylines.js'; // Import PAYLINES

// Import types
import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

// --- Module-level variables ---
/** @type {PIXI.Graphics | null} */
let winLineGraphics = null;
/** @type {EventBus | null} */
let eventBus = null;
/** @type {Logger | null} */
let logger = null;
/** @type {Function | null} */
let _unsubscribeWinEvent = null;

/**
 * Initializes the module, stores dependencies, and subscribes to win events.
 * @param {object} dependencies
 * @param {EventBus} dependencies.eventBus
 * @param {Logger} dependencies.logger
 * @param {PIXI.Graphics} dependencies.graphics - The Pixi Graphics object for drawing lines.
 */
export function initPaylineGraphics(dependencies) {
    if (!dependencies || !dependencies.eventBus || !dependencies.logger || !dependencies.graphics) {
        console.error("PaylineGraphics Init Error: Missing dependencies (eventBus, logger, graphics).");
        return;
    }
    eventBus = dependencies.eventBus;
    logger = dependencies.logger;
    winLineGraphics = dependencies.graphics;

    // Set initial position based on config 
    winLineGraphics.x = reelAreaX;
    winLineGraphics.y = reelAreaY;

    // Subscribe to win event
    _unsubscribeWinEvent = eventBus.on('win:validatedForAnimation', drawWinLines);
    
    logger.info('PaylineGraphics', 'Initialized and subscribed to win:validatedForAnimation.');
}

/**
 * Cleans up event listeners.
 */
export function destroy() {
    if (_unsubscribeWinEvent) {
        _unsubscribeWinEvent();
        _unsubscribeWinEvent = null;
        logger?.info('PaylineGraphics', 'Unsubscribed from win:validatedForAnimation.');
    }
    // Stop any ongoing animations and clear graphics upon destruction
    clearWinLines(); 
    winLineGraphics = null;
    eventBus = null;
    logger = null;
}

/**
 * Draws the winning paylines based on the data received from the win event.
 * Includes fade-in and fade-out animations using GSAP.
 * @param {object} eventData - Payload from the 'win:validatedForAnimation' event.
 */
function drawWinLines(eventData) { // No longer exported, becomes event handler
    if (!winLineGraphics || !logger) {
        (logger || console).error("PaylineGraphics Error: Module not initialized (graphics or logger missing).");
        return;
    }
    
    const currentGraphics = winLineGraphics;
    const currentLogger = logger;
    
    const winningLines = eventData?.winningLines;
    if (!winningLines || winningLines.length === 0) {
        currentLogger.debug('PaylineGraphics', 'Received win event with no winning lines.');
        clearWinLines(); 
        return;
    }

    currentLogger.debug('PaylineGraphics', `Drawing ${winningLines.length} win lines.`);

    // Stop any previous animations and clear
    gsap.killTweensOf(currentGraphics); // Kill GSAP tweens
    currentGraphics.clear();
    currentGraphics.alpha = 0; // Start transparent

    const lineColors = [ 
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500,
        0x800080, 0x008000, 0x800000, 0xadd8e6, 0x90ee90, 0xffb6c1, 0xfaebd7, 0xdda0dd
    ];

    winningLines.forEach((winInfo) => {
        const linePath = PAYLINES[winInfo.lineIndex];
        if (!linePath) {
             currentLogger.warn('PaylineGraphics', `Invalid lineIndex ${winInfo.lineIndex} in win data.`);
             return;
        }

        const lineColor = lineColors[winInfo.lineIndex % lineColors.length];
        currentGraphics.lineStyle(5, lineColor, 0.7); 

        let firstValidPoint = true;
        for (let reelIndex = 0; reelIndex < winInfo.count; reelIndex++) {
            const rowIndex = linePath[reelIndex];
            if (rowIndex === undefined || rowIndex < 0) continue; // Skip if row index invalid
            
            // Calculate symbol center position based on config/layout
            const symbolCenterX = reelIndex * REEL_WIDTH + REEL_WIDTH / 2;
            const symbolCenterY = rowIndex * SYMBOL_SIZE + SYMBOL_SIZE / 2; // Use SYMBOL_SIZE
            // TODO: Verify this calculation aligns symbols correctly.

            if (firstValidPoint) {
                currentGraphics.moveTo(symbolCenterX, symbolCenterY);
                firstValidPoint = false;
            } else {
                currentGraphics.lineTo(symbolCenterX, symbolCenterY);
            }
            // Draw circles at symbol centers
            currentGraphics.drawCircle(symbolCenterX, symbolCenterY, 8).fill({ color: lineColor, alpha: 0.8 });
        }
        if (!firstValidPoint) {
            currentGraphics.stroke(); // Draw the line segments
        }
    });

    // --- GSAP Fade Animation --- 
    const fadeInDuration = 0.15 * winAnimDelayMultiplier;
    const displayDuration = 2.8 * winAnimDelayMultiplier; // Slightly shorter than old timeout
    const fadeOutDuration = 0.2 * winAnimDelayMultiplier;

    // Create a GSAP timeline for fade in, hold, fade out
    const tl = gsap.timeline();
    tl.to(currentGraphics, { alpha: 0.8, duration: fadeInDuration, ease: "power1.in" })
      .to(currentGraphics, { alpha: 0, duration: fadeOutDuration, ease: "power1.out" }, `+=${displayDuration}`)
      .call(() => { // Add a callback to clear graphics after fade out
          currentGraphics?.clear(); // Use local const with optional chain
          currentLogger?.debug('PaylineGraphics', 'Win lines cleared after animation.'); // Use local const
      });
}

/**
 * Clears any active win lines and stops animations.
 * Still exported as it might be called externally (e.g., before a spin).
 */
export function clearWinLines() {
    // Use optional chaining as logger might be null if called after destroy
    logger?.debug('PaylineGraphics', 'Clearing win lines.'); 
    gsap.killTweensOf(winLineGraphics); // Stop GSAP animations
    if (winLineGraphics) {
        winLineGraphics.clear();
        winLineGraphics.alpha = 0;
    }
    // No need to manage interval/timeout IDs anymore
}
