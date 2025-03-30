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
/** @type {Function | null} */ // Store unsubscribe for clear event
let _unsubscribeClearEvent = null;
let animationController = null;
let reelManager = null;
let uiManager = null;

/**
 * Initializes the module, stores dependencies, and subscribes to events.
 * @param {object} dependencies
 * @param {EventBus} dependencies.eventBus
 * @param {Logger} dependencies.logger
 * @param {PIXI.Graphics} dependencies.graphics - The Pixi Graphics object for drawing lines.
 */
export function init(dependencies) { // Renamed initPaylineGraphics
    if (!dependencies || !dependencies.eventBus || !dependencies.logger || !dependencies.graphics) {
        console.error("PaylineGraphics Init Error: Missing dependencies (eventBus, logger, graphics).");
        return;
    }
    eventBus = dependencies.eventBus;
    logger = dependencies.logger;
    winLineGraphics = dependencies.graphics;

    // Subscribe to win event
    _unsubscribeWinEvent = eventBus.on('win:validatedForAnimation', _drawLines); // Call renamed _drawLines
    
    // Listen for clear requests
    // eventBus?.on('paylines:clearRequest', _clearLines); // OLD
    _unsubscribeClearEvent = eventBus?.on('paylines:clearRequest', _clearLines); // Store unsubscribe
    
    logger.info('PaylineGraphics', 'Initialized and subscribed to events.');
}

/**
 * Cleans up event listeners.
 */
export function destroy() {
    logger?.info('PaylineGraphics', 'Destroying...'); // Add log
    if (_unsubscribeWinEvent) {
        _unsubscribeWinEvent();
        _unsubscribeWinEvent = null;
        logger?.debug('PaylineGraphics', 'Unsubscribed from win:validatedForAnimation.'); // Use debug
    }
    // logger?.warn('PaylineGraphics', 'TODO: Implement unsubscription for paylines:clearRequest in destroy.');
    // ^^^ Need to store the unsubscribe function for paylines:clearRequest too ^^^ 
    if (_unsubscribeClearEvent) {
        _unsubscribeClearEvent();
        _unsubscribeClearEvent = null;
        logger?.debug('PaylineGraphics', 'Unsubscribed from paylines:clearRequest.'); // Use debug
    }

    _clearLines(); // Call renamed _clearLines
    winLineGraphics = null;
    eventBus = null;
    logger = null;
}

/**
 * Draws the winning paylines based on the data received from the win event.
 * Includes fade-in and fade-out animations using GSAP.
 * @param {object} eventData - Payload from the 'win:validatedForAnimation' event.
 * @private // Make internal
 */
function _drawLines(eventData) {
    if (!winLineGraphics || !logger) {
        (logger || console).error("PaylineGraphics Error: Module not initialized (graphics or logger missing).");
        return;
    }
    
    const globalPos = winLineGraphics.getGlobalPosition();
    const parentPos = winLineGraphics.parent?.position; // Access parent position
    logger?.info('PaylineGraphics', 'Start _drawLines', { 
        graphicsGlobalPos: `(${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`, 
        parentPos: parentPos ? `(${parentPos.x.toFixed(1)}, ${parentPos.y.toFixed(1)})` : 'N/A' 
    });
    
    const currentGraphics = winLineGraphics; // Draw directly on the main graphics object
    const currentLogger = logger;
    
    const winningLines = eventData?.winningLines;
    if (!winningLines || winningLines.length === 0) {
        currentLogger.debug('PaylineGraphics', 'Received win event with no winning lines.');
        _clearLines(); 
        return;
    }

    currentLogger.debug('PaylineGraphics', `Drawing ${winningLines.length} win lines.`);

    // Stop previous animations & Clear the main graphics object
    gsap.killTweensOf(currentGraphics);
    currentGraphics.clear(); 
    currentGraphics.alpha = 1; // Ensure main graphics is ready

    const lineColors = [ 
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500,
        0x800080, 0x008000, 0x800000, 0xadd8e6, 0x90ee90, 0xffb6c1, 0xfaebd7, 0xdda0dd
    ];

    // --- First Pass: Draw Lines --- 
    winningLines.forEach((winInfo) => {
        const linePath = PAYLINES[winInfo.lineIndex];
        if (!linePath) {
             currentLogger.warn('PaylineGraphics', `Invalid lineIndex ${winInfo.lineIndex} in win data.`);
             return;
        }
        
        currentGraphics.beginPath(); // Start path for this line
        const lineColor = lineColors[winInfo.lineIndex % lineColors.length];
        currentGraphics.lineStyle(5, lineColor, 0.7); 

        for (let reelIndex = 0; reelIndex < winInfo.count; reelIndex++) {
            const rowIndex = linePath[reelIndex];
            if (rowIndex === undefined || rowIndex < 0) continue; 
            
            const symbolCenterX = reelIndex * REEL_WIDTH + REEL_WIDTH / 2;
            const symbolCenterY = rowIndex * SYMBOL_SIZE + SYMBOL_SIZE / 2; 
            
            currentLogger?.debug('PaylineGraphics', `Drawing line ${winInfo.lineIndex}, Reel ${reelIndex}, Row ${rowIndex} -> Coords (${symbolCenterX.toFixed(1)}, ${symbolCenterY.toFixed(1)})`);

            // Define the line path
            if (reelIndex === 0) {
                currentGraphics.moveTo(symbolCenterX, symbolCenterY);
            } else {
                currentGraphics.lineTo(symbolCenterX, symbolCenterY);
            }
        }
        
        // Stroke the line path after defining it
        if (winInfo.count > 0) { 
            currentGraphics.stroke();
        }
    });
    
    // --- Second Pass: Draw Dots --- 
    winningLines.forEach((winInfo) => {
        const linePath = PAYLINES[winInfo.lineIndex];
        if (!linePath) {
             currentLogger.warn('PaylineGraphics', `Invalid lineIndex ${winInfo.lineIndex} in win data.`);
             return;
        }
        
        const lineColor = lineColors[winInfo.lineIndex % lineColors.length];

        for (let reelIndex = 0; reelIndex < winInfo.count; reelIndex++) {
            const rowIndex = linePath[reelIndex];
            if (rowIndex === undefined || rowIndex < 0) continue; 
            
            const symbolCenterX = reelIndex * REEL_WIDTH + REEL_WIDTH / 2;
            const symbolCenterY = rowIndex * SYMBOL_SIZE + SYMBOL_SIZE / 2; 

            // Draw circles at symbol centers (Filled)
            // No beginPath/lineStyle needed here, just fill
            currentGraphics.circle(symbolCenterX, symbolCenterY, 8).fill({ color: lineColor, alpha: 0.8 });
             // Log dot drawing
            // currentLogger?.debug('PaylineGraphics', `Drawing dot at (${symbolCenterX.toFixed(1)}, ${symbolCenterY.toFixed(1)})`);
        }
    });

    // --- GSAP Fade Animation --- 
    // Animate the main graphics object
    currentGraphics.alpha = 0; // Start transparent
    const fadeInDuration = 0.15 * winAnimDelayMultiplier;
    const displayDuration = 2.8 * winAnimDelayMultiplier; 
    const fadeOutDuration = 0.2 * winAnimDelayMultiplier;

    const tl = gsap.timeline();
    tl.to(currentGraphics, { alpha: 0.8, duration: fadeInDuration, ease: "power1.in" }) 
      .to(currentGraphics, { alpha: 0, duration: fadeOutDuration, ease: "power1.out" }, `+=${displayDuration}`);
}

/**
 * Clears any active win lines and stops animations.
 * @private // Make internal
 */
function _clearLines() { // Renamed clearWinLines and removed export
    if (!winLineGraphics) {
        logger?.warn('PaylineGraphics', 'Attempted to clear lines, but graphics object not initialized.');
        return;
    }
    logger?.debug('PaylineGraphics', 'Clearing win lines: Killing animations and clearing graphics paths.');
    
    // Kill fade animations targeting the graphics object
    gsap.killTweensOf(winLineGraphics);

    // Explicitly clear drawn paths
    winLineGraphics.clear();

    // Reset alpha just in case an animation was interrupted
    winLineGraphics.alpha = 1;
}
